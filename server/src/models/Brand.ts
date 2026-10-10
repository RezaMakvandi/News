import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";
import { slugify } from "../utils/helpers.js";

export interface IBrand extends Document<Types.ObjectId> {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  country?: string;
  isActive: boolean;
  showInMenu: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema =
  new Schema<IBrand>(
    {
      name: {
        type: String,
        required:
          [
            true,
            "نام برند الزامی است",
          ],
        trim: true,
        maxlength: 100,
      },
      slug: {
        type: String,
        unique: true,
        index: true,
      },
      description:
        {
          type: String,
          default:
            "",
          maxlength: 500,
        },
      logo: {
        type: String,
        default:
          "",
      },
      country:
        {
          type: String,
          default:
            "",
        },
      isActive:
        {
          type: Boolean,
          default: true,
          index: true,
        },
      showInMenu:
        {
          type: Boolean,
          default: false,
        },
      order:
        {
          type: Number,
          default: 0,
        },
    },
    {
      timestamps: true,
      toJSON:
        {
          virtuals: true,
        },
    },
  );

brandSchema.pre(
  "save",
  function (
    next,
  ) {
    if (
      this.isModified(
        "name",
      ) ||
      !this
        .slug
    ) {
      this.slug =
        slugify(
          this
            .name,
          "brand",
        );
    }
    next();
  },
);

export const Brand =
  model<IBrand>(
    "Brand",
    brandSchema,
  );
