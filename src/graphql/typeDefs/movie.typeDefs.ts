import { gql } from 'graphql-tag';

export const movieTypeDefs = gql`
  enum Genre {
    ACTION
    ADVENTURE
    ANIMATION
    COMEDY
    CRIME
    DOCUMENTARY
    DRAMA
    FANTASY
    HORROR
    MYSTERY
    ROMANCE
    SCI_FI
    THRILLER
    WAR
    WESTERN
  }

  type CastMember {
    name: String!
    character: String!
    order: Int
  }

  input CastMemberInput {
    name: String!
    character: String!
    order: Int
  }

  type Movie implements Node & Timestamped {
    id: ID!
    title: String!
    originalTitle: String
    overview: String
    releaseDate: DateTime
    runtimeMinutes: Int
    genres: [Genre!]!
    director: String
    cast: [CastMember!]!
    posterUrl: String
    backdropUrl: String

    averageRating: Float!
    reviewCount: Int!
    reviews(limit: Int = 20, offset: Int = 0): [Review!]!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MoviePage {
    items: [Movie!]!
    pageInfo: PageInfo!
  }

  input MovieFilterInput {
    genre: Genre
    search: String
    releaseYear: Int
    minRating: Float
  }

  enum MovieSortField {
    TITLE
    RELEASE_DATE
    AVERAGE_RATING
    CREATED_AT
  }

  input MovieSortInput {
    field: MovieSortField! = RELEASE_DATE
    order: SortOrder! = DESC
  }

  input CreateMovieInput {
    title: String!
    originalTitle: String
    overview: String
    releaseDate: DateTime
    runtimeMinutes: Int
    genres: [Genre!]!
    director: String
    cast: [CastMemberInput!]
    posterUrl: String
    backdropUrl: String
  }

  input UpdateMovieInput {
    title: String
    originalTitle: String
    overview: String
    releaseDate: DateTime
    runtimeMinutes: Int
    genres: [Genre!]
    director: String
    cast: [CastMemberInput!]
    posterUrl: String
    backdropUrl: String
  }

  extend type Query {
    movie(id: ID!): Movie

    movies(
      filter: MovieFilterInput
      sort: MovieSortInput
      limit: Int = 20
      offset: Int = 0
    ): MoviePage!
  }

  extend type Mutation {
    """
    Solo ADMIN / MODERATOR.
    """
    createMovie(input: CreateMovieInput!): Movie!
    updateMovie(id: ID!, input: UpdateMovieInput!): Movie!
    deleteMovie(id: ID!): DeletePayload!
  }
`;
