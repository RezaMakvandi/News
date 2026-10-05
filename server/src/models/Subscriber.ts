import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscriber extends Document<Types.ObjectId> {
  email: string;
  name?: string;
  isActive: boolean;
  token: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriberSchema = new Schema<ISubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, default: '', maxlength: 80 },
    isActive: { type: Boolean, default: true },
    token: { type: String, default: '' },
    source: { type: String, default: 'website' },
  },
  { timestamps: true },
);

export const Subscriber = model<ISubscriber>('Subscriber', subscriberSchema);