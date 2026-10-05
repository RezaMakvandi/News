import { Schema, model, Document, Types } from 'mongoose';

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export interface IComment extends Document<Types.ObjectId> {
  article: Types.ObjectId;
  author?: Types.ObjectId | null;
  parent?: Types.ObjectId | null;
  authorName: string;
  authorEmail: string;
  content: string;
  status: CommentStatus;
  likes: number;
  dislikes: number;
  ip?: string;
  userAgent?: string;
  isEdited: boolean;
  adminReply?: string;
  moderatedBy?: Types.ObjectId | null;
  moderatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    article: { type: Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    authorName: { type: String, required: [true, 'نام الزامی است'], trim: true, maxlength: 80 },
    authorEmail: { type: String, required: [true, 'ایمیل الزامی است'], trim: true, lowercase: true },
    content: { type: String, required: [true, 'متن نظر الزامی است'], trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'spam'],
      default: 'pending',
      index: true,
    },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    isEdited: { type: Boolean, default: false },
    adminReply: { type: String, default: '' },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

commentSchema.index({ article: 1, status: 1, createdAt: -1 });

export const Comment = model<IComment>('Comment', commentSchema);