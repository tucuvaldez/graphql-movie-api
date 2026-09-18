import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './typeDefs/index.js';
import  resolvers  from './resolvers/index.js';

export const schema = makeExecutableSchema({ typeDefs, resolvers });
export { typeDefs };
export default resolvers;