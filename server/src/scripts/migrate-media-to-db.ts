/**
 * One-off migration: store existing image files inside MongoDB and normalise
 * every `/uploads/...` reference to a site-relative path.
 *
 * Run with: `npm run migrate:media`
 *
 * The script is idempotent: images already backed by MongoDB are only checked
 * for URL normalisation, and missing files are reported then skipped.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import type { Filter, ObjectId } from 'mongodb';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Media } from '../models/Media.js';
import { logger } from '../utils/logger.js';

/** Matches any local development origin in front of an `/uploads/` path. */
const LOCAL_ORIGIN = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?=\/uploads\/)/gi;

const uploadsRelative = (url: string): string | null => {
  const marker = '/uploads/';
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
};

const diskPathForUrl = (url: string): string | null => {
  const relative = uploadsRelative(url);
  if (!relative) return null;

  const root = path.resolve(env.uploadsDir);
  const target = path.resolve(root, relative);
  return target.startsWith(`${root}${path.sep}`) ? target : null;
};

/** Rewrites strings inside arbitrary BSON documents without touching buffers/ids. */
const rewriteValue = (value: unknown, replacements: Map<string, string>): unknown => {
  if (typeof value === 'string') {
    let next = value;
    for (const [from, to] of replacements) {
      if (next.includes(from)) next = next.split(from).join(to);
    }
    return next.replace(LOCAL_ORIGIN, '');
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const rewritten = rewriteValue(item, replacements);
      if (rewritten !== item) changed = true;
      return rewritten;
    });
    return changed ? next : value;
  }

  if (value && typeof value === 'object' && value.constructor?.name === 'Object') {
    const source = value as Record<string, unknown>;
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(source)) {
      const rewritten = rewriteValue(child, replacements);
      if (rewritten !== child) changed = true;
      next[key] = rewritten;
    }
    return changed ? next : value;
  }

  return value;
};

const migrate = async () => {
  await connectDatabase();

  const replacements = new Map<string, string>();

  /* 1) Move every image's bytes from disk into its Media document. */
  const images = await Media.find({ mimeType: /^image\//i }).select('+data');
  let moved = 0;
  let skipped = 0;

  for (const media of images) {
    const oldUrl = media.url;
    const targetUrl = `/api/media/${media._id.toHexString()}/file`;
    const hasBytes = Boolean(media.data?.length);

    if (!hasBytes) {
      const source = diskPathForUrl(oldUrl);
      if (!source || !fs.existsSync(source)) {
        logger.warn(
          `Skipped ${media.originalName} (${media._id.toHexString()}): no bytes in MongoDB and no file on disk.`,
        );
        skipped += 1;
        continue;
      }

      media.data = await fsp.readFile(source);
      media.storage = 'db';
      await media.save();
      await fsp.rm(source, { force: true });
      moved += 1;
      logger.success(`Stored ${media.originalName} (${media.size} bytes) in MongoDB`);
    } else if (media.storage !== 'db') {
      media.storage = 'db';
      await media.save();
    }

    if (oldUrl !== targetUrl) {
      media.url = targetUrl;
      await media.save();
      replacements.set(oldUrl, targetUrl);
    }
  }

  /* 2) Non-image media (videos, PDFs) stay on disk but use relative URLs. */
  const others = await Media.find({ mimeType: { $not: /^image\//i } });
  for (const media of others) {
    const oldUrl = media.url;
    const normalized = oldUrl.replace(LOCAL_ORIGIN, '');
    if (normalized !== oldUrl) {
      media.url = normalized;
      media.storage = 'disk';
      await media.save();
      replacements.set(oldUrl, normalized);
    }
  }

  /* 3) Rewrite references (article covers/content, avatars, products, …). */
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');

  const collections = await db.listCollections().toArray();
  let updatedDocs = 0;

  for (const { name } of collections) {
    if (name.startsWith('system.') || name === 'media') continue;

    const collection = db.collection(name);
    const cursor = collection.find({});
    const updates: Array<{ filter: Filter<{ _id: ObjectId }>; document: Record<string, unknown> }> = [];

    for await (const doc of cursor) {
      const rewritten = rewriteValue(doc, replacements);
      if (rewritten !== doc) {
        updates.push({
          filter: { _id: doc._id as ObjectId },
          document: rewritten as Record<string, unknown>,
        });
      }
    }

    for (const update of updates) {
      await collection.replaceOne(update.filter, update.document);
      updatedDocs += 1;
    }
  }

  logger.success(
    `Media migration finished: ${moved} image(s) moved to MongoDB, ` +
      `${skipped} skipped, ${updatedDocs} document(s) had URLs rewritten.`,
  );

  await disconnectDatabase();
};

migrate().catch(async (error) => {
  logger.error('Media migration failed:', error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
