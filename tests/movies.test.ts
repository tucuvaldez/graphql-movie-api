import { describe, it, expect } from 'vitest';
import { ReviewModel } from '../src/models/index.js';
import {
  execute,
  buildContext,
  contextFor,
  createTestUser,
  createTestMovie,
  expectNoErrors,
} from './helpers.js';

const MOVIES = `
  query Movies($filter: MovieFilterInput, $limit: Int, $offset: Int) {
    movies(filter: $filter, limit: $limit, offset: $offset) {
      items { id title genres }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`;

const CREATE_MOVIE = `
  mutation CreateMovie($input: CreateMovieInput!) {
    createMovie(input: $input) { id title averageRating reviewCount }
  }
`;

const DELETE_MOVIE = `mutation DeleteMovie($id: ID!) { deleteMovie(id: $id) { success id } }`;

describe('movies query', () => {
  it('paginates and returns the correct totalCount', async () => {
    await Promise.all([
      createTestMovie({ title: 'A' }),
      createTestMovie({ title: 'B' }),
      createTestMovie({ title: 'C' }),
    ]);

    const result = await execute(MOVIES, { limit: 2, offset: 0 });
    expectNoErrors(result);
    const data = (result.data as any).movies;
    expect(data.items).toHaveLength(2);
    expect(data.pageInfo.totalCount).toBe(3);
    expect(data.pageInfo.hasNextPage).toBe(true);
    expect(data.pageInfo.hasPreviousPage).toBe(false);
  });

  it('filters by genre', async () => {
    await createTestMovie({ title: 'Horror Flick', genres: ['HORROR'] });
    await createTestMovie({ title: 'Laughs', genres: ['COMEDY'] });

    const result = await execute(MOVIES, { filter: { genre: 'HORROR' } });
    expectNoErrors(result);
    const items = (result.data as any).movies.items;
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Horror Flick');
  });

  it('movie(id) returns null if it does not exist', async () => {
    const result = await execute(`query { movie(id: "507f1f77bcf86cd799439011") { id } }`);
    expectNoErrors(result);
    expect((result.data as any).movie).toBeNull();
  });
});

describe('createMovie / updateMovie / deleteMovie (access control)', () => {
  it('rejects a user without ADMIN/MODERATOR role', async () => {
    const { user } = await createTestUser({ role: 'USER' });
    const result = await execute(
      CREATE_MOVIE,
      { input: { title: 'Movie', genres: ['DRAMA'] } },
      contextFor(user),
    );
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('rejects an unauthenticated user', async () => {
    const result = await execute(
      CREATE_MOVIE,
      { input: { title: 'Movie', genres: ['DRAMA'] } },
      buildContext(),
    );
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('allows a MODERATOR to create a movie', async () => {
    const { user } = await createTestUser({ role: 'MODERATOR' });
    const result = await execute(
      CREATE_MOVIE,
      { input: { title: 'New Movie', genres: ['SCI_FI'] } },
      contextFor(user),
    );
    expectNoErrors(result);
    const movie = (result.data as any).createMovie;
    expect(movie.title).toBe('New Movie');
    expect(movie.averageRating).toBe(0);
    expect(movie.reviewCount).toBe(0);
  });

  it('deleteMovie also deletes its associated reviews', async () => {
    const { user: admin } = await createTestUser({ role: 'ADMIN' });
    const { user: author } = await createTestUser();
    const movie = await createTestMovie();
    await ReviewModel.create({ movie: movie.id, author: author.id, rating: 8 });

    const result = await execute(DELETE_MOVIE, { id: movie.id }, contextFor(admin));
    expectNoErrors(result);
    expect((result.data as any).deleteMovie.success).toBe(true);

    const remainingReviews = await ReviewModel.countDocuments({ movie: movie.id });
    expect(remainingReviews).toBe(0);
  });
});
