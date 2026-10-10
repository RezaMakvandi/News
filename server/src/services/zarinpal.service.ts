import { logger } from "../utils/logger.js";

/**
 * Zarinpal payment gateway client.
 *
 * Two modes are supported:
 *  - Real    → `https://payment.zarinpal.com` / `https://api.zarinpal.com`
 *  - Sandbox → `https://sandbox.zarinpal.com` (no real money moves)
 *
 * Docs: https://docs.zarinpal.com/paymentGateway/
 * The merchant id defaults to the well-known Zarinpal sandbox id and can be
 * overridden from the admin settings / `.env` (`ZARINPAL_MERCHANT_ID`).
 */

export const ZARINPAL_SANDBOX_MERCHANT =
  "00000000-0000-0000-0000-000000000000";

export interface ZarinpalConfig {
  merchantId: string;
  sandbox: boolean;
  callbackUrl: string;
  description?: string;
}

export interface PaymentRequestResult {
  ok: boolean;
  /** Authority token used to build the redirect URL. */
  authority?: string;
  /** Full gateway URL the user must be redirected to. */
  paymentUrl?: string;
  code?: number;
  message?: string;
}

export interface PaymentVerifyResult {
  ok: boolean;
  code?: number;
  refId?: string;
  cardPan?: string;
  message?: string;
}

const endpoints =
  (
    sandbox: boolean,
  ) => ({
    request:
      sandbox
        ? "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
        : "https://api.zarinpal.com/pg/v4/payment/request.json",
    verify:
      sandbox
        ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
        : "https://api.zarinpal.com/pg/v4/payment/verify.json",
    gateway:
      sandbox
        ? "https://sandbox.zarinpal.com/pg/StartPay/"
        : "https://payment.zarinpal.com/pg/StartPay/",
  });

const REQUEST_TIMEOUT = 15_000;

/**
 * Extracts a human-readable message from a Zarinpal v4 response.
 * v4 puts validation/gateway errors in `errors` (with `data.code` sometimes
 * absent), while successful payloads use `data.message`.
 */
const extractErrorMessage =
  (
    result: Record<
      string,
      unknown
    >,
    fallback: string,
  ): string => {
    const data =
      (result.data as Record<
        string,
        unknown
      >) ??
      {};
    const errors =
      (result.errors as Record<
        string,
        unknown
      >) ??
      {};

    const candidate =
      (errors.message as string) ||
      (errors.code !==
      undefined
        ? `کد خطای درگاه: ${errors.code}`
        : "") ||
      (data.message as string) ||
      "";

    return (
      candidate ||
      fallback
    );
  };

/** True when the Zarinpal payload carries a gateway error. */
const hasGatewayError =
  (
    result: Record<
      string,
      unknown
    >,
  ): boolean => {
    const errors =
      result.errors as
        | Record<
            string,
            unknown
          >
        | Record<
            string,
            unknown
          >[]
        | undefined;
    if (
      !errors
    )
      return false;
    if (
      Array.isArray(
        errors,
      )
    )
      return (
        errors.length >
        0
      );
    return (
      errors.message !==
        undefined &&
      String(
        errors.message,
      )
        .length >
        0
    );
  };

const post =
  async (
    url: string,
    body: unknown,
  ): Promise<
    Record<
      string,
      unknown
    >
  > => {
    const controller =
      new AbortController();
    const timer =
      setTimeout(
        () =>
          controller.abort(),
        REQUEST_TIMEOUT,
      );
    try {
      const response =
        await fetch(
          url,
          {
            method:
              "POST",
            headers:
              {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
            body: JSON.stringify(
              body,
            ),
            signal:
              controller.signal,
          },
        );

      const text =
        await response.text();
      try {
        return JSON.parse(
          text,
        ) as Record<
          string,
          unknown
        >;
      } catch {
        return {
          data: {
            code: -1,
            message:
              text.slice(
                0,
                300,
              ),
          },
        };
      }
    } finally {
      clearTimeout(
        timer,
      );
    }
  };

/**
 * Requests a payment authority.
 * @param amount Amount in Toman (Zarinpal v4 works with Toman when currency=IRT).
 */
export const requestPayment =
  async (
    config: ZarinpalConfig,
    amount: number,
    email?: string,
    mobile?: string,
  ): Promise<PaymentRequestResult> => {
    const urls =
      endpoints(
        config.sandbox,
      );
    // Zarinpal v4 rejects empty metadata strings (HTTP 422, code -9:
    // "The metadata.mobile must be a string."), so only send fields
    // that actually carry a value.
    const metadata:
      | {
          email?: string;
          mobile?: string;
        }
      | undefined =
      email ||
      mobile
        ? {
            ...(email
              ? {
                  email,
                }
              : {}),
            ...(mobile
              ? {
                  mobile,
                }
              : {}),
          }
        : undefined;
    const payload =
      {
        merchant_id:
          config.merchantId,
        amount,
        currency:
          "IRT",
        description:
          config.description ??
          "پرداخت سفارش",
        callback_url:
          config.callbackUrl,
        ...(metadata
          ? {
              metadata,
            }
          : {}),
      };

    try {
      const result =
        await post(
          urls.request,
          payload,
        );
      const data =
        (result.data as Record<
          string,
          unknown
        >) ??
        {};
      const code =
        Number(
          data.code ??
            -1,
        );
      const authority =
        data.authority as
          | string
          | undefined;

      if (
        code ===
          100 &&
        authority
      ) {
        return {
          ok: true,
          authority,
          paymentUrl: `${urls.gateway}${authority}`,
          code,
        };
      }
      return {
        ok: false,
        code: hasGatewayError(
          result,
        )
          ? Number(
              (
                result.errors as Record<
                  string,
                  unknown
                >
              )
                .code ??
                -1,
            )
          : code,
        message:
          extractErrorMessage(
            result,
            "ایجاد تراکنش ناموفق بود",
          ),
      };
    } catch (error) {
      logger.error(
        "Zarinpal request failed:",
        error,
      );
      return {
        ok: false,
        message:
          "ارتباط با درگاه پرداخت برقرار نشد",
      };
    }
  };

/** Verifies a payment using the authority returned by the gateway callback. */
export const verifyPayment =
  async (
    config: ZarinpalConfig,
    amount: number,
    authority: string,
  ): Promise<PaymentVerifyResult> => {
    const urls =
      endpoints(
        config.sandbox,
      );
    const payload =
      {
        merchant_id:
          config.merchantId,
        amount,
        authority,
      };

    try {
      const result =
        await post(
          urls.verify,
          payload,
        );
      const data =
        (result.data as Record<
          string,
          unknown
        >) ??
        {};
      const code =
        Number(
          data.code ??
            -1,
        );

      // 100 → first verify, 101 → already verified.
      if (
        code ===
          100 ||
        code ===
          101
      ) {
        return {
          ok: true,
          code,
          refId:
            data.ref_id
              ? String(
                  data.ref_id,
                )
              : undefined,
          cardPan:
            (data.card_pan as string) ||
            undefined,
        };
      }
      return {
        ok: false,
        code,
        message:
          extractErrorMessage(
            result,
            "تأیید تراکنش ناموفق بود",
          ),
      };
    } catch (error) {
      logger.error(
        "Zarinpal verify failed:",
        error,
      );
      return {
        ok: false,
        message:
          "ارتباط با درگاه پرداخت برقرار نشد",
      };
    }
  };

export const isConfigured =
  (
    merchantId?: string,
  ): boolean =>
    Boolean(
      merchantId &&
      /^[0-9a-fA-F-]{36}$/.test(
        merchantId.trim(),
      ) &&
      merchantId.trim() !==
        "",
    );
