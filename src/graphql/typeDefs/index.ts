import { sharedTypeDefs } from './shared.typeDefs.js';
import { userTypeDefs } from './user.typeDefs.js';
import { movieTypeDefs } from './movie.typeDefs.js';
import { reviewTypeDefs } from './review.typeDefs.js';
import { listTypeDefs } from './list.typeDefs.js';

/**
 * Order matters: shared.typeDefs defines the base `type Query` / `type
 * Mutation` and the rest use `extend type` on top of that base.
 */
export const typeDefs = [
  sharedTypeDefs,
  userTypeDefs,
  movieTypeDefs,
  reviewTypeDefs,
  listTypeDefs,
];
