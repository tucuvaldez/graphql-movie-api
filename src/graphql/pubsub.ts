import { PubSub } from 'graphql-subscriptions';

/**
 * In-memory (single-process) PubSub -- good enough for dev / portfolio with
 * a single server running. If this ever gets deployed with more than one
 * process instance behind a load balancer, this needs to be swapped for a
 * distributed PubSub (e.g. graphql-redis-subscriptions), because an event
 * published on instance A would never reach a client connected via WS to
 * instance B.
 */
export const pubsub = new PubSub();

export const TOPICS = {
  reviewAdded: (movieId: string) => `REVIEW_ADDED:${movieId}`,
  movieRatingUpdated: (movieId: string) => `MOVIE_RATING_UPDATED:${movieId}`,
};
