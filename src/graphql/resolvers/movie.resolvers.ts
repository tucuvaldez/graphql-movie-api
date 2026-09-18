import type { FilterQuery } from 'mongoose';
import type { GraphQLContext, Genre } from '../../types/context.js';
import { MovieModel, ReviewModel, type ICastMember, type IMovie } from '../../models/index.js';
import { ForbiddenError, NotFoundError, requireAuth } from '../../utils/errors.js';
import { buildPageInfo, clampPagination } from '../../utils/pagination.js';
import { pubsub, TOPICS } from '../pubsub.js';

interface MovieFilterInput {
  genre?: Genre | null;
  search?: string | null;
  releaseYear?: number | null;
  minRating?: number | null;
}

interface MovieSortInput {
  field: 'TITLE' | 'RELEASE_DATE' | 'AVERAGE_RATING' | 'CREATED_AT';
  order: 'ASC' | 'DESC';
}

interface CreateMovieInput {
  title: string;
  originalTitle?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
  runtimeMinutes?: number | null;
  genres: Genre[];
  director?: string | null;
  cast?: ICastMember[] | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
}

type UpdateMovieInput = Partial<CreateMovieInput>;

const SORT_FIELD_MAP: Record<MovieSortInput['field'], string> = {
  TITLE: 'title',
  RELEASE_DATE: 'releaseDate',
  AVERAGE_RATING: 'ratingSum', // approximation; see README note on Phase 2.1 (real denormalized rating)
  CREATED_AT: 'createdAt',
};

function assertCanManageCatalog(ctx: GraphQLContext) {
  const currentUser = requireAuth(ctx.currentUser);
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR') {
    throw new ForbiddenError('ADMIN or MODERATOR role required');
  }
  return currentUser;
}

function averageRating(movie: Pick<IMovie, 'ratingSum' | 'ratingCount'>): number {
  if (movie.ratingCount === 0) return 0;
  return Math.round((movie.ratingSum / movie.ratingCount) * 10) / 10;
}

export const movieResolvers = {
  Query: {
    movie: async (_parent: unknown, args: { id: string }) => {
      return MovieModel.findById(args.id);
    },

    movies: async (
      _parent: unknown,
      args: {
        filter?: MovieFilterInput | null;
        sort?: MovieSortInput | null;
        limit: number;
        offset: number;
      },
    ) => {
      const { limit, offset } = clampPagination(args.limit, args.offset);
      const filter: FilterQuery<IMovie> = {};

      if (args.filter?.genre) filter.genres = args.filter.genre;
      if (args.filter?.search) filter.$text = { $search: args.filter.search };
      if (args.filter?.releaseYear) {
        const year = args.filter.releaseYear;
        filter.releaseDate = {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        };
      }

      const sortField = args.sort ? SORT_FIELD_MAP[args.sort.field] : 'releaseDate';
      const sortOrder = args.sort?.order === 'ASC' ? 1 : -1;

      const [items, totalCount] = await Promise.all([
        MovieModel.find(filter)
          .sort({ [sortField]: sortOrder })
          .skip(offset)
          .limit(limit),
        MovieModel.countDocuments(filter),
      ]);

      return { items, pageInfo: buildPageInfo(limit, offset, totalCount) };
    },
  },

  Mutation: {
    createMovie: async (
      _parent: unknown,
      args: { input: CreateMovieInput },
      ctx: GraphQLContext,
    ) => {
      assertCanManageCatalog(ctx);
      return MovieModel.create(args.input);
    },

    updateMovie: async (
      _parent: unknown,
      args: { id: string; input: UpdateMovieInput },
      ctx: GraphQLContext,
    ) => {
      assertCanManageCatalog(ctx);
      const movie = await MovieModel.findByIdAndUpdate(args.id, args.input, { new: true });
      if (!movie) throw new NotFoundError('Movie', args.id);
      return movie;
    },

    deleteMovie: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      assertCanManageCatalog(ctx);
      const movie = await MovieModel.findByIdAndDelete(args.id);
      if (!movie) throw new NotFoundError('Movie', args.id);
      await ReviewModel.deleteMany({ movie: args.id });
      return { success: true, id: args.id };
    },
  },

  Movie: {
    averageRating: (parent: IMovie) => averageRating(parent),

    reviewCount: (parent: IMovie) => parent.ratingCount,

    // Before: one Reviews query per resolved Movie (N+1 when listing
    // `movies { reviews }`). Now it's grouped into a single query -- see
    // src/graphql/loaders/index.ts.
    reviews: async (
      parent: { id: string },
      args: { limit: number; offset: number },
      ctx: GraphQLContext,
    ) => {
      return ctx.loaders.reviewsByMovie.load({ id: parent.id, limit: args.limit, offset: args.offset });
    },
  },

  Subscription: {
    movieRatingUpdated: {
      subscribe: (_parent: unknown, args: { movieId: string }) =>
        pubsub.asyncIterableIterator(TOPICS.movieRatingUpdated(args.movieId)),
    },
  },
};
