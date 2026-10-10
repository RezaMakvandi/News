import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { Brand } from "../models/Brand.js";
import { Product } from "../models/Product.js";
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
        "brand",
      );
    let candidate =
      base;
    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (
      true
    ) {
      const existing =
        await Brand.findOne(
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

/** GET /api/shop/brands */
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
      const brands =
        await Brand.find(
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
                  _id: "$brand",
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
        brands.map(
          (
            brand,
          ) => ({
            ...brand,
            productsCount:
              map.get(
                String(
                  brand._id,
                ),
              ) ??
              0,
          }),
        ),
      );
    },
  );

/** GET /api/shop/brands/:slug */
export const getBySlug =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const brand =
        await Brand.findOne(
          {
            slug: req
              .params
              .slug,
          },
        ).lean();
      if (
        !brand
      )
        throw ApiError.notFound(
          "برند یافت نشد",
        );
      const productsCount =
        await Product.countDocuments(
          {
            brand:
              brand._id,
            status:
              "published",
          },
        );
      return sendSuccess(
        res,
        {
          ...brand,
          productsCount,
        },
      );
    },
  );

/** POST /api/admin/shop/brands */
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
        logo,
        country,
        isActive,
        showInMenu,
        order,
      } =
        req.body as Record<
          string,
          any
        >;
      const brand =
        await Brand.create(
          {
            name,
            slug: await ensureUniqueSlug(
              slug ||
                name,
            ),
            description,
            logo,
            country,
            isActive,
            showInMenu,
            order,
          },
        );
      return sendSuccess(
        res,
        brand,
        {
          status: 201,
          message:
            "برند ایجاد شد",
        },
      );
    },
  );

/** PUT /api/admin/shop/brands/:id */
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
        "شناسه برند",
      );
      const brand =
        await Brand.findById(
          req
            .params
            .id,
        );
      if (
        !brand
      )
        throw ApiError.notFound(
          "برند یافت نشد",
        );

      const body =
        req.body as Record<
          string,
          any
        >;
      if (
        body.name !==
        undefined
      )
        brand.name =
          body.name;
      if (
        body.slug &&
        body.slug !==
          brand.slug
      )
        brand.slug =
          await ensureUniqueSlug(
            body.slug,
            brand.id,
          );
      if (
        body.description !==
        undefined
      )
        brand.description =
          body.description;
      if (
        body.logo !==
        undefined
      )
        brand.logo =
          body.logo;
      if (
        body.country !==
        undefined
      )
        brand.country =
          body.country;
      if (
        body.isActive !==
        undefined
      )
        brand.isActive =
          Boolean(
            body.isActive,
          );
      if (
        body.showInMenu !==
        undefined
      )
        brand.showInMenu =
          Boolean(
            body.showInMenu,
          );
      if (
        body.order !==
        undefined
      )
        brand.order =
          body.order;

      await brand.save();
      return sendSuccess(
        res,
        brand,
        {
          message:
            "برند بهروزرسانی شد",
        },
      );
    },
  );

/** DELETE /api/admin/shop/brands/:id */
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
        "شناسه برند",
      );
      const productsCount =
        await Product.countDocuments(
          {
            brand:
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
          `این برند ${productsCount} محصول دارد. ابتدا محصولات آن را جابجا کنید.`,
        );
      }
      const brand =
        await Brand.findByIdAndDelete(
          req
            .params
            .id,
        );
      if (
        !brand
      )
        throw ApiError.notFound(
          "برند یافت نشد",
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
            "برند حذف شد",
        },
      );
    },
  );
