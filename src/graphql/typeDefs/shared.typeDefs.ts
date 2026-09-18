import { gql } from 'graphql-tag';

/**
 * Types, scalars and enums shared across all schema modules.
 * This is merged first so the rest of the typeDefs can reference it.
 */
export const sharedTypeDefs = gql`
  scalar DateTime

  """
  Standard cursor-style pagination info (Relay-like, simplified).
  """
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    totalCount: Int!
  }

  enum SortOrder {
    ASC
    DESC
  }

  interface Node {
    id: ID!
  }

  interface Timestamped {
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  Generic response for delete mutations.
  """
  type DeletePayload {
    success: Boolean!
    id: ID!
  }

  type Query {
    _health: String!
  }

  type Mutation {
    _noop: Boolean!
  }

  """
  Sanity-check for the subscriptions transport (WebSocket via graphql-ws).
  Emits "true" as soon as it connects -- useful for testing the WS without
  depending on a real review/movie being involved.
  """
  type Subscription {
    _ping: Boolean!
  }
`;
