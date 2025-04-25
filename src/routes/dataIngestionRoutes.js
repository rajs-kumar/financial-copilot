"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dataIngestionController_1 = require("../controllers/dataIngestionController");
const dataIngestionService_1 = require("../services/dataIngestionService");
const dataIngestionAgent_1 = require("../agents/dataIngestionAgent");
const auth_1 = require("../middleware/auth");
const fileUpload_1 = require("../middleware/fileUpload");
const agentOrchestrator_1 = require("../orchestration/agentOrchestrator");
const router = express_1.default.Router();
// Initialize dependencies
const dataIngestionAgent = new dataIngestionAgent_1.DataIngestionAgent();
const dataIngestionService = new dataIngestionService_1.DataIngestionService(dataIngestionAgent);
const dataIngestionController = new dataIngestionController_1.DataIngestionController(dataIngestionService);
// Register the agent with the orchestrator
const orchestrator = (0, agentOrchestrator_1.getAgentOrchestrator)();
orchestrator.registerAgent(dataIngestionAgent);
// Route for uploading files
router.post('/upload', auth_1.authenticateToken, fileUpload_1.uploadSingleFile, fileUpload_1.handleFileUploadError, fileUpload_1.validateFileExists, fileUpload_1.cleanupOnError, (req, res) => dataIngestionController.uploadFile(req, res));
// Route for getting all files
router.get('/files', auth_1.authenticateToken, (req, res) => dataIngestionController.getFiles(req, res));
// Route for getting file status
router.get('/files/:id/status', auth_1.authenticateToken, (req, res) => dataIngestionController.getFileStatus(req, res));
// Route for reprocessing a file
router.post('/files/:id/reprocess', auth_1.authenticateToken, (req, res) => dataIngestionController.reprocessFile(req, res));
// Route for deleting a file
router.delete('/files/:id', auth_1.authenticateToken, (req, res) => dataIngestionController.deleteFile(req, res));
exports.default = router;
