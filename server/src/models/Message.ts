import { Schema, model, Document, Types } from 'mongoose';

export type MessageStatus = 'unread' | 'read' | 'replied' | 'archived';

export interface IMessage extends Document<Types.ObjectId> {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
  status: MessageStatus;
  reply?: string;
  repliedBy?: Types.ObjectId | null;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '', maxlength: 24 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ['unread', 'read', 'replied', 'archived'],
      default: 'unread',
      index: true,
    },
    reply: { type: String, default: '' },
    repliedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    repliedAt: { type: Date },
  },
  { timestamps: true },
);

export const Message = model<IMessage>('Message', messageSchema);