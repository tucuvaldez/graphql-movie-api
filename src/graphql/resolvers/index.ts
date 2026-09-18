import { DateTimeScalar } from './scalars/dateTime.resolver';
import { userResolvers } from './user.resolvers';
import { movieResolvers } from './movie.resolvers';
import { reviewResolvers } from './review.resolvers';
import { listResolvers } from './list.resolvers';

const resolvers: any = {
  DateTime: DateTimeScalar,

  Query: {
    _health: () => 'ok',
    ...userResolvers.Query,
    ...movieResolvers.Query,
    ...reviewResolvers.Query,
    ...listResolvers.Query,
  },

  Mutation: {
    _noop: () => true,
    ...userResolvers.Mutation,
    ...movieResolvers.Mutation,
    ...reviewResolvers.Mutation,
    ...listResolvers.Mutation,
  },

  User: userResolvers.User,
  Movie: movieResolvers.Movie,
  Review: reviewResolvers.Review,
  List: listResolvers.List,
};

export default resolvers;