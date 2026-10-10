import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
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

/** GET /api/admin/shop/coupons */
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
          100,
        );
      const {
        q,
        active,
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
        active ===
        "true"
      )
        filter.isActive = true;
      if (
        active ===
        "false"
      )
        filter.isActive = false;
      if (
        q
      )
        filter.code =
          {
            $regex:
              escapeRegex(
                q,
              ),
            $options:
              "i",
          };

      const [
        items,
        total,
      ] =
        await Promise.all(
          [
            Coupon.find(
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
            Coupon.countDocuments(
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

/** GET /api/admin/shop/coupons/:id */
export const getOne =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      assertObjectId(
        req
          .params
          .id,
        "شناسه کد تخفیف",
      );
      const coupon =
        await Coupon.findById(
          req
            .params
            .id,
        ).lean();
      if (
        !coupon
      )
        throw ApiError.notFound(
          "کد تخفیف یافت نشد",
        );
      return sendSuccess(
        res,
        coupon,
      );
    },
  );

/** POST /api/admin/shop/coupons */
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
      const code =
        String(
          body.code ??
            "",
        )
          .trim()
          .toUpperCase();
      if (
        !code
      )
        throw ApiError.badRequest(
          "کد تخفیف الزامی است",
        );

      const exists =
        await Coupon.findOne(
          {
            code,
          },
        );
      if (
        exists
      )
        throw ApiError.conflict(
          "این کد تخفیف قبلاً ثبت شده است",
        );

      const coupon =
        await Coupon.create(
          {
            ...body,
            code,
          },
        );
      return sendSuccess(
        res,
        coupon,
        {
          status: 201,
          message:
            "کد تخفیف ایجاد شد",
        },
      );
    },
  );

/** PUT /api/admin/shop/coupons/:id */
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
        "شناسه کد تخفیف",
      );
      const coupon =
        await Coupon.findById(
          req
            .params
            .id,
        );
      if (
        !coupon
      )
        throw ApiError.notFound(
          "کد تخفیف یافت نشد",
        );

      const body =
        req.body as Record<
          string,
          any
        >;
      if (
        body.code &&
        body.code.toUpperCase() !==
          coupon.code
      ) {
        const code =
          String(
            body.code,
          ).toUpperCase();
        const exists =
          await Coupon.findOne(
            {
              code,
              _id: {
                $ne: coupon._id,
              },
            },
          );
        if (
          exists
        )
          throw ApiError.conflict(
            "این کد تخفیف قبلاً ثبت شده است",
          );
        coupon.code =
          code;
      }

      const editable =
        [
          "description",
          "type",
          "amount",
          "minOrder",
          "maxUses",
          "perUserLimit",
          "categories",
          "products",
          "startsAt",
          "expiresAt",
          "isActive",
        ] as const;
      for (const key of editable) {
        if (
          body[
            key
          ] !==
          undefined
        ) {
          (
            coupon as unknown as Record<
              string,
              unknown
            >
          )[
            key
          ] =
            body[
              key
            ];
        }
      }

      await coupon.save();
      return sendSuccess(
        res,
        coupon,
        {
          message:
            "کد تخفیف بهروزرسانی شد",
        },
      );
    },
  );

/** PATCH /api/admin/shop/coupons/:id/status */
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
        "شناسه کد تخفیف",
      );
      const {
        isActive,
      } =
        req.body as {
          isActive: boolean;
        };
      const coupon =
        await Coupon.findByIdAndUpdate(
          req
            .params
            .id,
          {
            $set: {
              isActive,
            },
          },
          {
            new: true,
          },
        );
      if (
        !coupon
      )
        throw ApiError.notFound(
          "کد تخفیف یافت نشد",
        );
      return sendSuccess(
        res,
        coupon,
        {
          message:
            "وضعیت کد تخفیف بهروزرسانی شد",
        },
      );
    },
  );

/** DELETE /api/admin/shop/coupons/:id */
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
        "شناسه کد تخفیف",
      );
      const coupon =
        await Coupon.findByIdAndDelete(
          req
            .params
            .id,
        );
      if (
        !coupon
      )
        throw ApiError.notFound(
          "کد تخفیف یافت نشد",
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
            "کد تخفیف حذف شد",
        },
      );
    },
  );

/* ------------------------------------------------------------------ */
/* Admin shop statistics                                               */
/* ------------------------------------------------------------------ */

/** GET /api/admin/shop/stats/overview */
export const statsOverview =
  asyncHandler(
    async (
      _req: AuthRequest,
      res: Response,
    ) => {
      const startOfToday =
        new Date();
      startOfToday.setHours(
        0,
        0,
        0,
        0,
      );

      const [
        totalOrders,
        paidOrders,
        pendingOrders,
        todayOrders,
        revenueAgg,
        todayRevenueAgg,
        customers,
        activeCoupons,
      ] =
        await Promise.all(
          [
            Order.countDocuments(),
            Order.countDocuments(
              {
                paymentStatus:
                  "paid",
              },
            ),
            Order.countDocuments(
              {
                status:
                  "pending",
              },
            ),
            Order.countDocuments(
              {
                createdAt:
                  {
                    $gte: startOfToday,
                  },
              },
            ),
            Order.aggregate<{
              total: number;
            }>(
              [
                {
                  $match:
                    {
                      paymentStatus:
                        "paid",
                    },
                },
                {
                  $group:
                    {
                      _id: null,
                      total:
                        {
                          $sum: "$payable",
                        },
                    },
                },
              ],
            ),
            Order.aggregate<{
              total: number;
            }>(
              [
                {
                  $match:
                    {
                      paymentStatus:
                        "paid",
                      createdAt:
                        {
                          $gte: startOfToday,
                        },
                    },
                },
                {
                  $group:
                    {
                      _id: null,
                      total:
                        {
                          $sum: "$payable",
                        },
                    },
                },
              ],
            ),
            Order.distinct(
              "user",
            ),
            Coupon.countDocuments(
              {
                isActive: true,
              },
            ),
          ],
        );

      return sendSuccess(
        res,
        {
          orders:
            {
              total:
                totalOrders,
              paid: paidOrders,
              pending:
                pendingOrders,
              today:
                todayOrders,
            },
          revenue:
            revenueAgg[0]
              ?.total ??
            0,
          todayRevenue:
            todayRevenueAgg[0]
              ?.total ??
            0,
          customers:
            customers.length,
          activeCoupons,
        },
      );
    },
  );

/** GET /api/admin/shop/stats/charts */
export const statsCharts =
  asyncHandler(
    async (
      _req: AuthRequest,
      res: Response,
    ) => {
      const days = 14;
      const since =
        new Date();
      since.setHours(
        0,
        0,
        0,
        0,
      );
      since.setDate(
        since.getDate() -
          (days -
            1),
      );

      const [
        ordersByDay,
        topProducts,
        statusBreakdown,
      ] =
        await Promise.all(
          [
            Order.aggregate<{
              _id: string;
              count: number;
              revenue: number;
            }>(
              [
                {
                  $match:
                    {
                      createdAt:
                        {
                          $gte: since,
                        },
                    },
                },
                {
                  $group:
                    {
                      _id: {
                        $dateToString:
                          {
                            format:
                              "%Y-%m-%d",
                            date: "$createdAt",
                          },
                      },
                      count:
                        {
                          $sum: 1,
                        },
                      revenue:
                        {
                          $sum: "$payable",
                        },
                    },
                },
                {
                  $sort:
                    {
                      _id: 1,
                    },
                },
              ],
            ),
            Order.aggregate(
              [
                {
                  $match:
                    {
                      paymentStatus:
                        "paid",
                    },
                },
                {
                  $unwind:
                    "$items",
                },
                {
                  $group:
                    {
                      _id: "$items.product",
                      name: {
                        $first:
                          "$items.name",
                      },
                      quantity:
                        {
                          $sum: "$items.quantity",
                        },
                      revenue:
                        {
                          $sum: "$items.total",
                        },
                    },
                },
                {
                  $sort:
                    {
                      quantity:
                        -1,
                    },
                },
                {
                  $limit: 8,
                },
              ],
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

      const series =
        Array.from(
          {
            length:
              days,
          },
        ).map(
          (
            _,
            index,
          ) => {
            const date =
              new Date(
                since,
              );
            date.setDate(
              since.getDate() +
                index,
            );
            const key =
              date
                .toISOString()
                .slice(
                  0,
                  10,
                );
            const row =
              ordersByDay.find(
                (
                  item,
                ) =>
                  item._id ===
                  key,
              );
            return {
              date: key,
              label:
                date.toLocaleDateString(
                  "fa-IR",
                  {
                    day: "2-digit",
                    month:
                      "2-digit",
                  },
                ),
              orders:
                row?.count ??
                0,
              revenue:
                row?.revenue ??
                0,
            };
          },
        );

      return sendSuccess(
        res,
        {
          series,
          topProducts,
          statusBreakdown:
            Object.fromEntries(
              statusBreakdown.map(
                (
                  item,
                ) => [
                  item._id,
                  item.count,
                ],
              ),
            ),
        },
      );
    },
  );
