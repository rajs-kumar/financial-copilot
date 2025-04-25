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
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const transactionService_1 = require("../services/transactionService");
const transactionCategorizationAgent_1 = require("../agents/transactionCategorizationAgent");
const llmService_1 = require("../services/llmService");
const agentOrchestrator_1 = require("../orchestration/agentOrchestrator");
const router = express_1.default.Router();
// Initialize dependencies
const llmService = new llmService_1.LLMService();
const transactionService = new transactionService_1.TransactionService();
const categorizationAgent = new transactionCategorizationAgent_1.TransactionCategorizationAgent(llmService);
// Register the agent with the orchestrator
const orchestrator = (0, agentOrchestrator_1.getAgentOrchestrator)();
orchestrator.registerAgent(categorizationAgent);
// Route for getting all transactions with filtering
router.get('/', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        // Parse query parameters for filtering
        const filter = {
            userId,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0,
            sortBy: req.query.sortBy || 'date',
            sortOrder: req.query.sortOrder || 'desc'
        };
        // Add date filters
        if (req.query.startDate) {
            filter.startDate = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
            filter.endDate = new Date(req.query.endDate);
        }
        // Add amount filters
        if (req.query.minAmount) {
            filter.minAmount = parseFloat(req.query.minAmount);
        }
        if (req.query.maxAmount) {
            filter.maxAmount = parseFloat(req.query.maxAmount);
        }
        // Add other filters
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.accountCode) {
            filter.accountCode = req.query.accountCode;
        }
        if (req.query.search) {
            filter.search = req.query.search;
        }
        if (req.query.isRecurring) {
            filter.isRecurring = req.query.isRecurring === 'true';
        }
        // Get transactions
        const transactions = yield transactionService.getTransactions(filter);
        res.status(200).json({
            success: true,
            data: transactions
        });
    }
    catch (error) {
        console.error('Error getting transactions:', error);
        if (error instanceof Error) {
            res.status(500).json({ success: false, message: `Error getting transactions: ${error.message}` });
        }
        else {
            res.status(500).json({ success: false, message: 'Error getting transactions: Unknown error' });
        }
    }
}));
// Route for getting a single transaction
router.get('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const transactionId = req.params.id;
        if (!transactionId) {
            res.status(400).json({ success: false, message: 'Transaction ID is required' });
            return;
        }
        const transaction = yield transactionService.getTransactionById(transactionId, userId);
        if (!transaction) {
            res.status(404).json({ success: false, message: 'Transaction not found' });
            return;
        }
        res.status(200).json({
            success: true,
            data: transaction
        });
    }
    catch (error) {
        console.error('Error getting transaction:', error);
        if (error instanceof Error) {
            res.status(500).json({ success: false, message: `Error getting transaction: ${error.message}` });
        }
        else {
            res.status(500).json({ success: false, message: 'Error getting transaction: Unknown error' });
        }
    }
}));
// Route for creating a transaction
router.post('/', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        // Validate required fields
        const { date, description, amount, type } = req.body;
        if (!date || !description || !amount || !type) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }
        // Create transaction
        const transaction = yield transactionService.createTransaction({
            userId,
            date: new Date(date),
            description,
            amount: parseFloat(amount),
            type,
            accountCode: req.body.accountCode,
            confidence: req.body.confidence,
            isRecurring: req.body.isRecurring,
            tags: req.body.tags,
            notes: req.body.notes
        });
        // If transaction created successfully, categorize it if no account code provided
        if (!req.body.accountCode) {
            // Process with categorization agent asynchronously
            categorizationAgent.process({
                transactions: [transaction],
                userId,
                useLLM: true
            }, {
                userId,
                requestId: `categorize-${transaction.id}`
            }).catch(error => {
                console.error('Error categorizing transaction:', error);
            });
        }
        res.status(201).json({
            success: true,
            data: transaction
        });
    }
    catch (error) {
        console.error('Error creating transaction:', error);
        if (error instanceof Error) {
            res.status(500).json({ success: false, message: `Error creating transaction: ${error.message}` });
        }
        else {
            res.status(500).json({ success: false, message: 'Error creating transaction: Unknown error' });
        }
    }
}));
// Route for updating a transaction
router.put('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const transactionId = req.params.id;
        if (!transactionId) {
            res.status(400).json({ success: false, message: 'Transaction ID is required' });
            return;
        }
        // Update transaction
        const updatedTransaction = yield transactionService.updateTransaction(transactionId, userId, req.body);
        if (!updatedTransaction) {
            res.status(404).json({ success: false, message: 'Transaction not found' });
            return;
        }
        res.status(200).json({
            success: true,
            data: updatedTransaction
        });
    }
    catch (error) {
        console.error('Error updating transaction:', error);
        if (error instanceof Error) {
            res.status(500).json({ success: false, message: `Error updating transaction: ${error.message}` });
        }
        else {
            res.status(500).json({ success: false, message: 'Error updating transaction: Unknown error' });
        }
    }
}));
// Route for deleting a transaction
router.delete('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const transactionId = req.params.id;
        if (!transactionId) {
            res.status(400).json({ success: false, message: 'Transaction ID is required' });
            return;
        }
        // Delete transaction
        const result = yield transactionService.deleteTransaction(transactionId, userId);
        if (!result) {
            res.status(404).json({ success: false, message: 'Transaction not found or already deleted' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Transaction deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting transaction:', error);
        if (error instanceof Error) {
            res.status(500).json({ success: false, message: `Error deleting transaction: ${error.message}` });
        }
        else {
            res.status(500).json({ success: false, message: 'Error deleting transaction: Unknown error' });
        }
    }
}));
// Route for getting transaction statistics
router.get('/stats', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        // Parse date parameters
        let startDate;
        let endDate;
        if (req.query.startDate) {
            startDate = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
            endDate = new Date(req.query.endDate);
        }
        // Get stats
        const stats = yield transactionService.getTransactionStats(userId, startDate, endDate);
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error getting transaction stats:', error);
        if (error instanceof Error) {
            res.status(500).json({ success: false, message: `Error getting transaction stats: ${error.message}` });
        }
        else {
            res.status(500).json({ success: false, message: 'Error getting transaction stats: Unknown error' });
        }
    }
}));
// Route for batch categorizing transactions
router.post('/categorize', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }
        const { transactionIds, accountCode } = req.body;
        if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
            res.status(400).json({ success: false, message: 'Transaction IDs are required' });
            return;
        }
        if (!accountCode) {
            res.status(400).json({ success: false, message: 'Account code is required' });
            return;
        }
        // Categorize transactions
        const updatedCount = yield transactionService.categorizeTransactions(transactionIds, accountCode, userId);
        res.status(200).json({
            success: true,
            data: {
                updatedCount
            },
            message: `Successfully categorized ${updatedCount} transactions`
        });
    }
    catch (error) {
        console.error('Error categorizing transactions:', error);
        if (error instanceof Error) {
            res.status(500).json({ success: false, message: `Error categorizing transactions: ${error.message}` });
        }
        else {
            res.status(500).json({ success: false, message: 'Error categorizing transactions: Unknown error' });
        }
    }
}));
exports.default = router;
