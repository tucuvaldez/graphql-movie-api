import { describe, it, expect } from 'vitest';
import { MovieModel } from '../src/models/index.js';
import {
  execute,
  buildContext,
  contextFor,
  createTestUser,
  createTestMovie,
  expectNoErrors,
} from './helpers.js';

const CREATE_REVIEW = `
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) { id rating comment movie { id averageRating reviewCount } }
  }
`;

const UPDATE_REVIEW = `
  mutation UpdateReview($id: ID!, $input: UpdateReviewInput!) {
    updateReview(id: $id, input: $input) { id rating }
  }
`;

const DELETE_REVIEW = `mutation DeleteReview($id: ID!) { deleteReview(id: $id) { success id } }`;
const LIKE_REVIEW = `mutation LikeReview($id: ID!) { likeReview(id: $id) { likeCount } }`;
const UNLIKE_REVIEW = `mutation UnlikeReview($id: ID!) { unlikeReview(id: $id) { likeCount } }`;

describe('createReview', () => {
  it('requires authentication', async () => {
    const movie = await createTestMovie();
    const result = await execute(
      CREATE_REVIEW,
      { input: { movieId: movie.id, rating: 8 } },
      buildContext(),
    );
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a rating outside the valid range', async () => {
    const { user } = await createTestUser();
    const movie = await createTestMovie();
    const result = await execute(
      CREATE_REVIEW,
      { input: { movieId: movie.id, rating: 11 } },
      contextFor(user),
    );
    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it("creates the review and updates the movie's denormalized rating", async () => {
    const { user } = await createTestUser();
    const movie = await createTestMovie();

    const result = await execute(
      CREATE_REVIEW,
      { input: { movieId: movie.id, rating: 8, comment: 'Really good' } },
      contextFor(user),
    );
    expectNoErrors(result);
    const data = (result.data as any).createReview;
    expect(data.rating).toBe(8);
    expect(data.movie.averageRating).toBe(8);
    expect(data.movie.reviewCount).toBe(1);

    const stored = await MovieModel.findById(movie.id);
    expect(stored!.ratingSum).toBe(8);
    expect(stored!.ratingCount).toBe(1);
  });

  it('rejects a second review by the same user for the same movie', async () => {
    const { user } = await createTestUser();
    const movie = await createTestMovie();

    await execute(CREATE_REVIEW, { input: { movieId: movie.id, rating: 5 } }, contextFor(user));
    const result = await execute(
      CREATE_REVIEW,
      { input: { movieId: movie.id, rating: 7 } },
      contextFor(user),
    );
    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('rejects a review for a nonexistent movie', async () => {
    const { user } = await createTestUser();
    const result = await execute(
      CREATE_REVIEW,
      { input: { movieId: '507f1f77bcf86cd799439011', rating: 5 } },
      contextFor(user),
    );
    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});

describe('updateReview / deleteReview (permissions and rating recalculation)', () => {
  async function seedReview(rating = 6) {
    const { user: author } = await createTestUser();
    const movie = await createTestMovie();
    const created = await execute(
      CREATE_REVIEW,
      { input: { movieId: movie.id, rating } },
      contextFor(author),
    );
    const reviewId = (created.data as any).createReview.id;
    return { author, movie, reviewId };
  }

  it('rejects updating another user\'s review if you are not a moderator', async () => {
    const { reviewId } = await seedReview();
    const { user: stranger } = await createTestUser();
    const result = await execute(
      UPDATE_REVIEW,
      { id: reviewId, input: { rating: 9 } },
      contextFor(stranger),
    );
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it("allows the author to update their review and recalculates the movie's rating", async () => {
    const { author, movie, reviewId } = await seedReview(6);
    const result = await execute(
      UPDATE_REVIEW,
      { id: reviewId, input: { rating: 10 } },
      contextFor(author),
    );
    expectNoErrors(result);
    expect((result.data as any).updateReview.rating).toBe(10);

    const stored = await MovieModel.findById(movie.id);
    expect(stored!.ratingSum).toBe(10);
    expect(stored!.ratingCount).toBe(1);
  });

  it("allows a MODERATOR to update another user's review", async () => {
    const { reviewId } = await seedReview();
    const { user: moderator } = await createTestUser({ role: 'MODERATOR' });
    const result = await execute(
      UPDATE_REVIEW,
      { id: reviewId, input: { comment: 'edited by moderation' } },
      contextFor(moderator),
    );
    expectNoErrors(result);
  });

  it("deleteReview decrements the movie's denormalized rating", async () => {
    const { author, movie, reviewId } = await seedReview(8);
    const result = await execute(DELETE_REVIEW, { id: reviewId }, contextFor(author));
    expectNoErrors(result);
    expect((result.data as any).deleteReview.success).toBe(true);

    const stored = await MovieModel.findById(movie.id);
    expect(stored!.ratingSum).toBe(0);
    expect(stored!.ratingCount).toBe(0);
  });
});

describe('likeReview / unlikeReview', () => {
  it('adds and removes likes idempotently', async () => {
    const { user: author } = await createTestUser();
    const { user: liker } = await createTestUser();
    const movie = await createTestMovie();
    const created = await execute(
      CREATE_REVIEW,
      { input: { movieId: movie.id, rating: 7 } },
      contextFor(author),
    );
    const reviewId = (created.data as any).createReview.id;

    const liked = await execute(LIKE_REVIEW, { id: reviewId }, contextFor(liker));
    expect((liked.data as any).likeReview.likeCount).toBe(1);

    // $addToSet is idempotent: liking twice shouldn't duplicate.
    const likedAgain = await execute(LIKE_REVIEW, { id: reviewId }, contextFor(liker));
    expect((likedAgain.data as any).likeReview.likeCount).toBe(1);

    const unliked = await execute(UNLIKE_REVIEW, { id: reviewId }, contextFor(liker));
    expect((unliked.data as any).unlikeReview.likeCount).toBe(0);
  });
});
