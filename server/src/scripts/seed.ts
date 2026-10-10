import {
  connectDatabase,
  disconnectDatabase,
} from "../config/database.js";
import { Article } from "../models/Article.js";
import { Category } from "../models/Category.js";
import { Comment } from "../models/Comment.js";
import { Message } from "../models/Message.js";
import { Page } from "../models/Page.js";
import { Setting } from "../models/Setting.js";
import { Subscriber } from "../models/Subscriber.js";
import { Tag } from "../models/Tag.js";
import { User } from "../models/User.js";
import { Brand } from "../models/Brand.js";
import { Product } from "../models/Product.js";
import { ProductCategory } from "../models/ProductCategory.js";
import { Coupon } from "../models/Coupon.js";
import { logger } from "../utils/logger.js";
import { slugify } from "../utils/helpers.js";
import {
  articles as articleSeeds,
  categories as categorySeeds,
  commentSeeds,
  pageSeeds,
  settingsSeed,
  tagNames as tagSeeds,
  users as userSeeds,
} from "./seedData.js";
import {
  shopBrands,
  shopCoupons,
  shopProducts,
  productCategories,
} from "./shopSeedData.js";

const reset =
  process.argv.includes(
    "--reset",
  );

const run =
  async () => {
    await connectDatabase();

    if (
      reset
    ) {
      logger.warn(
        "--reset received: clearing collections…",
      );
      await Promise.all(
        [
          Article.deleteMany(
            {},
          ),
          Category.deleteMany(
            {},
          ),
          Tag.deleteMany(
            {},
          ),
          Comment.deleteMany(
            {},
          ),
          User.deleteMany(
            {},
          ),
          Setting.deleteMany(
            {},
          ),
          Page.deleteMany(
            {},
          ),
          Subscriber.deleteMany(
            {},
          ),
          Message.deleteMany(
            {},
          ),
          Brand.deleteMany(
            {},
          ),
          Product.deleteMany(
            {},
          ),
          ProductCategory.deleteMany(
            {},
          ),
          Coupon.deleteMany(
            {},
          ),
        ],
      );
    }

    /* ------------------------------- users ------------------------------- */
    const users =
      new Map<
        string,
        InstanceType<
          typeof User
        >
      >();
    for (const seed of userSeeds) {
      const existing =
        await User.findOne(
          {
            email:
              seed.email,
          },
        );
      if (
        existing
      ) {
        users.set(
          seed.name,
          existing,
        );
        continue;
      }
      const created =
        await User.create(
          {
            ...seed,
            slug: slugify(
              seed.name,
              "author",
            ),
          },
        );
      users.set(
        seed.name,
        created,
      );
    }
    logger.success(
      `Users ready: ${users.size}`,
    );

    /* ----------------------------- categories ---------------------------- */
    const categories =
      new Map<
        string,
        InstanceType<
          typeof Category
        >
      >();
    for (const seed of categorySeeds) {
      const existing =
        await Category.findOne(
          {
            name: seed.name,
          },
        );
      if (
        existing
      ) {
        categories.set(
          seed.name,
          existing,
        );
        continue;
      }
      const created =
        await Category.create(
          {
            ...seed,
            slug: slugify(
              seed.name,
              "category",
            ),
          },
        );
      categories.set(
        seed.name,
        created,
      );
    }
    logger.success(
      `Categories ready: ${categories.size}`,
    );

    /* -------------------------------- tags ------------------------------- */
    const tags =
      new Map<
        string,
        InstanceType<
          typeof Tag
        >
      >();
    for (const name of tagSeeds) {
      const existing =
        await Tag.findOne(
          {
            name,
          },
        );
      if (
        existing
      ) {
        tags.set(
          name,
          existing,
        );
        continue;
      }
      const created =
        await Tag.create(
          {
            name,
            slug: slugify(
              name,
              "tag",
            ),
          },
        );
      tags.set(
        name,
        created,
      );
    }

    /* ------------------------------ articles ----------------------------- */
    const tagUsage =
      new Map<
        string,
        number
      >();
    let createdArticles = 0;

    for (const seed of articleSeeds) {
      const exists =
        await Article.findOne(
          {
            title:
              seed.title,
          },
        );
      if (
        exists
      )
        continue;

      const category =
        categories.get(
          seed.category,
        );
      const author =
        users.get(
          seed.author,
        );
      if (
        !category ||
        !author
      )
        continue;

      const publishedAt =
        new Date(
          Date.now() -
            seed.daysAgo *
              24 *
              60 *
              60 *
              1000 -
            3 *
              60 *
              60 *
              1000,
        );
      const tagIds =
        seed.tags
          .map(
            (
              name,
            ) =>
              tags.get(
                name,
              )
                ?._id,
          )
          .filter(
            Boolean,
          );
      tagIds.forEach(
        (
          id,
        ) =>
          tagUsage.set(
            String(
              id,
            ),
            (tagUsage.get(
              String(
                id,
              ),
            ) ??
              0) +
              1,
          ),
      );

      await Article.create(
        {
          title:
            seed.title,
          slug: slugify(
            seed.title,
            "news",
          ),
          summary:
            seed.summary,
          content:
            seed.content,
          cover:
            seed.cover,
          coverAlt:
            seed.title,
          status:
            seed.status,
          type: seed.type,
          category:
            category._id,
          tags: tagIds,
          author:
            author._id,
          views:
            seed.views,
          likes:
            seed.likes,
          isFeatured:
            Boolean(
              seed.isFeatured,
            ),
          isBreaking:
            Boolean(
              seed.isBreaking,
            ),
          commentsCount: 0,
          publishedAt:
            seed.status ===
            "published"
              ? publishedAt
              : undefined,
          createdAt:
            publishedAt,
          seo: {
            title:
              seed.title,
            description:
              seed.summary,
            keywords:
              seed.tags,
          },
        },
      );
      createdArticles += 1;
    }
    logger.success(
      `Articles created: ${createdArticles}`,
    );

    /* ------------------------------- tags usage --------------------------- */
    const allArticles =
      await Article.find().select(
        "tags status",
      );
    const finalUsage =
      new Map<
        string,
        number
      >();
    for (const article of allArticles) {
      if (
        article.status !==
        "published"
      )
        continue;
      for (const tagId of article.tags) {
        finalUsage.set(
          String(
            tagId,
          ),
          (finalUsage.get(
            String(
              tagId,
            ),
          ) ??
            0) +
            1,
        );
      }
    }
    await Promise.all(
      [
        ...tags.values(),
      ].map(
        (
          tag,
        ) =>
          Tag.findByIdAndUpdate(
            tag._id,
            {
              $set: {
                usageCount:
                  finalUsage.get(
                    tag.id,
                  ) ??
                  0,
              },
            },
          ),
      ),
    );

    /* ------------------------------ comments ----------------------------- */
    let createdComments = 0;
    if (
      (await Comment.countDocuments()) ===
      0
    ) {
      const orderedArticles =
        await Article.find()
          .sort(
            {
              publishedAt: 1,
            },
          )
          .select(
            "_id",
          );
      for (const seed of commentSeeds) {
        const article =
          orderedArticles[
            seed
              .articleIndex
          ];
        if (
          !article
        )
          continue;

        const authorDoc =
          [
            ...users.values(),
          ].find(
            (
              user,
            ) =>
              user.email ===
              seed.email,
          );
        await Comment.create(
          {
            article:
              article._id,
            author:
              authorDoc?._id ??
              null,
            authorName:
              seed.name,
            authorEmail:
              seed.email,
            content:
              seed.content,
            status:
              seed.status,
          },
        );
        createdComments += 1;
      }

      // Recompute approved comment counters.
      const counts =
        await Comment.aggregate<{
          _id: string;
          count: number;
        }>(
          [
            {
              $match:
                {
                  status:
                    "approved",
                },
            },
            {
              $group:
                {
                  _id: "$article",
                  count:
                    {
                      $sum: 1,
                    },
                },
            },
          ],
        );
      await Promise.all(
        counts.map(
          (
            item,
          ) =>
            Article.findByIdAndUpdate(
              item._id,
              {
                $set: {
                  commentsCount:
                    item.count,
                },
              },
            ),
        ),
      );
    }
    logger.success(
      `Comments created: ${createdComments}`,
    );

    /* -------------------------------- pages ------------------------------ */
    let createdPages = 0;
    for (const seed of pageSeeds) {
      const exists =
        await Page.findOne(
          {
            slug: seed.slug,
          },
        );
      if (
        exists
      )
        continue;
      await Page.create(
        {
          ...seed,
          isPublished: true,
          showInFooter: true,
        },
      );
      createdPages += 1;
    }
    logger.success(
      `Pages created: ${createdPages}`,
    );

    /* ------------------------------- settings ---------------------------- */
    for (const seed of settingsSeed) {
      await Setting.updateOne(
        {
          key: seed.key,
        },
        {
          $setOnInsert:
            seed,
        },
        {
          upsert: true,
        },
      );
    }
    logger.success(
      `Settings ready: ${settingsSeed.length}`,
    );

    /* ----------------------------- subscribers --------------------------- */
    if (
      (await Subscriber.countDocuments()) ===
      0
    ) {
      await Subscriber.create(
        [
          {
            email:
              "reader1@example.com",
            name: "خواننده یک",
            isActive: true,
          },
          {
            email:
              "reader2@example.com",
            name: "خواننده دو",
            isActive: true,
          },
          {
            email:
              "reader3@example.com",
            name: "خواننده سه",
            isActive: false,
          },
        ],
      );
      logger.success(
        "Subscribers seeded: 3",
      );
    }

    /* ------------------------------ messages ----------------------------- */
    if (
      (await Message.countDocuments()) ===
      0
    ) {
      await Message.create(
        [
          {
            name: "شرکت فناوری آریا",
            email:
              "pr@aria.example.com",
            phone:
              "۰۹۱۲۱۲۳۴۵۶۷",
            subject:
              "درخواست پوشش خبری رویداد رونمایی محصول",
            body: "با سلام، شرکت ما هفته آینده از یک محصول جدید رونمایی می‌کند و مایل است تیم تحریریه شما در این رویداد حضور داشته باشد.",
            status:
              "unread",
          },
          {
            name: "سمیرا احمدی",
            email:
              "samira@example.com",
            subject:
              "پیشنهاد همکاری در تولید محتوا",
            body: "سلام، من کارشناس حوزه امنیت سایبری هستم و علاقه‌مند به همکاری با تحریریه در تولید مقالات تخصصی.",
            status:
              "read",
          },
          {
            name: "خواننده وفادار",
            email:
              "fan@example.com",
            subject:
              "گزارش اشتباه تایپی",
            body: "در خبر مربوط به تراشه جدید، در بند سوم یک اشتباه تایپی وجود دارد. لطفاً بررسی کنید.",
            status:
              "replied",
            reply:
              "با تشکر از دقت شما؛ اصلاح شد.",
          },
        ],
      );
      logger.success(
        "Messages seeded: 3",
      );
    }

    /* ------------------------------- shop -------------------------------- */
    const brandMap =
      new Map<
        string,
        InstanceType<
          typeof Brand
        >
      >();
    for (const seed of shopBrands) {
      const existing =
        await Brand.findOne(
          {
            name: seed.name,
          },
        );
      if (
        existing
      ) {
        brandMap.set(
          seed.name,
          existing,
        );
        continue;
      }
      const created =
        await Brand.create(
          {
            ...seed,
            slug: slugify(
              seed.name,
              "brand",
            ),
          },
        );
      brandMap.set(
        seed.name,
        created,
      );
    }
    logger.success(
      `Shop brands ready: ${brandMap.size}`,
    );

    const productCategoryMap =
      new Map<
        string,
        InstanceType<
          typeof ProductCategory
        >
      >();
    for (const seed of productCategories) {
      const existing =
        await ProductCategory.findOne(
          {
            name: seed.name,
          },
        );
      if (
        existing
      ) {
        productCategoryMap.set(
          seed.name,
          existing,
        );
        continue;
      }
      const created =
        await ProductCategory.create(
          {
            ...seed,
            slug: slugify(
              seed.name,
              "product-category",
            ),
          },
        );
      productCategoryMap.set(
        seed.name,
        created,
      );
    }
    logger.success(
      `Product categories ready: ${productCategoryMap.size}`,
    );

    let createdProducts = 0;
    for (const seed of shopProducts) {
      const exists =
        await Product.findOne(
          {
            name: seed.name,
          },
        );
      if (
        exists
      )
        continue;

      const brand =
        brandMap.get(
          seed.brand,
        );
      const category =
        productCategoryMap.get(
          seed.category,
        );
      if (
        !category
      )
        continue;

      await Product.create(
        {
          name: seed.name,
          slug: slugify(
            seed.name,
            "product",
          ),
          summary:
            seed.summary,
          description: `<p>${seed.summary}</p>`,
          brand:
            brand?._id ??
            null,
          category:
            category._id,
          images:
            [
              {
                url: seed.cover,
                alt: seed.name,
              },
            ],
          cover:
            seed.cover,
          price:
            seed.price,
          salePrice:
            seed.salePrice ??
            0,
          discountPercent:
            seed.salePrice
              ? Math.round(
                  ((seed.price -
                    seed.salePrice) /
                    seed.price) *
                    100,
                )
              : 0,
          stock:
            seed.stock,
          specs:
            seed.specs,
          status:
            "published",
          isFeatured:
            Boolean(
              seed.isFeatured,
            ),
          isNewArrival:
            Boolean(
              seed.isNewArrival,
            ),
          warranty:
            seed.warranty ??
            "",
          rating:
            seed.rating,
          ratingCount:
            seed.ratingCount,
          soldCount:
            seed.soldCount,
          seo: {
            title:
              seed.name,
            description:
              seed.summary,
          },
        },
      );
      createdProducts += 1;
    }
    logger.success(
      `Products created: ${createdProducts}`,
    );

    let createdCoupons = 0;
    for (const seed of shopCoupons) {
      const exists =
        await Coupon.findOne(
          {
            code: seed.code,
          },
        );
      if (
        exists
      )
        continue;
      await Coupon.create(
        seed,
      );
      createdCoupons += 1;
    }
    logger.success(
      `Coupons created: ${createdCoupons}`,
    );

    logger.success(
      "Seed completed successfully.",
    );
    logger.info(
      "Admin login → admin@zoomit.local / Admin@123",
    );
    logger.info(
      "Editor login → editor@zoomit.local / Editor@123",
    );
    logger.info(
      "Author login → author@zoomit.local / Author@123",
    );

    await disconnectDatabase();
  };

run().catch(
  async (
    error,
  ) => {
    logger.error(
      "Seed failed:",
      error,
    );
    await disconnectDatabase().catch(
      () =>
        undefined,
    );
    process.exit(
      1,
    );
  },
);
