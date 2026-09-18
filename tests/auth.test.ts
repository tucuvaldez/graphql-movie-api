import { describe, it, expect } from 'vitest';
import { UserModel } from '../src/models/index.js';
import { execute, buildContext, contextFor, createTestUser, expectNoErrors } from './helpers.js';

const REGISTER = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user { id username email role }
    }
  }
`;

const LOGIN = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user { id email }
    }
  }
`;

const REFRESH = `
  mutation Refresh($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`;

const ME = `query { me { id email } }`;

describe('register', () => {
  it('creates a user and returns tokens', async () => {
    const result = await execute(REGISTER, {
      input: { username: 'ricardo', email: 'ricardo@test.com', password: 'password123' },
    });
    expectNoErrors(result);
    const data = result.data as any;
    expect(data.register.accessToken).toBeTruthy();
    expect(data.register.refreshToken).toBeTruthy();
    expect(data.register.user.username).toBe('ricardo');
    expect(data.register.user.role).toBe('USER');

    const stored = await UserModel.findOne({ email: 'ricardo@test.com' }).select('+passwordHash');
    expect(stored).not.toBeNull();
    expect(stored!.passwordHash).not.toBe('password123');
  });

  it('rejects a password shorter than 8 characters', async () => {
    const result = await execute(REGISTER, {
      input: { username: 'shorty', email: 'shorty@test.com', password: '1234567' },
    });
    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('rejects an email/username already in use', async () => {
    await createTestUser({ email: 'dup@test.com', username: 'dup' });
    const result = await execute(REGISTER, {
      input: { username: 'other', email: 'dup@test.com', password: 'password123' },
    });
    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  });
});

describe('login', () => {
  it('returns tokens with correct credentials', async () => {
    const { user, password } = await createTestUser({ email: 'login@test.com' });
    const result = await execute(LOGIN, { input: { email: 'login@test.com', password } });
    expectNoErrors(result);
    const data = result.data as any;
    expect(data.login.user.id).toBe(user.id);
  });

  it('rejects an incorrect password', async () => {
    await createTestUser({ email: 'wrongpass@test.com', password: 'password123' });
    const result = await execute(LOGIN, {
      input: { email: 'wrongpass@test.com', password: 'incorrect' },
    });
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a nonexistent email', async () => {
    const result = await execute(LOGIN, {
      input: { email: 'doesnotexist@test.com', password: 'password123' },
    });
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });
});

describe('refreshToken', () => {
  it('issues new tokens with a valid refresh token', async () => {
    const { user, password } = await createTestUser({ email: 'refresh@test.com' });
    const login = await execute(LOGIN, { input: { email: 'refresh@test.com', password } });
    const refreshToken = (login.data as any).login.refreshToken;

    const result = await execute(REFRESH, { refreshToken });
    expectNoErrors(result);
    expect((result.data as any).refreshToken.accessToken).toBeTruthy();
    void user;
  });

  it('rejects an invalid refresh token', async () => {
    const result = await execute(REFRESH, { refreshToken: 'this-is-not-a-jwt' });
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('invalidates old refresh tokens after logout (tokenVersion rotation)', async () => {
    const { user, password } = await createTestUser({ email: 'logout@test.com' });
    const login = await execute(LOGIN, { input: { email: 'logout@test.com', password } });
    const oldRefreshToken = (login.data as any).login.refreshToken;

    const logoutResult = await execute('mutation { logout }', undefined, contextFor(user));
    expectNoErrors(logoutResult);
    expect((logoutResult.data as any).logout).toBe(true);

    const result = await execute(REFRESH, { refreshToken: oldRefreshToken });
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });
});

describe('me', () => {
  it('returns null without authentication', async () => {
    const result = await execute(ME);
    expectNoErrors(result);
    expect((result.data as any).me).toBeNull();
  });

  it('returns the authenticated user', async () => {
    const { user } = await createTestUser({ email: 'me@test.com' });
    const result = await execute(ME, undefined, contextFor(user));
    expectNoErrors(result);
    expect((result.data as any).me.email).toBe('me@test.com');
  });
});

describe('setUserRole', () => {
  const SET_ROLE = `
    mutation SetRole($userId: ID!, $role: UserRole!) {
      setUserRole(userId: $userId, role: $role) { id role }
    }
  `;

  it('rejects a user who is not ADMIN', async () => {
    const { user: admin } = await createTestUser({ role: 'MODERATOR' });
    const { user: target } = await createTestUser();
    const result = await execute(
      SET_ROLE,
      { userId: target.id, role: 'MODERATOR' },
      contextFor(admin),
    );
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it("allows an ADMIN to change another user's role", async () => {
    const { user: admin } = await createTestUser({ role: 'ADMIN' });
    const { user: target } = await createTestUser();
    const result = await execute(
      SET_ROLE,
      { userId: target.id, role: 'MODERATOR' },
      contextFor(admin),
    );
    expectNoErrors(result);
    expect((result.data as any).setUserRole.role).toBe('MODERATOR');
  });

  it('requires authentication', async () => {
    const { user: target } = await createTestUser();
    const result = await execute(SET_ROLE, { userId: target.id, role: 'ADMIN' }, buildContext());
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });
});
