import { Schema, model, Document, Types } from 'mongoose';
import { slugify } from '../utils/helpers.js';

export interface ITag extends Document<Types.ObjectId> {
  name: string;
  slug: string;
  description?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: { type: String, required: [true, 'نام برچسب الزامی است'], trim: true, maxlength: 60 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '', maxlength: 300 },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

tagSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, 'tag');
  }
  next();
});

export const Tag = model<ITag>('Tag', tagSchema);