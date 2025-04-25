"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOnError = exports.validateFileExists = exports.handleFileUploadError = exports.uploadSingleFile = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        // Create directory if it doesn't exist
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniquePrefix = (0, uuid_1.v4)();
        const originalName = file.originalname;
        const extension = path_1.default.extname(originalName);
        const filename = `${uniquePrefix}-${Date.now()}${extension}`;
        cb(null, filename);
    }
});
// File filter to only accept certain types
const fileFilter = (req, file, cb) => {
    // Accept CSV and PDF files
    if (file.mimetype === 'text/csv' ||
        file.mimetype === 'application/csv' ||
        file.mimetype === 'application/pdf') {
        cb(null, true);
    }
    else {
        cb(new Error('Only CSV and PDF files are allowed!'));
    }
};
// Configure multer
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // Default 10MB
    }
});
// Single file upload middleware
exports.uploadSingleFile = upload.single('file');
// Error handling middleware for file uploads
const handleFileUploadError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: `File too large. Maximum size is ${parseInt(process.env.MAX_FILE_SIZE || '10485760') / (1024 * 1024)}MB`
            });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    else if (err) {
        // An unknown error occurred
        return res.status(500).json({ success: false, message: err.message });
    }
    // If no error, continue
    next();
};
exports.handleFileUploadError = handleFileUploadError;
// Validate file exists middleware
const validateFileExists = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    next();
};
exports.validateFileExists = validateFileExists;
// Clean up file if processing fails
const cleanupOnError = (req, res, next) => {
    // Save the original end method
    const originalEnd = res.end;
    const originalJson = res.json;
    // Override end method
    res.end = function (...args) {
        // If there was an error and we have a file that was uploaded, remove it
        if (res.statusCode >= 400 && req.file) {
            try {
                fs_1.default.unlinkSync(req.file.path);
                console.log(`Cleaned up file ${req.file.path} due to error`);
            }
            catch (err) {
                console.error('Error cleaning up file:', err);
            }
        }
        // Call the original method
        return originalEnd.call(res, args[0], args[1], args[2]);
    };
    // Override json method
    res.json = function (body) {
        // If there was an error and we have a file that was uploaded, remove it
        if ((body && body.success === false) && req.file) {
            try {
                fs_1.default.unlinkSync(req.file.path);
                console.log(`Cleaned up file ${req.file.path} due to error`);
            }
            catch (err) {
                console.error('Error cleaning up file:', err);
            }
        }
        // Call the original method
        return originalJson.call(res, body);
    };
    next();
};
exports.cleanupOnError = cleanupOnError;
