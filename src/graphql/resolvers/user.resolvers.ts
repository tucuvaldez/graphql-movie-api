import type { GraphQLContext } from '../../types/context.js';
import { UserModel, type UserRole } from '../../models/index.js';
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/auth.js';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  requireAuth,
} from '../../utils/errors.js';
import { buildPageInfo, clampPagination } from '../../utils/pagination.js';

interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface UpdateProfileInput {
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

export const userResolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      if (!ctx.currentUser) return null;
      return UserModel.findById(ctx.currentUser.id);
    },

    user: async (_parent: unknown, args: { id: string }) => {
      return UserModel.findById(args.id);
    },

    users: async (_parent: unknown, args: { limit: number; offset: number }) => {
      const { limit, offset } = clampPagination(args.limit, args.offset);
      const [items, totalCount] = await Promise.all([
        UserModel.find().sort({ createdAt: -1 }).skip(offset).limit(limit),
        UserModel.countDocuments(),
      ]);
      return { items, pageInfo: buildPageInfo(limit, offset, totalCount) };
    },
  },

  Mutation: {
    register: async (_parent: unknown, args: { input: RegisterInput }) => {
      const { username, email, password } = args.input;

      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      const existing = await UserModel.findOne({ $or: [{ email }, { username }] });
      if (existing) {
        throw new ValidationError('Email or username already in use');
      }

      const passwordHash = await hashPassword(password);
      const user = await UserModel.create({ username, email, passwordHash });

      return buildAuthPayload(user.id, user.role, 0, user);
    },

    login: async (_parent: unknown, args: { input: LoginInput }) => {
      const { email, password } = args.input;

      const user = await UserModel.findOne({ email }).select('+passwordHash');
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        throw new AuthenticationError('Invalid credentials');
      }

      return buildAuthPayload(user.id, user.role, user.refreshTokenVersion, user);
    },

    refreshToken: async (_parent: unknown, args: { refreshToken: string }) => {
      let payload;
      try {
        payload = verifyRefreshToken(args.refreshToken);
      } catch {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      const user = await UserModel.findById(payload.sub);
      if (!user || user.refreshTokenVersion !== payload.tokenVersion) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      return buildAuthPayload(user.id, user.role, user.refreshTokenVersion, user);
    },

    logout: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      const currentUser = requireAuth(ctx.currentUser);
      // Incremented on logout/rotation to invalidate old refresh tokens.
      await UserModel.findByIdAndUpdate(currentUser.id, { $inc: { refreshTokenVersion: 1 } });
      return true;
    },

    updateProfile: async (
      _parent: unknown,
      args: { input: UpdateProfileInput },
      ctx: GraphQLContext,
    ) => {
      const currentUser = requireAuth(ctx.currentUser);

      const update: Partial<UpdateProfileInput> = {};
      if (args.input.username !== undefined) update.username = args.input.username ?? undefined;
      if (args.input.avatarUrl !== undefined) update.avatarUrl = args.input.avatarUrl;
      if (args.input.bio !== undefined) update.bio = args.input.bio;

      const user = await UserModel.findByIdAndUpdate(currentUser.id, update, { new: true });
      if (!user) throw new NotFoundError('User', currentUser.id);
      return user;
    },

    setUserRole: async (
      _parent: unknown,
      args: { userId: string; role: UserRole },
      ctx: GraphQLContext,
    ) => {
      const currentUser = requireAuth(ctx.currentUser);
      if (currentUser.role !== 'ADMIN') {
        throw new ForbiddenError('Only an ADMIN can change roles');
      }

      const user = await UserModel.findByIdAndUpdate(
        args.userId,
        { role: args.role },
        { new: true },
      );
      if (!user) throw new NotFoundError('User', args.userId);
      return user;
    },
  },

  User: {
    // Before: one Reviews query per resolved User (N+1 when listing
    // `users { reviews }`). Now it's grouped into a single query via
    // the DataLoader -- see src/graphql/loaders/index.ts.
    reviews: async (
      parent: { id: string },
      args: { limit: number; offset: number },
      ctx: GraphQLContext,
    ) => {
      return ctx.loaders.reviewsByAuthor.load({ id: parent.id, limit: args.limit, offset: args.offset });
    },

    lists: async (parent: { id: string }, _args: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.listsByOwner.load(parent.id);
    },

    // `parent` already carries `favoriteMovies` as an array of ObjectId (not
    // excluded by any `.select()`), so there's no need to hit Mongo again
    // for the User -- just batch the lookup of each Movie.
    favoriteMovies: async (
      parent: { favoriteMovies: Array<{ toString(): string }> },
      _args: unknown,
      ctx: GraphQLContext,
    ) => {
      const movies = await Promise.all(
        parent.favoriteMovies.map((id) => ctx.loaders.movieById.load(id.toString())),
      );
      return movies.filter((movie): movie is NonNullable<typeof movie> => movie !== null);
    },
  },
};

async function buildAuthPayload(
  userId: string,
  role: UserRole,
  tokenVersion: number,
  user: unknown,
) {
  return {
    accessToken: signAccessToken({ sub: userId, role }),
    refreshToken: signRefreshToken({ sub: userId, tokenVersion }),
    user,
  };
}
