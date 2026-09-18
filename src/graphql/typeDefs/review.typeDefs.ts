import { gql } from 'graphql-tag';

export const reviewTypeDefs = gql`
  """
  Rating en escala 1-10.
  """
  type Review implements Node & Timestamped {
    id: ID!
    rating: Int!
    comment: String
    movie: Movie!
    author: User!
    likeCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ReviewPage {
    items: [Review!]!
    pageInfo: PageInfo!
  }

  input CreateReviewInput {
    movieId: ID!
    rating: Int!
    comment: String
  }

  input UpdateReviewInput {
    rating: Int
    comment: String
  }

  extend type Query {
    review(id: ID!): Review

    reviewsByMovie(movieId: ID!, limit: Int = 20, offset: Int = 0): ReviewPage!

    reviewsByUser(userId: ID!, limit: Int = 20, offset: Int = 0): ReviewPage!
  }

  extend type Mutation {
    """
    Requiere autenticación. Un usuario solo puede tener una review por película.
    """
    createReview(input: CreateReviewInput!): Review!
    updateReview(id: ID!, input: UpdateReviewInput!): Review!
    deleteReview(id: ID!): DeletePayload!

    likeReview(id: ID!): Review!
    unlikeReview(id: ID!): Review!
  }
`;
