import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  enum UserRole {
    USER
    MODERATOR
    ADMIN
  }

  type User implements Node & Timestamped {
    id: ID!
    username: String!
    email: String!
    avatarUrl: String
    bio: String
    role: UserRole!
    reviews(limit: Int = 20, offset: Int = 0): [Review!]!
    lists: [List!]!
    favoriteMovies: [Movie!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UserPage {
    items: [User!]!
    pageInfo: PageInfo!
  }

  """
  Authentication payload returned by register / login / refreshToken.
  """
  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateProfileInput {
    username: String
    avatarUrl: String
    bio: String
  }

  extend type Query {
    """
    Authenticated user according to the JWT present on the request. null if there's no session.
    """
    me: User

    user(id: ID!): User

    users(limit: Int = 20, offset: Int = 0): UserPage!
  }

  extend type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!

    updateProfile(input: UpdateProfileInput!): User!

    """
    ADMIN only. Changes a user's role.
    """
    setUserRole(userId: ID!, role: UserRole!): User!
  }
`;
