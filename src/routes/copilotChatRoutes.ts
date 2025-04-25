import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { CopilotChatController } from '../controllers/copilotChatController';
import { CopilotChatService } from '../services/copilotChatService';
import { CopilotChatAgent } from '../agents/copilotChatAgent';
import { LLMService } from '../services/llmService';
import { TransactionService } from '../services/transactionService';
import { getAgentOrchestrator } from '../orchestration/agentOrchestrator';

const router = express.Router();

// Initialize dependencies
const llmService = new LLMService();
const transactionService = new TransactionService();
const copilotChatAgent = new CopilotChatAgent(llmService, transactionService);
const copilotChatService = new CopilotChatService(copilotChatAgent, llmService);
const copilotChatController = new CopilotChatController(copilotChatService);

// Register the agent with the orchestrator
const orchestrator = getAgentOrchestrator();
orchestrator.registerAgent(copilotChatAgent);

// Route for sending a message to the copilot
router.post(
  '/chat',
  authenticateToken,
  (req, res) => copilotChatController.sendMessage(req, res)
);

// Route for getting chat sessions
router.get(
  '/sessions',
  authenticateToken,
  (req, res) => copilotChatController.getSessions(req, res)
);

// Route for getting messages for a chat session
router.get(
  '/sessions/:sessionId/messages',
  authenticateToken,
  (req, res) => copilotChatController.getMessages(req, res)
);

// Route for deleting a chat session
router.delete(
  '/sessions/:sessionId',
  authenticateToken,
  (req, res) => copilotChatController.deleteSession(req, res)
);

// Route for getting insights
router.get(
  '/insights',
  authenticateToken,
  (req, res) => copilotChatController.getInsights(req, res)
);

export default router;