import { BaseAgent } from './baseAgent';
import { AgentType, AgentContext, AgentResult } from '../types/agent';
import { parseCSVFile } from '../utils/csvParser';
import { parsePDFFile } from '../utils/pdfParser';
import path from 'path';
import fs from 'fs';
import { Transaction } from '../types/transaction';
import { getFullChartOfAccounts } from '../utils/chartOfAccounts';

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
        fileType: input.fileType 
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
        count: rawTransactions.length
      });
      
      // Load chart of accounts for categorization
      const chartOfAccounts = await getFullChartOfAccounts();
      
      // Convert to Transaction objects
      const transactions: Transaction[] = [];
      const warnings: string[] = [];
      let failedCount = 0;
      
      for (const raw of rawTransactions) {
        try {
          // Skip if missing required fields
          if (!raw.date || !raw.description || isNaN(raw.amount)) {
            warnings.push(`Skipping transaction: Missing required fields`);
            failedCount++;
            continue;
          }
          
          // Convert to Transaction object
          const transaction: Transaction = {
            userId: input.userId,
            date: new Date(raw.date),
            description: raw.description,
            amount: Math.abs(parseFloat(raw.amount)),
            type: raw.type || 'debit',
            accountCode: raw.accountCode || '000', // Default code if not categorized
            confidence: raw.accountCode ? 0.9 : 0.5, // Higher confidence if pre-categorized
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          transactions.push(transaction);
        } catch (error: unknown) {
          if (error instanceof Error) {
            warnings.push(`Failed to process transaction: ${error.message}`);
          } else {
            warnings.push('Failed to process transaction: Unknown error');
          }
          failedCount++;
        }
      }
      this.logEvent('process_complete', {
        processed: transactions.length,
        failed: failedCount,
        warnings: warnings.length
      });
      
      // Send to categorization agent if needed
      if (transactions.length > 0) {
        this.emit('transactions_ready', {
          transactions,
          userId: input.userId
        });
      }
      
      return {
        success: true,
        data: {
          transactions,
          processedCount: transactions.length,
          failedCount,
          warnings
        } as any,
        warnings: warnings.length > 0 ? warnings : undefined
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