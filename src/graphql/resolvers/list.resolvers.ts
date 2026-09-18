import type { GraphQLContext } from '../../types/context.js';
import { ListModel, MovieModel, type IList } from '../../models/index.js';
import { ForbiddenError, NotFoundError, requireAuth } from '../../utils/errors.js';
import { buildPageInfo, clampPagination } from '../../utils/pagination.js';

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
    throw new ForbiddenError('Only the list owner can modify it');
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
          throw new ForbiddenError('This list is private');
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
    // Before: one findById(owner) per resolved List -- now all requested
    // owners are grouped into a single query in the same tick (see
    // src/graphql/loaders/index.ts). Shares a loader with Review.author.
    owner: async (parent: IList, _args: unknown, ctx: GraphQLContext) =>
      ctx.loaders.userById.load(parent.owner.toString()),

    // Before: a findById(list) + extra populate per resolved List, even
    // though `parent` already had the array of movie ids -- a completely
    // unnecessary extra query. Now the array is paginated in memory and
    // the Movie lookups are batched (shares a loader with Review.movie).
    movies: async (
      parent: IList,
      args: { limit: number; offset: number },
      ctx: GraphQLContext,
    ) => {
      const { limit, offset } = clampPagination(args.limit, args.offset);
      const pageIds = parent.movies.slice(offset, offset + limit);
      const movies = await Promise.all(pageIds.map((id) => ctx.loaders.movieById.load(id.toString())));
      return movies.filter((movie): movie is NonNullable<typeof movie> => movie !== null);
    },

    movieCount: (parent: IList) => parent.movies.length,
  },
};
