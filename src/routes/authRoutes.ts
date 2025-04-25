import express from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const authController = new AuthController();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

// Protected routes
router.get('/profile', authenticateToken, (req, res) => authController.getProfile(req, res));
router.put('/profile', authenticateToken, (req, res) => authController.updateProfile(req, res));
router.post('/change-password', authenticateToken, (req, res) => authController.changePassword(req, res));

export default router;