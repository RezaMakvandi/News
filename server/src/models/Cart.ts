import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export interface ICartItem {
  product: Types.ObjectId;
  /** Snapshot so historical carts still render if the product changes. */
  name: string;
  slug: string;
  cover?: string;
  variant?: {
    name: string;
    value: string;
  } | null;
  /** Unit price after discount at the time it was added. */
  price: number;
  quantity: number;
  stock: number;
}

export interface ICart extends Document<Types.ObjectId> {
  user: Types.ObjectId;
  items: ICartItem[];
  /** Denormalised subtotal for quick display; recomputed on every write. */
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema =
  new Schema<ICartItem>(
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
          default: 1,
        },
      stock:
        {
          type: Number,
          default: 0,
        },
    },
    {
      _id: true,
    },
  );

const cartSchema =
  new Schema<ICart>(
    {
      user: {
        type: Schema
          .Types
          .ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },
      items:
        {
          type: [
            cartItemSchema,
          ],
          default:
            [],
        },
      subtotal:
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

cartSchema.methods.recalculate =
  function (
    this: ICart,
  ) {
    this.subtotal =
      this.items.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.price *
            item.quantity,
        0,
      );
    return this
      .subtotal;
  };

cartSchema
  .virtual(
    "itemsCount",
  )
  .get(
    function (
      this: ICart,
    ) {
      return this.items.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.quantity,
        0,
      );
    },
  );

export const Cart =
  model<ICart>(
    "Cart",
    cartSchema,
  );
