import { gql } from 'graphql-tag';

/**
 * Tipos, scalars y enums compartidos entre todos los módulos del schema.
 * Se mergea primero para que el resto de los typeDefs puedan referenciarlo.
 */
export const sharedTypeDefs = gql`
  scalar DateTime

  """
  Info estándar de paginación estilo cursor (Relay-like, simplificada).
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
  Respuesta genérica para mutations de borrado.
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
`;
