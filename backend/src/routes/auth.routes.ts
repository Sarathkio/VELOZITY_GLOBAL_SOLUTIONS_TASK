import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/index.js';

const router = Router();

// Rate limiter applied specifically to login endpoint (20 requests per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
