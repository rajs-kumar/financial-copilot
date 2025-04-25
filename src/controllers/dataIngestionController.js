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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngestionController = void 0;
const dataIngestionAgent_1 = require("../agents/dataIngestionAgent");
class DataIngestionController {
    constructor(dataIngestionService) {
        this.dataIngestionService = dataIngestionService;
    }
    // Handle file upload
    uploadFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Request should have been processed by multer middleware
                if (!req.file) {
                    res.status(400).json({ success: false, message: 'No file uploaded' });
                    return;
                }
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Assuming auth middleware sets req.user
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const filePath = req.file.path;
                const originalName = req.file.originalname;
                const fileSize = req.file.size;
                const mimeType = req.file.mimetype;
                // Determine file type from extension
                const fileType = dataIngestionAgent_1.DataIngestionAgent.getFileTypeFromPath(filePath);
                if (!fileType) {
                    res.status(400).json({ success: false, message: 'Unsupported file type' });
                    return;
                }
                // Store file metadata in database
                const fileRecord = yield this.dataIngestionService.saveFileRecord({
                    userId,
                    filePath,
                    originalName,
                    fileSize,
                    mimeType,
                    fileType
                });
                // Process the file asynchronously
                this.dataIngestionService.processFileAsync(fileRecord.id, userId)
                    .then((result) => {
                    console.log(`File ${fileRecord.id} processed successfully:`, result);
                })
                    .catch((error) => {
                    console.error(`Error processing file ${fileRecord.id}:`, error);
                });
                // Return success with file record
                res.status(200).json({
                    success: true,
                    message: 'File uploaded successfully and processing started',
                    data: {
                        fileId: fileRecord.id,
                        originalName,
                        status: 'processing'
                    }
                });
            }
            catch (error) {
                console.error('Error uploading file:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error uploading file: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error uploading file: Unknown error' });
                }
            }
        });
    }
    // Get all uploaded files for a user
    getFiles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const files = yield this.dataIngestionService.getFilesByUser(userId);
                res.status(200).json({
                    success: true,
                    data: files
                });
            }
            catch (error) {
                console.error('Error fetching files:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error fetching files: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error fetching files: Unknown error' });
                }
            }
        });
    }
    // Get file processing status
    getFileStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const fileId = req.params.id;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const fileStatus = yield this.dataIngestionService.getFileStatus(fileId, userId);
                if (!fileStatus) {
                    res.status(404).json({ success: false, message: 'File not found' });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: fileStatus
                });
            }
            catch (error) {
                console.error('Error fetching file status:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error fetching file status: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error fetching file status: Unknown error' });
                }
            }
        });
    }
    // Reprocess a file
    reprocessFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const fileId = req.params.id;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                // Check if file exists and belongs to user
                const fileExists = yield this.dataIngestionService.checkFileAccess(fileId, userId);
                if (!fileExists) {
                    res.status(404).json({ success: false, message: 'File not found or access denied' });
                    return;
                }
                // Reprocess the file asynchronously
                this.dataIngestionService.processFileAsync(fileId, userId)
                    .then((result) => {
                    console.log(`File ${fileId} reprocessed successfully:`, result);
                })
                    .catch((error) => {
                    console.error(`Error reprocessing file ${fileId}:`, error);
                });
                res.status(200).json({
                    success: true,
                    message: 'File reprocessing started',
                    data: {
                        fileId,
                        status: 'processing'
                    }
                });
            }
            catch (error) {
                console.error('Error reprocessing file:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error reprocessing file: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error reprocessing file: Unknown error' });
                }
            }
        });
    }
    // Delete a file
    deleteFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const fileId = req.params.id;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const result = yield this.dataIngestionService.deleteFile(fileId, userId);
                if (!result) {
                    res.status(404).json({ success: false, message: 'File not found or already deleted' });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'File deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting file:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error deleting file: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error deleting file: Unknown error' });
                }
            }
        });
    }
}
exports.DataIngestionController = DataIngestionController;
