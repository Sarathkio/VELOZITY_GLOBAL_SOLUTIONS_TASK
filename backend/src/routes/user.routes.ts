import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema, uuidParamSchema } from '../validators/index.js';

const router = Router();

// All user management routes require Admin
router.use(authenticate, requireAdmin);

router.get('/', userController.getAll);
router.get('/:id', validate(uuidParamSchema, 'params'), userController.getById);
router.post('/', validate(createUserSchema), userController.create);
router.patch('/:id', validate(uuidParamSchema, 'params'), validate(updateUserSchema), userController.update);
router.delete('/:id', validate(uuidParamSchema, 'params'), userController.delete);

export default router;
