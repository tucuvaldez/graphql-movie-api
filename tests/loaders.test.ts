import { describe, it, expect, vi, afterEach } from 'vitest';
import { ReviewModel, UserModel } from '../src/models/index.js';
import { createLoaders } from '../src/graphql/loaders/index.js';
import { createTestUser, createTestMovie } from './helpers.js';

// Regression tests for the DataLoader implementation (see
// claude/fase-2-schema-y-resolvers.md): before this, every
// `movies { reviews }` / `users { reviews }` / `List.owner` triggered a
// Mongo query per resolved parent (N+1). These tests don't run against a
// real Mongo the way the manual verify-*.mjs scripts did, but they do test
// the property that matters: N `.load()` calls in the same tick collapse
// into ONE single batched query.

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DataLoader batching', () => {
  it('reviewsByMovie: N loads in the same tick -> 1 single query to Mongo', async () => {
    const [movieA, movieB, movieC] = await Promise.all([
      createTestMovie(),
      createTestMovie(),
      createTestMovie(),
    ]);
    const { user } = await createTestUser();
    await Promise.all([
      ReviewModel.create({ movie: movieA.id, author: user.id, rating: 7 }),
      ReviewModel.create({ movie: movieB.id, author: (await createTestUser()).user.id, rating: 5 }),
    ]);

    const findSpy = vi.spyOn(ReviewModel, 'find');
    const loaders = createLoaders();
    const [reviewsA, reviewsB, reviewsC] = await Promise.all([
      loaders.reviewsByMovie.load({ id: movieA.id, limit: 20, offset: 0 }),
      loaders.reviewsByMovie.load({ id: movieB.id, limit: 20, offset: 0 }),
      loaders.reviewsByMovie.load({ id: movieC.id, limit: 20, offset: 0 }),
    ]);

    expect(findSpy).toHaveBeenCalledTimes(1);
    expect(reviewsA).toHaveLength(1);
    expect(reviewsB).toHaveLength(1);
    expect(reviewsC).toHaveLength(0);
  });

  it('userById: repeated loads with the same id are cached within the same loader', async () => {
    const { user } = await createTestUser();
    const findSpy = vi.spyOn(UserModel, 'find');
    const loaders = createLoaders();

    const [u1, u2] = await Promise.all([
      loaders.userById.load(user.id),
      loaders.userById.load(user.id),
    ]);

    expect(findSpy).toHaveBeenCalledTimes(1);
    expect(u1?.id).toBe(user.id);
    expect(u2?.id).toBe(user.id);
  });

  it('reviewsByMovie paginates in memory respecting limit/offset', async () => {
    const movie = await createTestMovie();
    const { user } = await createTestUser();
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createTestUser().then(({ user: author }) =>
          ReviewModel.create({ movie: movie.id, author: author.id, rating: (i % 10) + 1 }),
        ),
      ),
    );

    const loaders = createLoaders();
    const page = await loaders.reviewsByMovie.load({ id: movie.id, limit: 2, offset: 1 });
    expect(page).toHaveLength(2);
    void user;
  });
});
