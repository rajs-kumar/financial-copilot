// src/services/transactionService.ts
import { v4 as uuidv4 } from 'uuid';
import prisma from './db';
import { Transaction, TransactionFilter, TransactionCategorization } from '../types/transaction';
import { getFullChartOfAccounts, findMatchingAccountCategory } from '../utils/chartOfAccounts';
import { Decimal } from '@prisma/client/runtime/library';

export class TransactionService {
  // Get transactions with filtering
  async getTransactions(filter: TransactionFilter): Promise<Transaction[]> {
    try {
      // Build the query with filters
      const where: any = {
        userId: filter.userId,
      };
      
      // Add date filters
      if (filter.startDate || filter.endDate) {
        where.date = {};
        
        if (filter.startDate) {
          where.date.gte = filter.startDate;
        }
        
        if (filter.endDate) {
          where.date.lte = filter.endDate;
        }
      }
      
      // Add amount filters
      if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
        where.amount = {};
        
        if (filter.minAmount !== undefined) {
          where.amount.gte = filter.minAmount;
        }
        
        if (filter.maxAmount !== undefined) {
          where.amount.lte = filter.maxAmount;
        }
      }
      
      // Add type filter
      if (filter.type) {
        where.type = filter.type;
      }
      
      // Add account code filter
      if (filter.accountCode) {
        where.accountCode = filter.accountCode;
      }
      
      // Add file filter
      if (filter.fileId) {
        where.fileId = filter.fileId;
      }
      
      // Add recurring filter
      if (filter.isRecurring !== undefined) {
        where.isRecurring = filter.isRecurring;
      }
      
      // Add search filter for description
      if (filter.search) {
        where.description = {
          contains: filter.search,
          mode: 'insensitive',
        };
      }
      
      // Add tags filter
      if (filter.tags && filter.tags.length > 0) {
        where.tags = {
          hasSome: filter.tags,
        };
      }
      
      // Execute the query
      const transactions = await prisma.transaction.findMany({
        where,
        orderBy: {
          [filter.sortBy || 'date']: filter.sortOrder || 'desc',
        },
        take: filter.limit || 50,
        skip: filter.offset || 0,
        include: {
          categorizations: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });
      
      // Convert Decimal types to numbers for JSON serialization
      return transactions.map((t: { id: any; userId: any; fileId: any; date: any; description: any; amount: Decimal | null; type: string; accountCode: any; confidence: Decimal | null; isRecurring: any; tags: string[]; notes: any; createdAt: any; updatedAt: any; categorizations: string | any[]; }) => ({
        id: t.id,
        userId: t.userId,
        fileId: t.fileId || undefined,
        date: t.date,
        description: t.description,
        amount: this.decimalToNumber(t.amount) ?? 0, // Ensure amount is always a number
        type: t.type as 'debit' | 'credit',
        accountCode: t.accountCode || undefined,
        confidence: t.confidence ? this.decimalToNumber(t.confidence) : undefined,
        isRecurring: t.isRecurring || false,
        tags: t.tags as string[],
        notes: t.notes || undefined,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        // Include latest categorization if available
        categorization: t.categorizations.length > 0 ? {
          id: t.categorizations[0].id,
          categoryCode: t.categorizations[0].categoryCode,
          confidence: this.decimalToNumber(t.categorizations[0].confidence),
          source: t.categorizations[0].source as 'rule' | 'llm' | 'user' | 'system',
          reasoning: t.categorizations[0].reasoning || undefined,
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }
  
  // Helper method to convert Decimal to number
  private decimalToNumber(decimal: Decimal | null): number | undefined {
    if (decimal === null) return undefined;
    return decimal instanceof Decimal ? decimal.toNumber() : decimal;
  }
  
  // Get a single transaction by ID
  async getTransactionById(id: string, userId: string): Promise<Transaction | null> {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          categorizations: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
      
      if (!transaction) {
        return null;
      }
      
      return {
        id: transaction.id,
        userId: transaction.userId,
        fileId: transaction.fileId || undefined,
        date: transaction.date,
        description: transaction.description,
        amount: this.decimalToNumber(transaction.amount) as number,
        type: transaction.type as 'debit' | 'credit',
        accountCode: transaction.accountCode || '000',
        confidence: transaction.confidence ? this.decimalToNumber(transaction.confidence) : undefined,
        isRecurring: transaction.isRecurring || false,
        tags: transaction.tags as string[],
        notes: transaction.notes || undefined,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        categorizations: transaction.categorizations.map((c: { id: any; categoryCode: any; confidence: Decimal | null; source: string; reasoning: any; createdAt: Date; }) => ({
          id: c.id,
          transactionId: transaction.id,
          categoryCode: c.categoryCode,
          confidence: this.decimalToNumber(c.confidence) as number,
          source: c.source as 'rule' | 'llm' | 'user' | 'system',
          reasoning: c.reasoning || undefined,
          createdAt: c.createdAt
        })),
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
      
      // Create transaction in database
      const result = await prisma.transaction.create({
        data: {
          id,
          userId: transaction.userId,
          fileId: transaction.fileId,
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          accountCode: transaction.accountCode,
          confidence: transaction.confidence || 0.5,
          isRecurring: transaction.isRecurring || false,
          tags: transaction.tags || [],
          notes: transaction.notes || '',
        },
      });
      
      // If categorization was done, create a categorization record
      if (transaction.accountCode) {
        await prisma.transactionCategorization.create({
          data: {
            id: uuidv4(),
            transactionId: id,
            categoryCode: transaction.accountCode,
            confidence: transaction.confidence || 0.5,
            source: 'system',
            reasoning: 'Initial categorization',
          }
        });
      }
      
      return {
        id: result.id,
        userId: result.userId,
        fileId: result.fileId || undefined,
        date: result.date,
        description: result.description,
        amount: this.decimalToNumber(result.amount) as number,
        type: result.type as 'debit' | 'credit',
        accountCode: result.accountCode || '000',
        confidence: result.confidence ? this.decimalToNumber(result.confidence) : undefined,
        isRecurring: result.isRecurring || false,
        tags: result.tags as string[],
        notes: result.notes || undefined,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
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
      
      // Prepare data to update
      const updateData: any = {};
      
      if (updates.date) {
        updateData.date = updates.date;
      }
      
      if (updates.description) {
        updateData.description = updates.description;
      }
      
      if (updates.amount !== undefined) {
        updateData.amount = updates.amount;
      }
      
      if (updates.type) {
        updateData.type = updates.type;
      }
      
      if (updates.accountCode !== undefined) {
        updateData.accountCode = updates.accountCode;
        
        // When account code is updated, create a new categorization record
        if (updates.accountCode !== existingTransaction.accountCode) {
          await prisma.transactionCategorization.create({
            data: {
              id: uuidv4(),
              transactionId: id,
              categoryCode: updates.accountCode || '000',
              confidence: updates.confidence || 0.9, // High confidence for manual updates
              source: 'user',
              reasoning: 'User categorization',
            }
          });
        }
      }
      
      if (updates.confidence !== undefined) {
        updateData.confidence = updates.confidence;
      }
      
      if (updates.isRecurring !== undefined) {
        updateData.isRecurring = updates.isRecurring;
      }
      
      if (updates.tags !== undefined) {
        updateData.tags = updates.tags;
      }
      
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }
      
      // Always update the updated_at timestamp
      updateData.updatedAt = new Date();
      
      // Execute the update
      const result = await prisma.transaction.update({
        where: { id },
        data: updateData,
        include: {
          categorizations: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });
      
      return {
        id: result.id,
        userId: result.userId,
        fileId: result.fileId || undefined,
        date: result.date,
        description: result.description,
        amount: this.decimalToNumber(result.amount) as number,
        type: result.type as 'debit' | 'credit',
        accountCode: result.accountCode || '000',
        confidence: result.confidence ? this.decimalToNumber(result.confidence) : undefined,
        isRecurring: result.isRecurring || false,
        tags: result.tags as string[],
        notes: result.notes || undefined,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        categorizations: result.categorizations.length > 0 ? [{
          id: result.categorizations[0].id,
          transactionId: result.id,
          categoryCode: result.categorizations[0].categoryCode,
          confidence: this.decimalToNumber(result.categorizations[0].confidence) as number,
          source: result.categorizations[0].source as 'rule' | 'llm' | 'user' | 'system',
          reasoning: result.categorizations[0].reasoning || undefined,
          createdAt: result.categorizations[0].createdAt,
        }] : []
      };
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      throw error;
    }
  }
  
  // Delete a transaction
  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    try {
      // Delete transaction and related categorizations (via cascade)
      const result = await prisma.transaction.deleteMany({
        where: {
          id,
          userId,
        },
      });
      
      return result.count > 0;
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error);
      throw error;
    }
  }
  
  // Get transaction statistics
  async getTransactionStats(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      // Build the where clause
      const where: any = { userId };
      
      if (startDate || endDate) {
        where.date = {};
        
        if (startDate) {
          where.date.gte = startDate;
        }
        
        if (endDate) {
          where.date.lte = endDate;
        }
      }
      
      // Get totals by type (income vs expense)
      const typeGrouping = await prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: {
          amount: true,
        },
      });
      
      // Get totals by category
      const categoryGrouping = await prisma.transaction.groupBy({
        by: ['accountCode'],
        where,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
      });
      
      // Get monthly trends
      // This is more complex with Prisma, so we'll use a raw query
      const trendResults = await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', date) as month,
          type,
          SUM(amount) as total
        FROM transactions
        WHERE user_id = ${userId}
          ${startDate ? `AND date >= '${startDate.toISOString()}'` : ''}
          ${endDate ? `AND date <= '${endDate.toISOString()}'` : ''}
        GROUP BY month, type
        ORDER BY month ASC
      `;
      
      // Format the results
      return {
        totals: typeGrouping.reduce((acc: { [x: string]: number; }, row: { type: string | number; _sum: { amount: Decimal | null; }; }) => {
          acc[row.type] = this.decimalToNumber(row._sum.amount) || 0;
          return acc;
        }, {} as Record<string, number>),
        
        categories: categoryGrouping.map((row: { accountCode: any; _sum: { amount: Decimal | null; }; _count: { id: any; }; }) => ({
          accountCode: row.accountCode || 'uncategorized',
          total: this.decimalToNumber(row._sum.amount) || 0,
          count: row._count.id,
        })),
        
        trends: (trendResults as any[]).map(row => ({
          month: row.month,
          type: row.type,
          total: this.decimalToNumber(row.total) || 0,
        })),
      };
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      throw error;
    }
  }
  
  // Batch categorize transactions
  async categorizeTransactions(transactionIds: string[], accountCode: string, userId: string): Promise<number> {
    try {
      let updatedCount = 0;
      
      // Get all transactions that belong to the user
      const transactions = await prisma.transaction.findMany({
        where: {
          id: { in: transactionIds },
          userId,
        },
      });
      
      // Only proceed with the ones that actually belong to the user
      const validTransactionIds = transactions.map((t: { id: any; }) => t.id);
      
      if (validTransactionIds.length === 0) {
        return 0;
      }
      
      // Batch update all matching transactions
      const updateResult = await prisma.transaction.updateMany({
        where: {
          id: { in: validTransactionIds },
        },
        data: {
          accountCode,
          confidence: 0.9, // High confidence for manual updates
          updatedAt: new Date(),
        },
      });
      
      updatedCount = updateResult.count;
      
      // Create categorization records for each transaction
      const categorizationData = validTransactionIds.map((transactionId: any) => ({
        id: uuidv4(),
        transactionId,
        categoryCode: accountCode,
        confidence: 0.9,
        source: 'user',
        reasoning: 'Batch categorization by user',
      }));
      
      await prisma.transactionCategorization.createMany({
        data: categorizationData,
      });
      
      return updatedCount;
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      throw error;
    }
  }
  
  // Import transactions from a file
  async importTransactionsFromFile(fileId: string, userId: string, transactions: Omit<Transaction, 'id' | 'userId' | 'fileId' | 'createdAt' | 'updatedAt'>[]): Promise<{ total: number; success: number; failed: number }> {
    try {
      let successCount = 0;
      let failedCount = 0;
      
      // Process transactions in batches of 100
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < transactions.length; i += batchSize) {
        batches.push(transactions.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        // Prepare data for batch insert
        const transactionData = batch.map(transaction => {
          const id = uuidv4();
          return {
            id,
            userId,
            fileId,
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            accountCode: transaction.accountCode || '000',
            confidence: transaction.confidence || 0.5,
            isRecurring: transaction.isRecurring || false,
            tags: transaction.tags || [],
            notes: transaction.notes || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });
        
        try {
          // Insert batch of transactions
          await prisma.transaction.createMany({
            data: transactionData,
            skipDuplicates: true,
          });
          
          // Create categorization records for transactions with account codes
          const categorizationData = transactionData
            .filter(t => t.accountCode && t.accountCode !== '000')
            .map(t => ({
              id: uuidv4(),
              transactionId: t.id,
              categoryCode: t.accountCode as string,
              confidence: t.confidence as number,
              source: 'system',
              reasoning: 'Imported from file',
            }));
          
          if (categorizationData.length > 0) {
            await prisma.transactionCategorization.createMany({
              data: categorizationData,
            });
          }
          
          successCount += transactionData.length;
        } catch (error) {
          console.error('Error importing batch of transactions:', error);
          failedCount += batch.length;
        }
      }
      
      return {
        total: transactions.length,
        success: successCount,
        failed: failedCount,
      };
    } catch (error) {
      console.error('Error importing transactions from file:', error);
      throw error;
    }
  }
}

// Import Prisma here to access the raw SQL functionality
import { Prisma } from '@prisma/client';