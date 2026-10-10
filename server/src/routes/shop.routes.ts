import { Router } from "express";
import * as products from "../controllers/product.controller.js";
import * as brands from "../controllers/brand.controller.js";
import * as categories from "../controllers/product-category.controller.js";
import * as cart from "../controllers/cart.controller.js";
import * as orders from "../controllers/order.controller.js";
import {
  attachUser,
  requireAuth,
} from "../middleware/auth.js";
import { publicWriteLimiter } from "../middleware/rateLimit.js";
import {
  isNonEmpty,
  maxLength,
  minLength,
  validateBody,
} from "../middleware/validate.js";

const router =
  Router();

router.use(
  attachUser,
);

/* ------------------------------- Catalog ------------------------------- */
router.get(
  "/products",
  products.list,
);
router.get(
  "/products/facets",
  products.facets,
);
router.get(
  "/products/featured",
  products.featured,
);
router.get(
  "/products/:slug",
  products.getBySlug,
);
router.get(
  "/products/:slug/reviews",
  products.listReviews,
);
router.post(
  "/products/:slug/reviews",
  publicWriteLimiter,
  requireAuth,
  validateBody(
    {
      rating:
        [
          isNonEmpty,
        ],
      comment:
        [
          isNonEmpty,
          minLength(
            5,
            "متن نظر",
          ),
          maxLength(
            2000,
            "متن نظر",
          ),
        ],
    },
  ),
  products.createReview,
);
router.post(
  "/reviews/:id/helpful",
  publicWriteLimiter,
  products.markReviewHelpful,
);

router.get(
  "/brands",
  brands.list,
);
router.get(
  "/brands/:slug",
  brands.getBySlug,
);
router.get(
  "/categories",
  categories.list,
);
router.get(
  "/categories/:slug",
  categories.getBySlug,
);

router.post(
  "/compare",
  cart.compare,
);

/* -------------------------------- Cart --------------------------------- */
router.get(
  "/cart",
  requireAuth,
  cart.getCart,
);
router.post(
  "/cart/items",
  requireAuth,
  validateBody(
    {
      productId:
        [
          isNonEmpty,
        ],
    },
  ),
  cart.addItem,
);
router.put(
  "/cart/items/:id",
  requireAuth,
  cart.updateItem,
);
router.delete(
  "/cart/items/:id",
  requireAuth,
  cart.removeItem,
);
router.delete(
  "/cart",
  requireAuth,
  cart.clearCart,
);
router.post(
  "/cart/validate-coupon",
  requireAuth,
  validateBody(
    {
      code: [
        isNonEmpty,
      ],
    },
  ),
  cart.validateCoupon,
);

/* ------------------------------ Wishlist ------------------------------- */
router.get(
  "/wishlist",
  requireAuth,
  cart.getWishlist,
);
router.post(
  "/wishlist/:productId",
  requireAuth,
  cart.toggleWishlist,
);
router.delete(
  "/wishlist",
  requireAuth,
  cart.clearWishlist,
);

/* ------------------------------ Checkout ------------------------------- */
router.post(
  "/checkout",
  requireAuth,
  orders.checkout,
);
router.post(
  "/orders/:id/pay",
  requireAuth,
  orders.startPayment,
);
router.post(
  "/payment/verify",
  requireAuth,
  orders.verifyPaymentManual,
);
router.get(
  "/payment/callback",
  orders.paymentCallback,
);

/* ------------------------------- Orders -------------------------------- */
router.get(
  "/orders",
  requireAuth,
  orders.myOrders,
);
router.get(
  "/orders/lookup/:orderNumber",
  requireAuth,
  orders.lookupOrder,
);
router.get(
  "/orders/:id",
  requireAuth,
  orders.myOrder,
);
router.post(
  "/orders/:id/cancel",
  requireAuth,
  validateBody(
    {
      reason:
        [
          maxLength(
            300,
            "دلیل",
          ),
        ],
    },
  ),
  orders.cancelOrder,
);

export default router;
