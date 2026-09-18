import { DateTimeScalar } from './scalars/dateTime.resolver.js';
import { EmailAddressScalar } from './scalars/email.resolver.js';
import { userResolvers } from './user.resolvers.js';
import { movieResolvers } from './movie.resolvers.js';
import { reviewResolvers } from './review.resolvers.js';
import { listResolvers } from './list.resolvers.js';

const resolvers: any = {
  DateTime: DateTimeScalar,
  EmailAddress: EmailAddressScalar,

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

  Subscription: {
    _ping: {
      // eslint-disable-next-line require-yield -- sanity-check placeholder, doesn't need multiple yields
      subscribe: async function* () {
        yield { _ping: true };
      },
    },
    ...movieResolvers.Subscription,
    ...reviewResolvers.Subscription,
  },

  User: userResolvers.User,
  Movie: movieResolvers.Movie,
  Review: reviewResolvers.Review,
  List: listResolvers.List,
};

export default resolvers;
