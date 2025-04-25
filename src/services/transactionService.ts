import { Transaction, TransactionFilter } from '../types/transaction';
import { query, getClient } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { getFullChartOfAccounts, findMatchingAccountCategory } from '../utils/chartOfAccounts';

export class TransactionService {
  // Get transactions with filtering
  async getTransactions(filter: TransactionFilter): Promise<Transaction[]> {
    try {
      // Build the query with filters
      let sqlQuery = `
        SELECT * FROM transactions
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      // Add userId filter (required)
      if (!filter.userId) {
        throw new Error('User ID is required');
      }
      
      sqlQuery += ` AND user_id = $${paramIndex++}`;
      params.push(filter.userId);
      
      // Add optional filters
      if (filter.startDate) {
        sqlQuery += ` AND date >= $${paramIndex++}`;
        params.push(filter.startDate);
      }
      
      if (filter.endDate) {
        sqlQuery += ` AND date <= $${paramIndex++}`;
        params.push(filter.endDate);
      }
      
      if (filter.minAmount !== undefined) {
        sqlQuery += ` AND amount >= $${paramIndex++}`;
        params.push(filter.minAmount);
      }
      
      if (filter.maxAmount !== undefined) {
        sqlQuery += ` AND amount <= $${paramIndex++}`;
        params.push(filter.maxAmount);
      }
      
      if (filter.type) {
        sqlQuery += ` AND type = $${paramIndex++}`;
        params.push(filter.type);
      }
      
      if (filter.accountCode) {
        sqlQuery += ` AND account_code = $${paramIndex++}`;
        params.push(filter.accountCode);
      }
      
      if (filter.isRecurring !== undefined) {
        sqlQuery += ` AND is_recurring = $${paramIndex++}`;
        params.push(filter.isRecurring);
      }
      
      if (filter.search) {
        sqlQuery += ` AND description ILIKE $${paramIndex++}`;
        params.push(`%${filter.search}%`);
      }
      
      if (filter.tags && filter.tags.length > 0) {
        sqlQuery += ` AND tags @> $${paramIndex++}`;
        params.push(filter.tags);
      }
      
      // Add sorting
      sqlQuery += ` ORDER BY ${filter.sortBy || 'date'} ${filter.sortOrder || 'desc'}`;
      
      // Add pagination
      if (filter.limit) {
        sqlQuery += ` LIMIT $${paramIndex++}`;
        params.push(filter.limit);
        
        if (filter.offset) {
          sqlQuery += ` OFFSET $${paramIndex++}`;
          params.push(filter.offset);
        }
      }
      
      const result = await query(sqlQuery, params);
      
      return result.rows.map((row: { id: any; user_id: any; date: any; description: any; amount: string; type: any; account_code: any; confidence: any; is_recurring: any; tags: any; notes: any; created_at: any; updated_at: any; }) => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount),
        type: row.type,
        accountCode: row.account_code,
        confidence: row.confidence,
        isRecurring: row.is_recurring,
        tags: row.tags,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }
  
  // Get a single transaction by ID
  async getTransactionById(id: string, userId: string): Promise<Transaction | null> {
    try {
      const result = await query(
        `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        userId: row.user_id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount),
        type: row.type,
        accountCode: row.account_code,
        confidence: row.confidence,
        isRecurring: row.is_recurring,
        tags: row.tags,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`Error getting transaction ${id}:`, error);
      throw error;
    }
  }
  
  // Create a new transaction
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    try {
      const id = uuidv4();
      const now = new Date();
      
      // If no account code provided, try to categorize
      if (!transaction.accountCode) {
        const chartOfAccounts = await getFullChartOfAccounts();
        const accountCode = findMatchingAccountCategory(
          transaction.description,
          transaction.amount,
          chartOfAccounts
        );
        
        if (accountCode) {
          transaction.accountCode = accountCode;
          transaction.confidence = 0.7; // Default confidence for rule-based
        } else {
          transaction.accountCode = '000'; // Default code
          transaction.confidence = 0.5;
        }
      }
      
      const result = await query(
        `INSERT INTO transactions 
         (id, user_id, date, description, amount, type, account_code, confidence, is_recurring, tags, notes, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
         RETURNING *`,
        [
          id,
          transaction.userId,
          transaction.date,
          transaction.description,
          transaction.amount,
          transaction.type,
          transaction.accountCode,
          transaction.confidence || 0.5,
          transaction.isRecurring || false,
          transaction.tags || [],
          transaction.notes || '',
          now,
          now
        ]
      );
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        userId: row.user_id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount),
        type: row.type,
        accountCode: row.account_code,
        confidence: row.confidence,
        isRecurring: row.is_recurring,
        tags: row.tags,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }
  
  // Update a transaction
  async updateTransaction(id: string, userId: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    try {
      // First check if the transaction exists and belongs to the user
      const existingTransaction = await this.getTransactionById(id, userId);
      
      if (!existingTransaction) {
        return null;
      }
      
      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Add fields to update
      if (updates.date) {
        updateFields.push(`date = $${paramIndex++}`);
        values.push(updates.date);
      }
      
      if (updates.description) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      
      if (updates.amount !== undefined) {
        updateFields.push(`amount = $${paramIndex++}`);
        values.push(updates.amount);
      }
      
      if (updates.type) {
        updateFields.push(`type = $${paramIndex++}`);
        values.push(updates.type);
      }
      
      if (updates.accountCode) {
        updateFields.push(`account_code = $${paramIndex++}`);
        values.push(updates.accountCode);
      }
      
      if (updates.confidence !== undefined) {
        updateFields.push(`confidence = $${paramIndex++}`);
        values.push(updates.confidence);
      }
      
      if (updates.isRecurring !== undefined) {
        updateFields.push(`is_recurring = $${paramIndex++}`);
        values.push(updates.isRecurring);
      }
      
      if (updates.tags) {
        updateFields.push(`tags = $${paramIndex++}`);
        values.push(updates.tags);
      }
      
      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        values.push(updates.notes);
      }
      
      // Always update the updated_at timestamp
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      
      // Add the WHERE clause parameters
      values.push(id);
      values.push(userId);
      
      // Execute the update
      const result = await query(
        `UPDATE transactions 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} 
         RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        userId: row.user_id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount),
        type: row.type,
        accountCode: row.account_code,
        confidence: row.confidence,
        isRecurring: row.is_recurring,
        tags: row.tags,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      throw error;
    }
  }
  
  // Delete a transaction
  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error);
      throw error;
    }
  }
  
  // Get transaction statistics
  async getTransactionStats(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const params: any[] = [userId];
      let dateFilter = '';
      
      if (startDate) {
        dateFilter += ` AND date >= $${params.length + 1}`;
        params.push(startDate);
      }
      
      if (endDate) {
        dateFilter += ` AND date <= $${params.length + 1}`;
        params.push(endDate);
      }
      
      // Get total income and expenses
      const totalsResult = await query(
        `SELECT
          type,
          SUM(amount) as total
         FROM transactions
         WHERE user_id = $1${dateFilter}
         GROUP BY type`,
        params
      );
      
      // Get totals by category
      const categoryResult = await query(
        `SELECT
          account_code,
          SUM(amount) as total,
          COUNT(*) as count
         FROM transactions
         WHERE user_id = $1${dateFilter}
         GROUP BY account_code
         ORDER BY total DESC`,
        params
      );
      
      // Get month-over-month trends
      const trendsResult = await query(
        `SELECT
          DATE_TRUNC('month', date) as month,
          type,
          SUM(amount) as total
         FROM transactions
         WHERE user_id = $1${dateFilter}
         GROUP BY month, type
         ORDER BY month ASC`,
        params
      );
      
      return {
        totals: totalsResult.rows.reduce((acc: { [x: string]: number; }, row: { type: string | number; total: string; }) => {
          acc[row.type] = parseFloat(row.total);
          return acc;
        }, {}),
        categories: categoryResult.rows.map((row: { account_code: any; total: string; count: string; }) => ({
          accountCode: row.account_code,
          total: parseFloat(row.total),
          count: parseInt(row.count)
        })),
        trends: trendsResult.rows.map((row: { month: any; type: any; total: string; }) => ({
          month: row.month,
          type: row.type,
          total: parseFloat(row.total)
        }))
      };
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      throw error;
    }
  }
  
  // Batch categorize transactions
  async categorizeTransactions(transactionIds: string[], accountCode: string, userId: string): Promise<number> {
    try {
      // Update all transactions with the new account code
      const result = await query(
        `UPDATE transactions
         SET account_code = $1, confidence = $2, updated_at = $3
         WHERE id = ANY($4) AND user_id = $5
         RETURNING id`,
        [accountCode, 0.9, new Date(), transactionIds, userId]
      );
      
      return result.rows.length;
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      throw error;
    }
  }
}