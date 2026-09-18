import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import { UserModel, MovieModel, ReviewModel, ListModel } from '../models/index.js';
import { ensureSeedData, SEED_ADMIN } from './seed.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const HTTP_URL = `http://localhost:${PORT}/graphql`;
const WS_URL = `ws://localhost:${PORT}/graphql`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movies';

// ────────────────────────────────────────────────────────────────────────
// End-to-end smoke test: exercises the real running server over HTTP and
// WebSocket, the same way a recruiter poking around in Apollo Sandbox
// would, rather than calling resolvers in-process like the Vitest suite
// does. Run this once before sending the repo/link to anyone, to catch
// anything that only breaks at the transport/config level (rate limits,
// CORS, the WS subscriptions handshake, etc).
//
// Prerequisite: MongoDB and the API must already be running
// (`npm run docker:up` + `npm run dev`, in another terminal).
// ────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(label: string): void {
  passed += 1;
  console.log(`  ✅ ${label}`);
}

function fail(label: string, detail?: unknown): void {
  failed += 1;
  console.error(`  ❌ ${label}`);
  if (detail !== undefined) console.error('     ', JSON.stringify(detail));
}

interface GraphQLResponse {
  data?: any;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

async function gql(query: string, variables?: Record<string, unknown>, token?: string): Promise<GraphQLResponse> {
  const res = await fetch(HTTP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<GraphQLResponse>;
}

async function main() {
  console.log(`\nRunning end-to-end smoke test against ${HTTP_URL}\n`);

  try {
    await fetch(HTTP_URL, { method: 'HEAD' });
  } catch {
    console.error(`Could not reach ${HTTP_URL}. Is the server running? (npm run dev)`);
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  console.log('0. Seed data');
  await ensureSeedData();
  ok('seed admin + sample movies present');

  const stamp = Date.now();
  const testUser = {
    username: `smoketest_${stamp}`,
    email: `smoketest_${stamp}@example.com`,
    password: 'SmokeTest123!',
  };

  console.log('\n1. Registration + login + auth');

  const registerRes = await gql(
    `mutation($input: RegisterInput!) { register(input: $input) { accessToken refreshToken user { id username role } } }`,
    { input: testUser },
  );
  if (registerRes.errors || !registerRes.data?.register?.accessToken) {
    fail('register returns tokens', registerRes.errors);
  } else {
    ok('register returns tokens');
  }
  const accessToken: string | undefined = registerRes.data?.register?.accessToken;
  const refreshToken: string | undefined = registerRes.data?.register?.refreshToken;
  const userId: string | undefined = registerRes.data?.register?.user?.id;

  const loginRes = await gql(
    `mutation($input: LoginInput!) { login(input: $input) { accessToken } }`,
    { input: { email: testUser.email, password: testUser.password } },
  );
  if (loginRes.errors || !loginRes.data?.login?.accessToken) fail('login returns tokens', loginRes.errors);
  else ok('login returns tokens');

  const meRes = await gql(`query { me { id email } }`, undefined, accessToken);
  if (meRes.data?.me?.email === testUser.email) ok('me returns the authenticated user');
  else fail('me returns the authenticated user', meRes.errors ?? meRes.data);

  const badEmailRes = await gql(
    `mutation($input: RegisterInput!) { register(input: $input) { accessToken } }`,
    { input: { username: `bad_${stamp}`, email: 'not-an-email', password: 'password123' } },
  );
  // Check the actual error, not just that the request failed -- an
  // unrelated server bug once made *every* variable-using request error
  // out, which made this check a false positive (it never actually
  // exercised the scalar's own validation).
  if (badEmailRes.errors?.some((e) => /EmailAddress/i.test(e.message))) {
    ok('EmailAddress scalar rejects a malformed email');
  } else {
    fail('expected EmailAddress scalar to reject a malformed email', badEmailRes);
  }

  console.log('\n2. Roles: catalog mutations are ADMIN/MODERATOR-only');

  const forbiddenRes = await gql(
    `mutation($input: CreateMovieInput!) { createMovie(input: $input) { id } }`,
    { input: { title: 'Should Fail', genres: ['DRAMA'] } },
    accessToken,
  );
  if (forbiddenRes.errors?.[0]?.extensions?.code === 'FORBIDDEN') ok('regular USER cannot createMovie (FORBIDDEN)');
  else fail('expected FORBIDDEN for non-admin createMovie', forbiddenRes);

  const adminLoginRes = await gql(
    `mutation($input: LoginInput!) { login(input: $input) { accessToken } }`,
    { input: { email: SEED_ADMIN.email, password: SEED_ADMIN.password } },
  );
  const adminToken: string | undefined = adminLoginRes.data?.login?.accessToken;
  if (adminToken) ok('seeded admin logs in');
  else fail('seeded admin failed to log in', adminLoginRes.errors);

  const createMovieRes = await gql(
    `mutation($input: CreateMovieInput!) { createMovie(input: $input) { id title } }`,
    { input: { title: `Smoke Test Movie ${stamp}`, genres: ['DRAMA'] } },
    adminToken,
  );
  const movieId: string | undefined = createMovieRes.data?.createMovie?.id;
  if (movieId) ok('admin creates a movie');
  else fail('admin createMovie failed', createMovieRes.errors);

  console.log('\n3. Reviews + real-time subscription');

  let subscriptionFired = false;
  if (movieId) {
    const wsClient = createClient({ url: WS_URL, webSocketImpl: WebSocket as any });
    const iterator = wsClient.iterate({
      query: `subscription($movieId: ID!) { reviewAdded(movieId: $movieId) { id rating } }`,
      variables: { movieId },
    });

    // Give the WS connection+subscribe a moment to land before publishing.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const createReviewRes = await gql(
      `mutation($input: CreateReviewInput!) { createReview(input: $input) { id rating movie { averageRating reviewCount } } }`,
      { input: { movieId, rating: 8, comment: 'Great!' } },
      accessToken,
    );
    const reviewId: string | undefined = createReviewRes.data?.createReview?.id;
    if (reviewId && createReviewRes.data?.createReview?.movie?.averageRating === 8) {
      ok('createReview succeeds and updates the movie\'s averageRating');
    } else {
      fail('createReview did not behave as expected', createReviewRes.errors ?? createReviewRes.data);
    }

    const waitForEvent = (async () => {
      for await (const event of iterator) {
        if ((event.data as any)?.reviewAdded?.id === reviewId) {
          subscriptionFired = true;
        }
        break;
      }
    })();
    await Promise.race([waitForEvent, new Promise((resolve) => setTimeout(resolve, 3000))]);
    if (subscriptionFired) ok('reviewAdded subscription fires in real time over graphql-ws');
    else fail('reviewAdded subscription did not fire within 3s');
    wsClient.dispose();

    const dupReviewRes = await gql(
      `mutation($input: CreateReviewInput!) { createReview(input: $input) { id } }`,
      { input: { movieId, rating: 5 } },
      accessToken,
    );
    if (dupReviewRes.errors?.[0]?.extensions?.code === 'BAD_USER_INPUT') ok('a second review by the same user is rejected');
    else fail('expected a duplicate review to be rejected', dupReviewRes);
  } else {
    fail('skipped reviews/subscription checks -- no movieId from previous step');
  }

  console.log('\n4. Lists');

  let listId: string | undefined;
  if (movieId) {
    const createListRes = await gql(
      `mutation($input: CreateListInput!) { createList(input: $input) { id } }`,
      { input: { name: `Smoke Test List ${stamp}` } },
      accessToken,
    );
    listId = createListRes.data?.createList?.id;
    if (listId) ok('createList');
    else fail('createList failed', createListRes.errors);

    const addMovieRes = await gql(
      `mutation($listId: ID!, $movieId: ID!) { addMovieToList(listId: $listId, movieId: $movieId) { movieCount } }`,
      { listId, movieId },
      accessToken,
    );
    if (addMovieRes.data?.addMovieToList?.movieCount === 1) ok('addMovieToList');
    else fail('addMovieToList did not return movieCount 1', addMovieRes.errors ?? addMovieRes.data);
  }

  console.log('\n5. Query depth limiting');

  const deepQuery = `query {
    movies(limit: 5) {
      items {
        reviews(limit: 5) {
          author {
            reviews(limit: 5) {
              author {
                reviews(limit: 5) {
                  author {
                    reviews(limit: 5) { author { id } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;
  const deepRes = await gql(deepQuery);
  if (deepRes.errors?.some((e) => /exceeds maximum operation depth/i.test(e.message))) {
    ok('overly deep query is rejected (graphql-depth-limit)');
  } else {
    fail('expected an overly deep query to be rejected', deepRes);
  }

  console.log('\n6. Refresh token rotation + logout');

  const refreshRes = await gql(
    `mutation($refreshToken: String!) { refreshToken(refreshToken: $refreshToken) { accessToken } }`,
    { refreshToken },
  );
  if (refreshRes.data?.refreshToken?.accessToken) ok('refreshToken issues a new access token');
  else fail('refreshToken failed', refreshRes.errors);

  const logoutRes = await gql(`mutation { logout }`, undefined, accessToken);
  if (logoutRes.data?.logout === true) ok('logout succeeds');
  else fail('logout failed', logoutRes.errors);

  const oldRefreshRes = await gql(
    `mutation($refreshToken: String!) { refreshToken(refreshToken: $refreshToken) { accessToken } }`,
    { refreshToken },
  );
  if (oldRefreshRes.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED') {
    ok('the pre-logout refresh token is invalidated');
  } else {
    fail('expected the pre-logout refresh token to be rejected', oldRefreshRes);
  }

  console.log('\n7. Cleanup (removing this run\'s test data, leaving seed data intact)');
  if (movieId) await ReviewModel.deleteMany({ movie: movieId });
  if (listId) await ListModel.deleteMany({ _id: listId });
  if (movieId) await MovieModel.deleteMany({ _id: movieId });
  if (userId) await UserModel.deleteMany({ _id: userId });
  ok('cleaned up smoke-test data');

  await mongoose.disconnect();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
