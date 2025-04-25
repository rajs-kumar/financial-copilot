import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniquePrefix = uuidv4();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const filename = `${uniquePrefix}-${Date.now()}${extension}`;
    cb(null, filename);
  }
});

// File filter to only accept certain types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept CSV and PDF files
  if (file.mimetype === 'text/csv' || 
      file.mimetype === 'application/csv' ||
      file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and PDF files are allowed!'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // Default 10MB
  }
});

// Single file upload middleware
export const uploadSingleFile = upload.single('file');

// Error handling middleware for file uploads
export const handleFileUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        success: false, 
        message: `File too large. Maximum size is ${parseInt(process.env.MAX_FILE_SIZE || '10485760') / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({ success: false, message: err.message });
  }
  // If no error, continue
  next();
};

// Validate file exists middleware
export const validateFileExists = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  next();
};

// Clean up file if processing fails
export const cleanupOnError = (req: Request, res: Response, next: NextFunction) => {
  // Save the original end method
  const originalEnd = res.end;
  const originalJson = res.json;
  
  // Override end method
  res.end = function(...args: any[]) {
    // If there was an error and we have a file that was uploaded, remove it
    if (res.statusCode >= 400 && req.file) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`Cleaned up file ${req.file.path} due to error`);
      } catch (err) {
        console.error('Error cleaning up file:', err);
      }
    }
    // Call the original method
    return originalEnd.call(res, args[0], args[1], args[2]);
  };
  
  // Override json method
  res.json = function(body: any) {
    // If there was an error and we have a file that was uploaded, remove it
    if ((body && body.success === false) && req.file) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`Cleaned up file ${req.file.path} due to error`);
      } catch (err) {
        console.error('Error cleaning up file:', err);
      }
    }
    // Call the original method
    return originalJson.call(res, body);
  };
  
  next();
};