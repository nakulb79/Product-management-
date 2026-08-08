import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, register } from '../controllers/authController';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validation/schemas';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
  skip: () => process.env.NODE_ENV === 'test'
});

router.post('/register', authLimiter, optionalAuth, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
