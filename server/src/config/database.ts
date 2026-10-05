import fs from 'node:fs';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Dev-only MongoDB fallback.
 *
 * When MONGODB_URI is empty we run a local `mongod` (via mongodb-memory-server)
 * on a fixed port and data directory so that data survives restarts and can be
 * shared between the dev server and one-off scripts such as `npm run seed`.
 */
const MEMORY_PORT = Number(process.env.MEMORY_MONGO_PORT ?? 27019);
export const MEMORY_DB_NAME = 'zoomit';
export const MEMORY_URI = `mongodb://127.0.0.1:${MEMORY_PORT}/${MEMORY_DB_NAME}`;
const MEMORY_DB_PATH = `${env.rootDir}/.mongodb-data`;

type MemoryServer = { stop: () => Promise<void>; getUri: (name?: string) => string };
let ownedServer: MemoryServer | null = null;

/** True when something is already listening on the memory port. */
const canReachMemoryServer = async (): Promise<boolean> => {
  const connection = mongoose.createConnection();
  try {
    await connection.openUri(MEMORY_URI, { serverSelectionTimeoutMS: 1200 });
    await connection.close();
    return true;
  } catch {
    await connection.close().catch(() => undefined);
    return false;
  }
};

const clearStaleLocks = () => {
  for (const file of ['mongod.lock', 'WiredTiger.lock', 'WiredTiger.turtle.set']) {
    const target = `${MEMORY_DB_PATH}/${file}`;
    if (fs.existsSync(target)) {
      try {
        fs.rmSync(target, { force: true });
      } catch {
        /* ignore */
      }
    }
  }
};

const startMemoryServer = async (): Promise<MemoryServer> => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  fs.mkdirSync(MEMORY_DB_PATH, { recursive: true });

  const options = {
    instance: {
      port: MEMORY_PORT,
      dbName: MEMORY_DB_NAME,
      dbPath: MEMORY_DB_PATH,
      storageEngine: 'wiredTiger' as const,
    },
  };

  try {
    return (await MongoMemoryServer.create(options)) as unknown as MemoryServer;
  } catch {
    // A previous run may have been killed without a clean shutdown.
    logger.warn('Local MongoDB failed to start, retrying after clearing stale locks…');
    clearStaleLocks();
    try {
      return (await MongoMemoryServer.create(options)) as unknown as MemoryServer;
    } catch (retryError) {
      throw new Error(
        `Could not start the dev MongoDB on port ${MEMORY_PORT}. ` +
          `Close any process using that port or set MONGODB_URI in .env. (${String(retryError)})`,
      );
    }
  }
};

/**
 * Resolves the connection string to use, starting a shared local instance when
 * no external MONGODB_URI is configured.
 */
export const resolveMongoUri = async (): Promise<{ uri: string; usingMemory: boolean }> => {
  if (env.mongodbUri) return { uri: env.mongodbUri, usingMemory: false };

  if (env.isProd) {
    throw new Error('MONGODB_URI is required in production.');
  }

  await mongoose.disconnect().catch(() => undefined);

  if (await canReachMemoryServer()) {
    logger.info(`Reusing the running dev MongoDB on port ${MEMORY_PORT}`);
    return { uri: MEMORY_URI, usingMemory: true };
  }

  ownedServer = await startMemoryServer();
  logger.warn(`MONGODB_URI is empty — started a local MongoDB on port ${MEMORY_PORT} (data in .mongodb-data).`);
  return { uri: ownedServer.getUri(MEMORY_DB_NAME), usingMemory: true };
};

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (error) => logger.error('MongoDB error:', error));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  const { uri, usingMemory } = await resolveMongoUri();

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });

  logger.success(
    `MongoDB connected (${usingMemory ? 'local dev instance' : 'external'}) → ${uri.replace(/\/\/.*@/, '//***@')}`,
  );
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (ownedServer) {
    const server = ownedServer;
    ownedServer = null;
    await server.stop().catch(() => undefined);
  }
}