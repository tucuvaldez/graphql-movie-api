import { Schema, model, type Document, type Types } from 'mongoose';

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';

export interface IUser extends Document<Types.ObjectId> {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: UserRole;
  favoriteMovies: Types.ObjectId[];
  refreshTokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: null, maxlength: 500 },
    role: { type: String, enum: ['USER', 'MODERATOR', 'ADMIN'], default: 'USER' },
    favoriteMovies: [{ type: Schema.Types.ObjectId, ref: 'Movie', default: [] }],
    // Incremented on logout/rotation to invalidate old refresh tokens.
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const UserModel = model<IUser>('User', userSchema);
