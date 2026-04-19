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

export async function GET(request: Request, context: any) {
  return handleRequest(request, context);
}

export async function POST(request: Request, context: any) {
  return handleRequest(request, context);
}

export async function OPTIONS(request: Request, context: any) {
  return handleRequest(request, context);
}
