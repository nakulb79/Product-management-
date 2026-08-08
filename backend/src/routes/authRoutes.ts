import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me, register } from '../controllers/authController';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});

router.post('/register', authLimiter, optionalAuth, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, me);

export default router;
