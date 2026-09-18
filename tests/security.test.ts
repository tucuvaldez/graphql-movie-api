import { describe, it, expect } from 'vitest';
import { parse, validate } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import {
  getComplexity,
  simpleEstimator,
  fieldExtensionsEstimator,
  type ComplexityEstimator,
} from 'graphql-query-complexity';
import { schema } from '../src/graphql/schema.js';

// Mirrors src/index.ts's startServer(): depthLimit stays a validation rule
// (it only looks at the query's AST shape), while complexity is checked
// with getComplexity() directly, the same way the didResolveOperation
// plugin hook in src/index.ts calls it -- with real `variables`, not the
// empty object createComplexityRule()'s internal coercion falls back to
// when it's wired into `validationRules` (which is what src/index.ts used
// to do, and why every operation using GraphQL variables failed with a
// spurious "Variable ... was not provided" error until the e2e smoke test
// caught it). They can't be imported directly because index.ts has
// module-level side effects (it connects to Mongo and starts the server on
// import), so this is intentionally a mirror -- if the rule setup in
// src/index.ts changes, update it here too.
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

const complexityEstimators = [fieldExtensionsEstimator(), paginationAwareEstimator(), simpleEstimator({ defaultComplexity: 1 })];

const validationRules = [depthLimit(MAX_QUERY_DEPTH)];

function errorsFor(query: string) {
  return validate(schema, parse(query), validationRules);
}

function complexityOf(query: string, variables?: Record<string, unknown>, operationName?: string) {
  return getComplexity({
    schema,
    query: parse(query),
    variables,
    operationName,
    estimators: complexityEstimators,
  });
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
    const complexity = complexityOf(`
      query {
        movies(limit: 50) {
          items {
            reviews(limit: 50) { id comment rating author { id username } }
          }
        }
      }
    `);
    expect(complexity).toBeGreaterThan(MAX_QUERY_COMPLEXITY);
  });

  it('allows a query with a small limit', () => {
    const complexity = complexityOf(`
      query {
        movies(limit: 5) {
          items { id title reviews(limit: 5) { id rating } }
        }
      }
    `);
    expect(complexity).toBeLessThanOrEqual(MAX_QUERY_COMPLEXITY);
  });

  // Regression test for a real bug: createComplexityRule() re-implements
  // its own variable coercion, and when it's wired into Apollo Server's
  // static `validationRules` (built once at startup, before any request
  // exists) that coercion always runs against empty variables -- so any
  // operation declaring a required variable failed validation with
  // "Variable ... was not provided", regardless of what was actually sent.
  // Every test above uses only literal/inline arguments, so none of them
  // would have caught that. This one exercises the same `$limit`-driven
  // cost via a variable, with the variable's value actually supplied, the
  // way a real client request looks.
  it('accounts for the actual value of a limit passed as a GraphQL variable', () => {
    const query = `
      query($limit: Int!) {
        movies(limit: $limit) {
          items {
            reviews(limit: 50) { id comment rating author { id username } }
          }
        }
      }
    `;
    const cheap = complexityOf(query, { limit: 1 });
    const expensive = complexityOf(query, { limit: 50 });
    expect(cheap).toBeLessThanOrEqual(MAX_QUERY_COMPLEXITY);
    expect(expensive).toBeGreaterThan(MAX_QUERY_COMPLEXITY);
  });
});
