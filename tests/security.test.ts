import { describe, it, expect } from 'vitest';
import { parse, validate } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import {
  createComplexityRule,
  simpleEstimator,
  fieldExtensionsEstimator,
  type ComplexityEstimator,
} from 'graphql-query-complexity';
import { schema } from '../src/graphql/schema.js';

// Rebuilds the same validationRules that src/index.ts assembles in
// startServer() (depthLimit + complexity with the pagination-aware
// estimator). They can't be imported directly because index.ts has
// module-level side effects (it connects to Mongo and starts the server on
// import), so this is intentionally a mirror -- if the rule setup in
// src/index.ts changes, update it here too. Same approach as
// verify-limits.mjs (which ran this manually against dist/).
function paginationAwareEstimator(): ComplexityEstimator {
  return ({ args, childComplexity }) => {
    const limitArg = (args as Record<string, unknown> | undefined)?.limit;
    if (typeof limitArg === 'number' && Number.isFinite(limitArg)) {
      return limitArg * Math.max(childComplexity, 1);
    }
    return undefined;
  };
}

const MAX_QUERY_DEPTH = 8;
const MAX_QUERY_COMPLEXITY = 1000;

const validationRules = [
  depthLimit(MAX_QUERY_DEPTH),
  createComplexityRule({
    maximumComplexity: MAX_QUERY_COMPLEXITY,
    estimators: [fieldExtensionsEstimator(), paginationAwareEstimator(), simpleEstimator({ defaultComplexity: 1 })],
  }),
];

function errorsFor(query: string) {
  return validate(schema, parse(query), validationRules);
}

describe('graphql-depth-limit', () => {
  it('allows a normal query (shallow depth)', () => {
    const errors = errorsFor(`
      query { movies(limit: 5) { items { id title averageRating } pageInfo { totalCount } } }
    `);
    expect(errors).toHaveLength(0);
  });

  it('rejects a query nested beyond the depth limit (8)', () => {
    const errors = errorsFor(`
      query {
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
      }
    `);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/exceeds maximum operation depth/i);
  });
});

describe('graphql-query-complexity (pagination-aware)', () => {
  it('rejects a query that multiplies cost by nested limits', () => {
    // movies(limit: 50) { reviews(limit: 50) { ... } } -> ~2500+ cost,
    // well above maximumComplexity=1000.
    const errors = errorsFor(`
      query {
        movies(limit: 50) {
          items {
            reviews(limit: 50) { id comment rating author { id username } }
          }
        }
      }
    `);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/complexity/i);
  });

  it('allows a query with a small limit', () => {
    const errors = errorsFor(`
      query {
        movies(limit: 5) {
          items { id title reviews(limit: 5) { id rating } }
        }
      }
    `);
    expect(errors).toHaveLength(0);
  });
});
