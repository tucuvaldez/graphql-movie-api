import { beforeAll, afterAll, afterEach, inject } from 'vitest';
import mongoose from 'mongoose';

// Each test file runs in the same worker (fileParallelism: false), so this
// mongoose connection is opened and closed once per file. A dbName of its
// own per file prevents data from one file leaking into another if
// parallelism ever gets enabled.
beforeAll(async () => {
  const uri = inject('MONGO_URI');
  const dbName = `test_${process.pid}_${Math.random().toString(16).slice(2)}`;
  await mongoose.connect(uri, { dbName });
});

// Clears all collections between tests so no state leaks from one `it()`
// to another (unique email/username ids, etc).
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
