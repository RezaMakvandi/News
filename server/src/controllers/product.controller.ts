import { Response } from "express";
import { FilterQuery } from "mongoose";
import { AuthRequest } from "../middleware/auth.js";
import {
  Product,
  IProduct,
} from "../models/Product.js";
import { Brand } from "../models/Brand.js";
import { ProductCategory } from "../models/ProductCategory.js";
import { Review } from "../models/Review.js";
import { Cart } from "../models/Cart.js";
import { Wishlist } from "../models/Wishlist.js";
import {
  ApiError,
  asyncHandler,
} from "../utils/ApiError.js";
import {
  assertObjectId,
  buildPageMeta,
  escapeRegex,
  parsePagination,
  sanitizeHtml,
  slugify,
} from "../utils/helpers.js";
import { sendSuccess } from "../utils/respond.js";

const BRAND_FIELDS =
  "name slug logo country";
const CATEGORY_FIELDS =
  "name slug color icon";
const LIST_FIELDS =
  "name slug summary cover price salePrice discountPercent stock rating ratingCount soldCount isFeatured isNewArrival brand category createdAt finalPrice effectiveDiscount";

const PRODUCT_SORTS: Record<
  string,
  Record<
    string,
    1 | -1
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
  "price-asc":
    {
      salePrice: 1,
      price: 1,
    },
  "price-desc":
    {
      salePrice:
        -1,
      price:
        -1,
    },
  popular:
    {
      soldCount:
        -1,
      views:
        -1,
    },
  rating:
    {
      rating:
        -1,
      ratingCount:
        -1,
    },
  views: {
    views:
      -1,
  },
};

const uniqueSlug =
  async (
    name: string,
    currentId?: string,
  ): Promise<string> => {
    const base =
      slugify(
        name,
        "product",
      );
    let candidate =
      base;
    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (
      true
    ) {
      const existing =
        await Product.findOne(
          {
            slug: candidate,
          },
        )
          .select(
            "_id",
          )
          .lean();
      if (
        !existing ||
        (currentId &&
          String(
            existing._id,
          ) ===
            currentId)
      )
        return candidate;
      candidate = `${base}-${counter++}`;
    }
  };

/** Resolves category slug/id input into a ProductCategory _id. */
const resolveCategory =
  async (
    value: string,
  ): Promise<string> => {
    const category =
      /^[0-9a-fA-F]{24}$/.test(
        value,
      )
        ? await ProductCategory.findById(
            value,
          )
        : await ProductCategory.findOne(
            {
              slug: value,
            },
          );
    if (
      !category
    )
      throw ApiError.notFound(
        "دستهبندی محصول یافت نشد",
      );
    return category.id;
  };

const buildPublicFilter =
  (
    query: Record<
      string,
      string
    >,
  ): FilterQuery<IProduct> => {
    const filter: FilterQuery<IProduct> =
      {
        status:
          "published",
      };
    const {
      q,
      minPrice,
      maxPrice,
      inStock,
      featured,
      brand,
      onSale,
      rating,
    } =
      query;

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
            name: regex,
          },
          {
            summary:
              regex,
          },
          {
            sku: regex,
          },
        ];
    }
    if (
      minPrice ||
      maxPrice
    ) {
      filter.price =
        {};
      if (
        minPrice
      )
        (
          filter.price as Record<
            string,
            number
          >
        ).$gte =
          Number(
            minPrice,
          );
      if (
        maxPrice
      )
        (
          filter.price as Record<
            string,
            number
          >
        ).$lte =
          Number(
            maxPrice,
          );
    }
    if (
      inStock ===
      "true"
    )
      filter.stock =
        {
          $gt: 0,
        };
    if (
      featured ===
      "true"
    )
      filter.isFeatured = true;
    if (
      onSale ===
      "true"
    )
      filter.$expr =
        {
          $gt: [
            "$discountPercent",
            0,
          ],
        };
    if (
      rating
    )
      filter.rating =
        {
          $gte: Number(
            rating,
          ),
        };
    if (
      brand
    ) {
      // eslint-disable-next-line no-unused-expressions
      filter.brand =
        /^[0-9a-fA-F]{24}$/.test(
          brand,
        )
          ? brand
          : null;
    }
    return filter;
  };

/* ------------------------------------------------------------------ */
/* Public endpoints                                                    */
/* ------------------------------------------------------------------ */

/** GET /api/shop/products */
export const list =
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
          48,
        );
      const query =
        req.query as Record<
          string,
          string
        >;
      const filter =
        buildPublicFilter(
          query,
        );

      if (
        query.category
      )
        filter.category =
          await resolveCategory(
            query.category,
          );
      if (
        query.brand &&
        !/^[0-9a-fA-F]{24}$/.test(
          query.brand,
        )
      ) {
        const brandDoc =
          await Brand.findOne(
            {
              slug: query.brand,
            },
          )
            .select(
              "_id",
            )
            .lean();
        filter.brand =
          brandDoc
            ? brandDoc._id
            : {
                $exists: false,
              };
      }

      const sort =
        PRODUCT_SORTS[
          query.sort ??
            "newest"
        ] ??
        PRODUCT_SORTS.newest;

      const [
        items,
        total,
      ] =
        await Promise.all(
          [
            Product.find(
              filter,
            )
              .sort(
                sort,
              )
              .skip(
                skip,
              )
              .limit(
                limit,
              )
              .populate(
                "brand",
                BRAND_FIELDS,
              )
              .populate(
                "category",
                CATEGORY_FIELDS,
              )
              .lean(
                {
                  virtuals: true,
                },
              ),
            Product.countDocuments(
              filter,
            ),
          ],
        );

      return sendSuccess(
        res,
        items,
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

/** GET /api/shop/products/facets — price range + brands + categories. */
export const facets =
  asyncHandler(
    async (
      _req: AuthRequest,
      res: Response,
    ) => {
      const base =
        {
          status:
            "published" as const,
        };

      const [
        priceAgg,
        brands,
        categories,
      ] =
        await Promise.all(
          [
            Product.aggregate<{
              min: number;
              max: number;
            }>(
              [
                {
                  $match:
                    base,
                },
                {
                  $group:
                    {
                      _id: null,
                      min: {
                        $min: "$price",
                      },
                      max: {
                        $max: "$price",
                      },
                    },
                },
              ],
            ),
            Product.aggregate<{
              _id: unknown;
              count: number;
              brand?: {
                name: string;
                slug: string;
                logo?: string;
              };
            }>(
              [
                {
                  $match:
                    {
                      ...base,
                      brand:
                        {
                          $ne: null,
                        },
                    },
                },
                {
                  $group:
                    {
                      _id: "$brand",
                      count:
                        {
                          $sum: 1,
                        },
                    },
                },
                {
                  $lookup:
                    {
                      from: "brands",
                      localField:
                        "_id",
                      foreignField:
                        "_id",
                      as: "brand",
                    },
                },
                {
                  $unwind:
                    {
                      path: "$brand",
                      preserveNullAndEmptyArrays: true,
                    },
                },
                {
                  $project:
                    {
                      count: 1,
                      "brand.name": 1,
                      "brand.slug": 1,
                      "brand.logo": 1,
                    },
                },
              ],
            ),
            Product.aggregate<{
              _id: unknown;
              count: number;
              category?: {
                name: string;
                slug: string;
                color?: string;
                icon?: string;
              };
            }>(
              [
                {
                  $match:
                    base,
                },
                {
                  $group:
                    {
                      _id: "$category",
                      count:
                        {
                          $sum: 1,
                        },
                    },
                },
                {
                  $lookup:
                    {
                      from: "productcategories",
                      localField:
                        "_id",
                      foreignField:
                        "_id",
                      as: "category",
                    },
                },
                {
                  $unwind:
                    {
                      path: "$category",
                      preserveNullAndEmptyArrays: true,
                    },
                },
                {
                  $project:
                    {
                      count: 1,
                      "category.name": 1,
                      "category.slug": 1,
                      "category.color": 1,
                      "category.icon": 1,
                    },
                },
              ],
            ),
          ],
        );

      return sendSuccess(
        res,
        {
          priceRange:
            {
              min:
                priceAgg[0]
                  ?.min ??
                0,
              max:
                priceAgg[0]
                  ?.max ??
                0,
            },
          brands:
            brands.filter(
              (
                item,
              ) =>
                item.brand,
            ),
          categories:
            categories.filter(
              (
                item,
              ) =>
                item.category,
            ),
        },
      );
    },
  );

/** GET /api/shop/products/featured — home page blocks. */
export const featured =
  asyncHandler(
    async (
      _req: AuthRequest,
      res: Response,
    ) => {
      const base =
        {
          status:
            "published" as const,
        };
      const [
        featuredItems,
        latest,
        bestSellers,
        onSale,
      ] =
        await Promise.all(
          [
            Product.find(
              {
                ...base,
                isFeatured: true,
              },
            )
              .sort(
                {
                  createdAt:
                    -1,
                },
              )
              .limit(
                8,
              )
              .populate(
                "brand",
                BRAND_FIELDS,
              )
              .lean(
                {
                  virtuals: true,
                },
              ),
            Product.find(
              base,
            )
              .sort(
                {
                  createdAt:
                    -1,
                },
              )
              .limit(
                8,
              )
              .populate(
                "brand",
                BRAND_FIELDS,
              )
              .lean(
                {
                  virtuals: true,
                },
              ),
            Product.find(
              base,
            )
              .sort(
                {
                  soldCount:
                    -1,
                },
              )
              .limit(
                8,
              )
              .populate(
                "brand",
                BRAND_FIELDS,
              )
              .lean(
                {
                  virtuals: true,
                },
              ),
            Product.find(
              {
                ...base,
                discountPercent:
                  {
                    $gt: 0,
                  },
              },
            )
              .sort(
                {
                  discountPercent:
                    -1,
                },
              )
              .limit(
                8,
              )
              .populate(
                "brand",
                BRAND_FIELDS,
              )
              .lean(
                {
                  virtuals: true,
                },
              ),
          ],
        );

      return sendSuccess(
        res,
        {
          featured:
            featuredItems,
          latest,
          bestSellers,
          onSale,
        },
      );
    },
  );

/** GET /api/shop/products/:slug */
export const getBySlug =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const product =
        await Product.findOneAndUpdate(
          {
            slug: req
              .params
              .slug,
            status:
              "published",
          },
          {
            $inc: {
              views: 1,
            },
          },
          {
            new: true,
          },
        )
          .populate(
            "brand",
            BRAND_FIELDS,
          )
          .populate(
            "category",
            CATEGORY_FIELDS,
          )
          .populate(
            "tags",
            "name slug",
          );

      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );

      const related =
        await Product.find(
          {
            status:
              "published",
            _id: {
              $ne: product._id,
            },
            $or: [
              {
                category:
                  product.category,
              },
              {
                brand:
                  product.brand,
              },
            ],
          },
        )
          .sort(
            {
              soldCount:
                -1,
            },
          )
          .limit(
            8,
          )
          .populate(
            "brand",
            BRAND_FIELDS,
          )
          .lean(
            {
              virtuals: true,
            },
          );

      // Rating histogram + can the current user review?
      const histogram =
        await Review.aggregate<{
          _id: number;
          count: number;
        }>(
          [
            {
              $match:
                {
                  product:
                    product._id,
                  status:
                    "approved",
                },
            },
            {
              $group:
                {
                  _id: "$rating",
                  count:
                    {
                      $sum: 1,
                    },
                },
            },
          ],
        );

      let canReview = false;
      if (
        req.user
      ) {
        const existing =
          await Review.findOne(
            {
              product:
                product._id,
              user: req
                .user
                .id,
            },
          )
            .select(
              "_id",
            )
            .lean();
        canReview =
          !existing;
      }

      return sendSuccess(
        res,
        {
          product:
            product.toJSON(),
          related,
          ratingHistogram:
            Object.fromEntries(
              histogram.map(
                (
                  item,
                ) => [
                  item._id,
                  item.count,
                ],
              ),
            ),
          canReview,
        },
      );
    },
  );

/** GET /api/shop/products/:slug/reviews */
export const listReviews =
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
          30,
        );
      const product =
        await Product.findOne(
          {
            slug: req
              .params
              .slug,
          },
        )
          .select(
            "_id",
          )
          .lean();
      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );

      const filter =
        {
          product:
            product._id,
          status:
            "approved" as const,
        };
      const [
        items,
        total,
      ] =
        await Promise.all(
          [
            Review.find(
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
              .populate(
                "user",
                "name avatar slug",
              )
              .lean(),
            Review.countDocuments(
              filter,
            ),
          ],
        );

      return sendSuccess(
        res,
        items,
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

/** POST /api/shop/products/:slug/reviews */
export const createReview =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      if (
        !req.user
      )
        throw ApiError.unauthorized();

      const product =
        await Product.findOne(
          {
            slug: req
              .params
              .slug,
            status:
              "published",
          },
        ).select(
          "_id",
        );
      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );

      const exists =
        await Review.findOne(
          {
            product:
              product._id,
            user: req
              .user
              .id,
          },
        );
      if (
        exists
      )
        throw ApiError.conflict(
          "شما قبلاً برای این محصول نظر ثبت کردهاید",
        );

      const {
        rating,
        title,
        comment,
        pros,
        cons,
      } =
        req.body as {
          rating: number;
          title?: string;
          comment: string;
          pros?: string[];
          cons?: string[];
        };

      if (
        !rating ||
        rating <
          1 ||
        rating >
          5
      )
        throw ApiError.badRequest(
          "امتیاز باید بین ۱ تا ۵ باشد",
        );

      const review =
        await Review.create(
          {
            product:
              product._id,
            user: req
              .user
              .id,
            rating,
            title,
            comment,
            pros: Array.isArray(
              pros,
            )
              ? pros.slice(
                  0,
                  8,
                )
              : [],
            cons: Array.isArray(
              cons,
            )
              ? cons.slice(
                  0,
                  8,
                )
              : [],
            status:
              "pending",
            isVerifiedPurchase: false,
          },
        );

      return sendSuccess(
        res,
        review,
        {
          status: 201,
          message:
            "نظر شما ثبت شد و پس از تأیید نمایش داده میشود",
        },
      );
    },
  );

/** POST /api/shop/reviews/:id/helpful */
export const markReviewHelpful =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه نظر",
      );
      const review =
        await Review.findOneAndUpdate(
          {
            _id: req
              .params
              .id,
            status:
              "approved",
          },
          {
            $inc: {
              helpfulCount: 1,
            },
          },
          {
            new: true,
          },
        ).select(
          "helpfulCount",
        );
      if (
        !review
      )
        throw ApiError.notFound(
          "نظر مورد نظر یافت نشد",
        );
      return sendSuccess(
        res,
        {
          helpfulCount:
            review.helpfulCount,
        },
      );
    },
  );

/* ------------------------------------------------------------------ */
/* Admin endpoints                                                     */
/* ------------------------------------------------------------------ */

/** GET /api/admin/shop/products */
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
        category,
        brand,
        q,
        sort,
      } =
        req.query as Record<
          string,
          string
        >;
      const filter: FilterQuery<IProduct> =
        {};

      if (
        status &&
        status !==
          "all"
      )
        filter.status =
          status;
      if (
        category &&
        category !==
          "all"
      )
        filter.category =
          category;
      if (
        brand &&
        brand !==
          "all"
      )
        filter.brand =
          brand;
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
              name: regex,
            },
            {
              sku: regex,
            },
            {
              slug: regex,
            },
          ];
      }

      const sortMap =
        PRODUCT_SORTS[
          sort ??
            "newest"
        ] ??
        PRODUCT_SORTS.newest;

      const [
        items,
        total,
        statusCounts,
      ] =
        await Promise.all(
          [
            Product.find(
              filter,
            )
              .sort(
                sortMap,
              )
              .skip(
                skip,
              )
              .limit(
                limit,
              )
              .populate(
                "brand",
                BRAND_FIELDS,
              )
              .populate(
                "category",
                CATEGORY_FIELDS,
              )
              .lean(
                {
                  virtuals: true,
                },
              ),
            Product.countDocuments(
              filter,
            ),
            Product.aggregate<{
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
        items,
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

/** GET /api/admin/shop/products/:id */
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
        "شناسه محصول",
      );
      const product =
        await Product.findById(
          req
            .params
            .id,
        )
          .populate(
            "brand",
            BRAND_FIELDS,
          )
          .populate(
            "category",
            CATEGORY_FIELDS,
          )
          .populate(
            "tags",
            "name slug",
          );
      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );
      return sendSuccess(
        res,
        product.toJSON(),
      );
    },
  );

/** POST /api/admin/shop/products */
export const create =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const body =
        req.body as Record<
          string,
          any
        >;
      if (
        !body.category
      )
        throw ApiError.badRequest(
          "انتخاب دستهبندی الزامی است",
        );

      const product =
        await Product.create(
          {
            ...body,
            slug: await uniqueSlug(
              body.slug ||
                body.name,
            ),
            category:
              await resolveCategory(
                String(
                  body.category,
                ),
              ),
            brand:
              body.brand ||
              null,
            description:
              sanitizeHtml(
                body.description ??
                  "",
              ),
          },
        );

      return sendSuccess(
        res,
        product.toJSON(),
        {
          status: 201,
          message:
            "محصول ایجاد شد",
        },
      );
    },
  );

/** PUT /api/admin/shop/products/:id */
export const update =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه محصول",
      );
      const product =
        await Product.findById(
          req
            .params
            .id,
        );
      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );

      const body =
        req.body as Record<
          string,
          any
        >;
      if (
        body.slug &&
        body.slug !==
          product.slug
      ) {
        product.slug =
          await uniqueSlug(
            body.slug,
            product.id,
          );
      }
      if (
        body.category !==
          undefined &&
        String(
          body.category,
        ) !==
          String(
            product.category,
          )
      ) {
        product.category =
          (await resolveCategory(
            String(
              body.category,
            ),
          )) as unknown as typeof product.category;
      }

      const editable: (keyof IProduct)[] =
        [
          "name",
          "summary",
          "brand",
          "tags",
          "images",
          "cover",
          "price",
          "salePrice",
          "discountPercent",
          "stock",
          "sku",
          "variants",
          "specs",
          "status",
          "isFeatured",
          "isNewArrival",
          "warranty",
          "shippingNote",
          "seo",
        ];
      for (const key of editable) {
        if (
          body[
            key
          ] !==
          undefined
        ) {
          (
            product as unknown as Record<
              string,
              unknown
            >
          )[
            key as string
          ] =
            body[
              key
            ];
        }
      }
      if (
        body.description !==
        undefined
      )
        product.description =
          sanitizeHtml(
            body.description,
          );

      await product.save();
      return sendSuccess(
        res,
        product.toJSON(),
        {
          message:
            "محصول بهروزرسانی شد",
        },
      );
    },
  );

/** PATCH /api/admin/shop/products/:id/status */
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
        "شناسه محصول",
      );
      const {
        status,
      } =
        req.body as {
          status: string;
        };
      const product =
        await Product.findByIdAndUpdate(
          req
            .params
            .id,
          {
            $set: {
              status,
            },
          },
          {
            new: true,
          },
        );
      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );
      return sendSuccess(
        res,
        product.toJSON(),
        {
          message:
            "وضعیت محصول بهروزرسانی شد",
        },
      );
    },
  );

/** PATCH /api/admin/shop/products/:id/stock — inventory quick edit. */
export const updateStock =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه محصول",
      );
      const {
        stock,
      } =
        req.body as {
          stock: number;
        };
      const product =
        await Product.findByIdAndUpdate(
          req
            .params
            .id,
          {
            $set: {
              stock:
                Math.max(
                  0,
                  Number(
                    stock,
                  ) ||
                    0,
                ),
            },
          },
          {
            new: true,
          },
        ).select(
          "name stock",
        );
      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );
      return sendSuccess(
        res,
        product.toJSON(),
        {
          message:
            "موجودی بهروزرسانی شد",
        },
      );
    },
  );

/** POST /api/admin/shop/products/bulk */
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
          "محصولی انتخاب نشده است",
        );

      let result: {
        affected: number;
      } =
        {
          affected: 0,
        };
      if (
        action ===
        "delete"
      ) {
        const removed =
          await Product.deleteMany(
            {
              _id: {
                $in: ids,
              },
            },
          );
        result =
          {
            affected:
              removed.deletedCount ??
              0,
          };
      } else {
        const statusMap: Record<
          string,
          string
        > =
          {
            publish:
              "published",
            draft:
              "draft",
            archive:
              "archived",
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
          await Product.updateMany(
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
        result =
          {
            affected:
              updated.modifiedCount ??
              0,
          };
      }

      return sendSuccess(
        res,
        result,
        {
          message:
            "عملیات با موفقیت انجام شد",
        },
      );
    },
  );

/** DELETE /api/admin/shop/products/:id */
export const remove =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه محصول",
      );
      const product =
        await Product.findByIdAndDelete(
          req
            .params
            .id,
        );
      if (
        !product
      )
        throw ApiError.notFound(
          "محصول مورد نظر یافت نشد",
        );

      await Promise.all(
        [
          Cart.updateMany(
            {},
            {
              $pull:
                {
                  items:
                    {
                      product:
                        product._id,
                    },
                },
            },
          ),
          Wishlist.updateMany(
            {},
            {
              $pull:
                {
                  products:
                    product._id,
                },
            },
          ),
        ],
      );

      return sendSuccess(
        res,
        {
          id: req
            .params
            .id,
        },
        {
          message:
            "محصول حذف شد",
        },
      );
    },
  );

/** POST /api/admin/shop/products/:id/refresh-rating */
export const refreshRating =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه محصول",
      );
      const {
        recalculateProductRating,
      } =
        await import("../models/Review.js");
      await recalculateProductRating(
        req
          .params
          .id,
      );
      const product =
        await Product.findById(
          req
            .params
            .id,
        ).select(
          "rating ratingCount",
        );
      return sendSuccess(
        res,
        product,
        {
          message:
            "امتیاز محصول بازمحاسبه شد",
        },
      );
    },
  );
