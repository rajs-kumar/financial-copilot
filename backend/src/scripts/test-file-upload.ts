// Create a standalone script: backend/scripts/test-file-upload.js
import fs from 'fs';
import path from 'path';
import axios, { AxiosError, AxiosResponse } from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface UploadResponse {
  success: boolean;
  data?: {
    fileId: string;
  };
}

interface FilesResponse {
  success: boolean;
  data?: {
    length: number;
  };
}

interface TestResult {
  error?: string;
  message?: string;
  details?: string;
  response?: any;
  uploadSuccessful?: boolean;
  fileId?: string;
  filesListSuccessful?: boolean;
  filesCount?: number;
}

const testFileUpload = async (): Promise<TestResult> => {
  try {
    // Check if server is running first
    console.log('Testing connection to backend server...');
    try {
      await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
      console.log('✅ Backend server is running');
    } catch (connectionError) {
      console.error('❌ Cannot connect to the backend server!');
      console.error('Make sure your backend server is running on port 5000.');
      console.error('Start it with: cd backend && npm run dev');
      console.error('Error details:', connectionError instanceof Error ? connectionError.message : 'Unknown error');
      
      return {
        error: 'Server connection failed',
        message: 'The backend server is not running or not accessible',
        details: connectionError instanceof Error ? connectionError.message : 'Unknown error'
      };
    }

    // Create a test file
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const testFilePath = path.join(uploadDir, 'test-upload.csv');
    
    // Create a simple CSV file
    fs.writeFileSync(testFilePath, 'date,description,amount,type\n2025-05-09,Test Transaction,100,debit');
    
    console.log(`Created test file: ${testFilePath}`);
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    
    // Get auth token - either from command line or hardcode for testing
    const token = process.env.TEST_TOKEN;
    console.log('Using token:', token);
    
    if (!token) {
      console.error('❌ No token provided!');
      console.error('Run this script with a valid JWT token:');
      console.error('TEST_TOKEN="your-jwt-token" node scripts/test-file-upload.js');
      return {
        error: 'No authentication token',
        message: 'Please provide a valid JWT token via TEST_TOKEN environment variable'
      };
    }
    
    console.log('Attempting to upload file...');
    
    // Upload the file
    const response = await axios.post<UploadResponse>(
      'http://localhost:5000/api/data-ingestion/upload',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Upload response:', response.data);
    
    // Get file list to verify
    console.log('Checking files list...');
    const filesResponse = await axios.get<FilesResponse>(
      'http://localhost:5000/api/data-ingestion/files',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Files list response:', filesResponse.data);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('Test file cleaned up');
    
    return {
      uploadSuccessful: response.data.success,
      fileId: response.data.data?.fileId,
      filesListSuccessful: filesResponse.data.success,
      filesCount: filesResponse.data.data?.length
    };
  } catch (error) {
    console.error('Error testing file upload:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && 'code' in error && error.code === 'ECONNREFUSED') {
      console.error('The backend server is not running or not accessible on port 5000.');
      console.error('Start your backend server with: cd backend && npm run dev');
    }
    
    if (axios.isAxiosError(error)) {
      console.error('Server responded with error:', {
        status: error.response?.status,
        data: error.response?.data
      });
      
      return {
        error: error.message,
        response: error.response?.data
      };
    }
    
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

testFileUpload()
  .then(result => {
    console.log('Test result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });