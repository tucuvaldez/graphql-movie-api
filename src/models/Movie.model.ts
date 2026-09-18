import { Schema, model, type Document, type Types } from 'mongoose';
import type { Genre } from '../types/context.js';

export interface ICastMember {
  name: string;
  character: string;
  order?: number | null;
}

export interface IMovie extends Document<Types.ObjectId> {
  title: string;
  originalTitle?: string | null;
  overview?: string | null;
  releaseDate?: Date | null;
  runtimeMinutes?: number | null;
  genres: Genre[];
  director?: string | null;
  cast: ICastMember[];
  posterUrl?: string | null;
  backdropUrl?: string | null;

  // Denormalized to avoid aggregations on every listing query.
  ratingSum: number;
  ratingCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const castMemberSchema = new Schema<ICastMember>(
  {
    name: { type: String, required: true },
    character: { type: String, required: true },
    order: { type: Number, default: null },
  },
  { _id: false },
);

const movieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: true, trim: true },
    originalTitle: { type: String, default: null },
    overview: { type: String, default: null },
    releaseDate: { type: Date, default: null },
    runtimeMinutes: { type: Number, default: null },
    genres: [{ type: String, required: true }],
    director: { type: String, default: null },
    cast: { type: [castMemberSchema], default: [] },
    posterUrl: { type: String, default: null },
    backdropUrl: { type: String, default: null },
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

movieSchema.index({ title: 'text', overview: 'text' });
movieSchema.index({ genres: 1 });
movieSchema.index({ releaseDate: -1 });

export const MovieModel = model<IMovie>('Movie', movieSchema);
