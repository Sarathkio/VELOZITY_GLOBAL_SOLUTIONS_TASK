import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAnyRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  uuidParamSchema,
  updateTaskSchema,
  developerUpdateTaskSchema,
  taskFilterSchema,
} from '../validators/index.js';
import { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const router = Router();

router.use(authenticate, requireAnyRole);

// Task list with filters (enforced at DB level per role)
router.get('/', validate(taskFilterSchema, 'query'), taskController.getAll);

// Task detail
router.get('/:id', validate(uuidParamSchema, 'params'), taskController.getById);

// Task update — role-aware schema selection applied in controller
router.patch('/:id', validate(uuidParamSchema, 'params'), (req: Request, res: Response, next: NextFunction) => {
  // Developers can only update status; use narrower schema
  const schema = req.user?.role === Role.DEVELOPER ? developerUpdateTaskSchema : updateTaskSchema;
  validate(schema)(req, res, next);
}, taskController.update);

// Task delete — admin/PM only (enforced in service)
router.delete('/:id', validate(uuidParamSchema, 'params'), taskController.delete);

export default router;
