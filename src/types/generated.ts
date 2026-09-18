import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { IUser, IMovie, IReview, IList } from '../models/index.js';
import { GraphQLContext } from '../types/context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
};

/** Authentication payload returned by register / login / refreshToken. */
export type AuthPayload = {
  __typename?: 'AuthPayload';
  accessToken: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
  user: User;
};

export type CastMember = {
  __typename?: 'CastMember';
  character: Scalars['String']['output'];
  name: Scalars['String']['output'];
  order?: Maybe<Scalars['Int']['output']>;
};

export type CastMemberInput = {
  character: Scalars['String']['input'];
  name: Scalars['String']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateListInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type CreateMovieInput = {
  backdropUrl?: InputMaybe<Scalars['String']['input']>;
  cast?: InputMaybe<Array<CastMemberInput>>;
  director?: InputMaybe<Scalars['String']['input']>;
  genres: Array<Genre>;
  originalTitle?: InputMaybe<Scalars['String']['input']>;
  overview?: InputMaybe<Scalars['String']['input']>;
  posterUrl?: InputMaybe<Scalars['String']['input']>;
  releaseDate?: InputMaybe<Scalars['DateTime']['input']>;
  runtimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreateReviewInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  movieId: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
};

/** Generic response for delete mutations. */
export type DeletePayload = {
  __typename?: 'DeletePayload';
  id: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export enum Genre {
  Action = 'ACTION',
  Adventure = 'ADVENTURE',
  Animation = 'ANIMATION',
  Comedy = 'COMEDY',
  Crime = 'CRIME',
  Documentary = 'DOCUMENTARY',
  Drama = 'DRAMA',
  Fantasy = 'FANTASY',
  Horror = 'HORROR',
  Mystery = 'MYSTERY',
  Romance = 'ROMANCE',
  SciFi = 'SCI_FI',
  Thriller = 'THRILLER',
  War = 'WAR',
  Western = 'WESTERN'
}

/** Lista curada por un usuario (watchlist, favoritos, etc). */
export type List = Node & Timestamped & {
  __typename?: 'List';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  movieCount: Scalars['Int']['output'];
  movies: Array<Movie>;
  name: Scalars['String']['output'];
  owner: User;
  updatedAt: Scalars['DateTime']['output'];
};


/** Lista curada por un usuario (watchlist, favoritos, etc). */
export type ListMoviesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type ListPage = {
  __typename?: 'ListPage';
  items: Array<List>;
  pageInfo: PageInfo;
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Movie = Node & Timestamped & {
  __typename?: 'Movie';
  averageRating: Scalars['Float']['output'];
  backdropUrl?: Maybe<Scalars['String']['output']>;
  cast: Array<CastMember>;
  createdAt: Scalars['DateTime']['output'];
  director?: Maybe<Scalars['String']['output']>;
  genres: Array<Genre>;
  id: Scalars['ID']['output'];
  originalTitle?: Maybe<Scalars['String']['output']>;
  overview?: Maybe<Scalars['String']['output']>;
  posterUrl?: Maybe<Scalars['String']['output']>;
  releaseDate?: Maybe<Scalars['DateTime']['output']>;
  reviewCount: Scalars['Int']['output'];
  reviews: Array<Review>;
  runtimeMinutes?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type MovieReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type MovieFilterInput = {
  genre?: InputMaybe<Genre>;
  minRating?: InputMaybe<Scalars['Float']['input']>;
  releaseYear?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type MoviePage = {
  __typename?: 'MoviePage';
  items: Array<Movie>;
  pageInfo: PageInfo;
};

export enum MovieSortField {
  AverageRating = 'AVERAGE_RATING',
  CreatedAt = 'CREATED_AT',
  ReleaseDate = 'RELEASE_DATE',
  Title = 'TITLE'
}

export type MovieSortInput = {
  field?: MovieSortField;
  order?: SortOrder;
};

export type Mutation = {
  __typename?: 'Mutation';
  _noop: Scalars['Boolean']['output'];
  addMovieToList: List;
  createList: List;
  /** Solo ADMIN / MODERATOR. */
  createMovie: Movie;
  /** Requires authentication. A user can only have one review per movie. */
  createReview: Review;
  deleteList: DeletePayload;
  deleteMovie: DeletePayload;
  deleteReview: DeletePayload;
  likeReview: Review;
  login: AuthPayload;
  logout: Scalars['Boolean']['output'];
  refreshToken: AuthPayload;
  register: AuthPayload;
  removeMovieFromList: List;
  /** Solo ADMIN. Cambia el rol de un usuario. */
  setUserRole: User;
  unlikeReview: Review;
  updateList: List;
  updateMovie: Movie;
  updateProfile: User;
  updateReview: Review;
};


export type MutationAddMovieToListArgs = {
  listId: Scalars['ID']['input'];
  movieId: Scalars['ID']['input'];
};


export type MutationCreateListArgs = {
  input: CreateListInput;
};


export type MutationCreateMovieArgs = {
  input: CreateMovieInput;
};


export type MutationCreateReviewArgs = {
  input: CreateReviewInput;
};


export type MutationDeleteListArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMovieArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteReviewArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLikeReviewArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationRemoveMovieFromListArgs = {
  listId: Scalars['ID']['input'];
  movieId: Scalars['ID']['input'];
};


export type MutationSetUserRoleArgs = {
  role: UserRole;
  userId: Scalars['ID']['input'];
};


export type MutationUnlikeReviewArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateListArgs = {
  id: Scalars['ID']['input'];
  input: UpdateListInput;
};


export type MutationUpdateMovieArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMovieInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateReviewArgs = {
  id: Scalars['ID']['input'];
  input: UpdateReviewInput;
};

export type Node = {
  id: Scalars['ID']['output'];
};

/** Standard cursor-style pagination info (Relay-like, simplified). */
export type PageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  _health: Scalars['String']['output'];
  list?: Maybe<List>;
  /** Authenticated user according to the JWT present on the request. null if there's no session. */
  me?: Maybe<User>;
  movie?: Maybe<Movie>;
  movies: MoviePage;
  /** Lists belonging to the authenticated user (public and private). */
  myLists: Array<List>;
  /** Public lists belonging to any user. */
  publicLists: ListPage;
  review?: Maybe<Review>;
  reviewsByMovie: ReviewPage;
  reviewsByUser: ReviewPage;
  user?: Maybe<User>;
  users: UserPage;
};


export type QueryListArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMovieArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMoviesArgs = {
  filter?: InputMaybe<MovieFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<MovieSortInput>;
};


export type QueryPublicListsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryReviewArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReviewsByMovieArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  movieId: Scalars['ID']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryReviewsByUserArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type RegisterInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

/** Rating en escala 1-10. */
export type Review = Node & Timestamped & {
  __typename?: 'Review';
  author: User;
  comment?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  likeCount: Scalars['Int']['output'];
  movie: Movie;
  rating: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewPage = {
  __typename?: 'ReviewPage';
  items: Array<Review>;
  pageInfo: PageInfo;
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type Timestamped = {
  createdAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type UpdateListInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMovieInput = {
  backdropUrl?: InputMaybe<Scalars['String']['input']>;
  cast?: InputMaybe<Array<CastMemberInput>>;
  director?: InputMaybe<Scalars['String']['input']>;
  genres?: InputMaybe<Array<Genre>>;
  originalTitle?: InputMaybe<Scalars['String']['input']>;
  overview?: InputMaybe<Scalars['String']['input']>;
  posterUrl?: InputMaybe<Scalars['String']['input']>;
  releaseDate?: InputMaybe<Scalars['DateTime']['input']>;
  runtimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProfileInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateReviewInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Int']['input']>;
};

export type User = Node & Timestamped & {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  favoriteMovies: Array<Movie>;
  id: Scalars['ID']['output'];
  lists: Array<List>;
  reviews: Array<Review>;
  role: UserRole;
  updatedAt: Scalars['DateTime']['output'];
  username: Scalars['String']['output'];
};


export type UserReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type UserPage = {
  __typename?: 'UserPage';
  items: Array<User>;
  pageInfo: PageInfo;
};

export enum UserRole {
  Admin = 'ADMIN',
  Moderator = 'MODERATOR',
  User = 'USER'
}

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Node: ( IList ) | ( IMovie ) | ( IReview ) | ( IUser );
  Timestamped: ( IList ) | ( IMovie ) | ( IReview ) | ( IUser );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AuthPayload: ResolverTypeWrapper<Omit<AuthPayload, 'user'> & { user: ResolversTypes['User'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CastMember: ResolverTypeWrapper<CastMember>;
  CastMemberInput: CastMemberInput;
  CreateListInput: CreateListInput;
  CreateMovieInput: CreateMovieInput;
  CreateReviewInput: CreateReviewInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeletePayload: ResolverTypeWrapper<DeletePayload>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Genre: Genre;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  List: ResolverTypeWrapper<IList>;
  ListPage: ResolverTypeWrapper<Omit<ListPage, 'items'> & { items: Array<ResolversTypes['List']> }>;
  LoginInput: LoginInput;
  Movie: ResolverTypeWrapper<IMovie>;
  MovieFilterInput: MovieFilterInput;
  MoviePage: ResolverTypeWrapper<Omit<MoviePage, 'items'> & { items: Array<ResolversTypes['Movie']> }>;
  MovieSortField: MovieSortField;
  MovieSortInput: MovieSortInput;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Query: ResolverTypeWrapper<{}>;
  RegisterInput: RegisterInput;
  Review: ResolverTypeWrapper<IReview>;
  ReviewPage: ResolverTypeWrapper<Omit<ReviewPage, 'items'> & { items: Array<ResolversTypes['Review']> }>;
  SortOrder: SortOrder;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Timestamped: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Timestamped']>;
  UpdateListInput: UpdateListInput;
  UpdateMovieInput: UpdateMovieInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateReviewInput: UpdateReviewInput;
  User: ResolverTypeWrapper<IUser>;
  UserPage: ResolverTypeWrapper<Omit<UserPage, 'items'> & { items: Array<ResolversTypes['User']> }>;
  UserRole: UserRole;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AuthPayload: Omit<AuthPayload, 'user'> & { user: ResolversParentTypes['User'] };
  Boolean: Scalars['Boolean']['output'];
  CastMember: CastMember;
  CastMemberInput: CastMemberInput;
  CreateListInput: CreateListInput;
  CreateMovieInput: CreateMovieInput;
  CreateReviewInput: CreateReviewInput;
  DateTime: Scalars['DateTime']['output'];
  DeletePayload: DeletePayload;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  List: IList;
  ListPage: Omit<ListPage, 'items'> & { items: Array<ResolversParentTypes['List']> };
  LoginInput: LoginInput;
  Movie: IMovie;
  MovieFilterInput: MovieFilterInput;
  MoviePage: Omit<MoviePage, 'items'> & { items: Array<ResolversParentTypes['Movie']> };
  MovieSortInput: MovieSortInput;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Query: {};
  RegisterInput: RegisterInput;
  Review: IReview;
  ReviewPage: Omit<ReviewPage, 'items'> & { items: Array<ResolversParentTypes['Review']> };
  String: Scalars['String']['output'];
  Timestamped: ResolversInterfaceTypes<ResolversParentTypes>['Timestamped'];
  UpdateListInput: UpdateListInput;
  UpdateMovieInput: UpdateMovieInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateReviewInput: UpdateReviewInput;
  User: IUser;
  UserPage: Omit<UserPage, 'items'> & { items: Array<ResolversParentTypes['User']> };
}>;

export type AuthPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CastMemberResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CastMember'] = ResolversParentTypes['CastMember']> = ResolversObject<{
  character?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeletePayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeletePayload'] = ResolversParentTypes['DeletePayload']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['List'] = ResolversParentTypes['List']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPublic?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  movieCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  movies?: Resolver<Array<ResolversTypes['Movie']>, ParentType, ContextType, RequireFields<ListMoviesArgs, 'limit' | 'offset'>>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListPageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ListPage'] = ResolversParentTypes['ListPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['List']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MovieResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Movie'] = ResolversParentTypes['Movie']> = ResolversObject<{
  averageRating?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  backdropUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cast?: Resolver<Array<ResolversTypes['CastMember']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  director?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  genres?: Resolver<Array<ResolversTypes['Genre']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  originalTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  overview?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  posterUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  releaseDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  reviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<MovieReviewsArgs, 'limit' | 'offset'>>;
  runtimeMinutes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MoviePageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MoviePage'] = ResolversParentTypes['MoviePage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['Movie']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  _noop?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  addMovieToList?: Resolver<ResolversTypes['List'], ParentType, ContextType, RequireFields<MutationAddMovieToListArgs, 'listId' | 'movieId'>>;
  createList?: Resolver<ResolversTypes['List'], ParentType, ContextType, RequireFields<MutationCreateListArgs, 'input'>>;
  createMovie?: Resolver<ResolversTypes['Movie'], ParentType, ContextType, RequireFields<MutationCreateMovieArgs, 'input'>>;
  createReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationCreateReviewArgs, 'input'>>;
  deleteList?: Resolver<ResolversTypes['DeletePayload'], ParentType, ContextType, RequireFields<MutationDeleteListArgs, 'id'>>;
  deleteMovie?: Resolver<ResolversTypes['DeletePayload'], ParentType, ContextType, RequireFields<MutationDeleteMovieArgs, 'id'>>;
  deleteReview?: Resolver<ResolversTypes['DeletePayload'], ParentType, ContextType, RequireFields<MutationDeleteReviewArgs, 'id'>>;
  likeReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationLikeReviewArgs, 'id'>>;
  login?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'input'>>;
  logout?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationRefreshTokenArgs, 'refreshToken'>>;
  register?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationRegisterArgs, 'input'>>;
  removeMovieFromList?: Resolver<ResolversTypes['List'], ParentType, ContextType, RequireFields<MutationRemoveMovieFromListArgs, 'listId' | 'movieId'>>;
  setUserRole?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationSetUserRoleArgs, 'role' | 'userId'>>;
  unlikeReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationUnlikeReviewArgs, 'id'>>;
  updateList?: Resolver<ResolversTypes['List'], ParentType, ContextType, RequireFields<MutationUpdateListArgs, 'id' | 'input'>>;
  updateMovie?: Resolver<ResolversTypes['Movie'], ParentType, ContextType, RequireFields<MutationUpdateMovieArgs, 'id' | 'input'>>;
  updateProfile?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateProfileArgs, 'input'>>;
  updateReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationUpdateReviewArgs, 'id' | 'input'>>;
}>;

export type NodeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'List' | 'Movie' | 'Review' | 'User', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  _health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  list?: Resolver<Maybe<ResolversTypes['List']>, ParentType, ContextType, RequireFields<QueryListArgs, 'id'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  movie?: Resolver<Maybe<ResolversTypes['Movie']>, ParentType, ContextType, RequireFields<QueryMovieArgs, 'id'>>;
  movies?: Resolver<ResolversTypes['MoviePage'], ParentType, ContextType, RequireFields<QueryMoviesArgs, 'limit' | 'offset'>>;
  myLists?: Resolver<Array<ResolversTypes['List']>, ParentType, ContextType>;
  publicLists?: Resolver<ResolversTypes['ListPage'], ParentType, ContextType, RequireFields<QueryPublicListsArgs, 'limit' | 'offset'>>;
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<QueryReviewArgs, 'id'>>;
  reviewsByMovie?: Resolver<ResolversTypes['ReviewPage'], ParentType, ContextType, RequireFields<QueryReviewsByMovieArgs, 'limit' | 'movieId' | 'offset'>>;
  reviewsByUser?: Resolver<ResolversTypes['ReviewPage'], ParentType, ContextType, RequireFields<QueryReviewsByUserArgs, 'limit' | 'offset' | 'userId'>>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'id'>>;
  users?: Resolver<ResolversTypes['UserPage'], ParentType, ContextType, RequireFields<QueryUsersArgs, 'limit' | 'offset'>>;
}>;

export type ReviewResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = ResolversObject<{
  author?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  comment?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  likeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  movie?: Resolver<ResolversTypes['Movie'], ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewPageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ReviewPage'] = ResolversParentTypes['ReviewPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TimestampedResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Timestamped'] = ResolversParentTypes['Timestamped']> = ResolversObject<{
  __resolveType: TypeResolveFn<'List' | 'Movie' | 'Review' | 'User', ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  favoriteMovies?: Resolver<Array<ResolversTypes['Movie']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lists?: Resolver<Array<ResolversTypes['List']>, ParentType, ContextType>;
  reviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<UserReviewsArgs, 'limit' | 'offset'>>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserPageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserPage'] = ResolversParentTypes['UserPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  CastMember?: CastMemberResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeletePayload?: DeletePayloadResolvers<ContextType>;
  List?: ListResolvers<ContextType>;
  ListPage?: ListPageResolvers<ContextType>;
  Movie?: MovieResolvers<ContextType>;
  MoviePage?: MoviePageResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  ReviewPage?: ReviewPageResolvers<ContextType>;
  Timestamped?: TimestampedResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserPage?: UserPageResolvers<ContextType>;
}>;

