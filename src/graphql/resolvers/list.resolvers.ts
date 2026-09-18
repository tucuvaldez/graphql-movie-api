import type { GraphQLContext } from '../../types/context';
import { ListModel, MovieModel, UserModel, type IList } from '../../models';
import { ForbiddenError, NotFoundError, requireAuth } from '../../utils/errors';
import { buildPageInfo, clampPagination } from '../../utils/pagination';

interface CreateListInput {
  name: string;
  description?: string | null;
  isPublic?: boolean | null;
}

interface UpdateListInput {
  name?: string | null;
  description?: string | null;
  isPublic?: boolean | null;
}

function assertOwner(list: IList, ctx: GraphQLContext) {
  const currentUser = requireAuth(ctx.currentUser);
  if (list.owner.toString() !== currentUser.id) {
    throw new ForbiddenError('Solo el dueño de la lista puede modificarla');
  }
  return currentUser;
}

export const listResolvers = {
  Query: {
    list: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const list = await ListModel.findById(args.id);
      if (!list) return null;
      if (!list.isPublic) {
        const currentUser = requireAuth(ctx.currentUser);
        if (list.owner.toString() !== currentUser.id) {
          throw new ForbiddenError('Esta lista es privada');
        }
      }
      return list;
    },

    myLists: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      const currentUser = requireAuth(ctx.currentUser);
      return ListModel.find({ owner: currentUser.id }).sort({ createdAt: -1 });
    },

    publicLists: async (
      _parent: unknown,
      args: { userId?: string | null; limit: number; offset: number },
    ) => {
      const { limit, offset } = clampPagination(args.limit, args.offset);
      const filter: Record<string, unknown> = { isPublic: true };
      if (args.userId) filter.owner = args.userId;

      const [items, totalCount] = await Promise.all([
        ListModel.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
        ListModel.countDocuments(filter),
      ]);
      return { items, pageInfo: buildPageInfo(limit, offset, totalCount) };
    },
  },

  Mutation: {
    createList: async (
      _parent: unknown,
      args: { input: CreateListInput },
      ctx: GraphQLContext,
    ) => {
      const currentUser = requireAuth(ctx.currentUser);
      return ListModel.create({
        name: args.input.name,
        description: args.input.description ?? null,
        isPublic: args.input.isPublic ?? false,
        owner: currentUser.id,
        movies: [],
      });
    },

    updateList: async (
      _parent: unknown,
      args: { id: string; input: UpdateListInput },
      ctx: GraphQLContext,
    ) => {
      const list = await ListModel.findById(args.id);
      if (!list) throw new NotFoundError('List', args.id);
      assertOwner(list, ctx);

      if (args.input.name !== undefined && args.input.name !== null) list.name = args.input.name;
      if (args.input.description !== undefined) list.description = args.input.description;
      if (args.input.isPublic !== undefined && args.input.isPublic !== null) {
        list.isPublic = args.input.isPublic;
      }
      await list.save();
      return list;
    },

    deleteList: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const list = await ListModel.findById(args.id);
      if (!list) throw new NotFoundError('List', args.id);
      assertOwner(list, ctx);

      await ListModel.findByIdAndDelete(args.id);
      return { success: true, id: args.id };
    },

    addMovieToList: async (
      _parent: unknown,
      args: { listId: string; movieId: string },
      ctx: GraphQLContext,
    ) => {
      const list = await ListModel.findById(args.listId);
      if (!list) throw new NotFoundError('List', args.listId);
      assertOwner(list, ctx);

      const movie = await MovieModel.findById(args.movieId);
      if (!movie) throw new NotFoundError('Movie', args.movieId);

      const updated = await ListModel.findByIdAndUpdate(
        args.listId,
        { $addToSet: { movies: args.movieId } },
        { new: true },
      );
      return updated;
    },

    removeMovieFromList: async (
      _parent: unknown,
      args: { listId: string; movieId: string },
      ctx: GraphQLContext,
    ) => {
      const list = await ListModel.findById(args.listId);
      if (!list) throw new NotFoundError('List', args.listId);
      assertOwner(list, ctx);

      const updated = await ListModel.findByIdAndUpdate(
        args.listId,
        { $pull: { movies: args.movieId } },
        { new: true },
      );
      return updated;
    },
  },

  List: {
    owner: async (parent: IList) => UserModel.findById(parent.owner),

    movies: async (parent: { id: string }, args: { limit: number; offset: number }) => {
      const { limit, offset } = clampPagination(args.limit, args.offset);
      const list = await ListModel.findById(parent.id)
        .populate({ path: 'movies', options: { skip: offset, limit } });
      return list?.movies ?? [];
    },

    movieCount: (parent: IList) => parent.movies.length,
  },
};
