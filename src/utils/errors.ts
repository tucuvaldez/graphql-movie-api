import { GraphQLError } from 'graphql';

export class AuthenticationError extends GraphQLError {
  constructor(message = 'No autenticado') {
    super(message, { extensions: { code: 'UNAUTHENTICATED' } });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message = 'No tenés permisos para esta acción') {
    super(message, { extensions: { code: 'FORBIDDEN' } });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(entity: string, id: string) {
    super(`${entity} con id "${id}" no encontrado`, {
      extensions: { code: 'NOT_FOUND' },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

/**
 * Lanza AuthenticationError si no hay usuario en contexto.
 * Devuelve el AuthUser (no-null) para que TS angoste el tipo en el caller.
 */
export function requireAuth<T extends { id: string }>(currentUser: T | null): T {
  if (!currentUser) {
    throw new AuthenticationError();
  }
  return currentUser;
}
