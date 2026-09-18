import type { GraphQLContext } from '../../types/context';
import { ReviewModel, MovieModel, UserModel, type IReview } from '../../models';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  requireAuth,
} from '../../utils/errors';
import { buildPageInfo, clampPagination } from '../../utils/pagination';

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
    throw new ValidationError('rating debe ser un entero entre 1 y 10');
  }
}

async function assertOwnerOrModerator(review: IReview, ctx: GraphQLContext) {
  const currentUser = requireAuth(ctx.currentUser);
  const isOwner = review.author.toString() === currentUser.id;
  const isModerator = currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR';
  if (!isOwner && !isModerator) {
    throw new ForbiddenError('Solo el autor o un moderador pueden modificar esta review');
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
          throw new ValidationError('Ya dejaste una review para esta película');
        }
        throw err;
      }

      await MovieModel.findByIdAndUpdate(args.input.movieId, {
        $inc: { ratingSum: args.input.rating, ratingCount: 1 },
      });

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
        await MovieModel.findByIdAndUpdate(review.movie, {
          $inc: { ratingSum: review.rating - previousRating },
        });
      }

      return review;
    },

    deleteReview: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const review = await ReviewModel.findById(args.id);
      if (!review) throw new NotFoundError('Review', args.id);
      await assertOwnerOrModerator(review, ctx);

      await ReviewModel.findByIdAndDelete(args.id);
      await MovieModel.findByIdAndUpdate(review.movie, {
        $inc: { ratingSum: -review.rating, ratingCount: -1 },
      });

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
    movie: async (parent: IReview) => MovieModel.findById(parent.movie),
    author: async (parent: IReview) => UserModel.findById(parent.author),
    likeCount: (parent: IReview) => parent.likedBy.length,
  },
};

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
