import { GraphQLError } from 'graphql';

export class AuthenticationError extends GraphQLError {
  constructor(message = 'Not authenticated') {
    super(message, { extensions: { code: 'UNAUTHENTICATED' } });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message = "You don't have permission for this action") {
    super(message, { extensions: { code: 'FORBIDDEN' } });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found`, {
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
 * Throws AuthenticationError if there's no user in context.
 * Returns the (non-null) AuthUser so TS narrows the type at the call site.
 */
export function requireAuth<T extends { id: string }>(currentUser: T | null): T {
  if (!currentUser) {
    throw new AuthenticationError();
  }
  return currentUser;
}
