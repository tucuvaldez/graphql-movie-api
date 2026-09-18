# GraphQL Movie API

A GraphQL backend for a movie review platform, built as a portfolio project to demonstrate production-oriented backend patterns: JWT authentication with refresh-token rotation, request-scoped DataLoader batching to eliminate N+1 queries, GraphQL subscriptions over WebSockets, and defense-in-depth query limiting (depth + cost-based complexity) against abusive clients.

## Tech stack

- **Node.js 20** / **TypeScript 5.3**
- **Apollo Server 5** (`@apollo/server` + `@as-integrations/express4`) over Express 4
- **MongoDB 6** with **Mongoose 8**
- **graphql-ws** for subscriptions over WebSocket
- **DataLoader** for per-request batching/caching
- **JWT** (`jsonwebtoken`) for access/refresh authentication, **bcryptjs** for password hashing
- **helmet**, **cors**, **express-rate-limit** for HTTP-layer security
- **graphql-depth-limit** + **graphql-query-complexity** for GraphQL-layer abuse protection
- **Vitest** + **mongodb-memory-server** for the test suite
- **Docker** / **docker-compose** for local Mongo (and optionally the whole stack)

## Features

**Schema.** Four core types — `User`, `Movie`, `Review`, `List` — covering registration/auth, a movie catalog with genres/cast, per-movie reviews with a denormalized average rating, and user-curated watchlists (public or private).

**Authentication.** `register` / `login` return a short-lived access token and a longer-lived refresh token. `refreshToken` rotates the access token; `logout` invalidates every refresh token issued for that user by bumping a `refreshTokenVersion` counter checked on every refresh. Role-based access control (`USER` / `MODERATOR` / `ADMIN`) gates catalog mutations and moderation actions.

**N+1 elimination via DataLoader.** Nested fields that used to issue one query per resolved parent (`Movie.reviews`, `User.reviews`, `User.lists`, `List.movies`, `List.owner`, `Review.movie`, `Review.author`) are now batched: all the ids requested within the same event-loop tick are grouped into a single `$in` query. Loaders are created fresh per request (see `src/graphql/loaders/index.ts` and the `context()` functions in `src/index.ts`) so nothing is cached across different users.

**Subscriptions.** `reviewAdded` and `movieRatingUpdated` are published over `graphql-ws`, sharing the same schema and the same `/graphql` path as the HTTP transport. Authentication for subscriptions travels in `connectionParams` rather than an HTTP header.

**Query limiting.** Every request is validated against a configurable max depth (`graphql-depth-limit`) and a configurable max complexity (`graphql-query-complexity`), with a custom pagination-aware estimator so `limit` arguments are factored into the cost — a query nesting `movies(limit: 100) { reviews(limit: 100) }` gets rejected before it ever reaches MongoDB.

**HTTP-layer security.** `helmet` for standard OWASP headers, strict CORS via an allowlist, and two layers of rate limiting on `/graphql` — a general limit for all traffic and a much stricter one specifically for `login`/`register`, detected by inspecting the GraphQL operation in the request body.

**Tests.** 47 tests covering auth flows, catalog/review/list CRUD and permission checks, DataLoader batching behavior, and the depth/complexity validation rules, run against an in-memory MongoDB (`mongodb-memory-server`) so the suite has no external dependencies.

## Project structure

```
src/
  index.ts                 Express + Apollo Server + WebSocket bootstrap
  types/context.ts         Shared GraphQL context & Genre types
  graphql/
    schema.ts               Assembles typeDefs + resolvers into one schema
    pubsub.ts                In-memory PubSub for subscriptions
    typeDefs/                GraphQL SDL, one file per domain
    resolvers/               Resolvers, one file per domain
    loaders/                 Per-request DataLoader factories
  models/                   Mongoose schemas (User, Movie, Review, List)
  utils/                    Auth (JWT/bcrypt), pagination, error helpers
tests/
  *.test.ts                 Vitest suites (one per domain) + security tests
  helpers.ts                Test fixtures (users, movies, GraphQL execution)
  globalSetup.ts / setup.ts Shared in-memory MongoDB lifecycle
```

## Getting started

### Prerequisites

- Node.js ≥ 20
- Docker (for MongoDB), or a MongoDB instance you already have running

### Setup

```bash
npm install
cp .env.example .env   # adjust JWT secrets etc. for local use
```

### Run MongoDB

```bash
npm run docker:up   # starts MongoDB via docker-compose on localhost:27018
```

### Run the API

```bash
npm run dev          # tsx watch mode, http://localhost:4000/graphql
```

In development, Apollo Sandbox is available at that same URL for exploring the schema and running queries interactively. Subscriptions run over WebSocket on the same path (`ws://localhost:4000/graphql`).

### Build & run in production mode

```bash
npm run build
npm start
```

### Run everything in Docker

```bash
npm run docker:build
npm run docker:up
```

## Environment variables

See `.env.example` for the full list. The important ones:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets for access/refresh tokens (must be changed for any real deployment) |
| `RATE_LIMIT_WINDOW` / `RATE_LIMIT_MAX_REQUESTS` | General rate limit window (minutes) and request cap |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist |
| `GRAPHQL_MAX_DEPTH` / `GRAPHQL_MAX_COMPLEXITY` | Query depth and complexity limits |

## Testing

```bash
npm test          # runs the full suite once
npm run test:watch
```

Tests run against `mongodb-memory-server`, an in-memory MongoDB instance spun up once for the whole suite — no Docker or external database required.

## Known limitations / next steps

- `averageRating` sorting uses the denormalized `ratingSum` field as an approximation rather than a true computed average field indexed in MongoDB; revisiting this (along with full-text search ranking) is tracked as a possible Phase 2.1.
- The subscriptions PubSub is in-memory and single-process, which is fine for a single server instance; a multi-instance deployment behind a load balancer would need a distributed PubSub (e.g. `graphql-redis-subscriptions`) so events published on one instance reach clients connected to another.

## License

MIT
