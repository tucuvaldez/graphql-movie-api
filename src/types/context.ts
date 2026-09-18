import type { IUser, UserRole } from '../models/User.model.js';
import type { AppLoaders } from '../graphql/loaders/index.js';

export type Genre =
  | 'ACTION'
  | 'ADVENTURE'
  | 'ANIMATION'
  | 'COMEDY'
  | 'CRIME'
  | 'DOCUMENTARY'
  | 'DRAMA'
  | 'FANTASY'
  | 'HORROR'
  | 'MYSTERY'
  | 'ROMANCE'
  | 'SCI_FI'
  | 'THRILLER'
  | 'WAR'
  | 'WESTERN';

/**
 * Authenticated user extracted and verified from the JWT on the request.
 * It's a lightweight subset of IUser -- we don't hit Mongo on every resolver
 * just to know "who is asking for this".
 */
export interface AuthUser {
  id: string;
  role: UserRole;
}

/**
 * Apollo Server context. `currentUser` is null when there's no valid
 * Authorization header -- resolvers decide whether that's an error
 * (see utils/errors.ts) or a valid case (e.g. `movies` is public).
 *
 * `loaders` is created from scratch on every request (see context() in
 * src/index.ts) to avoid N+1 in nested fields -- see
 * src/graphql/loaders/index.ts.
 */
export interface GraphQLContext {
  currentUser: AuthUser | null;
  loaders: AppLoaders;
}

export type { IUser };
