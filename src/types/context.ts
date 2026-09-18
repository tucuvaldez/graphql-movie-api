import type { IUser, UserRole } from '../models/User.model';

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
 * Usuario autenticado extraído y verificado desde el JWT en el request.
 * Es un subconjunto liviano de IUser — no pegamos a Mongo en cada resolver
 * solo para saber "quién está pidiendo esto".
 */
export interface AuthUser {
  id: string;
  role: UserRole;
}

/**
 * Contexto de Apollo Server. `currentUser` es null cuando no hay
 * Authorization header válido — los resolvers deciden si eso es un error
 * (ver utils/errors.ts) o un caso válido (ej: `movies` es pública).
 */
export interface GraphQLContext {
  currentUser: AuthUser | null;
  // Placeholder para Fase 2.1: DataLoaders por entidad para evitar N+1
  // en campos como Movie.reviews, User.lists, etc.
  loaders?: Record<string, unknown>;
}

export type { IUser };
