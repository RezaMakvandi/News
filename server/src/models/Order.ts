import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export type OrderStatus =

    | "pending" // created, awaiting payment
    | "paid" // payment verified
    | "processing" // being prepared
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
    | "failed";

export type PaymentStatus =

    | "unpaid"
    | "authorized"
    | "paid"
    | "failed"
    | "refunded";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  slug: string;
  cover?: string;
  variant?: {
    name: string;
    value: string;
  } | null;
  price: number;
  quantity: number;
  total: number;
}

export interface IOrderAddress {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  postalCode?: string;
  address: string;
  notes?: string;
}

export interface IOrder extends Document<Types.ObjectId> {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  itemsTotal: number;
  discount: number;
  shippingCost: number;
  payable: number;
  couponCode?: string;
  coupon?: Types.ObjectId | null;
  shippingMethod?: string;
  address: IOrderAddress;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment: {
    gateway?: string;
    authority?: string;
    refId?: string;
    cardPan?: string;
    paidAt?: Date;
    /** Raw gateway payload kept for audits. */
    raw?: Record<
      string,
      unknown
    >;
  };
  trackingCode?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema =
  new Schema<IOrderItem>(
    {
      product:
        {
          type: Schema
            .Types
            .ObjectId,
          ref: "Product",
          required: true,
        },
      name: {
        type: String,
        required: true,
      },
      slug: {
        type: String,
        required: true,
      },
      cover:
        {
          type: String,
          default:
            "",
        },
      variant:
        {
          type: {
            name: {
              type: String,
            },
            value:
              {
                type: String,
              },
          },
          default:
            null,
          _id: false,
        },
      price:
        {
          type: Number,
          required: true,
          min: 0,
        },
      quantity:
        {
          type: Number,
          required: true,
          min: 1,
        },
      total:
        {
          type: Number,
          required: true,
          min: 0,
        },
    },
    {
      _id: false,
    },
  );

const orderSchema =
  new Schema<IOrder>(
    {
      orderNumber:
        {
          type: String,
          unique: true,
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
      items:
        {
          type: [
            orderItemSchema,
          ],
          default:
            [],
        },
      itemsTotal:
        {
          type: Number,
          default: 0,
          min: 0,
        },
      discount:
        {
          type: Number,
          default: 0,
          min: 0,
        },
      shippingCost:
        {
          type: Number,
          default: 0,
          min: 0,
        },
      payable:
        {
          type: Number,
          default: 0,
          min: 0,
        },
      couponCode:
        {
          type: String,
          default:
            "",
        },
      coupon:
        {
          type: Schema
            .Types
            .ObjectId,
          ref: "Coupon",
          default:
            null,
        },
      shippingMethod:
        {
          type: String,
          default:
            "post",
        },
      address:
        {
          fullName:
            {
              type: String,
              required: true,
            },
          phone:
            {
              type: String,
              required: true,
            },
          province:
            {
              type: String,
              required: true,
            },
          city: {
            type: String,
            required: true,
          },
          postalCode:
            {
              type: String,
              default:
                "",
            },
          address:
            {
              type: String,
              required: true,
            },
          notes:
            {
              type: String,
              default:
                "",
            },
        },
      status:
        {
          type: String,
          enum: [
            "pending",
            "paid",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "refunded",
            "failed",
          ],
          default:
            "pending",
          index: true,
        },
      paymentStatus:
        {
          type: String,
          enum: [
            "unpaid",
            "authorized",
            "paid",
            "failed",
            "refunded",
          ],
          default:
            "unpaid",
          index: true,
        },
      payment:
        {
          gateway:
            {
              type: String,
              default:
                "",
            },
          authority:
            {
              type: String,
              default:
                "",
              index: true,
            },
          refId:
            {
              type: String,
              default:
                "",
            },
          cardPan:
            {
              type: String,
              default:
                "",
            },
          paidAt:
            {
              type: Date,
            },
          raw: {
            type: Schema
              .Types
              .Mixed,
            default:
              null,
          },
        },
      trackingCode:
        {
          type: String,
          default:
            "",
        },
      shippedAt:
        {
          type: Date,
        },
      deliveredAt:
        {
          type: Date,
        },
      cancelledAt:
        {
          type: Date,
        },
      cancelReason:
        {
          type: String,
          default:
            "",
        },
      adminNote:
        {
          type: String,
          default:
            "",
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

orderSchema.index(
  {
    user: 1,
    createdAt:
      -1,
  },
);
orderSchema.index(
  {
    status: 1,
    createdAt:
      -1,
  },
);

/** Sequence-based human friendly order number, e.g. SH-14040117-0023. */
orderSchema.pre(
  "save",
  async function (
    next,
  ) {
    if (
      this
        .orderNumber
    )
      return next();
    const now =
      new Date();
    const jy =
      Number(
        new Intl.DateTimeFormat(
          "en-u-ca-persian",
          {
            year: "numeric",
          },
        )
          .format(
            now,
          )
          .replace(
            /\D/g,
            "",
          ),
      );
    const month =
      String(
        now.getMonth() +
          1,
      ).padStart(
        2,
        "0",
      );
    const day =
      String(
        now.getDate(),
      ).padStart(
        2,
        "0",
      );
    const count =
      await model<IOrder>(
        "Order",
      ).countDocuments(
        {
          createdAt:
            {
              $gte: new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
              ),
            },
        },
      );
    this.orderNumber = `SH-${jy}${month}${day}-${String(count + 1).padStart(4, "0")}`;
    next();
  },
);

export const Order =
  model<IOrder>(
    "Order",
    orderSchema,
  );
