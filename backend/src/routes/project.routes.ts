import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdminOrPM, requireAnyRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createProjectSchema,
  updateProjectSchema,
  uuidParamSchema,
  createTaskSchema,
  projectIdParamSchema,
} from '../validators/index.js';
import { taskController } from '../controllers/task.controller.js';

const router = Router();

router.use(authenticate);

// Dashboard metrics
router.get('/dashboard', requireAnyRole, projectController.getDashboardMetrics);

// Project CRUD
router.get('/', requireAnyRole, projectController.getAll);
router.get('/:id', validate(uuidParamSchema, 'params'), requireAnyRole, projectController.getById);
router.post('/', requireAdminOrPM, validate(createProjectSchema), projectController.create);
router.patch('/:id', validate(uuidParamSchema, 'params'), requireAdminOrPM, validate(updateProjectSchema), projectController.update);
router.delete('/:id', validate(uuidParamSchema, 'params'), requireAdminOrPM, projectController.delete);

// Project activity feed
router.get('/:id/activity', validate(uuidParamSchema, 'params'), requireAdminOrPM, projectController.getActivity);

// Tasks nested under project for creation
router.post(
  '/:projectId/tasks',
  validate(projectIdParamSchema, 'params'),
  requireAdminOrPM,
  validate(createTaskSchema),
  taskController.createForProject,
);

export default router;

