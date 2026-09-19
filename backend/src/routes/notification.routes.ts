import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAnyRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../validators/index.js';

const router = Router();

router.use(authenticate, requireAnyRole);

router.get('/', notificationController.getAll);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validate(uuidParamSchema, 'params'), notificationController.markAsRead);

export default router;
