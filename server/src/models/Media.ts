import { Schema, model, Document, Types } from 'mongoose';

export interface IMedia extends Document<Types.ObjectId> {
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  folder: string;
  uploadedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    filename: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    alt: { type: String, default: '' },
    folder: { type: String, default: 'general', index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

export const Media = model<IMedia>('Media', mediaSchema);