import { Schema, model, Document, Types } from 'mongoose';
import { excerptFrom, readingTimeOf, slugify } from '../utils/helpers.js';

export type ArticleStatus = 'draft' | 'pending' | 'published' | 'archived';
export type ArticleType = 'news' | 'article' | 'review' | 'video' | 'gallery';

export interface IArticleImage {
  url: string;
  alt?: string;
  caption?: string;
}

export interface IArticle extends Document<Types.ObjectId> {
  title: string;
  slug: string;
  summary?: string;
  content: string;
  cover?: string;
  coverAlt?: string;
  gallery?: IArticleImage[];
  status: ArticleStatus;
  type: ArticleType;
  category: Types.ObjectId;
  tags: Types.ObjectId[];
  author: Types.ObjectId;
  isBreaking: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  allowComments: boolean;
  views: number;
  likes: number;
  shares: number;
  commentsCount: number;
  readingTime: number;
  seo?: { title?: string; description?: string; keywords?: string[]; canonical?: string };
  source?: { name?: string; url?: string };
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const articleSchema = new Schema<IArticle>(
  {
    title: { type: String, required: [true, 'عنوان خبر الزامی است'], trim: true, maxlength: 220 },
    slug: { type: String, unique: true, index: true },
    summary: { type: String, default: '', maxlength: 600 },
    content: { type: String, required: [true, 'متن خبر الزامی است'] },
    cover: { type: String, default: '' },
    coverAlt: { type: String, default: '' },
    gallery: [
      {
        _id: false,
        url: { type: String, required: true },
        alt: { type: String, default: '' },
        caption: { type: String, default: '' },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    type: {
      type: String,
      enum: ['news', 'article', 'review', 'video', 'gallery'],
      default: 'news',
      index: true,
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isBreaking: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isPinned: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    readingTime: { type: Number, default: 1 },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      keywords: [{ type: String }],
      canonical: { type: String, default: '' },
    },
    source: {
      name: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    publishedAt: { type: Date, index: true },
    scheduledAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

articleSchema.index({ title: 'text', summary: 'text', content: 'text' });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, status: 1, publishedAt: -1 });

articleSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, 'news');
  }
  if (!this.summary) {
    this.summary = excerptFrom(this.content, 200);
  }
  this.readingTime = readingTimeOf(this.content);
  next();
});

export const Article = model<IArticle>('Article', articleSchema);