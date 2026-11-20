import { Schema, model, Document, Types } from 'mongoose';

export interface IMediaFolder extends Document<Types.ObjectId> {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const mediaFolderSchema = new Schema<IMediaFolder>(
  {
    name: { type: String, required: [true, 'نام پوشه الزامی است'], trim: true, maxlength: 80, unique: true },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

export const MediaFolder = model<IMediaFolder>('MediaFolder', mediaFolderSchema);