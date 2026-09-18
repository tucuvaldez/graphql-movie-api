import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // graphql-js publishes both a CJS and an ESM build of the same package;
    // without this, Vitest can end up loading two different copies (one via
    // some CJS dependency's internal require(), the other via the tests'
    // ESM imports) and `instanceof GraphQLSchema` fails between them with
    // "Cannot use GraphQLSchema ... from another module or realm" -- the
    // classic "dual package hazard" documented by graphql-js. `dedupe`
    // forces Vite to always resolve the same physical copy.
    dedupe: ['graphql'],
  },
  test: {
    environment: 'node',
    globals: false,
    server: {
      deps: {
        // Vitest leaves node_modules packages "external" by default (they
        // don't go through Vite) -- that's why `resolve.dedupe` alone isn't
        // enough. graphql-tag and the @graphql-tools/* packages are CJS and
        // do their own require('graphql'); externalized, that require
        // resolves graphql's CJS build while the tests import the ESM
        // build -- two different GraphQLSchema classes for the same
        // package/version. Inlining them makes Vite process them through
        // its own module graph, where `dedupe` does apply.
        inline: [/graphql/, /@graphql-tools/],
      },
    },
    // Phase 2 is a small portfolio project: running test files sequentially
    // in a single worker is simpler and more deterministic than
    // coordinating multiple MongoMemoryServer/mongoose connections in
    // parallel.
    fileParallelism: false,
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.ts'],
  },
});
