import { Schema, model, Document, Types } from 'mongoose';
import { slugify } from '../utils/helpers.js';

export interface ICategory extends Document<Types.ObjectId> {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  cover?: string;
  parent?: Types.ObjectId | null;
  order: number;
  isActive: boolean;
  showInMenu: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: [true, 'نام دسته‌بندی الزامی است'], trim: true, maxlength: 80 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '', maxlength: 400 },
    color: { type: String, default: '#2563eb' },
    icon: { type: String, default: '' },
    cover: { type: String, default: '' },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    showInMenu: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, 'category');
  }
  next();
});

export const Category = model<ICategory>('Category', categorySchema);