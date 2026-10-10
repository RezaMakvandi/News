import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname =
  path.dirname(
    fileURLToPath(
      import.meta
        .url,
    ),
  );
const rootDir =
  path.resolve(
    __dirname,
    "../..",
  );

dotenv.config(
  {
    path: path.join(
      rootDir,
      ".env",
    ),
  },
);

const toBool =
  (
    value:
      | string
      | undefined,
    fallback = false,
  ) =>
    value ===
    undefined
      ? fallback
      : [
          "1",
          "true",
          "yes",
          "on",
        ].includes(
          value.toLowerCase(),
        );

export const env =
  {
    rootDir,
    port: Number(
      process
        .env
        .PORT ??
        4000,
    ),
    nodeEnv:
      process
        .env
        .NODE_ENV ??
      "development",
    isProd:
      (process
        .env
        .NODE_ENV ??
        "development") ===
      "production",
    mongodbUri:
      (
        process
          .env
          .MONGODB_URI ??
        ""
      ).trim(),
    jwtSecret:
      process
        .env
        .JWT_SECRET ??
      "dev-secret-zoomit-clone",
    jwtExpiresIn:
      process
        .env
        .JWT_EXPIRES_IN ??
      "7d",
    corsOrigins:
      (
        process
          .env
          .CORS_ORIGIN ??
        "http://localhost:4200"
      )
        .split(
          ",",
        )
        .map(
          (
            item,
          ) =>
            item.trim(),
        )
        .filter(
          Boolean,
        ),
    publicUrl:
      process
        .env
        .PUBLIC_URL ??
      "http://localhost:4000",
    trustProxy:
      toBool(
        process
          .env
          .TRUST_PROXY,
        false,
      ),
    uploadsDir:
      path.join(
        rootDir,
        "uploads",
      ),

    /* ------------------------------- Shop -------------------------------- */
    zarinpalMerchantId:
      (
        process
          .env
          .ZARINPAL_MERCHANT_ID ??
        ""
      ).trim(),
    zarinpalSandbox:
      toBool(
        process
          .env
          .ZARINPAL_SANDBOX,
        true,
      ),
    shippingCost:
      Number(
        process
          .env
          .SHIPPING_COST ??
          49000,
      ),
    freeShippingFrom:
      Number(
        process
          .env
          .FREE_SHIPPING_FROM ??
          3_000_000,
      ),
    shopEnabled:
      toBool(
        process
          .env
          .SHOP_ENABLED,
        true,
      ),
  };
