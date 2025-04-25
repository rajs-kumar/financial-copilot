import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { DataIngestionAgent } from '../agents/dataIngestionAgent';
import { getAgentOrchestrator } from '../orchestration/agentOrchestrator';
import { AgentType } from '../types/agent';
import { query } from '../config/database';
import { Transaction } from '../types/transaction';

interface FileRecord {
  id: string;
  userId: string;
  filePath: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileType: 'csv' | 'pdf';
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  createdAt: Date;
  metadata?: any;
}

interface FileStatus {
  id: string;
  status: string;
  processedAt?: Date;
  transactionCount?: number;
  error?: string;
}

export class DataIngestionService {
  private dataIngestionAgent: DataIngestionAgent;
  
  constructor(dataIngestionAgent: DataIngestionAgent) {
    this.dataIngestionAgent = dataIngestionAgent;
  }
  
  // Save file record to database
  async saveFileRecord(fileInfo: Omit<FileRecord, 'id' | 'status' | 'createdAt'>): Promise<FileRecord> {
    const id = uuidv4();
    const now = new Date();
    
    const result = await query(
      `INSERT INTO files 
       (id, user_id, file_path, original_name, file_size, mime_type, file_type, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        id,
        fileInfo.userId,
        fileInfo.filePath,
        fileInfo.originalName,
        fileInfo.fileSize,
        fileInfo.mimeType,
        fileInfo.fileType,
        'pending',
        now
      ]
    );
    
    return {
      id,
      userId: fileInfo.userId,
      filePath: fileInfo.filePath,
      originalName: fileInfo.originalName,
      fileSize: fileInfo.fileSize,
      mimeType: fileInfo.mimeType,
      fileType: fileInfo.fileType,
      status: 'pending',
      createdAt: now
    };
  }
  
  // Get all files for a user
  async getFilesByUser(userId: string): Promise<Partial<FileRecord>[]> {
    const result = await query(
      `SELECT id, original_name, file_size, mime_type, file_type, status, processed_at, created_at
       FROM files
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return result.rows;
  }
  
  // Get file processing status
  async getFileStatus(fileId: string, userId: string): Promise<FileStatus | null> {
    const result = await query(
      `SELECT f.id, f.status, f.processed_at, f.error,
       (SELECT COUNT(*) FROM transactions WHERE file_id = f.id) as transaction_count
       FROM files f
       WHERE f.id = $1 AND f.user_id = $2`,
      [fileId, userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      id: result.rows[0].id,
      status: result.rows[0].status,
      processedAt: result.rows[0].processed_at,
      transactionCount: parseInt(result.rows[0].transaction_count),
      error: result.rows[0].error
    };
  }
  
  // Check if a file exists and is accessible by the user
  async checkFileAccess(fileId: string, userId: string): Promise<boolean> {
    const result = await query(
      `SELECT id FROM files WHERE id = $1 AND user_id = $2`,
      [fileId, userId]
    );
    
    return result.rows.length > 0;
  }
  
  // Process a file asynchronously
  async processFileAsync(fileId: string, userId: string): Promise<any> {
    try {
      // Update file status to processing
      await query(
        `UPDATE files SET status = $1 WHERE id = $2`,
        ['processing', fileId]
      );
      
      // Get file details
      const fileResult = await query(
        `SELECT * FROM files WHERE id = $1`,
        [fileId]
      );
      
      if (fileResult.rows.length === 0) {
        throw new Error(`File ${fileId} not found`);
      }
      
      const file = fileResult.rows[0];
      
      // Process the file using DataIngestionAgent
      const result = await this.dataIngestionAgent.process({
        filePath: file.file_path,
        fileType: file.file_type,
        userId
      }, {
        userId,
        requestId: fileId
      });
      
      if (!result.success) {
        // Update file status to failed
        await query(
          `UPDATE files SET status = $1, error = $2, processed_at = $3 WHERE id = $4`,
          ['failed', result.error, new Date(), fileId]
        );
        
        return { success: false, error: result.error };
      }
      
      // Save extracted transactions to database
      const data = result.data as { transactions: Transaction[] };
      const savedTransactions = await this.saveTransactions(data.transactions, fileId);
      
      // Update file status to completed
      await query(
        `UPDATE files SET status = $1, processed_at = $2 WHERE id = $3`,
        ['completed', new Date(), fileId]
      );
      
      // Notify transaction categorization agent
      if (savedTransactions.length > 0) {
        const orchestrator = getAgentOrchestrator();
        const categorizationAgent = orchestrator.getAgent(AgentType.TRANSACTION_CATEGORIZATION);
        
        if (categorizationAgent) {
          // Process the transactions for categorization
          categorizationAgent.process({
            transactions: savedTransactions,
            userId,
            useLLM: true
          }, {
            userId,
            requestId: `categorize-${fileId}`
          });
        }
      }
      
      return {
        success: true,
        transactionCount: savedTransactions.length
      };
    } catch (error) {
      console.error(`Error processing file ${fileId}:`, error);
      
      // Update file status to failed
      await query(
        `UPDATE files SET status = $1, error = $2, processed_at = $3 WHERE id = $4`,
        ['failed', (error as Error).message, new Date(), fileId]
      );
      
      return { success: false, error: (error as Error).message };
    }
  }
  
  // Save transactions to database
  private async saveTransactions(transactions: Transaction[], fileId: string): Promise<Transaction[]> {
    const savedTransactions: Transaction[] = [];
    
    for (const transaction of transactions) {
      try {
        const id = uuidv4();
        
        const result = await query(
          `INSERT INTO transactions 
           (id, user_id, file_id, date, description, amount, type, account_code, confidence, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
           RETURNING *`,
          [
            id,
            transaction.userId,
            fileId,
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.type,
            transaction.accountCode,
            transaction.confidence || 0.5,
            new Date(),
            new Date()
          ]
        );
        
        savedTransactions.push({
          ...transaction,
          id
        });
      } catch (error) {
        console.error('Error saving transaction:', error);
        // Continue with the next transaction
      }
    }
    
    return savedTransactions;
  }
  
  // Delete a file and its transactions
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      // First check if the file exists and belongs to the user
      const fileResult = await query(
        `SELECT * FROM files WHERE id = $1 AND user_id = $2`,
        [fileId, userId]
      );
      
      if (fileResult.rows.length === 0) {
        return false;
      }
      
      const file = fileResult.rows[0];
      
      // Begin transaction
      const client = await query('BEGIN');
      
      try {
        // Delete transactions associated with the file
        await query(
          `DELETE FROM transactions WHERE file_id = $1`,
          [fileId]
        );
        
        // Delete file record
        await query(
          `DELETE FROM files WHERE id = $1`,
          [fileId]
        );
        
        // Delete physical file if it exists
        if (file.file_path && fs.existsSync(file.file_path)) {
          fs.unlinkSync(file.file_path);
        }
        
        await query('COMMIT');
        return true;
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      return false;
    }
  }
}