import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Runs ONCE for the whole suite (in vitest's main process, not in the
 * worker that runs the tests). Spins up a standalone in-memory mongod --
 * it doesn't depend on the project's dev Docker/Mongo -- and exposes its
 * URI to the test files via `inject('MONGO_URI')` (see tests/setup.ts).
 */
export default async function setup({ provide }: { provide: (key: string, value: unknown) => void }) {
  const mongod = await MongoMemoryServer.create();
  provide('MONGO_URI', mongod.getUri());

  return async () => {
    await mongod.stop();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    MONGO_URI: string;
  }
}
