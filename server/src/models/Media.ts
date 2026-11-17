import { Schema, model, Document, Types } from 'mongoose';

/** Where the file bytes live: inside MongoDB or on the uploads directory. */
export type MediaStorage = 'db' | 'disk';

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
  storage: MediaStorage;
  /** Raw file bytes, present only when `storage` is `'db'`. */
  data?: Buffer;
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
    storage: { type: String, enum: ['db', 'disk'], default: 'disk', index: true },
    // Bytes are never selected by default so list queries stay small; the
    // dedicated file endpoint opts in with `.select('+data')`.
    data: { type: Buffer, select: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.data;
        return ret;
      },
    },
  },
);

export const Media = model<IMedia>('Media', mediaSchema);
