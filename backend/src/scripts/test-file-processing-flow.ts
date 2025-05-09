// backend/scripts/test-file-processing-flow.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DataIngestionAgent } from '../agents/dataIngestionAgent';
import { query } from '../config/database';
import { connectDatabase } from '../config/database';
import { Transaction } from '../types/transaction';

interface TestResult {
  success: boolean;
  userId?: string;
  fileId?: string;
  transactionCount?: number;
  processedTransactions?: number;
  error?: string;
}

interface ProcessingResult {
  success: boolean;
  data?: {
    transactions: Transaction[];
  };
}

const testFileProcessingFlow = async () => {
  try {
    // 1. Connect to the database
    await connectDatabase();
    console.log('Database connected');
    
    // 2. Create a test user if needed
    // const testUserId = 'test-user-' + uuidv4().substring(0, 8);
    const testUserId = uuidv4(); // Use the full UUID
    const userEmail = `test-${testUserId.substring(0, 8)}@example.com`; // Use the UUID in the email instead
    await query(`
      INSERT INTO users (id, email, password, first_name, last_name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      testUserId,
      `${testUserId}@example.com`,
      'password-hash',
      'Test',
      'User',
      'user',
      new Date(),
      new Date()
    ]);
    console.log(`Test user created: ${testUserId}`);
    
    // 3. Create a test CSV file
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const testFileName = `test-${Date.now()}.csv`;
    const testFilePath = path.join(uploadDir, testFileName);
    
    fs.writeFileSync(testFilePath, 
      'date,description,amount,type\n' +
      '2025-01-01,Grocery Store,50.25,debit\n' +
      '2025-01-02,Salary Deposit,1000.00,credit\n' +
      '2025-01-03,Restaurant,35.75,debit'
    );
    console.log(`Test file created: ${testFilePath}`);
    
    // 4. Create file record in database
    const fileId = uuidv4();
    await query(`
      INSERT INTO files 
      (id, user_id, file_path, original_name, file_size, mime_type, file_type, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      fileId,
      testUserId,
      testFilePath,
      testFileName,
      fs.statSync(testFilePath).size,
      'text/csv',
      'csv',
      'pending',
      new Date()
    ]);
    console.log(`File record created: ${fileId}`);
    
    // 5. Initialize and run the data ingestion agent
    const dataIngestionAgent = new DataIngestionAgent();
    
    const result = await dataIngestionAgent.process({
        filePath: testFilePath,
        fileType: 'csv',
        userId: testUserId
      }) as ProcessingResult;
      
    console.log('Data ingestion result:', JSON.stringify(result, null, 2));
    
    // 6. Check if transactions were created
    const transactionsResult = await query(`
      SELECT COUNT(*) FROM transactions WHERE file_id = $1
    `, [fileId]);
    
    const transactionCount = parseInt(transactionsResult.rows[0].count);
    console.log(`Transactions created: ${transactionCount}`);
    
    // 7. Update file status
    await query(`
      UPDATE files SET status = $1, processed_at = $2 WHERE id = $3
    `, ['completed', new Date(), fileId]);
    console.log('File status updated to completed');
    
    return {
      success: result.success,
      userId: testUserId,
      fileId,
      transactionCount,
      processedTransactions: result.data?.transactions?.length || 0
    };
  } catch (error) {
    console.error('Error in test flow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

testFileProcessingFlow()
  .then(result => {
    console.log('Test result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });