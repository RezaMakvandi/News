import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import {
  Review,
  ReviewStatus,
  recalculateProductRating,
} from "../models/Review.js";
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

/** GET /api/admin/shop/reviews */
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
          60,
        );
      const {
        status,
        q,
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
              comment:
                regex,
            },
            {
              title:
                regex,
            },
          ];
      }

      const [
        items,
        total,
        statusCounts,
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
                "name email avatar",
              )
              .populate(
                "product",
                "name slug cover",
              )
              .lean(),
            Review.countDocuments(
              filter,
            ),
            Review.aggregate<{
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

/** PATCH /api/admin/shop/reviews/:id/status */
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
        "شناسه نظر",
      );
      const {
        status,
      } =
        req.body as {
          status: ReviewStatus;
        };

      const review =
        await Review.findByIdAndUpdate(
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
        !review
      )
        throw ApiError.notFound(
          "نظر مورد نظر یافت نشد",
        );

      await recalculateProductRating(
        review.product,
      );
      return sendSuccess(
        res,
        review,
        {
          message:
            "وضعیت نظر بهروزرسانی شد",
        },
      );
    },
  );

/** PUT /api/admin/shop/reviews/:id */
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
        "شناسه نظر",
      );
      const review =
        await Review.findById(
          req
            .params
            .id,
        );
      if (
        !review
      )
        throw ApiError.notFound(
          "نظر مورد نظر یافت نشد",
        );

      const body =
        req.body as Record<
          string,
          any
        >;
      if (
        body.rating !==
        undefined
      )
        review.rating =
          body.rating;
      if (
        body.title !==
        undefined
      )
        review.title =
          body.title;
      if (
        body.comment !==
        undefined
      )
        review.comment =
          body.comment;
      if (
        body.pros !==
        undefined
      )
        review.pros =
          body.pros;
      if (
        body.cons !==
        undefined
      )
        review.cons =
          body.cons;
      if (
        body.status !==
        undefined
      )
        review.status =
          body.status;

      await review.save();
      await recalculateProductRating(
        review.product,
      );
      return sendSuccess(
        res,
        review,
        {
          message:
            "نظر بهروزرسانی شد",
        },
      );
    },
  );

/** DELETE /api/admin/shop/reviews/:id */
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
        "شناسه نظر",
      );
      const review =
        await Review.findByIdAndDelete(
          req
            .params
            .id,
        );
      if (
        !review
      )
        throw ApiError.notFound(
          "نظر مورد نظر یافت نشد",
        );

      await recalculateProductRating(
        review.product,
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
            "نظر حذف شد",
        },
      );
    },
  );
