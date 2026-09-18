import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { UserModel, MovieModel } from '../models/index.js';
import { hashPassword } from '../utils/auth.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movies';

// Fictional catalog entries -- kept deliberately unreal so nobody mistakes
// this seed data for a real licensed movie dataset.
export const SEED_ADMIN = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'AdminPass123!',
};

const SEED_MOVIES = [
  {
    title: 'Silent Horizon',
    overview: 'A lone researcher aboard a drifting station races to restore contact with Earth before her life support runs out.',
    genres: ['SCI_FI', 'DRAMA'],
    releaseDate: new Date('2021-03-12'),
    runtimeMinutes: 118,
  },
  {
    title: 'The Last Bakery',
    overview: "A struggling small-town baker enters a high-stakes competition to save her family's shop.",
    genres: ['COMEDY', 'DRAMA'],
    releaseDate: new Date('2019-11-02'),
    runtimeMinutes: 102,
  },
  {
    title: 'Iron Tide',
    overview: 'A former demolitions expert is pulled back into one last job when an old partner resurfaces.',
    genres: ['ACTION', 'THRILLER'],
    releaseDate: new Date('2022-07-22'),
    runtimeMinutes: 131,
  },
  {
    title: 'Paper Lanterns',
    overview: 'Two strangers reconnect year after year at the same lantern festival, each time a little more changed.',
    genres: ['ROMANCE', 'DRAMA'],
    releaseDate: new Date('2018-09-14'),
    runtimeMinutes: 109,
  },
  {
    title: 'Hollow Ridge',
    overview: "A documentary crew investigating a mountain town's disappearances finds more than they bargained for.",
    genres: ['HORROR', 'MYSTERY'],
    releaseDate: new Date('2023-10-06'),
    runtimeMinutes: 97,
  },
];

/**
 * Creates the seed ADMIN user and sample movies if they don't already
 * exist. Assumes mongoose is already connected -- callers (this script's
 * own `main()`, or the e2e smoke test) own the connection lifecycle so it
 * can be reused across multiple seed/verify steps instead of reconnecting
 * each time.
 */
export async function ensureSeedData(): Promise<void> {
  const existingAdmin = await UserModel.findOne({ email: SEED_ADMIN.email });
  if (existingAdmin) {
    console.log(`Admin user already exists (${SEED_ADMIN.email}), skipping.`);
  } else {
    const passwordHash = await hashPassword(SEED_ADMIN.password);
    await UserModel.create({
      username: SEED_ADMIN.username,
      email: SEED_ADMIN.email,
      passwordHash,
      role: 'ADMIN',
    });
    console.log(`Created admin user -> email: ${SEED_ADMIN.email}  password: ${SEED_ADMIN.password}`);
  }

  const movieCount = await MovieModel.countDocuments();
  if (movieCount > 0) {
    console.log(`Movies collection already has ${movieCount} document(s), skipping movie seed.`);
  } else {
    await MovieModel.insertMany(SEED_MOVIES);
    console.log(`Seeded ${SEED_MOVIES.length} sample movies.`);
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI}`);
  await ensureSeedData();
  await mongoose.disconnect();
  console.log('Done.');
}

// Only auto-run when this file is executed directly (`tsx src/scripts/seed.ts`
// / `npm run seed`), not when `ensureSeedData`/`SEED_ADMIN` are imported by
// another script (e.g. the e2e smoke test).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
