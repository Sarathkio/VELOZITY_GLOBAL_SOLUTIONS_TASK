import { Router } from 'express';
import { clientController } from '../controllers/client.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createClientSchema, updateClientSchema, uuidParamSchema } from '../validators/index.js';

const router = Router();

// Admin manages clients; PM/Developer can read for project creation
router.use(authenticate);

router.get('/', clientController.getAll);                  // All authenticated (PM needs to pick client when creating project)
router.get('/:id', validate(uuidParamSchema, 'params'), clientController.getById);

// Write operations: admin only
router.post('/', requireAdmin, validate(createClientSchema), clientController.create);
router.patch('/:id', requireAdmin, validate(uuidParamSchema, 'params'), validate(updateClientSchema), clientController.update);
router.delete('/:id', requireAdmin, validate(uuidParamSchema, 'params'), clientController.delete);

export default router;
