import express from 'express';
import { DataIngestionController } from '../controllers/dataIngestionController';
import { DataIngestionService } from '../services/dataIngestionService';
import { DataIngestionAgent } from '../agents/dataIngestionAgent';
import { authenticateToken } from '../middleware/auth';
import { uploadSingleFile, handleFileUploadError, validateFileExists, cleanupOnError } from '../middleware/fileUpload';
import { getAgentOrchestrator } from '../orchestration/agentOrchestrator';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

const router = express.Router();

// Initialize dependencies
const dataIngestionAgent = new DataIngestionAgent();
const dataIngestionService = new DataIngestionService(dataIngestionAgent);
const dataIngestionController = new DataIngestionController(dataIngestionService);

// Register the agent with the orchestrator
const orchestrator = getAgentOrchestrator();
orchestrator.registerAgent(dataIngestionAgent);

// Route for uploading files
router.post(
  '/upload',
  authenticateToken,
  uploadSingleFile,
  handleFileUploadError,
  validateFileExists,
  cleanupOnError,
  (req: express.Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: express.Response<any, Record<string, any>>) => dataIngestionController.uploadFile(req, res)
);

// Route for getting all files
router.get(
  '/files',
  authenticateToken,
  (req, res) => dataIngestionController.getFiles(req, res)
);

// Route for getting file status
router.get(
  '/files/:id/status',
  authenticateToken,
  (req, res) => dataIngestionController.getFileStatus(req, res)
);

// Route for reprocessing a file
router.post(
  '/files/:id/reprocess',
  authenticateToken,
  (req, res) => dataIngestionController.reprocessFile(req, res)
);

// Route for deleting a file
router.delete(
  '/files/:id',
  authenticateToken,
  (req, res) => dataIngestionController.deleteFile(req, res)
);

export default router;