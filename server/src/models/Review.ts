import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export type ReviewStatus =

    | "pending"
    | "approved"
    | "rejected";

export interface IReview extends Document<Types.ObjectId> {
  product: Types.ObjectId;
  user: Types.ObjectId;
  order?: Types.ObjectId | null;
  rating: number;
  title?: string;
  comment: string;
  /** Pros/cons as free-form chips, e.g. «کیفیت ساخت عالی». */
  pros: string[];
  cons: string[];
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema =
  new Schema<IReview>(
    {
      product:
        {
          type: Schema
            .Types
            .ObjectId,
          ref: "Product",
          required: true,
          index: true,
        },
      user: {
        type: Schema
          .Types
          .ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      order:
        {
          type: Schema
            .Types
            .ObjectId,
          ref: "Order",
          default:
            null,
        },
      rating:
        {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
      title:
        {
          type: String,
          default:
            "",
          maxlength: 150,
        },
      comment:
        {
          type: String,
          required:
            [
              true,
              "متن نظر الزامی است",
            ],
          maxlength: 2000,
        },
      pros: [
        {
          type: String,
          maxlength: 120,
        },
      ],
      cons: [
        {
          type: String,
          maxlength: 120,
        },
      ],
      status:
        {
          type: String,
          enum: [
            "pending",
            "approved",
            "rejected",
          ],
          default:
            "pending",
          index: true,
        },
      isVerifiedPurchase:
        {
          type: Boolean,
          default: false,
        },
      helpfulCount:
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

reviewSchema.index(
  {
    product: 1,
    user: 1,
  },
  {
    unique: true,
  },
);
reviewSchema.index(
  {
    product: 1,
    status: 1,
    createdAt:
      -1,
  },
);

/** Recomputes a product's aggregate rating — call after any review change. */
export const recalculateProductRating =
  async (
    productId:
      | Types.ObjectId
      | string,
  ) => {
    const productModel =
      model(
        "Product",
      );
    const result =
      await model<IReview>(
        "Review",
      ).aggregate<{
        avg: number;
        count: number;
      }>([
        {
          $match:
            {
              product:
                new Types.ObjectId(
                  String(
                    productId,
                  ),
                ),
              status:
                "approved",
            },
        },
        {
          $group:
            {
              _id: null,
              avg: {
                $avg: "$rating",
              },
              count:
                {
                  $sum: 1,
                },
            },
        },
      ]);
    const avg =
      result[0]
        ?.avg ??
      0;
    const count =
      result[0]
        ?.count ??
      0;
    await productModel.findByIdAndUpdate(
      productId,
      {
        rating:
          Math.round(
            avg *
              10,
          ) /
          10,
        ratingCount:
          count,
      },
    );
  };

export const Review =
  model<IReview>(
    "Review",
    reviewSchema,
  );
