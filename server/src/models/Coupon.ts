import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export type CouponType =

    | "percent"
    | "fixed";

export interface ICoupon extends Document<Types.ObjectId> {
  code: string;
  description?: string;
  type: CouponType;
  /** percent: 1..100, fixed: amount in Toman. */
  amount: number;
  minOrder: number;
  /** 0 = unlimited. */
  maxUses: number;
  usedCount: number;
  /** 0 = unlimited per user. */
  perUserLimit: number;
  /** Restrict to specific categories/products when set. */
  categories: Types.ObjectId[];
  products: Types.ObjectId[];
  startsAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isUsable(
    subtotal: number,
  ): {
    ok: boolean;
    reason?: string;
  };
}

const couponSchema =
  new Schema<ICoupon>(
    {
      code: {
        type: String,
        required:
          [
            true,
            "کد تخفیف الزامی است",
          ],
        unique: true,
        uppercase: true,
        trim: true,
      },
      description:
        {
          type: String,
          default:
            "",
          maxlength: 300,
        },
      type: {
        type: String,
        enum: [
          "percent",
          "fixed",
        ],
        default:
          "percent",
      },
      amount:
        {
          type: Number,
          required: true,
          min: 0,
        },
      minOrder:
        {
          type: Number,
          default: 0,
          min: 0,
        },
      maxUses:
        {
          type: Number,
          default: 0,
          min: 0,
        },
      usedCount:
        {
          type: Number,
          default: 0,
          min: 0,
        },
      perUserLimit:
        {
          type: Number,
          default: 1,
          min: 0,
        },
      categories:
        [
          {
            type: Schema
              .Types
              .ObjectId,
            ref: "ProductCategory",
          },
        ],
      products:
        [
          {
            type: Schema
              .Types
              .ObjectId,
            ref: "Product",
          },
        ],
      startsAt:
        {
          type: Date,
        },
      expiresAt:
        {
          type: Date,
        },
      isActive:
        {
          type: Boolean,
          default: true,
          index: true,
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

couponSchema.index(
  {
    isActive: 1,
    expiresAt: 1,
  },
);

/** A coupon is usable when active, within its window, and under its caps. */
couponSchema.methods.isUsable =
  function (
    this: ICoupon,
    subtotal: number,
  ): {
    ok: boolean;
    reason?: string;
  } {
    if (
      !this
        .isActive
    )
      return {
        ok: false,
        reason:
          "این کد تخفیف غیرفعال است",
      };
    const now =
      Date.now();
    if (
      this
        .startsAt &&
      this.startsAt.getTime() >
        now
    ) {
      return {
        ok: false,
        reason:
          "این کد تخفیف هنوز فعال نشده است",
      };
    }
    if (
      this
        .expiresAt &&
      this.expiresAt.getTime() <
        now
    ) {
      return {
        ok: false,
        reason:
          "مهلت استفاده از این کد تخفیف به پایان رسیده است",
      };
    }
    if (
      this
        .maxUses >
        0 &&
      this
        .usedCount >=
        this
          .maxUses
    ) {
      return {
        ok: false,
        reason:
          "ظرفیت استفاده از این کد تخفیف تکمیل شده است",
      };
    }
    if (
      subtotal <
      this
        .minOrder
    ) {
      return {
        ok: false,
        reason: `حداقل مبلغ سفارش برای این کد ${this.minOrder.toLocaleString("fa-IR")} تومان است`,
      };
    }
    return {
      ok: true,
    };
  };

export const Coupon =
  model<ICoupon>(
    "Coupon",
    couponSchema,
  );
