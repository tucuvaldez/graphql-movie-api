import { gql } from 'graphql-tag';

export const listTypeDefs = gql`
  """
  List curated by a user (watchlist, favorites, etc).
  """
  type List implements Node & Timestamped {
    id: ID!
    name: String!
    description: String
    isPublic: Boolean!
    owner: User!
    movies(limit: Int = 20, offset: Int = 0): [Movie!]!
    movieCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ListPage {
    items: [List!]!
    pageInfo: PageInfo!
  }

  input CreateListInput {
    name: String!
    description: String
    isPublic: Boolean = false
  }

  input UpdateListInput {
    name: String
    description: String
    isPublic: Boolean
  }

  extend type Query {
    list(id: ID!): List

    """
    Lists belonging to the authenticated user (public and private).
    """
    myLists: [List!]!

    """
    Public lists belonging to any user.
    """
    publicLists(userId: ID, limit: Int = 20, offset: Int = 0): ListPage!
  }

  extend type Mutation {
    createList(input: CreateListInput!): List!
    updateList(id: ID!, input: UpdateListInput!): List!
    deleteList(id: ID!): DeletePayload!

    addMovieToList(listId: ID!, movieId: ID!): List!
    removeMovieFromList(listId: ID!, movieId: ID!): List!
  }
`;
