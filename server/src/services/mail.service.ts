import nodemailer, { type Transporter } from "nodemailer";
import { Setting } from "../models/Setting.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Outgoing mail (SMTP) client used to answer contact messages.
 *
 * The administrator configures the shop mailbox from the admin panel
 * (settings group `mail`); the `.env` values act as fallbacks so an operator
 * can also configure everything without touching the database. Replies are
 * always sent *from* the admin mailbox *to* the address that submitted the
 * contact form.
 */

export interface MailConfig {
  /** Mailbox the admin receives/sends from (the "shop" address). */
  adminEmail: string;
  /** Display name used in the `From` header. */
  fromName: string;
  /** SMTP server host — empty when mail is not configured yet. */
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
}

export interface MailStatus {
  /** True when a SMTP host + sender address are available. */
  configured: boolean;
  /** True when the admin filled the mailbox in the settings screen. */
  hasAdminEmail: boolean;
  adminEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  /** The SMTP password is never returned — only whether one is stored. */
  hasPassword: boolean;
  /** Length of the stored password (helps spot a non-app-password). */
  passwordLength: number;
  /** True when the admin entered both mailbox + SMTP host. */
  ready: boolean;
  /** Actionable warning when the setup looks suspicious, else empty. */
  warning: string;
}

const mailKeys = [
  "adminEmail",
  "mailFromName",
  "smtpHost",
  "smtpPort",
  "smtpSecure",
  "smtpUser",
  "smtpPass",
];

/**
 * Maps raw nodemailer/SMTP failures to actionable Persian messages so the
 * admin panel can show something more useful than `Invalid login: 535 ...`.
 */
export const describeMailError = (
  error: unknown,
): string => {
  const raw =
    error instanceof
    Error
      ? error.message
      : String(
          error ??
            "",
        );
  const lower =
    raw.toLowerCase();

  if (
    lower.includes(
      "invalid login",
    ) ||
    lower.includes(
      "535",
    ) ||
    lower.includes(
      "badcredentials",
    ) ||
    lower.includes(
      "username and password not accepted",
    ) ||
    lower.includes(
      "534",
    ) ||
    lower.includes(
      "application-specific password",
    )
  )
    return "نام کاربری یا رمز عبور SMTP پذیرفته نشد. برای Gmail باید در حساب گوگل تأیید دو مرحلهای را روشن کرده و از نشانی myaccount.google.com/apppasswords یک «رمز برنامه» (App Password) ۱۶ کاراکتری بسازید و آن را در فیلد «رمز عبور SMTP» وارد و ذخیره کنید — رمز اصلی حساب کار نمیکند.";

  if (
    lower.includes(
      "econnrefused",
    )
  )
    return "اتصال به سرور SMTP برقرار نشد. آدرس و پورت سرور SMTP و بازبودن پورت در فایروال را بررسی کنید.";

  if (
    lower.includes(
      "etimedout",
    ) ||
    lower.includes(
      "timeout",
    )
  )
    return "زمان اتصال به سرور SMTP به پایان رسید. اتصال اینترنت/شبکه سرور یا فایروال را بررسی کنید.";

  if (
    lower.includes(
      "enotfound",
    ) ||
    lower.includes(
      "getaddrinfo",
    )
  )
    return "آدرس سرور SMTP یافت نشد. مقدار «سرور SMTP» را بررسی کنید (مثلاً smtp.gmail.com).";

  if (
    lower.includes(
      "self signed",
    ) ||
    lower.includes(
      "certificate",
    ) ||
    lower.includes(
      "unable to verify",
    )
  )
    return "گواهی امنیتی سرور SMTP معتبر نیست. در صورت نیاز گزینه «اتصال امن» را تغییر دهید.";

  if (
    lower.includes(
      "ssl",
    ) ||
    lower.includes(
      "wrong version number",
    )
  )
    return "تنظیم «اتصال امن» با پورت سرور SMTP سازگار نیست. برای پورت ۴۶۵ آن را روشن و برای پورت ۵۸۷ خاموش کنید.";

  return raw ||
    "ارسال ایمیل ناموفق بود";
};

const str = (
  value: unknown,
): string =>
  value ===
    null ||
  value ===
    undefined
    ? ""
    : String(
        value,
      ).trim();

const boolish = (
  value: unknown,
  fallback: boolean,
): boolean => {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  )
    return fallback;
  if (
    typeof value ===
    "boolean"
  )
    return value;
  return [
    "1",
    "true",
    "yes",
    "on",
  ].includes(
    String(
      value,
    ).toLowerCase(),
  );
};

/** Resolves the mail configuration from settings, falling back to `.env`. */
export const getMailConfig =
  async (): Promise<MailConfig> => {
    const rows =
      await Setting.find(
        {
          key: {
            $in: mailKeys,
          },
        },
      ).lean();
    const map =
      Object.fromEntries(
        rows.map(
          (
            row,
          ) => [
            row.key,
            row.value,
          ],
        ),
      );

    const smtpHost =
      str(
        map[
          "smtpHost"
        ],
      ) ||
      env.smtpHost;
    const smtpUser =
      str(
        map[
          "smtpUser"
        ],
      ) ||
      env.smtpUser;
    const smtpPass =
      // Gmail app passwords are shown in groups of four ("abcd efgh ijkl mnop")
      // but must be submitted without the spaces — strip any inner whitespace.
      (
        str(
          map[
            "smtpPass"
          ],
        ) ||
        env.smtpPass
      ).replace(
        /\s+/g,
        "",
      );
    const smtpPort =
      Number(
        map[
          "smtpPort"
        ] ??
          env.smtpPort,
      ) ||
      env.smtpPort ||
      587;

    return {
      adminEmail:
        str(
          map[
            "adminEmail"
          ],
        ) ||
        env.adminEmail,
      fromName:
        str(
          map[
            "mailFromName"
          ],
        ) ||
        env.mailFromName,
      smtpHost,
      smtpPort,
      smtpSecure:
        boolish(
          map[
            "smtpSecure"
          ],
          env.smtpSecure,
        ),
      smtpUser,
      smtpPass,
    };
  };

/** Public-safe summary of the current mail configuration (never leaks secrets). */
export const getMailStatus =
  async (): Promise<MailStatus> => {
    const config =
      await getMailConfig();

    const isGmail =
      /gmail\.com$/i.test(
        config.smtpHost,
      ) ||
      /googlemail\.com$/i.test(
        config.smtpHost,
      );
    const passwordLength =
      config.smtpPass
        .length;

    let warning =
      "";
    if (
      config.smtpHost &&
      isGmail &&
      config.smtpPass &&
      passwordLength !==
        16
    )
      warning =
        "طول رمز ذخیرهشده با «رمز برنامه» گوگل (۱۶ کاراکتر) همخوانی ندارد؛ احتمالاً رمز اصلی حساب وارد شده است. از myaccount.google.com/apppasswords یک رمز برنامه بسازید.";
    else if (
      config.smtpHost &&
      !config.smtpPass
    )
      warning =
        "رمز عبور SMTP وارد نشده است؛ بدون آن معمولاً ارسال ایمیل ناموفق میشود.";

    return {
      configured:
        Boolean(
          config.adminEmail,
        ) &&
        Boolean(
          config.smtpHost,
        ),
      hasAdminEmail:
        Boolean(
          config.adminEmail,
        ),
      adminEmail:
        config.adminEmail,
      fromName:
        config.fromName,
      smtpHost:
        config.smtpHost,
      smtpPort:
        config.smtpPort,
      smtpSecure:
        config.smtpSecure,
      smtpUser:
        config.smtpUser,
      hasPassword:
        Boolean(
          config.smtpPass,
        ),
      passwordLength:
        config.smtpPass
          .length,
      ready:
        Boolean(
          config.adminEmail,
        ) &&
        Boolean(
          config.smtpHost,
        ),
      warning,
    };
  };

const buildTransport =
  (
    config: MailConfig,
  ): Transporter => {
    const auth =
      config.smtpUser ||
      config.smtpPass
        ? {
            user:
              config.smtpUser,
            pass:
              config.smtpPass,
          }
        : undefined;

    return nodemailer.createTransport(
      {
        host:
          config.smtpHost,
        port:
          config.smtpPort,
        secure:
          config.smtpSecure,
        auth,
        connectionTimeout:
          10_000,
        greetingTimeout:
          10_000,
        socketTimeout:
          20_000,
      },
      {
        from: {
          name:
            config.fromName ||
            "پشتیبانی",
          address:
            config.adminEmail,
        },
      },
    );
  };

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

/**
 * Sends an email through the configured SMTP server.
 * Throws a descriptive error when mail is not configured or delivery fails.
 */
export const sendMail =
  async (
    input: SendMailInput,
  ): Promise<void> => {
    const config =
      await getMailConfig();

    if (
      !config.smtpHost
    )
      throw new Error(
        "سرور SMTP پیکربندی نشده است. از بخش تنظیمات، اطلاعات ایمیل مدیر فروشگاه را وارد کنید.",
      );
    if (
      !config.adminEmail
    )
      throw new Error(
        "ایمیل مدیر فروشگاه پیکربندی نشده است.",
      );

    const transport =
      buildTransport(
        config,
      );

    let info;
    try {
      info =
        await transport.sendMail(
          {
            from: {
              name:
                config.fromName ||
                "پشتیبانی",
              address:
                config.adminEmail,
            },
            to: input.to,
            subject:
              input.subject,
            text:
              input.text,
            html:
              input.html,
            replyTo:
              input.replyTo,
          },
        );
    } catch (error) {
      throw new Error(
        describeMailError(
          error,
        ),
      );
    }

    logger.info(
      `mail sent → ${input.to} (${info.messageId})`,
    );
  };

/** Sends a plain-text verification email to confirm the SMTP settings work. */
export const verifyMail =
  async (
    to?: string,
  ): Promise<void> => {
    const config =
      await getMailConfig();
    if (
      !config.smtpHost
    )
      throw new Error(
        "سرور SMTP پیکربندی نشده است.",
      );
    if (
      !config.adminEmail
    )
      throw new Error(
        "ایمیل مدیر فروشگاه پیکربندی نشده است.",
      );

    await sendMail(
      {
        to:
          to ||
          config.adminEmail,
        subject:
          "آزمایش تنظیمات ایمیل — پنل مدیریت",
        text:
          "این یک ایمیل آزمایشی است تا صحت تنظیمات SMTP پنل مدیریت بررسی شود.",
      },
    );
  };

/** Escapes user-supplied text before embedding it into the reply HTML. */
const escapeHtml =
  (
    value: string,
  ): string =>
    value
      .replace(
        /&/g,
        "&amp;",
      )
      .replace(
        /</g,
        "&lt;",
      )
      .replace(
        />/g,
        "&gt;",
      )
      .replace(
        /"/g,
        "&quot;",
      );

/** Builds the HTML body for a reply to a contact message. */
export const buildReplyHtml =
  (
    original: {
      name: string;
      body: string;
      createdAt?: Date;
    },
    reply: string,
  ): string => {
    const safeName =
      escapeHtml(
        original.name,
      );
    const safeBody =
      escapeHtml(
        original.body,
      ).replace(
        /\n/g,
        "<br />",
      );
    const safeReply =
      escapeHtml(
        reply,
      ).replace(
        /\n/g,
        "<br />",
      );

    return `<!doctype html>
<html lang="fa" dir="rtl">
  <body style="margin:0;padding:24px;background:#f5f6f8;font-family:Tahoma,Arial,sans-serif;color:#1f2937">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="padding:20px 24px;background:#2563eb;color:#ffffff">
        <h2 style="margin:0;font-size:18px">پاسخ به پیام شما</h2>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 16px">${safeName} عزیز،</p>
        <div style="padding:16px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;line-height:1.9">
          ${safeReply}
        </div>
        <p style="margin:24px 0 8px;color:#6b7280;font-size:13px">پیام ارسالی شما:</p>
        <blockquote style="margin:0;padding:12px 16px;border-right:3px solid #d1d5db;color:#4b5563;line-height:1.8;font-size:13px">
          ${safeBody}
        </blockquote>
      </div>
    </div>
  </body>
</html>`;
  };