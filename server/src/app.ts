import path from 'node:path';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/validate.js';
import authRoutes from './routes/auth.routes.js';
import articleRoutes from './routes/article.routes.js';
import adminRoutes from './routes/admin.routes.js';
import {
  authorRoutes,
  categoryRoutes,
  commentRoutes,
  messageRoutes,
  pageRoutes,
  subscriberRoutes,
  tagRoutes,
} from './routes/public.routes.js';
import { getPublic } from './controllers/settings.controller.js';

export const createApp = (): Application => {
  const app = express();

  app.set('trust proxy', env.trustProxy ? 1 : false);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '3mb' }));
  app.use(express.urlencoded({ extended: true, limit: '3mb' }));
  app.use(cookieParser());

  if (!env.isProd) {
    app.use(morgan('dev'));
  }

  app.use(
    '/uploads',
    express.static(env.uploadsDir, {
      maxAge: env.isProd ? '30d' : 0,
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime(), env: env.nodeEnv } });
  });

  app.use('/api', apiLimiter);

  app.get('/api/settings', getPublic);
  app.use('/api/auth', authRoutes);
  app.use('/api/articles', articleRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/authors', authorRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/pages', pageRoutes);
  app.use('/api/subscribers', subscriberRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve the built Angular app when it exists (production single-port mode).
  const clientDist = path.resolve(env.rootDir, '../client/dist/news-portal/browser');
  app.use(express.static(clientDist, { index: false }));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) res.status(404).json({ success: false, message: 'صفحه مورد نظر یافت نشد' });
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};