import { Router } from 'express';
import * as media from '../controllers/media.controller.js';

/** Public media routes — images may be embedded by the portal and emails. */
export const mediaRoutes = Router();

mediaRoutes.get('/:id/file', media.file);
