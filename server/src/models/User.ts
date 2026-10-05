import bcrypt from 'bcryptjs';
import { Schema, model, Document, Types } from 'mongoose';
import { slugify } from '../utils/helpers.js';

export type UserRole = 'admin' | 'editor' | 'author' | 'subscriber';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface IUser extends Document<Types.ObjectId> {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  bio?: string;
  slug: string;
  lastLoginAt?: Date;
  postsCount?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: [true, 'نام کاربر الزامی است'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'ایمیل الزامی است'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'editor', 'author', 'subscriber'], default: 'subscriber', index: true },
    status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'active', index: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 600 },
    slug: { type: String, index: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

userSchema.index({ name: 'text', email: 'text' });

export const userRoles: UserRole[] = ['admin', 'editor', 'author', 'subscriber'];

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, 'author');
  }
  next();
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser>('User', userSchema);