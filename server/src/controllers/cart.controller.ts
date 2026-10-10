import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/auth.js";
import {
  Cart,
  ICartItem,
} from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Wishlist } from "../models/Wishlist.js";
import {
  ApiError,
  asyncHandler,
} from "../utils/ApiError.js";
import { assertObjectId } from "../utils/helpers.js";
import { sendSuccess } from "../utils/respond.js";
import { priceCart } from "../services/pricing.service.js";

const PRODUCT_FIELDS =
  "name slug cover price salePrice discountPercent stock status finalPrice effectiveDiscount";

/** Loads the current user's cart, creating one lazily. */
const getOrCreateCart =
  async (
    userId: string,
  ) => {
    const cart =
      await Cart.findOne(
        {
          user: userId,
        },
      );
    if (
      cart
    )
      return cart;
    return Cart.create(
      {
        user: userId,
        items:
          [],
      },
    );
  };

const computeUnitPrice =
  (product: {
    price: number;
    salePrice: number;
    discountPercent: number;
  }): number => {
    if (
      product.salePrice >
        0 &&
      product.salePrice <
        product.price
    )
      return product.salePrice;
    if (
      product.discountPercent >
      0
    )
      return Math.round(
        product.price *
          (1 -
            product.discountPercent /
              100),
      );
    return product.price;
  };

/** Resolves variant stock (falls back to the product stock when no variant). */
const resolveStock =
  (
    product: {
      stock: number;
      variants: {
        name: string;
        value: string;
        stock: number;
      }[];
    },
    variant?: {
      name: string;
      value: string;
    } | null,
  ): number => {
    if (
      !variant
    )
      return product.stock;
    const match =
      product.variants.find(
        (
          item,
        ) =>
          item.name ===
            variant.name &&
          item.value ===
            variant.value,
      );
    return match
      ? match.stock
      : product.stock;
  };

const serializeCart =
  async (cart: {
    items: ICartItem[];
  }) => {
    const totals =
      await priceCart(
        cart.items.map(
          (
            item,
          ) => ({
            product:
              item.product as Types.ObjectId,
            name: item.name,
            slug: item.slug,
            cover:
              item.cover,
            variant:
              item.variant ??
              null,
            price:
              item.price,
            quantity:
              item.quantity,
            stock:
              item.stock,
          }),
        ),
        "",
      ).catch(
        () =>
          null,
      );

    const itemsCount =
      cart.items.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.quantity,
        0,
      );
    const subtotal =
      cart.items.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.price *
            item.quantity,
        0,
      );

    return {
      items:
        cart.items.map(
          (
            item,
          ) => ({
            id: String(
              (
                item as unknown as {
                  _id: Types.ObjectId;
                }
              )
                ._id,
            ),
            product:
              item.product,
            name: item.name,
            slug: item.slug,
            cover:
              item.cover,
            variant:
              item.variant ??
              null,
            price:
              item.price,
            quantity:
              item.quantity,
            stock:
              item.stock,
            total:
              item.price *
              item.quantity,
          }),
        ),
      itemsCount,
      subtotal,
      shippingCost:
        totals?.shippingCost ??
        0,
    };
  };

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

/** GET /api/shop/cart */
export const getCart =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      const cart =
        await getOrCreateCart(
          req
            .user
            .id,
        );
      return sendSuccess(
        res,
        await serializeCart(
          cart,
        ),
      );
    },
  );

/** POST /api/shop/cart/items */
export const addItem =
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
        productId,
        quantity = 1,
        variant,
      } = req.body as {
        productId: string;
        quantity?: number;
        variant?: {
          name: string;
          value: string;
        } | null;
      };
      assertObjectId(
        productId,
        "شناسه محصول",
      );

      const product =
        await Product.findOne(
          {
            _id: productId,
            status:
              "published",
          },
        );
      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );

      const stock =
        resolveStock(
          product,
          variant ??
            null,
        );
      const qty =
        Math.max(
          1,
          Math.min(
            Number(
              quantity,
            ) ||
              1,
            20,
          ),
        );
      if (
        stock <=
        0
      )
        throw ApiError.badRequest(
          "این محصول موجود نیست",
        );

      const cart =
        await getOrCreateCart(
          req
            .user
            .id,
        );
      const variantKey =
        variant ??
        null;
      const existing =
        cart.items.find(
          (
            item,
          ) =>
            String(
              item.product,
            ) ===
              productId &&
            (item
              .variant
              ?.name ??
              "") ===
              (variantKey?.name ??
                "") &&
            (item
              .variant
              ?.value ??
              "") ===
              (variantKey?.value ??
                ""),
        );

      const price =
        computeUnitPrice(
          product,
        );
      if (
        existing
      ) {
        existing.quantity =
          Math.min(
            existing.quantity +
              qty,
            stock,
            20,
          );
        existing.price =
          price;
        existing.stock =
          stock;
      } else {
        cart.items.push(
          {
            product:
              product._id,
            name: product.name,
            slug: product.slug,
            cover:
              product.cover,
            variant:
              variantKey,
            price,
            quantity:
              Math.min(
                qty,
                stock,
              ),
            stock,
          },
        );
      }

      cart.subtotal =
        cart.items.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            item.price *
              item.quantity,
          0,
        );
      await cart.save();
      return sendSuccess(
        res,
        await serializeCart(
          cart,
        ),
        {
          message:
            "به سبد خرید اضافه شد",
        },
      );
    },
  );

/** PUT /api/shop/cart/items/:id */
export const updateItem =
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
        "شناسه ردیف سبد",
      );

      const {
        quantity,
      } =
        req.body as {
          quantity: number;
        };
      const cart =
        await getOrCreateCart(
          req
            .user
            .id,
        );
      const item =
        cart.items.find(
          (
            entry,
          ) =>
            String(
              (
                entry as unknown as {
                  _id: Types.ObjectId;
                }
              )
                ._id,
            ) ===
            req
              .params
              .id,
        );
      if (
        !item
      )
        throw ApiError.notFound(
          "ردیف سبد خرید یافت نشد",
        );

      const stock =
        item.stock ||
        20;
      const qty =
        Math.max(
          1,
          Math.min(
            Number(
              quantity,
            ) ||
              1,
            stock,
            20,
          ),
        );
      item.quantity =
        qty;

      cart.subtotal =
        cart.items.reduce(
          (
            sum,
            entry,
          ) =>
            sum +
            entry.price *
              entry.quantity,
          0,
        );
      await cart.save();
      return sendSuccess(
        res,
        await serializeCart(
          cart,
        ),
        {
          message:
            "سبد خرید بهروزرسانی شد",
        },
      );
    },
  );

/** DELETE /api/shop/cart/items/:id */
export const removeItem =
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
        "شناسه ردیف سبد",
      );

      const cart =
        await getOrCreateCart(
          req
            .user
            .id,
        );
      cart.items =
        cart.items.filter(
          (
            entry,
          ) =>
            String(
              (
                entry as unknown as {
                  _id: Types.ObjectId;
                }
              )
                ._id,
            ) !==
            req
              .params
              .id,
        );
      cart.subtotal =
        cart.items.reduce(
          (
            sum,
            entry,
          ) =>
            sum +
            entry.price *
              entry.quantity,
          0,
        );
      await cart.save();
      return sendSuccess(
        res,
        await serializeCart(
          cart,
        ),
        {
          message:
            "کالا از سبد حذف شد",
        },
      );
    },
  );

/** DELETE /api/shop/cart */
export const clearCart =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      const cart =
        await getOrCreateCart(
          req
            .user
            .id,
        );
      cart.items =
        [];
      cart.subtotal = 0;
      await cart.save();
      return sendSuccess(
        res,
        await serializeCart(
          cart,
        ),
        {
          message:
            "سبد خرید خالی شد",
        },
      );
    },
  );

/** POST /api/shop/cart/validate-coupon */
export const validateCoupon =
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
        code,
      } =
        req.body as {
          code: string;
        };

      const cart =
        await getOrCreateCart(
          req
            .user
            .id,
        );
      if (
        cart
          .items
          .length ===
        0
      )
        throw ApiError.badRequest(
          "سبد خرید شما خالی است",
        );

      const totals =
        await priceCart(
          cart.items.map(
            (
              item,
            ) => ({
              product:
                item.product as Types.ObjectId,
              name: item.name,
              slug: item.slug,
              cover:
                item.cover,
              variant:
                item.variant ??
                null,
              price:
                item.price,
              quantity:
                item.quantity,
              stock:
                item.stock,
            }),
          ),
          code,
          req
            .user
            .id,
        );

      return sendSuccess(
        res,
        totals,
        {
          message:
            "کد تخفیف اعمال شد",
        },
      );
    },
  );

/* ------------------------------------------------------------------ */
/* Wishlist                                                            */
/* ------------------------------------------------------------------ */

/** GET /api/shop/wishlist */
export const getWishlist =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      const wishlist =
        await Wishlist.findOneAndUpdate(
          {
            user: req
              .user
              .id,
          },
          {
            $setOnInsert:
              {
                user: req
                  .user
                  .id,
              },
          },
          {
            new: true,
            upsert: true,
          },
        ).populate(
          {
            path: "products",
            select:
              PRODUCT_FIELDS,
            match:
              {
                status:
                  "published",
              },
          },
        );

      return sendSuccess(
        res,
        (
          wishlist.products as unknown[]
        ).filter(
          Boolean,
        ),
      );
    },
  );

/** POST /api/shop/wishlist/:productId — toggle. */
export const toggleWishlist =
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
          .productId,
        "شناسه محصول",
      );

      const wishlist =
        await Wishlist.findOneAndUpdate(
          {
            user: req
              .user
              .id,
          },
          {
            $setOnInsert:
              {
                user: req
                  .user
                  .id,
              },
          },
          {
            new: true,
            upsert: true,
          },
        );

      const productId =
        new Types.ObjectId(
          req
            .params
            .productId,
        );
      const exists =
        wishlist.products.some(
          (
            id,
          ) =>
            String(
              id,
            ) ===
            req
              .params
              .productId,
        );
      if (
        exists
      ) {
        wishlist.products =
          wishlist.products.filter(
            (
              id,
            ) =>
              String(
                id,
              ) !==
              req
                .params
                .productId,
          );
      } else {
        wishlist.products.push(
          productId,
        );
      }
      await wishlist.save();

      return sendSuccess(
        res,
        {
          wishlisted:
            !exists,
        },
        {
          message:
            exists
              ? "از علاقهمندیها حذف شد"
              : "به علاقهمندیها اضافه شد",
        },
      );
    },
  );

/** DELETE /api/shop/wishlist */
export const clearWishlist =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();
      await Wishlist.findOneAndUpdate(
        {
          user: req
            .user
            .id,
        },
        {
          $set: {
            products:
              [],
          },
        },
        {
          upsert: true,
        },
      );
      return sendSuccess(
        res,
        [],
        {
          message:
            "لیست علاقهمندیها خالی شد",
        },
      );
    },
  );

/* ------------------------------------------------------------------ */
/* Compare                                                             */
/* ------------------------------------------------------------------ */

/** POST /api/shop/compare — public; returns the products for the given ids. */
export const compare =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const {
        ids,
      } =
        req.body as {
          ids: string[];
        };
      if (
        !Array.isArray(
          ids,
        ) ||
        ids.length ===
          0
      )
        return sendSuccess(
          res,
          [],
        );
      if (
        ids.length >
        4
      )
        throw ApiError.badRequest(
          "حداکثر ۴ محصول قابل مقایسه است",
        );

      const products =
        await Product.find(
          {
            _id: {
              $in: ids.slice(
                0,
                4,
              ),
            },
            status:
              "published",
          },
        )
          .populate(
            "brand",
            "name slug logo",
          )
          .populate(
            "category",
            "name slug color",
          )
          .lean(
            {
              virtuals: true,
            },
          );

      return sendSuccess(
        res,
        products,
      );
    },
  );
