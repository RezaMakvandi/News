import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { Product } from "../models/Product.js";
import { ProductCategory } from "../models/ProductCategory.js";
import {
  ApiError,
  asyncHandler,
} from "../utils/ApiError.js";
import {
  assertObjectId,
  slugify,
} from "../utils/helpers.js";
import { sendSuccess } from "../utils/respond.js";

const ensureUniqueSlug =
  async (
    input: string,
    currentId?: string,
  ): Promise<string> => {
    const base =
      slugify(
        input,
        "product-category",
      );
    let candidate =
      base;
    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (
      true
    ) {
      const existing =
        await ProductCategory.findOne(
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

/** GET /api/shop/categories */
export const list =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const includeInactive =
        req
          .query
          .all ===
          "true" &&
        Boolean(
          req.user,
        );
      const categories =
        await ProductCategory.find(
          includeInactive
            ? {}
            : {
                isActive: true,
              },
        )
          .sort(
            {
              order: 1,
              name: 1,
            },
          )
          .lean();

      const counts =
        await Product.aggregate<{
          _id: string;
          count: number;
        }>(
          [
            {
              $match:
                {
                  status:
                    "published",
                },
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
          ],
        );
      const map =
        new Map(
          counts.map(
            (
              item,
            ) => [
              String(
                item._id,
              ),
              item.count,
            ],
          ),
        );

      return sendSuccess(
        res,
        categories.map(
          (
            category,
          ) => ({
            ...category,
            productsCount:
              map.get(
                String(
                  category._id,
                ),
              ) ??
              0,
          }),
        ),
      );
    },
  );

/** GET /api/shop/categories/:slug */
export const getBySlug =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const category =
        await ProductCategory.findOne(
          {
            slug: req
              .params
              .slug,
          },
        ).lean();
      if (
        !category
      )
        throw ApiError.notFound(
          "دستهبندی یافت نشد",
        );
      const productsCount =
        await Product.countDocuments(
          {
            category:
              category._id,
            status:
              "published",
          },
        );
      return sendSuccess(
        res,
        {
          ...category,
          productsCount,
        },
      );
    },
  );

/** POST /api/admin/shop/categories */
export const create =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const {
        name,
        slug,
        description,
        color,
        icon,
        cover,
        parent,
        order,
        isActive,
        showInMenu,
      } =
        req.body as Record<
          string,
          any
        >;
      const category =
        await ProductCategory.create(
          {
            name,
            slug: await ensureUniqueSlug(
              slug ||
                name,
            ),
            description,
            color,
            icon,
            cover,
            parent:
              parent ||
              null,
            order,
            isActive,
            showInMenu,
          },
        );
      return sendSuccess(
        res,
        category,
        {
          status: 201,
          message:
            "دستهبندی ایجاد شد",
        },
      );
    },
  );

/** PUT /api/admin/shop/categories/:id */
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
        "شناسه دستهبندی",
      );
      const category =
        await ProductCategory.findById(
          req
            .params
            .id,
        );
      if (
        !category
      )
        throw ApiError.notFound(
          "دستهبندی یافت نشد",
        );

      const body =
        req.body as Record<
          string,
          any
        >;
      if (
        body.parent &&
        String(
          body.parent,
        ) ===
          category.id
      ) {
        throw ApiError.badRequest(
          "دستهبندی نمیتواند والد خودش باشد",
        );
      }
      if (
        body.slug &&
        body.slug !==
          category.slug
      ) {
        category.slug =
          await ensureUniqueSlug(
            body.slug,
            category.id,
          );
      }
      if (
        body.name !==
        undefined
      )
        category.name =
          body.name;
      if (
        body.description !==
        undefined
      )
        category.description =
          body.description;
      if (
        body.color !==
        undefined
      )
        category.color =
          body.color;
      if (
        body.icon !==
        undefined
      )
        category.icon =
          body.icon;
      if (
        body.cover !==
        undefined
      )
        category.cover =
          body.cover;
      if (
        body.parent !==
        undefined
      )
        category.parent =
          body.parent ||
          null;
      if (
        body.order !==
        undefined
      )
        category.order =
          body.order;
      if (
        body.isActive !==
        undefined
      )
        category.isActive =
          Boolean(
            body.isActive,
          );
      if (
        body.showInMenu !==
        undefined
      )
        category.showInMenu =
          Boolean(
            body.showInMenu,
          );

      await category.save();
      return sendSuccess(
        res,
        category,
        {
          message:
            "دستهبندی بهروزرسانی شد",
        },
      );
    },
  );

/** DELETE /api/admin/shop/categories/:id */
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
        "شناسه دستهبندی",
      );
      const productsCount =
        await Product.countDocuments(
          {
            category:
              req
                .params
                .id,
          },
        );
      if (
        productsCount >
        0
      ) {
        throw ApiError.badRequest(
          `این دستهبندی ${productsCount} محصول دارد. ابتدا محصولات آن را جابجا کنید.`,
        );
      }
      const category =
        await ProductCategory.findByIdAndDelete(
          req
            .params
            .id,
        );
      if (
        !category
      )
        throw ApiError.notFound(
          "دستهبندی یافت نشد",
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
            "دستهبندی حذف شد",
        },
      );
    },
  );
