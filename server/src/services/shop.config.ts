import { Types } from "mongoose";
import { Setting } from "../models/Setting.js";
import { env } from "../config/env.js";
import { ZARINPAL_SANDBOX_MERCHANT } from "./zarinpal.service.js";

export interface ShopConfig {
  merchantId: string;
  sandbox: boolean;
  callbackUrl: string;
  shopName: string;
  currency: string;
  shippingCost: number;
  freeShippingFrom: number;
  codEnabled: boolean;
}

const readSettings =
  async (
    keys: string[],
  ): Promise<
    Record<
      string,
      unknown
    >
  > => {
    const rows =
      await Setting.find(
        {
          key: {
            $in: keys,
          },
        },
      ).lean();
    return Object.fromEntries(
      rows.map(
        (
          row,
        ) => [
          row.key,
          row.value,
        ],
      ),
    );
  };

/**
 * Resolves the current shop/payment configuration.
 * Values stored in the admin settings take priority over `.env` defaults so an
 * operator can switch merchant ids (or sandbox ⇄ real) without a redeploy.
 */
export const getShopConfig =
  async (): Promise<ShopConfig> => {
    const settings =
      await readSettings(
        [
          "zarinpalMerchantId",
          "zarinpalSandbox",
          "payCallbackUrl",
          "shopName",
          "shippingCost",
          "freeShippingFrom",
          "codEnabled",
        ],
      );

    const sandbox =
      settings[
        "zarinpalSandbox"
      ] !==
      undefined
        ? settings[
            "zarinpalSandbox"
          ] !==
          false
        : env.zarinpalSandbox;

    const merchantId =
      String(
        settings[
          "zarinpalMerchantId"
        ] ??
          "",
      ).trim() ||
      (sandbox
        ? ZARINPAL_SANDBOX_MERCHANT
        : env.zarinpalMerchantId) ||
      ZARINPAL_SANDBOX_MERCHANT;

    const callbackUrl =
      String(
        settings[
          "payCallbackUrl"
        ] ??
          "",
      ).trim() ||
      `${env.publicUrl.replace(/\/$/, "")}/api/shop/payment/callback`;

    return {
      merchantId,
      sandbox,
      callbackUrl,
      shopName:
        String(
          settings[
            "shopName"
          ] ??
            "فروشگاه",
        ),
      currency:
        "IRT",
      shippingCost:
        Number(
          settings[
            "shippingCost"
          ] ??
            env.shippingCost,
        ) ||
        0,
      freeShippingFrom:
        Number(
          settings[
            "freeShippingFrom"
          ] ??
            env.freeShippingFrom,
        ) ||
        0,
      codEnabled:
        settings[
          "codEnabled"
        ] ===
        true,
    };
  };

/** Convenience wrapper used by controllers to build a Zarinpal config. */
export const buildZarinpalConfig =
  async (
    description?: string,
  ) => {
    const shop =
      await getShopConfig();
    return {
      merchantId:
        shop.merchantId,
      sandbox:
        shop.sandbox,
      callbackUrl:
        shop.callbackUrl,
      description,
    };
  };

export const asObjectId =
  (
    value: string,
  ): Types.ObjectId =>
    new Types.ObjectId(
      value,
    );
