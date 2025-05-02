// src/agents/dataIngestionAgent.ts
import { BaseAgent } from './baseAgent';
import { AgentType, AgentContext, AgentResult } from '../types/agent';
import { parseCSVFile } from '../utils/csvParser';
import { parsePDFFile } from '../utils/pdfParser';
import path from 'path';
import fs from 'fs';
import { Transaction } from '../types/transaction';
import { findMatchingAccountCategory, getFullChartOfAccounts } from '../utils/chartOfAccounts';
import prisma from '../services/db';
import { Prisma } from '@prisma/client'; // Import Prisma for TransactionClient type
import { v4 as uuidv4 } from 'uuid';

export interface DataIngestionInput {
  filePath: string;
  fileType: 'csv' | 'pdf';
  userId: string;
  metadata?: Record<string, any>;
}

export interface DataIngestionResult {
  transactions: Transaction[];
  processedCount: number;
  failedCount: number;
  warnings: string[];
}

export class DataIngestionAgent extends BaseAgent {
  constructor() {
    super(AgentType.DATA_INGESTION);
  }

  async process<DataIngestionResult>(
    input: DataIngestionInput,
    context?: AgentContext
  ): Promise<AgentResult<DataIngestionResult>> {
    try {
      if (context) {
        this.setContext(context);
      }

      this.logEvent('process_start', {
        filePath: input.filePath,
        fileType: input.fileType,
      });

      // Check if file exists
      if (!fs.existsSync(input.filePath)) {
        throw new Error(`File not found: ${input.filePath}`);
      }

      let rawTransactions: any[] = [];

      // Parse file based on type
      if (input.fileType === 'csv') {
        rawTransactions = await parseCSVFile(input.filePath);
      } else if (input.fileType === 'pdf') {
        rawTransactions = await parsePDFFile(input.filePath);
      } else {
        throw new Error(`Unsupported file type: ${input.fileType}`);
      }

      this.logEvent('file_parsed', {
        count: rawTransactions.length,
      });

      // Load chart of accounts for categorization
      const chartOfAccounts = await getFullChartOfAccounts();

      // Convert to Transaction objects and save to database
      const transactions: Transaction[] = [];
      const warnings: string[] = [];
      let failedCount = 0;

      // Create a database transaction for atomicity
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const raw of rawTransactions) {
          try {
            // Skip if missing required fields
            if (!raw.date || !raw.description || isNaN(raw.amount)) {
              warnings.push(`Skipping transaction: Missing required fields`);
              failedCount++;
              continue;
            }
      
            // Try to categorize
            const accountCode =
              raw.accountCode ||
              findMatchingAccountCategory(raw.description, raw.amount, chartOfAccounts) ||
              '000';
      
            // Determine the transaction type
            let transactionType: 'debit' | 'credit';
            if (raw.type === 'credit') {
              transactionType = 'credit';
            } else {
              transactionType = 'debit'; // Default to 'debit'
            }
      
            // Create transaction in database
            const transaction = await tx.transaction.create({
              data: {
                id: uuidv4(),
                date: new Date(raw.date),
                description: raw.description,
                amount: Math.abs(parseFloat(raw.amount)),
                type: transactionType, // Use the validated transactionType
                accountCode,
                confidence: raw.accountCode ? 0.9 : 0.5,
                tags: [],
                user: {
                  connect: { id: input.userId },
                },
                ...(input.metadata?.fileId
                  ? {
                      file: {
                        connect: { id: input.metadata.fileId },
                      },
                    }
                  : {}),
              },
            });
      
            // Type assertion to ensure compatibility
            const processedTransaction: Transaction = {
              ...transaction,
              amount: Number(transaction.amount),
              confidence: transaction.confidence ? Number(transaction.confidence) : undefined,
              fileId: transaction.fileId ?? undefined, // Convert null to undefined
              type: transactionType, // Use the validated transactionType here as well
              accountCode: transaction.accountCode ?? '', // Provide a default value
              isRecurring: transaction.isRecurring ?? undefined, // Convert null to undefined
              notes: transaction.notes ?? undefined, // Convert null to undefined
            };
      
            transactions.push(processedTransaction);
          } catch (error: unknown) {
            if (error instanceof Error) {
              warnings.push(`Failed to process transaction: ${error.message}`);
            } else {
              warnings.push('Failed to process transaction: Unknown error');
            }
            failedCount++;
          }
        }
      });

      this.logEvent('process_complete', {
        processed: transactions.length,
        failed: failedCount,
        warnings: warnings.length,
      });

      // Send to categorization agent if needed
      if (transactions.length > 0) {
        this.emit('transactions_ready', {
          transactions,
          userId: input.userId,
        });
      }

      return {
        success: true,
        data: {
          transactions,
          processedCount: transactions.length,
          failedCount,
          warnings,
        } as any,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return this.handleError(error);
      }
      return this.handleError(new Error(String(error)));
    }
  }

  // Helper method to determine file type from extension
  static getFileTypeFromPath(filePath: string): 'csv' | 'pdf' | null {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.csv') {
      return 'csv';
    } else if (ext === '.pdf') {
      return 'pdf';
    }

    return null;
  }
}