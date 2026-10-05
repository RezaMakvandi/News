import { Schema, model, Document, Types } from 'mongoose';

/** Key/value site settings (branding, socials, SEO defaults, footer, ...). */
export interface ISetting extends Document<Types.ObjectId> {
  key: string;
  value: unknown;
  group: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, default: null },
    group: { type: String, default: 'general', index: true },
    label: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Setting = model<ISetting>('Setting', settingSchema);