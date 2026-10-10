import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/auth.js";
import { Cart } from "../models/Cart.js";
import {
  Order,
  IOrder,
  OrderStatus,
} from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import {
  ApiError,
  asyncHandler,
} from "../utils/ApiError.js";
import {
  assertObjectId,
  buildPageMeta,
  escapeRegex,
  parsePagination,
} from "../utils/helpers.js";
import { sendSuccess } from "../utils/respond.js";
import {
  assertStockAvailable,
  priceCart,
} from "../services/pricing.service.js";
import {
  buildZarinpalConfig,
  getShopConfig,
} from "../services/shop.config.js";
import {
  requestPayment,
  verifyPayment,
} from "../services/zarinpal.service.js";
import { env } from "../config/env.js";

const USER_FIELDS =
  "name email";
const PAYABLE_ITEM_FIELDS =
  "name slug cover price salePrice discountPercent stock status";

interface CheckoutBody {
  address: {
    fullName: string;
    phone: string;
    province: string;
    city: string;
    postalCode?: string;
    address: string;
    notes?: string;
  };
  couponCode?: string;
  shippingMethod?: string;
}

/** Builds the priced item list from the user's cart, verifying live prices/stock. */
const buildOrderItems =
  async (cart: {
    items: {
      product: Types.ObjectId;
      quantity: number;
    }[];
  }) => {
    const productIds =
      cart.items.map(
        (
          item,
        ) =>
          item.product,
      );
    const products =
      await Product.find(
        {
          _id: {
            $in: productIds,
          },
        },
      ).select(
        "name slug cover price salePrice discountPercent stock status variants",
      );
    const productMap =
      new Map(
        products.map(
          (
            product,
          ) => [
            String(
              product._id,
            ),
            product,
          ],
        ),
      );

    const priced =
      cart.items.map(
        (
          item,
        ) => {
          const product =
            productMap.get(
              String(
                item.product,
              ),
            );
          if (
            !product ||
            product.status !==
              "published"
          ) {
            throw ApiError.badRequest(
              "یکی از محصولات سبد خرید دیگر در دسترس نیست",
            );
          }
          // Use the cart's stored variant for price delta when present.
          const rawVariant =
            (
              item as unknown as {
                variant?: {
                  name: string;
                  value: string;
                };
              }
            )
              .variant ??
            null;
          const variantMatch =
            rawVariant
              ? product.variants.find(
                  (
                    v,
                  ) =>
                    v.name ===
                      rawVariant.name &&
                    v.value ===
                      rawVariant.value,
                )
              : null;

          let unit =
            product.price;
          if (
            product.salePrice >
              0 &&
            product.salePrice <
              product.price
          )
            unit =
              product.salePrice;
          else if (
            product.discountPercent >
            0
          )
            unit =
              Math.round(
                product.price *
                  (1 -
                    product.discountPercent /
                      100),
              );
          if (
            variantMatch?.priceDelta
          )
            unit +=
              variantMatch.priceDelta;

          const stock =
            variantMatch
              ? variantMatch.stock
              : product.stock;
          return {
            product:
              product._id,
            name: product.name,
            slug: product.slug,
            cover:
              product.cover,
            variant:
              rawVariant,
            price:
              unit,
            quantity:
              item.quantity,
            stock:
              Math.max(
                0,
                stock,
              ),
          };
        },
      );

    return priced;
  };

/* ------------------------------------------------------------------ */
/* Checkout & payment                                                  */
/* ------------------------------------------------------------------ */

/** POST /api/shop/checkout — validates the cart and creates a pending order. */
export const checkout =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();

      const {
        address,
        couponCode = "",
        shippingMethod = "post",
      } = req.body as CheckoutBody;
      if (
        !address?.fullName ||
        !address?.phone ||
        !address?.address
      ) {
        throw ApiError.badRequest(
          "اطلاعات آدرس گیرنده کامل نیست",
        );
      }

      const cart =
        await Cart.findOne(
          {
            user: req
              .user
              .id,
          },
        );
      if (
        !cart ||
        cart
          .items
          .length ===
          0
      )
        throw ApiError.badRequest(
          "سبد خرید شما خالی است",
        );

      const priced =
        await buildOrderItems(
          cart,
        );
      assertStockAvailable(
        priced,
      );

      const totals =
        await priceCart(
          priced,
          couponCode,
          req
            .user
            .id,
        );
      const coupon =
        couponCode
          ? await Coupon.findOne(
              {
                code: couponCode
                  .trim()
                  .toUpperCase(),
              },
            ).select(
              "_id",
            )
          : null;

      const order =
        await Order.create(
          {
            user: req
              .user
              .id,
            items:
              priced.map(
                (
                  item,
                ) => ({
                  product:
                    item.product,
                  name: item.name,
                  slug: item.slug,
                  cover:
                    item.cover,
                  variant:
                    item.variant,
                  price:
                    item.price,
                  quantity:
                    item.quantity,
                  total:
                    item.price *
                    item.quantity,
                }),
              ),
            itemsTotal:
              totals.itemsTotal,
            discount:
              totals.discount,
            shippingCost:
              totals.shippingCost,
            payable:
              totals.payable,
            couponCode:
              totals.couponCode,
            coupon:
              coupon?._id ??
              null,
            shippingMethod,
            address,
            status:
              "pending",
            paymentStatus:
              "unpaid",
          },
        );

      return sendSuccess(
        res,
        serializeOrder(
          order,
        ),
        {
          status: 201,
          message:
            "سفارش ثبت شد",
        },
      );
    },
  );

/** POST /api/shop/orders/:id/pay — requests a Zarinpal authority and payment URL. */
export const startPayment =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      assertObjectId(
        req
          .params
          .id,
        "شناسه سفارش",
      );

      const order =
        await Order.findOne(
          {
            _id: req
              .params
              .id,
            user: req
              .user
              .id,
          },
        );
      if (
        !order
      )
        throw ApiError.notFound(
          "سفارش یافت نشد",
        );
      if (
        order.paymentStatus ===
        "paid"
      )
        throw ApiError.badRequest(
          "این سفارش قبلاً پرداخت شده است",
        );
      if (
        order.status ===
        "cancelled"
      )
        throw ApiError.badRequest(
          "این سفارش لغو شده است",
        );

      const config =
        await buildZarinpalConfig(
          `پرداخت سفارش ${order.orderNumber}`,
        );
      const result =
        await requestPayment(
          config,
          order.payable,
          req
            .user
            .email,
          order
            .address
            ?.phone,
        );

      if (
        !result.ok ||
        !result.authority ||
        !result.paymentUrl
      ) {
        throw ApiError.badRequest(
          result.message ??
            "ایجاد تراکنش ناموفق بود",
        );
      }

      order.payment =
        {
          ...order.payment,
          gateway:
            "zarinpal",
          authority:
            result.authority,
        };
      await order.save();

      return sendSuccess(
        res,
        {
          paymentUrl:
            result.paymentUrl,
          authority:
            result.authority,
          orderNumber:
            order.orderNumber,
        },
      );
    },
  );

/** GET /api/shop/payment/callback — Zarinpal redirects here with ?Authority=&Status= */
export const paymentCallback =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const authority =
        String(
          req
            .query
            .Authority ??
            req
              .query
              .authority ??
            "",
        );
      const status =
        String(
          req
            .query
            .Status ??
            req
              .query
              .status ??
            "",
        );
      const clientBase =
        resolveClientBase();

      const order =
        await Order.findOne(
          {
            "payment.authority":
              authority,
          },
        );
      if (
        !order
      ) {
        return res.redirect(
          `${clientBase}/shop/payment-result?status=failed&reason=notfound`,
        );
      }

      if (
        status !==
          "OK" &&
        status !==
          "ok"
      ) {
        order.paymentStatus =
          "failed";
        order.status =
          "failed";
        await order.save();
        return res.redirect(
          `${clientBase}/shop/payment-result?order=${order.orderNumber}&status=failed&reason=cancelled`,
        );
      }

      const config =
        await buildZarinpalConfig(
          `پرداخت سفارش ${order.orderNumber}`,
        );
      const verify =
        await verifyPayment(
          config,
          order.payable,
          authority,
        );

      if (
        !verify.ok
      ) {
        order.paymentStatus =
          "failed";
        order.status =
          "failed";
        order.payment.raw =
          {
            verifyCode:
              verify.code,
            message:
              verify.message,
          };
        await order.save();
        return res.redirect(
          `${clientBase}/shop/payment-result?order=${order.orderNumber}&status=failed&reason=verify`,
        );
      }

      // Idempotent: if already paid (code 101) just redirect to success.
      if (
        order.paymentStatus !==
        "paid"
      ) {
        order.paymentStatus =
          "paid";
        order.status =
          "paid";
        order.payment.refId =
          verify.refId ??
          "";
        order.payment.cardPan =
          verify.cardPan ??
          "";
        order.payment.paidAt =
          new Date();
        order.payment.raw =
          {
            verifyCode:
              verify.code,
          };
        await order.save();

        await finalizeOrderSideEffects(
          order,
        );
      }

      return res.redirect(
        `${clientBase}/shop/payment-result?order=${order.orderNumber}&status=success&ref=${verify.refId ?? ""}`,
      );
    },
  );

/** POST /api/shop/payment/verify — manual/server-side verification fallback. */
export const verifyPaymentManual =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      const {
        authority,
        orderId,
      } =
        req.body as {
          authority: string;
          orderId?: string;
        };

      const order =
        orderId
          ? await Order.findOne(
              {
                _id: orderId,
                user: req
                  .user
                  .id,
              },
            )
          : await Order.findOne(
              {
                "payment.authority":
                  authority,
                user: req
                  .user
                  .id,
              },
            );
      if (
        !order
      )
        throw ApiError.notFound(
          "سفارش یافت نشد",
        );
      if (
        order.paymentStatus ===
        "paid"
      ) {
        return sendSuccess(
          res,
          serializeOrder(
            order,
          ),
          {
            message:
              "این سفارش قبلاً پرداخت شده است",
          },
        );
      }

      const config =
        await buildZarinpalConfig(
          `پرداخت سفارش ${order.orderNumber}`,
        );
      const verify =
        await verifyPayment(
          config,
          order.payable,
          order
            .payment
            .authority ??
            authority,
        );
      if (
        !verify.ok
      ) {
        order.paymentStatus =
          "failed";
        order.status =
          "failed";
        await order.save();
        throw ApiError.badRequest(
          verify.message ??
            "تأیید پرداخت ناموفق بود",
        );
      }

      order.paymentStatus =
        "paid";
      order.status =
        "paid";
      order.payment.refId =
        verify.refId ??
        "";
      order.payment.cardPan =
        verify.cardPan ??
        "";
      order.payment.paidAt =
        new Date();
      await order.save();
      await finalizeOrderSideEffects(
        order,
      );

      return sendSuccess(
        res,
        serializeOrder(
          order,
        ),
        {
          message:
            "پرداخت با موفقیت تأیید شد",
        },
      );
    },
  );

/** Decrements stock, bumps sold counters and consumes the coupon. */
const finalizeOrderSideEffects =
  async (
    order: IOrder,
  ) => {
    const operations =
      order.items.map(
        (
          item,
        ) => ({
          updateOne:
            {
              filter:
                {
                  _id: item.product,
                },
              update:
                {
                  $inc: {
                    stock:
                      -item.quantity,
                    soldCount:
                      item.quantity,
                  },
                },
            },
        }),
      );
    if (
      operations.length >
      0
    )
      await Product.bulkWrite(
        operations,
      );

    if (
      order.coupon
    ) {
      await Coupon.updateOne(
        {
          _id: order.coupon,
        },
        {
          $inc: {
            usedCount: 1,
          },
        },
      );
    }

    // Clear the user's cart now that the order is paid.
    await Cart.updateOne(
      {
        user: order.user,
      },
      {
        $set: {
          items:
            [],
          subtotal: 0,
        },
      },
    );
  };

/* ------------------------------------------------------------------ */
/* Customer order endpoints                                            */
/* ------------------------------------------------------------------ */

/** GET /api/shop/orders */
export const myOrders =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      const {
        page,
        limit,
        skip,
      } =
        parsePagination(
          req
            .query
            .page as string,
          req
            .query
            .limit as string,
          30,
        );

      const filter =
        {
          user: req
            .user
            .id,
        };
      const [
        items,
        total,
      ] =
        await Promise.all(
          [
            Order.find(
              filter,
            )
              .sort(
                {
                  createdAt:
                    -1,
                },
              )
              .skip(
                skip,
              )
              .limit(
                limit,
              )
              .lean(),
            Order.countDocuments(
              filter,
            ),
          ],
        );

      return sendSuccess(
        res,
        items.map(
          serializeOrderLean,
        ),
        {
          meta: buildPageMeta(
            total,
            page,
            limit,
          ),
        },
      );
    },
  );

/** GET /api/shop/orders/:id */
export const myOrder =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      assertObjectId(
        req
          .params
          .id,
        "شناسه سفارش",
      );
      const order =
        await Order.findOne(
          {
            _id: req
              .params
              .id,
            user: req
              .user
              .id,
          },
        );
      if (
        !order
      )
        throw ApiError.notFound(
          "سفارش یافت نشد",
        );
      return sendSuccess(
        res,
        serializeOrder(
          order,
        ),
      );
    },
  );

/** GET /api/shop/orders/lookup/:orderNumber */
export const lookupOrder =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const order =
        await Order.findOne(
          {
            orderNumber:
              req
                .params
                .orderNumber,
          },
        ).populate(
          "user",
          USER_FIELDS,
        );
      if (
        !order
      )
        throw ApiError.notFound(
          "سفارش یافت نشد",
        );
      return sendSuccess(
        res,
        serializeOrder(
          order,
        ),
      );
    },
  );

/** POST /api/shop/orders/:id/cancel */
export const cancelOrder =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      assertObjectId(
        req
          .params
          .id,
        "شناسه سفارش",
      );

      const order =
        await Order.findOne(
          {
            _id: req
              .params
              .id,
            user: req
              .user
              .id,
          },
        );
      if (
        !order
      )
        throw ApiError.notFound(
          "سفارش یافت نشد",
        );
      if (
        ![
          "pending",
          "paid",
          "processing",
        ].includes(
          order.status,
        )
      ) {
        throw ApiError.badRequest(
          "این سفارش در وضعیت فعلی قابل لغو نیست",
        );
      }

      order.status =
        "cancelled";
      order.cancelledAt =
        new Date();
      order.cancelReason =
        (
          req.body as {
            reason?: string;
          }
        )
          .reason ??
        "";
      await order.save();

      return sendSuccess(
        res,
        serializeOrder(
          order,
        ),
        {
          message:
            "سفارش لغو شد",
        },
      );
    },
  );

/* ------------------------------------------------------------------ */
/* Admin order endpoints                                               */
/* ------------------------------------------------------------------ */

/** GET /api/admin/shop/orders */
export const listForAdmin =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const {
        page,
        limit,
        skip,
      } =
        parsePagination(
          req
            .query
            .page as string,
          req
            .query
            .limit as string,
          100,
        );
      const {
        status,
        paymentStatus,
        q,
        sort,
      } =
        req.query as Record<
          string,
          string
        >;
      const filter: Record<
        string,
        unknown
      > =
        {};

      if (
        status &&
        status !==
          "all"
      )
        filter.status =
          status;
      if (
        paymentStatus &&
        paymentStatus !==
          "all"
      )
        filter.paymentStatus =
          paymentStatus;
      if (
        q
      ) {
        const regex =
          {
            $regex:
              escapeRegex(
                q,
              ),
            $options:
              "i",
          };
        filter.$or =
          [
            {
              orderNumber:
                regex,
            },
            {
              "address.fullName":
                regex,
            },
            {
              "address.phone":
                regex,
            },
          ];
      }

      const sortMap: Record<
        string,
        Record<
          string,
          | 1
          | -1
        >
      > = {
        newest:
          {
            createdAt:
              -1,
          },
        oldest:
          {
            createdAt: 1,
          },
        "amount-desc":
          {
            payable:
              -1,
          },
        "amount-asc":
          {
            payable: 1,
          },
      };

      const [
        items,
        total,
        statusCounts,
      ] =
        await Promise.all(
          [
            Order.find(
              filter,
            )
              .sort(
                sortMap[
                  sort ??
                    "newest"
                ] ??
                  sortMap.newest,
              )
              .skip(
                skip,
              )
              .limit(
                limit,
              )
              .populate(
                "user",
                USER_FIELDS,
              )
              .lean(),
            Order.countDocuments(
              filter,
            ),
            Order.aggregate<{
              _id: string;
              count: number;
            }>(
              [
                {
                  $group:
                    {
                      _id: "$status",
                      count:
                        {
                          $sum: 1,
                        },
                    },
                },
              ],
            ),
          ],
        );

      return sendSuccess(
        res,
        items.map(
          serializeOrderLean,
        ),
        {
          meta: {
            ...buildPageMeta(
              total,
              page,
              limit,
            ),
            statusCounts:
              Object.fromEntries(
                statusCounts.map(
                  (
                    item,
                  ) => [
                    item._id,
                    item.count,
                  ],
                ),
              ),
          },
        },
      );
    },
  );

/** GET /api/admin/shop/orders/:id */
export const getForAdmin =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه سفارش",
      );
      const order =
        await Order.findById(
          req
            .params
            .id,
        ).populate(
          "user",
          "name email phone slug",
        );
      if (
        !order
      )
        throw ApiError.notFound(
          "سفارش یافت نشد",
        );
      return sendSuccess(
        res,
        serializeOrder(
          order,
        ),
      );
    },
  );

/** PATCH /api/admin/shop/orders/:id/status */
export const updateStatus =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه سفارش",
      );
      const {
        status,
        trackingCode,
        cancelReason,
        adminNote,
      } =
        req.body as {
          status?: OrderStatus;
          trackingCode?: string;
          cancelReason?: string;
          adminNote?: string;
        };

      const order =
        await Order.findById(
          req
            .params
            .id,
        );
      if (
        !order
      )
        throw ApiError.notFound(
          "سفارش یافت نشد",
        );

      if (
        status
      ) {
        order.status =
          status;
        if (
          status ===
          "shipped"
        ) {
          order.shippedAt =
            new Date();
          if (
            trackingCode
          )
            order.trackingCode =
              trackingCode;
        }
        if (
          status ===
          "delivered"
        )
          order.deliveredAt =
            new Date();
        if (
          status ===
          "cancelled"
        ) {
          order.cancelledAt =
            new Date();
          if (
            cancelReason
          )
            order.cancelReason =
              cancelReason;
        }
      }
      if (
        trackingCode !==
        undefined
      )
        order.trackingCode =
          trackingCode;
      if (
        adminNote !==
        undefined
      )
        order.adminNote =
          adminNote;

      await order.save();
      return sendSuccess(
        res,
        serializeOrder(
          order,
        ),
        {
          message:
            "وضعیت سفارش بهروزرسانی شد",
        },
      );
    },
  );

/** PATCH /api/admin/shop/orders/:id/payment — mark paid/refunded manually. */
export const updatePaymentStatus =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه سفارش",
      );
      const {
        paymentStatus,
      } =
        req.body as {
          paymentStatus: string;
        };

      const order =
        await Order.findById(
          req
            .params
            .id,
        );
      if (
        !order
      )
        throw ApiError.notFound(
          "سفارش یافت نشد",
        );

      order.paymentStatus =
        paymentStatus as IOrder["paymentStatus"];
      if (
        paymentStatus ===
          "paid" &&
        !order
          .payment
          .paidAt
      ) {
        order.payment.paidAt =
          new Date();
        if (
          order.status ===
          "pending"
        )
          order.status =
            "paid";
      }
      if (
        paymentStatus ===
        "refunded"
      )
        order.status =
          "refunded";
      await order.save();

      return sendSuccess(
        res,
        serializeOrder(
          order,
        ),
        {
          message:
            "وضعیت پرداخت بهروزرسانی شد",
        },
      );
    },
  );

/** POST /api/admin/shop/orders/bulk */
export const bulkAction =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const {
        ids,
        action,
      } =
        req.body as {
          ids: string[];
          action: string;
        };
      if (
        !Array.isArray(
          ids,
        ) ||
        ids.length ===
          0
      )
        throw ApiError.badRequest(
          "سفارشی انتخاب نشده است",
        );

      if (
        action ===
        "delete"
      ) {
        const removed =
          await Order.deleteMany(
            {
              _id: {
                $in: ids,
              },
            },
          );
        return sendSuccess(
          res,
          {
            affected:
              removed.deletedCount ??
              0,
          },
          {
            message:
              "سفارشها حذف شدند",
          },
        );
      }

      const statusMap: Record<
        string,
        OrderStatus
      > =
        {
          processing:
            "processing",
          shipped:
            "shipped",
          delivered:
            "delivered",
          cancelled:
            "cancelled",
        };
      const status =
        statusMap[
          action
        ];
      if (
        !status
      )
        throw ApiError.badRequest(
          "عملیات نامعتبر است",
        );

      const updated =
        await Order.updateMany(
          {
            _id: {
              $in: ids,
            },
          },
          {
            $set: {
              status,
            },
          },
        );
      return sendSuccess(
        res,
        {
          affected:
            updated.modifiedCount ??
            0,
        },
        {
          message:
            "عملیات با موفقیت انجام شد",
        },
      );
    },
  );

/* ------------------------------------------------------------------ */
/* Serialisation helpers                                               */
/* ------------------------------------------------------------------ */

const resolveClientBase =
  (): string => {
    const origin =
      env.corsOrigins.find(
        (
          item,
        ) =>
          item !==
          "*",
      ) ??
      "http://localhost:4200";
    return origin.replace(
      /\/$/,
      "",
    );
  };

const serializeOrder =
  (
    order: IOrder,
  ) =>
    order.toJSON();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeOrderLean =
  (
    order: any,
  ) => ({
    ...order,
  });
export { PAYABLE_ITEM_FIELDS };
