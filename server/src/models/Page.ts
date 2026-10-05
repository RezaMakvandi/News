import { Schema, model, Document, Types } from 'mongoose';
import { slugify } from '../utils/helpers.js';

/** Static pages such as «درباره ما»، «تماس با ما»، «قوانین». */
export interface IPage extends Document<Types.ObjectId> {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  isPublished: boolean;
  showInFooter: boolean;
  order: number;
  seo?: { title?: string; description?: string; keywords?: string[] };
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, unique: true, index: true },
    content: { type: String, required: true },
    excerpt: { type: String, default: '', maxlength: 400 },
    isPublished: { type: Boolean, default: true, index: true },
    showInFooter: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      keywords: [{ type: String }],
    },
  },
  { timestamps: true },
);

pageSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, 'page');
  }
  next();
});

export const Page = model<IPage>('Page', pageSchema);