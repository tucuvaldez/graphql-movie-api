import { Schema, model, type Document, type Types } from 'mongoose';

export interface IList extends Document<Types.ObjectId> {
  name: string;
  description?: string | null;
  isPublic: boolean;
  owner: Types.ObjectId;
  movies: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const listSchema = new Schema<IList>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: null, maxlength: 500 },
    isPublic: { type: Boolean, default: false },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movies: [{ type: Schema.Types.ObjectId, ref: 'Movie', default: [] }],
  },
  { timestamps: true },
);

listSchema.index({ owner: 1 });
listSchema.index({ isPublic: 1, createdAt: -1 });

export const ListModel = model<IList>('List', listSchema);
