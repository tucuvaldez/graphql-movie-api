import { Schema, model, type Document, type Types } from 'mongoose';

export interface IReview extends Document<Types.ObjectId> {
  rating: number; // 1-10
  comment?: string | null;
  movie: Types.ObjectId;
  author: Types.ObjectId;
  likedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    rating: { type: Number, required: true, min: 1, max: 10 },
    comment: { type: String, default: null, maxlength: 2000 },
    movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true },
);

// Un usuario solo puede dejar una review por película.
reviewSchema.index({ movie: 1, author: 1 }, { unique: true });
reviewSchema.index({ movie: 1, createdAt: -1 });
reviewSchema.index({ author: 1, createdAt: -1 });

export const ReviewModel = model<IReview>('Review', reviewSchema);
