"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const authController = new authController_1.AuthController();
// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
// Protected routes
router.get('/profile', auth_1.authenticateToken, (req, res) => authController.getProfile(req, res));
router.put('/profile', auth_1.authenticateToken, (req, res) => authController.updateProfile(req, res));
router.post('/change-password', auth_1.authenticateToken, (req, res) => authController.changePassword(req, res));
exports.default = router;
