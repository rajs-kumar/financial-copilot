import request from 'supertest';
import app from '../../src/app';
import { query } from '../../src/config/database';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

describe('Data Ingestion API', () => {
  let authToken: string;
  let testUserId: string;
  
  // Setup test user before tests
  beforeAll(async () => {
    // Create test user in database
    testUserId = 'test-user-id';
    await query(
      `INSERT INTO users (id, email, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, 'test@example.com', 'password-hash', 'user', new Date(), new Date()]
    );
    
    // Generate JWT token for test user
    authToken = jwt.sign(
      { userId: testUserId },
      process.env.JWT_SECRET || 'default_jwt_secret',
      { expiresIn: '1h' }
    );
    
    // Create uploads directory if it doesn't exist
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  });
  
  // Clean up after tests
  afterAll(async () => {
    // Delete test user and related data
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });
  
  describe('GET /api/data/files', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/data/files');
      expect(response.status).toBe(401);
    });
    
    it('should return empty array when no files exist', async () => {
      const response = await request(app)
        .get('/api/data/files')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });
  
  describe('POST /api/data/upload', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).post('/api/data/upload');
      expect(response.status).toBe(401);
    });
    
    it('should return 400 if no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/data/upload')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should upload a CSV file successfully', async () => {
      // Create a test CSV file
      const testCsvPath = path.join(process.env.UPLOAD_DIR || './uploads', 'test.csv');
      fs.writeFileSync(testCsvPath, 'date,description,amount,type\n2023-01-01,Test Transaction,100,debit');
      
      const response = await request(app)
        .post('/api/data/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testCsvPath);
      
      // Clean up test file
      fs.unlinkSync(testCsvPath);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fileId');
      expect(response.body.data).toHaveProperty('status', 'processing');
    });
  });
});