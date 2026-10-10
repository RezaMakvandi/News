import { Types } from "mongoose";
import { Coupon } from "../models/Coupon.js";
import { ApiError } from "../utils/ApiError.js";
import { getShopConfig } from "./shop.config.js";

export interface PricedItem {
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
  stock: number;
}

export interface CartTotals {
  itemsTotal: number;
  discount: number;
  shippingCost: number;
  payable: number;
  freeShipping: boolean;
  couponCode: string;
}

/** Applies a coupon against a subtotal, returning the discount in Toman. */
export const computeDiscount =
  async (
    couponCode: string,
    itemsTotal: number,
    userId?: string,
    items?: PricedItem[],
  ): Promise<{
    discount: number;
    coupon: InstanceType<
      typeof Coupon
    > | null;
    reason?: string;
  }> => {
    const code =
      couponCode
        .trim()
        .toUpperCase();
    if (
      !code
    )
      return {
        discount: 0,
        coupon:
          null,
      };

    const coupon =
      await Coupon.findOne(
        {
          code,
        },
      );
    if (
      !coupon
    )
      return {
        discount: 0,
        coupon:
          null,
        reason:
          "کد تخفیف یافت نشد",
      };

    const usable =
      coupon.isUsable(
        itemsTotal,
      );
    if (
      !usable.ok
    )
      return {
        discount: 0,
        coupon:
          null,
        reason:
          usable.reason,
      };

    if (
      coupon.perUserLimit >
        0 &&
      userId
    ) {
      // Count how many times this user consumed the coupon (see Order.coupon).
      const {
        Order,
      } =
        await import("../models/Order.js");
      const used =
        await Order.countDocuments(
          {
            user: new Types.ObjectId(
              userId,
            ),
            coupon:
              coupon._id,
            paymentStatus:
              "paid",
          },
        );
      if (
        used >=
        coupon.perUserLimit
      ) {
        return {
          discount: 0,
          coupon:
            null,
          reason:
            "شما پیشتر از این کد استفاده کردهاید",
        };
      }
    }

    // Category / product restricted coupons apply only to matching line items.
    let base =
      itemsTotal;
    if (
      coupon
        .categories
        .length >
        0 ||
      coupon
        .products
        .length >
        0
    ) {
      const productIds =
        coupon.products.map(
          (
            id,
          ) =>
            String(
              id,
            ),
        );
      const categoryIds =
        coupon.categories.map(
          (
            id,
          ) =>
            String(
              id,
            ),
        );
      const {
        Product,
      } =
        await import("../models/Product.js");
      const matching =
        await Product.find(
          {
            _id: {
              $in: (
                items ??
                []
              ).map(
                (
                  item,
                ) =>
                  item.product,
              ),
            },
            $or: [
              {
                _id: {
                  $in: productIds,
                },
              },
              {
                category:
                  {
                    $in: categoryIds,
                  },
              },
            ],
          },
        )
          .select(
            "_id",
          )
          .lean();
      const matchSet =
        new Set(
          matching.map(
            (
              item,
            ) =>
              String(
                item._id,
              ),
          ),
        );
      base =
        (
          items ??
          []
        )
          .filter(
            (
              item,
            ) =>
              matchSet.has(
                String(
                  item.product,
                ),
              ),
          )
          .reduce(
            (
              sum,
              item,
            ) =>
              sum +
              item.price *
                item.quantity,
            0,
          );

      if (
        base <=
        0
      ) {
        return {
          discount: 0,
          coupon:
            null,
          reason:
            "این کد برای اقلام سبد خرید شما معتبر نیست",
        };
      }
    }

    let discount =
      coupon.type ===
      "percent"
        ? Math.round(
            (base *
              coupon.amount) /
              100,
          )
        : coupon.amount;
    discount =
      Math.min(
        discount,
        base,
      );

    return {
      discount,
      coupon,
    };
  };

/** Full cart → order price breakdown, including shipping rules. */
export const priceCart =
  async (
    items: PricedItem[],
    couponCode: string,
    userId?: string,
  ): Promise<CartTotals> => {
    const shop =
      await getShopConfig();
    const itemsTotal =
      items.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.price *
            item.quantity,
        0,
      );

    const {
      discount,
      coupon,
      reason,
    } =
      await computeDiscount(
        couponCode,
        itemsTotal,
        userId,
        items,
      );
    if (
      reason &&
      couponCode.trim() !==
        ""
    ) {
      throw ApiError.badRequest(
        reason,
      );
    }

    const freeShipping =
      shop.freeShippingFrom >
        0 &&
      itemsTotal -
        discount >=
        shop.freeShippingFrom;
    const shippingCost =
      items.length ===
        0 ||
      freeShipping
        ? 0
        : shop.shippingCost;
    const payable =
      Math.max(
        0,
        itemsTotal -
          discount +
          shippingCost,
      );

    return {
      itemsTotal,
      discount,
      shippingCost,
      payable,
      freeShipping,
      couponCode:
        coupon?.code ??
        "",
    };
  };

/** Guards stock availability for every line before a payment is created. */
export const assertStockAvailable =
  (
    items: PricedItem[],
  ): void => {
    for (const item of items) {
      if (
        item.stock <=
        0
      ) {
        throw ApiError.badRequest(
          `محصول «${item.name}» موجود نیست`,
        );
      }
      if (
        item.quantity >
        item.stock
      ) {
        throw ApiError.badRequest(
          `موجودی «${item.name}» کافی نیست (حداکثر ${item.stock} عدد)`,
        );
      }
    }
  };
