import { describe, it, expect } from 'vitest';
import { execute, buildContext, contextFor, createTestUser, createTestMovie, expectNoErrors } from './helpers.js';

const CREATE_LIST = `
  mutation CreateList($input: CreateListInput!) {
    createList(input: $input) { id name isPublic owner { id } }
  }
`;

const LIST_BY_ID = `query ListById($id: ID!) { list(id: $id) { id name isPublic } }`;

const ADD_MOVIE = `
  mutation AddMovie($listId: ID!, $movieId: ID!) {
    addMovieToList(listId: $listId, movieId: $movieId) { movieCount movies { id } }
  }
`;

const REMOVE_MOVIE = `
  mutation RemoveMovie($listId: ID!, $movieId: ID!) {
    removeMovieFromList(listId: $listId, movieId: $movieId) { movieCount }
  }
`;

describe('createList / updateList / deleteList (owner)', () => {
  it('requires authentication to create a list', async () => {
    const result = await execute(CREATE_LIST, { input: { name: 'My List' } }, buildContext());
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('creates a private list by default', async () => {
    const { user } = await createTestUser();
    const result = await execute(CREATE_LIST, { input: { name: 'Favorites' } }, contextFor(user));
    expectNoErrors(result);
    const list = (result.data as any).createList;
    expect(list.isPublic).toBe(false);
    expect(list.owner.id).toBe(user.id);
  });

  it('rejects someone who is not the owner editing the list', async () => {
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    const created = await execute(CREATE_LIST, { input: { name: 'Private' } }, contextFor(owner));
    const listId = (created.data as any).createList.id;

    const UPDATE_LIST = `mutation Upd($id: ID!, $input: UpdateListInput!) { updateList(id: $id, input: $input) { id } }`;
    const result = await execute(UPDATE_LIST, { id: listId, input: { name: 'Hacked' } }, contextFor(stranger));
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('rejects someone who is not the owner deleting the list', async () => {
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    const created = await execute(CREATE_LIST, { input: { name: 'Private' } }, contextFor(owner));
    const listId = (created.data as any).createList.id;

    const DELETE_LIST = `mutation Del($id: ID!) { deleteList(id: $id) { success } }`;
    const result = await execute(DELETE_LIST, { id: listId }, contextFor(stranger));
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });
});

describe('list query (visibility)', () => {
  it('a private list requires authentication', async () => {
    const { user: owner } = await createTestUser();
    const created = await execute(CREATE_LIST, { input: { name: 'Private' } }, contextFor(owner));
    const listId = (created.data as any).createList.id;

    const result = await execute(LIST_BY_ID, { id: listId }, buildContext());
    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('a private list is visible to its owner but not to others', async () => {
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    const created = await execute(CREATE_LIST, { input: { name: 'Private' } }, contextFor(owner));
    const listId = (created.data as any).createList.id;

    const ownResult = await execute(LIST_BY_ID, { id: listId }, contextFor(owner));
    expectNoErrors(ownResult);
    expect((ownResult.data as any).list.name).toBe('Private');

    const strangerResult = await execute(LIST_BY_ID, { id: listId }, contextFor(stranger));
    expect(strangerResult.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('a public list is visible without authentication', async () => {
    const { user: owner } = await createTestUser();
    const created = await execute(
      CREATE_LIST,
      { input: { name: 'Public', isPublic: true } },
      contextFor(owner),
    );
    const listId = (created.data as any).createList.id;

    const result = await execute(LIST_BY_ID, { id: listId }, buildContext());
    expectNoErrors(result);
    expect((result.data as any).list.name).toBe('Public');
  });
});

describe('addMovieToList / removeMovieFromList', () => {
  it('adds and removes movies without duplicating (addToSet)', async () => {
    const { user } = await createTestUser();
    const movie = await createTestMovie();
    const created = await execute(CREATE_LIST, { input: { name: 'Watchlist' } }, contextFor(user));
    const listId = (created.data as any).createList.id;

    const added = await execute(ADD_MOVIE, { listId, movieId: movie.id }, contextFor(user));
    expectNoErrors(added);
    expect((added.data as any).addMovieToList.movieCount).toBe(1);

    // Adding the same movie twice shouldn't duplicate it.
    const addedAgain = await execute(ADD_MOVIE, { listId, movieId: movie.id }, contextFor(user));
    expect((addedAgain.data as any).addMovieToList.movieCount).toBe(1);

    const removed = await execute(REMOVE_MOVIE, { listId, movieId: movie.id }, contextFor(user));
    expectNoErrors(removed);
    expect((removed.data as any).removeMovieFromList.movieCount).toBe(0);
  });

  it("rejects adding a movie to another user's list", async () => {
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    const movie = await createTestMovie();
    const created = await execute(CREATE_LIST, { input: { name: 'Watchlist' } }, contextFor(owner));
    const listId = (created.data as any).createList.id;

    const result = await execute(ADD_MOVIE, { listId, movieId: movie.id }, contextFor(stranger));
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });
});
