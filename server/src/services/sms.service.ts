import { Setting } from "../models/Setting.js";
import { logger } from "../utils/logger.js";

/**
 * Outgoing SMS client.
 *
 * The panel is configured from the admin settings (group `sms`). The first
 * provider is Melipayamak; its REST endpoint and parameters are documented at
 * https://www.melipayamak.com/api/sendsimplesms2/ .
 *
 * Credentials are read from the database on every send, so saving the settings
 * screen takes effect immediately without restarting the server.
 */

export type SmsProvider = "melipayamak";

export interface SmsConfig {
  provider: SmsProvider;
  /** Melipayamak panel username. */
  username: string;
  /** Melipayamak panel password or ApiKey. */
  password: string;
  /** Sender line configured in the Melipayamak panel. */
  from: string;
  /** Send the message as a flash SMS. */
  isFlash: boolean;
  /** Destination used by the "send test message" button. */
  testNumber: string;
}

export interface SendSmsInput {
  to: string;
  text: string;
}

export interface SendSmsResult {
  /** Unique delivery id returned by the provider. */
  recId: string;
}

const SMS_KEYS = [
  "smsUsername",
  "smsPassword",
  "smsFrom",
  "smsIsFlash",
  "smsTestNumber",
];

const MELIPAYAMAK_SEND_URL =
  "https://rest.payamak-panel.com/api/SendSMS/SendSMS";

const REQUEST_TIMEOUT = 15_000;

const str = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const boolish = (value: unknown, fallback = false): boolean => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

/** Human-readable explanations for Melipayamak's numeric error codes. */
const MELIPAYAMAK_ERRORS: Record<string, string> = {
  "-110":
    "پنل ملی پیامک استفاده از ApiKey را الزامی کرده است. در پنل ملی پیامک یک ApiKey بسازید و آن را در فیلد «رمز عبور / ApiKey» وارد کنید.",
  "-109":
    "باید IP سرور را در پنل ملی پیامک به‌عنوان IP مجاز ثبت کنید تا استفاده از وب‌سرویس امکان‌پذیر شود.",
  "-108":
    "IP سرور به دلیل تلاش‌های ناموفق برای استفاده از API مسدود شده است. آن را در پنل ملی پیامک بررسی کنید.",
  "0": "نام کاربری یا رمز عبور (ApiKey) پنل ملی پیامک اشتباه است.",
  "2": "اعتبار پنل پیامکی کافی نیست. اعتبار پنل ملی پیامک را افزایش دهید.",
  "3": "محدودیت تعداد ارسال روزانه در پنل ملی پیامک اعمال شده است.",
  "4": "محدودیت حجم ارسال در پنل ملی پیامک اعمال شده است.",
  "5": "شماره فرستنده معتبر نیست. «شماره فرستنده» را با خطوط فعال پنل ملی پیامک هماهنگ کنید.",
  "6": "سامانه ملی پیامک در حال به‌روزرسانی است؛ کمی بعد دوباره تلاش کنید.",
  "7": "متن پیامک حاوی کلمه فیلترشده است.",
  "9": "ارسال از خطوط عمومی از طریق وب‌سرویس امکان‌پذیر نیست؛ از یک خط اختصاصی استفاده کنید.",
  "10": "کاربر پنل ملی پیامک فعال نیست.",
  "11": "پیامک ارسال نشد.",
  "12": "مدارک کاربر پنل ملی پیامک کامل نیست.",
  "14": "متن پیامک حاوی لینک است و مجاز نیست.",
  "15":
    'ارسال به بیش از یک شماره همراه بدون درج «لغو11» در متن پیامک ممکن نیست.',
  "16": "شماره گیرنده در سامانه یافت نشد.",
  "17": "متن پیامک خالی است.",
  "18": "شماره گیرنده نامعتبر است.",
  "35": "شماره گیرنده در لیست سیاه مخابرات قرار دارد.",
};

/** Resolves the SMS configuration stored by the admin settings screen. */
export const getSmsConfig = async (): Promise<SmsConfig> => {
  const rows = await Setting.find({ key: { $in: SMS_KEYS } }).lean();
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    provider: "melipayamak",
    username: str(map["smsUsername"]),
    password: str(map["smsPassword"]),
    from: str(map["smsFrom"]),
    isFlash: boolish(map["smsIsFlash"], false),
    testNumber: str(map["smsTestNumber"]),
  };
};

/** Converts Persian/Arabic digits and common mobile formats to `09xxxxxxxxx`. */
export const normalizeMobile = (value: string): string => {
  const digits = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");

  if (digits.startsWith("0098")) return `0${digits.slice(4)}`;
  if (digits.startsWith("98") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) return `0${digits}`;
  return digits;
};

const isValidMobile = (value: string): boolean => /^09\d{9}$/.test(value);

const describeMelipayamakCode = (code: string): string =>
  MELIPAYAMAK_ERRORS[code] ??
  `ارسال پیامک ناموفق بود (کد خطای ملی پیامک: ${code || "نامشخص"}).`;

const parsePayload = (raw: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

/**
 * Sends one SMS through Melipayamak's REST API.
 * Throws a descriptive Persian error when configuration or delivery fails.
 */
export const sendSms = async (
  input: SendSmsInput,
): Promise<SendSmsResult> => {
  const config = await getSmsConfig();

  if (!config.username)
    throw new Error(
      "نام کاربری پنل ملی پیامک پیکربندی نشده است. از بخش تنظیمات، اطلاعات پنل پیامکی را وارد کنید.",
    );
  if (!config.password)
    throw new Error(
      "رمز عبور یا ApiKey پنل ملی پیامک پیکربندی نشده است.",
    );
  if (!config.from)
    throw new Error(
      "شماره فرستنده پنل ملی پیامک پیکربندی نشده است.",
    );

  const to = normalizeMobile(input.to);
  if (!isValidMobile(to))
    throw new Error(
      "شماره موبایل گیرنده معتبر نیست. شماره را به شکل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.",
    );

  const text = input.text.trim();
  if (!text) throw new Error("متن پیامک خالی است.");

  const form = new URLSearchParams({
    username: config.username,
    password: config.password,
    from: config.from,
    to,
    text,
    isFlash: String(config.isFlash),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  let raw: string;
  try {
    response = await fetch(MELIPAYAMAK_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json",
      },
      body: form.toString(),
      signal: controller.signal,
    });
    raw = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "زمان اتصال به وب‌سرویس ملی پیامک به پایان رسید. اتصال اینترنت/شبکه سرور را بررسی کنید.",
      );
    logger.error("Melipayamak request failed:", error);
    throw new Error(
      "ارتباط با وب‌سرویس ملی پیامک برقرار نشد. آدرس سرویس و اتصال شبکه سرور را بررسی کنید.",
    );
  } finally {
    clearTimeout(timer);
  }

  const payload = parsePayload(raw);
  if (!payload) {
    if (!response.ok)
      throw new Error(
        `وب‌سرویس ملی پیامک با خطای HTTP ${response.status} پاسخ داد.`,
      );
    throw new Error(
      `پاسخ وب‌سرویس ملی پیامک قابل خواندن نبود: ${raw.slice(0, 200) || "پاسخ خالی"}`,
    );
  }

  const retStatus = Number(payload.RetStatus);
  const value = str(payload.Value);
  const providerMessage = str(payload.StrRetStatus);

  if (retStatus === 1) {
    logger.info(`sms sent → ${to} (recId: ${value || "?"})`);
    return { recId: value };
  }

  const knownError = MELIPAYAMAK_ERRORS[value];
  if (knownError) throw new Error(knownError);

  if (providerMessage)
    throw new Error(
      `ارسال پیامک ناموفق بود: ${providerMessage}${value ? ` (کد ${value})` : ""}.`,
    );

  throw new Error(describeMelipayamakCode(value));
};

/** Sends a test message to confirm the saved SMS panel settings work. */
export const verifySms = async (to?: string): Promise<SendSmsResult> => {
  const config = await getSmsConfig();
  const destination = to?.trim() || config.testNumber;

  if (!destination)
    throw new Error(
      "شماره موبایل آزمایشی وارد نشده است. آن را در تنظیمات پنل پیامکی ذخیره کنید.",
    );

  return sendSms({
    to: destination,
    text: "تست وب سرویس ملی پیامک — پنل مدیریت",
  });
};
