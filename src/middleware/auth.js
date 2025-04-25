"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        res.status(401).json({ success: false, message: 'Authentication token is required' });
        return;
    }
    try {
        // Verify token
        const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Check if user exists in database
        const result = yield (0, database_1.query)('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
            res.status(401).json({ success: false, message: 'Invalid user' });
            return;
        }
        // Set user in request object
        req.user = {
            id: result.rows[0].id,
            email: result.rows[0].email,
            role: result.rows[0].role
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            if (error.name === 'TokenExpiredError') {
                res.status(401).json({ success: false, message: 'Token expired' });
            }
            else {
                res.status(403).json({ success: false, message: 'Invalid token' });
            }
        }
        else {
            res.status(500).json({ success: false, message: 'Authentication error' });
        }
    }
});
exports.authenticateToken = authenticateToken;
// Middleware to check if user has required role
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: 'Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
