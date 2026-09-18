import { graphql, type ExecutionResult } from 'graphql';
import { schema } from '../src/graphql/schema.js';
import { createLoaders } from '../src/graphql/loaders/index.js';
import { hashPassword, signAccessToken } from '../src/utils/auth.js';
import { UserModel, MovieModel, type UserRole } from '../src/models/index.js';
import type { GraphQLContext, AuthUser } from '../src/types/context.js';

/**
 * Fake request context for tests: same shape as the one src/index.ts
 * builds on every real request (currentUser + fresh loaders), but without
 * going through HTTP/Express. Same pattern used in the verify-*.mjs
 * scripts to manually validate depth-limit, DataLoaders and subscriptions.
 */
export function buildContext(currentUser: AuthUser | null = null): GraphQLContext {
  return { currentUser, loaders: createLoaders() };
}

export function execute(
  source: string,
  variableValues?: Record<string, unknown>,
  contextValue: GraphQLContext = buildContext(),
): Promise<ExecutionResult> {
  return graphql({ schema, source, variableValues, contextValue });
}

let seq = 0;
function nextSeq(): number {
  seq += 1;
  return seq;
}

interface CreateTestUserOptions {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

/**
 * Creates a User directly in Mongo (bypassing the `register` resolver,
 * which already has its own test) and returns both the document and the
 * plaintext password (for `login` tests).
 */
export async function createTestUser(options: CreateTestUserOptions = {}) {
  const n = nextSeq();
  const password = options.password ?? 'password123';
  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({
    username: options.username ?? `user${n}`,
    email: options.email ?? `user${n}@test.com`,
    passwordHash,
    role: options.role ?? 'USER',
  });
  return { user, password };
}

// Typed by `_id` (not by the `.id` virtual) because the type mongoose
// returns for `Model.create(...)` marks `.id` as optional even though at
// runtime it's always present -- this avoids fighting that type nuance in
// every test.
interface UserLike {
  _id: unknown;
  role: UserRole;
}

export function authUserFor(user: UserLike): AuthUser {
  return { id: String(user._id), role: user.role };
}

export function contextFor(user: UserLike): GraphQLContext {
  return buildContext(authUserFor(user));
}

/** Real access token (same signAccessToken used by the `login` resolver). */
export function accessTokenFor(user: UserLike): string {
  return signAccessToken({ sub: String(user._id), role: user.role });
}

interface CreateTestMovieOptions {
  title?: string;
  genres?: string[];
  director?: string | null;
}

export async function createTestMovie(options: CreateTestMovieOptions = {}) {
  const n = nextSeq();
  return MovieModel.create({
    title: options.title ?? `Movie ${n}`,
    genres: options.genres ?? ['DRAMA'],
    director: options.director ?? null,
  });
}

/** Fails the test with a readable message if the graphql() response had errors. */
export function expectNoErrors(result: ExecutionResult): void {
  if (result.errors?.length) {
    throw new Error(
      `Expected no GraphQL errors, got: ${result.errors.map((e) => e.message).join('; ')}`,
    );
  }
}
