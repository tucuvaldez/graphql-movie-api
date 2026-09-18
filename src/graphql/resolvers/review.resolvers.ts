import type { GraphQLContext } from '../../types/context.js';
import { ReviewModel, MovieModel, type IReview } from '../../models/index.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  requireAuth,
} from '../../utils/errors.js';
import { buildPageInfo, clampPagination } from '../../utils/pagination.js';
import { pubsub, TOPICS } from '../pubsub.js';

interface CreateReviewInput {
  movieId: string;
  rating: number;
  comment?: string | null;
}

interface UpdateReviewInput {
  rating?: number | null;
  comment?: string | null;
}

function assertValidRating(rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    throw new ValidationError('rating must be an integer between 1 and 10');
  }
}

async function assertOwnerOrModerator(review: IReview, ctx: GraphQLContext) {
  const currentUser = requireAuth(ctx.currentUser);
  const isOwner = review.author.toString() === currentUser.id;
  const isModerator = currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR';
  if (!isOwner && !isModerator) {
    throw new ForbiddenError('Only the author or a moderator can modify this review');
  }
  return currentUser;
}

export const reviewResolvers = {
  Query: {
    review: async (_parent: unknown, args: { id: string }) => {
      return ReviewModel.findById(args.id);
    },

    reviewsByMovie: async (
      _parent: unknown,
      args: { movieId: string; limit: number; offset: number },
    ) => {
      const { limit, offset } = clampPagination(args.limit, args.offset);
      const filter = { movie: args.movieId };
      const [items, totalCount] = await Promise.all([
        ReviewModel.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
        ReviewModel.countDocuments(filter),
      ]);
      return { items, pageInfo: buildPageInfo(limit, offset, totalCount) };
    },

    reviewsByUser: async (
      _parent: unknown,
      args: { userId: string; limit: number; offset: number },
    ) => {
      const { limit, offset } = clampPagination(args.limit, args.offset);
      const filter = { author: args.userId };
      const [items, totalCount] = await Promise.all([
        ReviewModel.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
        ReviewModel.countDocuments(filter),
      ]);
      return { items, pageInfo: buildPageInfo(limit, offset, totalCount) };
    },
  },

  Mutation: {
    createReview: async (
      _parent: unknown,
      args: { input: CreateReviewInput },
      ctx: GraphQLContext,
    ) => {
      const currentUser = requireAuth(ctx.currentUser);
      assertValidRating(args.input.rating);

      const movie = await MovieModel.findById(args.input.movieId);
      if (!movie) throw new NotFoundError('Movie', args.input.movieId);

      let review: IReview;
      try {
        review = await ReviewModel.create({
          movie: args.input.movieId,
          author: currentUser.id,
          rating: args.input.rating,
          comment: args.input.comment ?? null,
        });
      } catch (err: unknown) {
        if (isDuplicateKeyError(err)) {
          throw new ValidationError('You already left a review for this movie');
        }
        throw err;
      }

      const updatedMovie = await MovieModel.findByIdAndUpdate(
        args.input.movieId,
        { $inc: { ratingSum: args.input.rating, ratingCount: 1 } },
        { new: true },
      );

      await pubsub.publish(TOPICS.reviewAdded(args.input.movieId), { reviewAdded: review });
      if (updatedMovie) {
        await pubsub.publish(TOPICS.movieRatingUpdated(args.input.movieId), {
          movieRatingUpdated: updatedMovie,
        });
      }

      return review;
    },

    updateReview: async (
      _parent: unknown,
      args: { id: string; input: UpdateReviewInput },
      ctx: GraphQLContext,
    ) => {
      const review = await ReviewModel.findById(args.id);
      if (!review) throw new NotFoundError('Review', args.id);
      await assertOwnerOrModerator(review, ctx);

      const previousRating = review.rating;

      if (args.input.rating !== undefined && args.input.rating !== null) {
        assertValidRating(args.input.rating);
        review.rating = args.input.rating;
      }
      if (args.input.comment !== undefined) {
        review.comment = args.input.comment;
      }
      await review.save();

      if (args.input.rating !== undefined && args.input.rating !== previousRating) {
        const updatedMovie = await MovieModel.findByIdAndUpdate(
          review.movie,
          { $inc: { ratingSum: review.rating - previousRating } },
          { new: true },
        );
        if (updatedMovie) {
          await pubsub.publish(TOPICS.movieRatingUpdated(review.movie.toString()), {
            movieRatingUpdated: updatedMovie,
          });
        }
      }

      return review;
    },

    deleteReview: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const review = await ReviewModel.findById(args.id);
      if (!review) throw new NotFoundError('Review', args.id);
      await assertOwnerOrModerator(review, ctx);

      await ReviewModel.findByIdAndDelete(args.id);
      const updatedMovie = await MovieModel.findByIdAndUpdate(
        review.movie,
        { $inc: { ratingSum: -review.rating, ratingCount: -1 } },
        { new: true },
      );
      if (updatedMovie) {
        await pubsub.publish(TOPICS.movieRatingUpdated(review.movie.toString()), {
          movieRatingUpdated: updatedMovie,
        });
      }

      return { success: true, id: args.id };
    },

    likeReview: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const currentUser = requireAuth(ctx.currentUser);
      const review = await ReviewModel.findByIdAndUpdate(
        args.id,
        { $addToSet: { likedBy: currentUser.id } },
        { new: true },
      );
      if (!review) throw new NotFoundError('Review', args.id);
      return review;
    },

    unlikeReview: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const currentUser = requireAuth(ctx.currentUser);
      const review = await ReviewModel.findByIdAndUpdate(
        args.id,
        { $pull: { likedBy: currentUser.id } },
        { new: true },
      );
      if (!review) throw new NotFoundError('Review', args.id);
      return review;
    },
  },

  Review: {
    // Before: one findById per resolved Review, both for `movie` and
    // `author` (classic N+1 when listing reviews). Now all requested ids
    // are batched in the same tick -- see src/graphql/loaders/index.ts.
    // Shares a loader with List.owner (userById) and List.movies
    // (movieById).
    movie: async (parent: IReview, _args: unknown, ctx: GraphQLContext) =>
      ctx.loaders.movieById.load(parent.movie.toString()),
    author: async (parent: IReview, _args: unknown, ctx: GraphQLContext) =>
      ctx.loaders.userById.load(parent.author.toString()),
    likeCount: (parent: IReview) => parent.likedBy.length,
  },

  Subscription: {
    reviewAdded: {
      subscribe: (_parent: unknown, args: { movieId: string }) =>
        pubsub.asyncIterableIterator(TOPICS.reviewAdded(args.movieId)),
    },
  },
};

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
