// penghubung end point url, zod, rate limiiter, dan controller

import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema.js';
import { authLimiter } from '../middlewares/rateLimiter.middleware.js';
import { publicKey } from '../config/keys.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware.js';


const router = Router();

// Endpoint Public Key (Untuk downstream microservices memverifikasi RS256 JWT)
router.get('/public-key', (req, res) => {
  res.type('text/plain').send(publicKey);
});

// Auth Endpoints
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected Route: Mendapatkan profil user yang sedang login
router.get('/me', authenticate, authController.getMe);

// Protected Route Contoh RBAC: Khusus role 'worker'
router.get('/worker/dashboard', authenticate, authorizeRoles('worker'), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: `Selamat datang di dashboard mitra tukang, ID: ${req.user.id}`,
  });
});

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default router;