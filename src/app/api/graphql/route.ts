import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs, resolvers } from '@/graphql/schema';

const { handleRequest } = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response }
});

export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS };
