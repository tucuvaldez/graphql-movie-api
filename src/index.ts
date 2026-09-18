import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import depthLimit from 'graphql-depth-limit';
import {
  getComplexity,
  simpleEstimator,
  fieldExtensionsEstimator,
  type ComplexityEstimator,
} from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';

import type { GraphQLContext, AuthUser } from './types/context.js';
import { verifyAccessToken } from './utils/auth.js';
import { createLoaders } from './graphql/loaders/index.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movies';

// ────────────────────────────────────────────────────────────────────────
// Base HTTP security (OWASP headers)
// ────────────────────────────────────────────────────────────────────────
app.use(
  helmet({
    // Apollo Sandbox loads assets from its own CDN; in dev we relax CSP
    // so it doesn't break. We don't serve Sandbox in production, so we
    // keep helmet's default CSP there.
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  }),
);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true,
    credentials: true,
  }),
);
app.use(express.json());

// ────────────────────────────────────────────────────────────────────────
// Rate limiting (OWASP API4:2023 — Unrestricted Resource Consumption)
// ────────────────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MINUTES = Number(process.env.RATE_LIMIT_WINDOW) || 15;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

// General limit for all of /graphql.
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { errors: [{ message: 'Too many requests. Please try again later.' }] },
});

// Login/register concentrate the risk of brute force and credential
// stuffing (OWASP API2:2023 — Broken Authentication), so on top of the
// general limit they get a much stricter one, detected by inspecting the
// GraphQL operation in the body (already parsed by express.json() above).
const AUTH_OPERATIONS = ['login', 'register'];

function isAuthOperation(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const { operationName, query } = body as { operationName?: string; query?: string };
  if (operationName && AUTH_OPERATIONS.includes(operationName)) return true;
  if (typeof query === 'string') {
    return AUTH_OPERATIONS.some((op) => new RegExp(`\\b${op}\\s*[({]`).test(query));
  }
  return false;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    errors: [{ message: 'Too many authentication attempts. Please try again later.' }],
  },
  skip: (req) => !isAuthOperation(req.body),
});

app.use('/graphql', authLimiter, generalLimiter);

// ────────────────────────────────────────────────────────────────────────
// JWT context — extracts and verifies the access token, both for HTTP
// requests (Authorization header) and for subscription WS connections
// (connectionParams, see below).
// ────────────────────────────────────────────────────────────────────────
function getCurrentUser(authHeader: string | undefined): AuthUser | null {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    return { id: payload.sub, role: payload.role };
  } catch {
    // Invalid/expired token: we don't authenticate, but we don't break
    // the request either — public queries (e.g. `movies`) keep working;
    // ones that require auth fail further down via requireAuth().
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────
// "Pagination-aware" complexity estimator: simpleEstimator() alone gives
// every field a cost of 1 regardless of how many items a list returns, so
// a query with `limit: 100` costs the same as one with `limit: 1`. This
// estimator multiplies the children's cost by the actual `limit` requested
// in the query (before the resolver clamps it), so nesting large lists
// (e.g. movies(limit:100){ reviews(limit:100) }) trips the complexity
// limit instead of ever reaching Mongo.
// ────────────────────────────────────────────────────────────────────────
function paginationAwareEstimator(): ComplexityEstimator {
  return ({ args, childComplexity }) => {
    const limitArg = args?.limit;
    if (typeof limitArg === 'number' && Number.isFinite(limitArg)) {
      return limitArg * Math.max(childComplexity, 1);
    }
    return undefined;
  };
}

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }

  // Dynamic import to avoid ES module issues. `schema` already comes
  // assembled (typeDefs + resolvers, including Subscription) from
  // graphql/schema.ts -- both Apollo Server (HTTP) and graphql-ws
  // (WebSocket) share it, a single schema for both transports.
  const { schema } = await import('./graphql/schema.js');

  // graphql-depth-limit and graphql-query-complexity: mitigate deeply
  // nested/expensive queries (OWASP GraphQL Cheat Sheet — limit query
  // depth and complexity).
  const MAX_QUERY_DEPTH = Number(process.env.GRAPHQL_MAX_DEPTH) || 8;
  const MAX_QUERY_COMPLEXITY = Number(process.env.GRAPHQL_MAX_COMPLEXITY) || 1000;

  // graphql-depth-limit is a plain validation rule -- it only looks at the
  // query's AST shape, so it works fine here. graphql-query-complexity is
  // different: createComplexityRule() builds a rule that re-implements its
  // own variable coercion internally, and Apollo Server builds
  // `validationRules` once at startup, before any request (and its
  // variables) exists. A complexity rule built that way always validates
  // against empty variables, so it rejected every operation that declares
  // required variables (`$input`, `$refreshToken`, ...) with a spurious
  // "Variable ... was not provided" error -- caught by the e2e smoke test,
  // which hits the real server the way an actual client does instead of
  // calling resolvers in-process. The fix: keep depth limiting as a
  // validation rule, but run the complexity check from a plugin hook
  // (below) that receives the actual per-request variables.
  const validationRules = [depthLimit(MAX_QUERY_DEPTH)];

  const complexityEstimators = [
    fieldExtensionsEstimator(),
    paginationAwareEstimator(),
    simpleEstimator({ defaultComplexity: 1 }),
  ];

  // Explicit HTTP server (instead of app.listen directly) so we can
  // attach the subscriptions WebSocketServer to the same port.
  const httpServer = createServer(app);

  // ── WebSocket subscriptions (graphql-ws) on the same /graphql path ──
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

  const serverCleanup = useServer(
    {
      schema,
      // graphql-ws doesn't have normal per-connection HTTP headers (the
      // handshake is an upgrade); the token travels in `connectionParams`,
      // sent by the client in the ConnectionInit message. We accept
      // `Authorization`/`authorization: "Bearer <token>"`, same format as
      // the HTTP header.
      context: async (ctx): Promise<GraphQLContext> => {
        const params = ctx.connectionParams as Record<string, unknown> | undefined;
        const authHeader = (params?.authorization ?? params?.Authorization) as string | undefined;
        return {
          currentUser: getCurrentUser(authHeader),
          loaders: createLoaders(),
        };
      },
    },
    wsServer,
  );

  const server = new ApolloServer<GraphQLContext>({
    schema,
    introspection: NODE_ENV !== 'production',
    validationRules,
    plugins: [
      // Cleanly closes the HTTP server when server.stop() is called.
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Also closes subscription WS connections on the same shutdown --
      // without this they'd be left hanging.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
      // Query cost limiting (see the `complexityEstimators` comment above
      // for why this lives here instead of in `validationRules`).
      // didResolveOperation runs once per request, after parsing/validation,
      // with the real `request.variables` -- exactly what
      // graphql-query-complexity's variable coercion needs.
      {
        async requestDidStart() {
          return {
            async didResolveOperation(requestContext) {
              const complexity = getComplexity({
                schema: requestContext.schema,
                query: requestContext.document,
                operationName: requestContext.operationName ?? undefined,
                variables: requestContext.request.variables,
                estimators: complexityEstimators,
              });
              if (complexity > MAX_QUERY_COMPLEXITY) {
                throw new GraphQLError(
                  `Query is too complex: ${complexity}. Maximum allowed complexity: ${MAX_QUERY_COMPLEXITY}`,
                  { extensions: { code: 'QUERY_TOO_COMPLEX' } },
                );
              }
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => ({
        currentUser: getCurrentUser(req.headers.authorization),
        // Fresh on every request -- see src/graphql/loaders/index.ts.
        loaders: createLoaders(),
      }),
    }),
  );

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
    console.log(`🔌 Subscriptions (WebSocket) at ws://localhost:${PORT}/graphql`);
  });
}

startServer();
