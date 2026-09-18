import DataLoader from 'dataloader';
import { UserModel, MovieModel, ReviewModel, ListModel } from '../../models/index.js';
import type { IUser, IMovie, IReview, IList } from '../../models/index.js';
import { clampPagination } from '../../utils/pagination.js';

/**
 * Per-request DataLoaders. Created from scratch on every Apollo `context()`
 * (see src/index.ts) -- DataLoader's caching/batching is intentionally
 * short-lived, one event-loop tick per request, never shared across
 * different requests (avoids serving stale data between users).
 *
 * Solves the N+1 that used to exist in Movie.reviews, User.reviews,
 * User.lists, List.movies, List.owner, Review.movie and Review.author: each
 * one ran its own query per resolved parent (e.g. 20 movies -> 20 queries
 * for `reviews`). Here all the keys requested in the same tick are grouped
 * into a SINGLE `$in` query and resolved in memory.
 */

// ───────────────────────── simple id-based lookups ─────────────────────────

function createUserByIdLoader() {
  return new DataLoader<string, IUser | null>(async (ids) => {
    const users = await UserModel.find({ _id: { $in: ids as string[] } });
    const byId = new Map(users.map((user) => [user.id, user]));
    return ids.map((id) => byId.get(id) ?? null);
  });
}

function createMovieByIdLoader() {
  return new DataLoader<string, IMovie | null>(async (ids) => {
    const movies = await MovieModel.find({ _id: { $in: ids as string[] } });
    const byId = new Map(movies.map((movie) => [movie.id, movie]));
    return ids.map((id) => byId.get(id) ?? null);
  });
}

// ─────────────── paginated lists by parent (movie/author/owner) ───────────────

export interface PaginatedKey {
  id: string;
  limit: number;
  offset: number;
}

function paginatedCacheKey(key: PaginatedKey): string {
  return `${key.id}::${key.limit}::${key.offset}`;
}

function createReviewsByMovieLoader() {
  return new DataLoader<PaginatedKey, IReview[], string>(
    async (keys) => {
      const movieIds = [...new Set(keys.map((key) => key.id))];
      const reviews = await ReviewModel.find({ movie: { $in: movieIds } }).sort({
        createdAt: -1,
      });

      const byMovie = new Map<string, IReview[]>();
      for (const review of reviews) {
        const movieId = review.movie.toString();
        const bucket = byMovie.get(movieId);
        if (bucket) bucket.push(review);
        else byMovie.set(movieId, [review]);
      }

      return keys.map(({ id, limit, offset }) => {
        const { limit: clampedLimit, offset: clampedOffset } = clampPagination(limit, offset);
        const all = byMovie.get(id) ?? [];
        return all.slice(clampedOffset, clampedOffset + clampedLimit);
      });
    },
    { cacheKeyFn: paginatedCacheKey },
  );
}

function createReviewsByAuthorLoader() {
  return new DataLoader<PaginatedKey, IReview[], string>(
    async (keys) => {
      const authorIds = [...new Set(keys.map((key) => key.id))];
      const reviews = await ReviewModel.find({ author: { $in: authorIds } }).sort({
        createdAt: -1,
      });

      const byAuthor = new Map<string, IReview[]>();
      for (const review of reviews) {
        const authorId = review.author.toString();
        const bucket = byAuthor.get(authorId);
        if (bucket) bucket.push(review);
        else byAuthor.set(authorId, [review]);
      }

      return keys.map(({ id, limit, offset }) => {
        const { limit: clampedLimit, offset: clampedOffset } = clampPagination(limit, offset);
        const all = byAuthor.get(id) ?? [];
        return all.slice(clampedOffset, clampedOffset + clampedLimit);
      });
    },
    { cacheKeyFn: paginatedCacheKey },
  );
}

// `User.lists` doesn't take limit/offset in the schema, so this one goes
// unpaginated -- simple key (ownerId).
function createListsByOwnerLoader() {
  return new DataLoader<string, IList[]>(async (ownerIds) => {
    const lists = await ListModel.find({ owner: { $in: ownerIds as string[] } }).sort({
      createdAt: -1,
    });

    const byOwner = new Map<string, IList[]>();
    for (const list of lists) {
      const ownerId = list.owner.toString();
      const bucket = byOwner.get(ownerId);
      if (bucket) bucket.push(list);
      else byOwner.set(ownerId, [list]);
    }

    return ownerIds.map((id) => byOwner.get(id) ?? []);
  });
}

export function createLoaders() {
  return {
    userById: createUserByIdLoader(),
    movieById: createMovieByIdLoader(),
    reviewsByMovie: createReviewsByMovieLoader(),
    reviewsByAuthor: createReviewsByAuthorLoader(),
    listsByOwner: createListsByOwnerLoader(),
  };
}

export type AppLoaders = ReturnType<typeof createLoaders>;
