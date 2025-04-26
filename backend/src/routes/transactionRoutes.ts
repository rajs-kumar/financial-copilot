import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { TransactionService } from '../services/transactionService';
import { TransactionCategorizationAgent } from '../agents/transactionCategorizationAgent';
import { LLMService } from '../services/llmService';
import { getAgentOrchestrator } from '../orchestration/agentOrchestrator';

const router = express.Router();

// Initialize dependencies
const llmService = new LLMService();
const transactionService = new TransactionService();
const categorizationAgent = new TransactionCategorizationAgent(llmService);

// Register the agent with the orchestrator
const orchestrator = getAgentOrchestrator();
orchestrator.registerAgent(categorizationAgent);

// Route for getting all transactions with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    // Parse query parameters for filtering
    const filter: any = {
      userId,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      sortBy: req.query.sortBy as string || 'date',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
    };
    
    // Add date filters
    if (req.query.startDate) {
      filter.startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      filter.endDate = new Date(req.query.endDate as string);
    }
    
    // Add amount filters
    if (req.query.minAmount) {
      filter.minAmount = parseFloat(req.query.minAmount as string);
    }
    
    if (req.query.maxAmount) {
      filter.maxAmount = parseFloat(req.query.maxAmount as string);
    }
    
    // Add other filters
    if (req.query.type) {
      filter.type = req.query.type as 'debit' | 'credit';
    }
    
    if (req.query.accountCode) {
      filter.accountCode = req.query.accountCode as string;
    }
    
    if (req.query.search) {
      filter.search = req.query.search as string;
    }
    
    if (req.query.isRecurring) {
      filter.isRecurring = req.query.isRecurring === 'true';
    }
    
    // Get transactions
    const transactions = await transactionService.getTransactions(filter);
    
    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error: unknown) {
    console.error('Error getting transactions:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: `Error getting transactions: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: 'Error getting transactions: Unknown error' });
    }
  }
});

// Route for getting a single transaction
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    const transactionId = req.params.id;
    
    if (!transactionId) {
      res.status(400).json({ success: false, message: 'Transaction ID is required' });
      return;
    }
    
    const transaction = await transactionService.getTransactionById(transactionId, userId);
    
    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error: unknown) {
    console.error('Error getting transaction:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: `Error getting transaction: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: 'Error getting transaction: Unknown error' });
    }
  }
});

// Route for creating a transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
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
    const transaction = await transactionService.createTransaction({
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
  } catch (error: unknown) {
    console.error('Error creating transaction:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: `Error creating transaction: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: 'Error creating transaction: Unknown error' });
    }
  }
});

// Route for updating a transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
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
    const updatedTransaction = await transactionService.updateTransaction(
      transactionId,
      userId,
      req.body
    );
    
    if (!updatedTransaction) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: updatedTransaction
    });
  } catch (error: unknown) {
    console.error('Error updating transaction:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: `Error updating transaction: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: 'Error updating transaction: Unknown error' });
    }
  }
});

// Route for deleting a transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
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
    const result = await transactionService.deleteTransaction(transactionId, userId);
    
    if (!result) {
      res.status(404).json({ success: false, message: 'Transaction not found or already deleted' });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Error deleting transaction:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: `Error deleting transaction: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: 'Error deleting transaction: Unknown error' });
    }
  }
});

// Route for getting transaction statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    // Parse date parameters
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
    }
    
    // Get stats
    const stats = await transactionService.getTransactionStats(userId, startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: unknown) {
    console.error('Error getting transaction stats:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: `Error getting transaction stats: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: 'Error getting transaction stats: Unknown error' });
    }
  }
});

// Route for batch categorizing transactions
router.post('/categorize', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
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
    const updatedCount = await transactionService.categorizeTransactions(transactionIds, accountCode, userId);
    
    res.status(200).json({
      success: true,
      data: {
        updatedCount
      },
      message: `Successfully categorized ${updatedCount} transactions`
    });
  } catch (error: unknown) {
    console.error('Error categorizing transactions:', error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: `Error categorizing transactions: ${error.message}` });
    } else {
      res.status(500).json({ success: false, message: 'Error categorizing transactions: Unknown error' });
    }
  }
});

export default router;