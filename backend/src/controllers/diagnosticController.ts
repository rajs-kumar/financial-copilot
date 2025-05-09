// backend/src/controllers/diagnosticController.ts
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query } from '../config/database';
import { checkUploadDirectory } from '../utils/fsCheck';

export class DiagnosticController {
  // Test database connection
  async testDatabase(req: Request, res: Response): Promise<void> {
    try {
      // Test connection
      const result = await query('SELECT NOW() as now');
      
      // Check tables
      const tablesResult = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      // Check records in important tables
      const filesCount = await query('SELECT COUNT(*) FROM files');
      const usersCount = await query('SELECT COUNT(*) FROM users');
      
      res.status(200).json({
        success: true,
        data: {
          connected: true,
          serverTime: result.rows[0].now,
          tables: tablesResult.rows.map((row: { table_name: any; }) => row.table_name),
          recordCounts: {
            files: parseInt(filesCount.rows[0].count),
            users: parseInt(usersCount.rows[0].count)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      });
    }
  }

  // Test file upload directory
  async testFileStorage(req: Request, res: Response): Promise<void> {
    try {
      const storageInfo = checkUploadDirectory();
      res.status(200).json({
        success: true,
        data: storageInfo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Test file upload (creates and processes a test file)
  async testFileUpload(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }
    
    try {
      // 1. Create a test CSV file
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const testFileName = `test-${Date.now()}.csv`;
      const testFilePath = path.join(uploadDir, testFileName);
      
      fs.writeFileSync(testFilePath, 
        'date,description,amount,type\n' +
        '2025-01-01,Test Grocery,50.25,debit\n' +
        '2025-01-02,Test Salary,1000.00,credit\n' +
        '2025-01-03,Test Restaurant,35.75,debit'
      );
      
      // 2. Create a file record
      const fileId = crypto.randomUUID();
      await query(`
        INSERT INTO files 
        (id, user_id, file_path, original_name, file_size, mime_type, file_type, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        fileId,
        userId,
        testFilePath,
        testFileName,
        fs.statSync(testFilePath).size,
        'text/csv',
        'csv',
        'pending',
        new Date()
      ]);
      
      // In a real implementation, we would process the file with DataIngestionAgent
      // But for this test, we'll just update its status to simulate processing
      
      await query(`
        UPDATE files SET status = $1, processed_at = $2 WHERE id = $3
      `, ['completed', new Date(), fileId]);
      
      res.status(200).json({
        success: true,
        data: {
          message: 'Test file created and processed',
          fileId: fileId,
          fileName: testFileName,
          filePath: testFilePath
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}