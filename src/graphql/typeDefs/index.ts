import { sharedTypeDefs } from './shared.typeDefs';
import { userTypeDefs } from './user.typeDefs';
import { movieTypeDefs } from './movie.typeDefs';
import { reviewTypeDefs } from './review.typeDefs';
import { listTypeDefs } from './list.typeDefs';

/**
 * Orden importa: shared.typeDefs define `type Query` / `type Mutation` base
 * y el resto usa `extend type` sobre esa base.
 */
export const typeDefs = [
  sharedTypeDefs,
  userTypeDefs,
  movieTypeDefs,
  reviewTypeDefs,
  listTypeDefs,
];
