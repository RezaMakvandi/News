import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { Media } from "../models/Media.js";
import { env } from "../config/env.js";
import {
  ApiError,
  asyncHandler,
} from "../utils/ApiError.js";
import { sendSuccess } from "../utils/respond.js";
import { publicUrlFor } from "../middleware/upload.js";

/**
 * Resumable (chunked) uploads for large files such as videos.
 *
 * Protocol:
 *  1. `GET  /api/admin/media/uploads/:uploadId/status` → `{ received }` bytes
 *     already stored for this upload id.
 *  2. `PUT  /api/admin/media/uploads/:uploadId` with `X-File-Size` /
 *     `X-File-Type` headers and the raw chunk as the request body.
 *  3. `POST /api/admin/media/uploads/:uploadId/complete` with metadata
 *     (filename, type, size, alt, folder) → stores a `Media` document and
 *     returns the public URL.
 *
 * Chunks are appended to a temp file under `uploads/.chunks/<uploadId>` so an
 * interrupted browser upload can resume from the last acknowledged offset
 * instead of restarting from zero.
 */

const VIDEO_TYPES =
  new Set(
    [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-matroska",
    ],
  );
const MAX_FILE_SIZE =
  2 *
  1024 *
  1024 *
  1024; // 2 GB
const CHUNKS_DIR =
  path.join(
    env.uploadsDir,
    ".chunks",
  );

const SAFE_ID =
  /^[a-zA-Z0-9-]{8,64}$/;
const ID_TTL_MS =
  24 *
  60 *
  60 *
  1000; // abandoned temp files are purged after a day

interface ChunkSession {
  id: string;
  size: number;
  mimeType: string;
  createdAt: number;
}

/** In-memory registry of active sessions (id → metadata). */
const sessions =
  new Map<
    string,
    ChunkSession
  >();

const tempPathFor =
  (
    id: string,
  ) =>
    path.join(
      CHUNKS_DIR,
      `${id}.part`,
    );

const sanitizeSegment =
  (
    value: string,
    fallback: string,
  ) =>
    value
      .replace(
        /[^\p{L}\p{N}._-]+/gu,
        "-",
      )
      .slice(
        0,
        80,
      ) ||
    fallback;

const extensionFor =
  (
    mimeType: string,
    originalName: string,
  ) => {
    const fromName =
      path
        .extname(
          originalName ||
            "",
        )
        .toLowerCase();
    if (
      fromName
    )
      return fromName;
    const map: Record<
      string,
      string
    > = {
      "video/mp4":
        ".mp4",
      "video/webm":
        ".webm",
      "video/ogg":
        ".ogv",
      "video/quicktime":
        ".mov",
      "video/x-matroska":
        ".mkv",
    };
    return (
      map[
        mimeType
      ] ??
      ".bin"
    );
  };

const purgeExpired =
  () => {
    if (
      !fs.existsSync(
        CHUNKS_DIR,
      )
    )
      return;
    let entries: fs.Dirent[] =
      [];
    try {
      entries =
        fs.readdirSync(
          CHUNKS_DIR,
          {
            withFileTypes: true,
          },
        );
    } catch {
      return;
    }
    const now =
      Date.now();
    for (const entry of entries) {
      if (
        !entry.name.endsWith(
          ".part",
        )
      )
        continue;
      const target =
        path.join(
          CHUNKS_DIR,
          entry.name,
        );
      try {
        const stats =
          fs.statSync(
            target,
          );
        if (
          now -
            stats.mtimeMs >
          ID_TTL_MS
        )
          fs.rmSync(
            target,
            {
              force: true,
            },
          );
      } catch {
        /* already removed by a concurrent request */
      }
    }
    for (const [
      id,
      session,
    ] of sessions) {
      if (
        now -
          session.createdAt >
        ID_TTL_MS
      )
        sessions.delete(
          id,
        );
    }
  };

/** GET /api/admin/media/uploads/:uploadId/status — bytes already received. */
export const chunkStatus =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const {
        uploadId,
      } =
        req.params as {
          uploadId: string;
        };
      if (
        !SAFE_ID.test(
          uploadId,
        )
      )
        throw ApiError.badRequest(
          "شناسه آپلود نامعتبر است",
        );

      let received = 0;
      try {
        received =
          (
            await fsp.stat(
              tempPathFor(
                uploadId,
              ),
            )
          )
            .size;
      } catch {
        received = 0;
      }

      return sendSuccess(
        res,
        {
          uploadId,
          received,
        },
      );
    },
  );

/** PUT /api/admin/media/uploads/:uploadId — append one raw chunk. */
export const uploadChunk =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const {
        uploadId,
      } =
        req.params as {
          uploadId: string;
        };
      if (
        !SAFE_ID.test(
          uploadId,
        )
      )
        throw ApiError.badRequest(
          "شناسه آپلود نامعتبر است",
        );

      const total =
        Number(
          req
            .headers[
            "x-file-size"
          ] ??
            0,
        );
      if (
        !Number.isFinite(
          total,
        ) ||
        total <=
          0 ||
        total >
          MAX_FILE_SIZE
      ) {
        throw ApiError.badRequest(
          "حجم فایل خارج از محدوده مجاز است",
        );
      }

      const mimeType =
        String(
          req
            .headers[
            "x-file-type"
          ] ??
            "",
        );
      if (
        mimeType &&
        !VIDEO_TYPES.has(
          mimeType,
        )
      ) {
        throw ApiError.badRequest(
          `فرمت ویدیو پشتیبانی نمی‌شود: ${mimeType}`,
        );
      }

      const existing =
        sessions.get(
          uploadId,
        );
      if (
        existing &&
        existing.size !==
          total
      )
        throw ApiError.conflict(
          "حجم فایل با جلسه آپلود فعلی هم‌خوانی ندارد",
        );

      const current =
        req.body
          ? (
              req.body as Buffer
            )
              .length
          : 0;
      if (
        current ===
        0
      )
        throw ApiError.badRequest(
          "بخش ارسالی خالی است",
        );

      await fsp.mkdir(
        CHUNKS_DIR,
        {
          recursive: true,
        },
      );

      const target =
        tempPathFor(
          uploadId,
        );
      const received =
        fs.existsSync(
          target,
        )
          ? fs.statSync(
              target,
            )
              .size
          : 0;

      // The client reads `received` before sending, so a mismatch means a race
      // between parallel tabs; ask it to re-sync via the status endpoint.
      if (
        received +
          current >
        total
      ) {
        throw ApiError.conflict(
          "حجم دریافتی بیش از حد انتظار است؛ آپلود را از ابتدا شروع کنید",
        );
      }

      await fsp.appendFile(
        target,
        req.body as Buffer,
      );
      sessions.set(
        uploadId,
        {
          id: uploadId,
          size: total,
          mimeType:
            mimeType ||
            existing?.mimeType ||
            "",
          createdAt:
            existing?.createdAt ??
            Date.now(),
        },
      );

      return sendSuccess(
        res,
        {
          uploadId,
          received:
            received +
            current,
        },
      );
    },
  );

/** POST /api/admin/media/uploads/:uploadId/complete — finalise into Media. */
export const completeChunkedUpload =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const {
        uploadId,
      } =
        req.params as {
          uploadId: string;
        };
      if (
        !SAFE_ID.test(
          uploadId,
        )
      )
        throw ApiError.badRequest(
          "شناسه آپلود نامعتبر است",
        );

      const body =
        (req.body ??
          {}) as {
          filename?: string;
          mimeType?: string;
          size?: number;
          alt?: string;
          folder?: string;
        };

      const mimeType =
        String(
          body.mimeType ??
            sessions.get(
              uploadId,
            )
              ?.mimeType ??
            "",
        );
      if (
        !VIDEO_TYPES.has(
          mimeType,
        )
      )
        throw ApiError.badRequest(
          `فرمت ویدیو پشتیبانی نمی‌شود: ${mimeType || "نامشخص"}`,
        );

      const source =
        tempPathFor(
          uploadId,
        );
      if (
        !fs.existsSync(
          source,
        )
      )
        throw ApiError.notFound(
          "آپلودی برای تکمیل وجود ندارد",
        );

      const size =
        fs.statSync(
          source,
        ).size;
      if (
        body.size &&
        Math.abs(
          size -
            Number(
              body.size,
            ),
        ) >
          1024
      ) {
        throw ApiError.conflict(
          "حجم فایل دریافتی با مقدار اعلام‌شده هم‌خوانی ندارد",
        );
      }

      purgeExpired();

      const now =
        new Date();
      const folder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const targetDir =
        path.join(
          env.uploadsDir,
          folder,
        );
      await fsp.mkdir(
        targetDir,
        {
          recursive: true,
        },
      );

      const originalName =
        sanitizeSegment(
          body.filename ??
            "video",
          "video",
        );
      const filename = `${originalName}-${crypto.randomUUID().slice(0, 12)}${extensionFor(mimeType, body.filename ?? "")}`;
      const target =
        path.join(
          targetDir,
          filename,
        );
      await fsp.rename(
        source,
        target,
      );

      const media =
        await Media.create(
          {
            filename,
            originalName:
              body.filename ??
              filename,
            url: publicUrlFor(
              filename,
              folder,
            ),
            mimeType,
            size,
            alt:
              body.alt ??
              "",
            folder:
              body.folder ??
              "article-videos",
            uploadedBy:
              req
                .user
                ?._id ??
              null,
          },
        );

      return sendSuccess(
        res,
        media,
        {
          status: 201,
          message:
            "ویدیو با موفقیت بارگذاری شد",
        },
      );
    },
  );

/** DELETE /api/admin/media/uploads/:uploadId — abort and clean up. */
export const abortChunkedUpload =
  asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
    ) => {
      const {
        uploadId,
      } =
        req.params as {
          uploadId: string;
        };
      if (
        !SAFE_ID.test(
          uploadId,
        )
      )
        throw ApiError.badRequest(
          "شناسه آپلود نامعتبر است",
        );

      sessions.delete(
        uploadId,
      );
      await fsp.rm(
        tempPathFor(
          uploadId,
        ),
        {
          force: true,
        },
      );

      return sendSuccess(
        res,
        {
          uploadId,
        },
        {
          message:
            "آپلود لغو شد",
        },
      );
    },
  );

/** Removes stale temp chunks on module load. */
fs.mkdirSync(
  CHUNKS_DIR,
  {
    recursive: true,
  },
);
purgeExpired();
