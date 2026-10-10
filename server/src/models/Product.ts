import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";
import { excerptFrom } from "../utils/helpers.js";

export type ProductStatus =

    | "draft"
    | "published"
    | "archived";

export interface IProductImage {
  url: string;
  alt?: string;
}

export interface IProductVariant {
  /** e.g. رنگ / حافظه */
  name: string;
  /** e.g. مشکی / ۱۲۸ گیگابایت */
  value: string;
  /** Price delta in Toman relative to the base price (can be negative). */
  priceDelta?: number;
  stock: number;
  sku?: string;
}

export interface IProductSpec {
  group: string;
  name: string;
  value: string;
}

export interface IProduct extends Document<Types.ObjectId> {
  name: string;
  slug: string;
  /** Short marketing description shown on cards. */
  summary?: string;
  description: string;
  brand?: Types.ObjectId | null;
  category: Types.ObjectId;
  tags: Types.ObjectId[];
  images: IProductImage[];
  /** Main display image. */
  cover?: string;
  price: number;
  /** Discounted price when on sale; 0 means no sale. */
  salePrice: number;
  /** Optional explicit discount percentage (otherwise derived). */
  discountPercent: number;
  stock: number;
  sku?: string;
  variants: IProductVariant[];
  specs: IProductSpec[];
  status: ProductStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  warranty?: string;
  /** Free-form shipping note, e.g. «ارسال از ۲ روز کاری آینده». */
  shippingNote?: string;
  rating: number;
  ratingCount: number;
  soldCount: number;
  views: number;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const productSchema =
  new Schema<IProduct>(
    {
      name: {
        type: String,
        required:
          [
            true,
            "نام محصول الزامی است",
          ],
        trim: true,
        maxlength: 220,
      },
      slug: {
        type: String,
        unique: true,
        index: true,
      },
      summary:
        {
          type: String,
          default:
            "",
          maxlength: 600,
        },
      description:
        {
          type: String,
          default:
            "",
        },
      brand:
        {
          type: Schema
            .Types
            .ObjectId,
          ref: "Brand",
          default:
            null,
          index: true,
        },
      category:
        {
          type: Schema
            .Types
            .ObjectId,
          ref: "ProductCategory",
          required: true,
          index: true,
        },
      tags: [
        {
          type: Schema
            .Types
            .ObjectId,
          ref: "Tag",
        },
      ],
      images:
        [
          {
            _id: false,
            url: {
              type: String,
              required: true,
            },
            alt: {
              type: String,
              default:
                "",
            },
          },
        ],
      cover:
        {
          type: String,
          default:
            "",
        },
      price:
        {
          type: Number,
          required:
            [
              true,
              "قیمت محصول الزامی است",
            ],
          min: 0,
          default: 0,
          index: true,
        },
      salePrice:
        {
          type: Number,
          default: 0,
          min: 0,
        },
      discountPercent:
        {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      stock:
        {
          type: Number,
          default: 0,
          min: 0,
          index: true,
        },
      sku: {
        type: String,
        default:
          "",
        trim: true,
      },
      variants:
        [
          {
            _id: false,
            name: {
              type: String,
              required: true,
              trim: true,
            },
            value:
              {
                type: String,
                required: true,
                trim: true,
              },
            priceDelta:
              {
                type: Number,
                default: 0,
              },
            stock:
              {
                type: Number,
                default: 0,
                min: 0,
              },
            sku: {
              type: String,
              default:
                "",
            },
          },
        ],
      specs:
        [
          {
            _id: false,
            group:
              {
                type: String,
                default:
                  "عمومی",
              },
            name: {
              type: String,
              required: true,
            },
            value:
              {
                type: String,
                required: true,
              },
          },
        ],
      status:
        {
          type: String,
          enum: [
            "draft",
            "published",
            "archived",
          ],
          default:
            "draft",
          index: true,
        },
      isFeatured:
        {
          type: Boolean,
          default: false,
          index: true,
        },
      isNewArrival:
        {
          type: Boolean,
          default: false,
          index: true,
        },
      warranty:
        {
          type: String,
          default:
            "",
        },
      shippingNote:
        {
          type: String,
          default:
            "",
        },
      rating:
        {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
          index: true,
        },
      ratingCount:
        {
          type: Number,
          default: 0,
        },
      soldCount:
        {
          type: Number,
          default: 0,
        },
      views:
        {
          type: Number,
          default: 0,
        },
      seo: {
        title:
          {
            type: String,
            default:
              "",
          },
        description:
          {
            type: String,
            default:
              "",
          },
        keywords:
          [
            {
              type: String,
            },
          ],
      },
    },
    {
      timestamps: true,
      toJSON:
        {
          virtuals: true,
        },
      toObject:
        {
          virtuals: true,
        },
    },
  );

productSchema.index(
  {
    name: "text",
    summary:
      "text",
    description:
      "text",
    sku: "text",
  },
);
productSchema.index(
  {
    status: 1,
    category: 1,
    price: 1,
  },
);
productSchema.index(
  {
    status: 1,
    isFeatured:
      -1,
    soldCount:
      -1,
  },
);

/** Final payable price after applying the sale price / discount percent. */
productSchema
  .virtual(
    "finalPrice",
  )
  .get(
    function (
      this: IProduct,
    ) {
      if (
        this
          .salePrice >
          0 &&
        this
          .salePrice <
          this
            .price
      )
        return this
          .salePrice;
      if (
        this
          .discountPercent >
        0
      )
        return Math.round(
          this
            .price *
            (1 -
              this
                .discountPercent /
                100),
        );
      return this
        .price;
    },
  );

/** Effective discount percentage for badges. */
productSchema
  .virtual(
    "effectiveDiscount",
  )
  .get(
    function (
      this: IProduct,
    ) {
      const final =
        (
          this as IProduct & {
            finalPrice: number;
          }
        )
          .finalPrice;
      if (
        final >
          0 &&
        final <
          this
            .price
      ) {
        return Math.round(
          ((this
            .price -
            final) /
            this
              .price) *
            100,
        );
      }
      return 0;
    },
  );

productSchema.pre(
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
        this.name
          .trim()
          .replace(
            /[\s_]+/g,
            "-",
          )
          .replace(
            /[^\p{L}\p{N}-]+/gu,
            "",
          )
          .replace(
            /-+/g,
            "-",
          )
          .replace(
            /^-|-$/g,
            "",
          )
          .toLowerCase() ||
        `product-${Date.now().toString(36)}`;
    }
    if (
      !this
        .summary &&
      this
        .description
    ) {
      this.summary =
        excerptFrom(
          this
            .description,
          200,
        );
    }
    if (
      !this
        .cover &&
      this
        .images
        .length >
        0
    ) {
      this.cover =
        this.images[0].url;
    }
    next();
  },
);

export const Product =
  model<IProduct>(
    "Product",
    productSchema,
  );
