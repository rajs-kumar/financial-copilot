"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const copilotChatController_1 = require("../controllers/copilotChatController");
const copilotChatService_1 = require("../services/copilotChatService");
const copilotChatAgent_1 = require("../agents/copilotChatAgent");
const llmService_1 = require("../services/llmService");
const transactionService_1 = require("../services/transactionService");
const agentOrchestrator_1 = require("../orchestration/agentOrchestrator");
const router = express_1.default.Router();
// Initialize dependencies
const llmService = new llmService_1.LLMService();
const transactionService = new transactionService_1.TransactionService();
const copilotChatAgent = new copilotChatAgent_1.CopilotChatAgent(llmService, transactionService);
const copilotChatService = new copilotChatService_1.CopilotChatService(copilotChatAgent, llmService);
const copilotChatController = new copilotChatController_1.CopilotChatController(copilotChatService);
// Register the agent with the orchestrator
const orchestrator = (0, agentOrchestrator_1.getAgentOrchestrator)();
orchestrator.registerAgent(copilotChatAgent);
// Route for sending a message to the copilot
router.post('/chat', auth_1.authenticateToken, (req, res) => copilotChatController.sendMessage(req, res));
// Route for getting chat sessions
router.get('/sessions', auth_1.authenticateToken, (req, res) => copilotChatController.getSessions(req, res));
// Route for getting messages for a chat session
router.get('/sessions/:sessionId/messages', auth_1.authenticateToken, (req, res) => copilotChatController.getMessages(req, res));
// Route for deleting a chat session
router.delete('/sessions/:sessionId', auth_1.authenticateToken, (req, res) => copilotChatController.deleteSession(req, res));
// Route for getting insights
router.get('/insights', auth_1.authenticateToken, (req, res) => copilotChatController.getInsights(req, res));
exports.default = router;
