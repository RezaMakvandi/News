import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";
import { slugify } from "../utils/helpers.js";

export interface IProductCategory extends Document<Types.ObjectId> {
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

const productCategorySchema =
  new Schema<IProductCategory>(
    {
      name: {
        type: String,
        required:
          [
            true,
            "نام دستهبندی الزامی است",
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
      color:
        {
          type: String,
          default:
            "#2563eb",
        },
      icon: {
        type: String,
        default:
          "",
      },
      cover:
        {
          type: String,
          default:
            "",
        },
      parent:
        {
          type: Schema
            .Types
            .ObjectId,
          ref: "ProductCategory",
          default:
            null,
        },
      order:
        {
          type: Number,
          default: 0,
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
          default: true,
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

productCategorySchema.pre(
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
          "product-category",
        );
    }
    next();
  },
);

export const ProductCategory =
  model<IProductCategory>(
    "ProductCategory",
    productCategorySchema,
  );
