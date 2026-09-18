import type { GraphQLContext } from '../../types/context';
import { UserModel, ListModel, ReviewModel, type UserRole } from '../../models';
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/auth';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  requireAuth,
} from '../../utils/errors';
import { buildPageInfo, clampPagination } from '../../utils/pagination';

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
        throw new ValidationError('La contraseña debe tener al menos 8 caracteres');
      }

      const existing = await UserModel.findOne({ $or: [{ email }, { username }] });
      if (existing) {
        throw new ValidationError('Email o username ya en uso');
      }

      const passwordHash = await hashPassword(password);
      const user = await UserModel.create({ username, email, passwordHash });

      return buildAuthPayload(user.id, user.role, 0, user);
    },

    login: async (_parent: unknown, args: { input: LoginInput }) => {
      const { email, password } = args.input;

      const user = await UserModel.findOne({ email }).select('+passwordHash');
      if (!user) {
        throw new AuthenticationError('Credenciales inválidas');
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        throw new AuthenticationError('Credenciales inválidas');
      }

      return buildAuthPayload(user.id, user.role, user.refreshTokenVersion, user);
    },

    refreshToken: async (_parent: unknown, args: { refreshToken: string }) => {
      let payload;
      try {
        payload = verifyRefreshToken(args.refreshToken);
      } catch {
        throw new AuthenticationError('Refresh token inválido o expirado');
      }

      const user = await UserModel.findById(payload.sub);
      if (!user || user.refreshTokenVersion !== payload.tokenVersion) {
        throw new AuthenticationError('Refresh token inválido o expirado');
      }

      return buildAuthPayload(user.id, user.role, user.refreshTokenVersion, user);
    },

    logout: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      const currentUser = requireAuth(ctx.currentUser);
      // Invalida todos los refresh tokens emitidos previamente.
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
        throw new ForbiddenError('Solo un ADMIN puede cambiar roles');
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
    reviews: async (parent: { id: string }, args: { limit: number; offset: number }) => {
      const { limit, offset } = clampPagination(args.limit, args.offset);
      return ReviewModel.find({ author: parent.id })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
    },

    lists: async (parent: { id: string }) => {
      return ListModel.find({ owner: parent.id }).sort({ createdAt: -1 });
    },

    favoriteMovies: async (parent: { id: string }) => {
      const user = await UserModel.findById(parent.id).populate('favoriteMovies');
      return user?.favoriteMovies ?? [];
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
