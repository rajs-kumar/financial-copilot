// src/app.ts - modify the connection part

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import dataIngestionRoutes from './routes/dataIngestionRoutes';
import transactionRoutes from './routes/transactionRoutes';
import copilotChatRoutes from './routes/copilotChatRoutes';
import diagnosticRoutes from './routes/diagnosticRoutes';
import healthCheckRoutes from './routes/healthCheckRoutes';
import { connectDatabase, query } from './config/database';
import { setupMessageQueue } from './orchestration/messageQueue';
import { getAgentOrchestrator } from './orchestration/agentOrchestrator';
import { DataIngestionAgent } from './agents/dataIngestionAgent';
import { CopilotChatAgent } from './agents/copilotChatAgent';
import { TransactionCategorizationAgent } from './agents/transactionCategorizationAgent';
import prisma from './services/db';
import path from 'path';
import fs from 'fs';
import { LLMService } from './services/llmService';
import { TransactionService } from './services/transactionService';



// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data-ingestion', dataIngestionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/copilot', copilotChatRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api', healthCheckRoutes);

// Error handling middleware
app.use(errorHandler);

const testDbConnection = async () => {
  try {
    // Simple query to test the connection
    const result = await query('SELECT NOW() as now');
    console.log('✅ PostgreSQL connection successful!');
    console.log(`Server time: ${result.rows[0].now}`);
    
    // Test table access
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Available tables:', tablesResult.rows.map((row: { table_name: any; }) => row.table_name).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    return false;
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const dbConnected = await testDbConnection();
    
    if (!dbConnected) {
      console.error('Could not connect to the database. Check your connection parameters.');
      process.exit(1);
    }

    // Connect to PostgreSQL
    await connectDatabase();
    
    // Verify Prisma connection
    await prisma.$connect();
    console.log('Connected to database via Prisma');
    
    console.log('Setting up RabbitMQ...');
    await setupMessageQueue();
    console.log('RabbitMQ setup complete. Registering agents...');
    
    /* Register agents
    const orchestrator = getAgentOrchestrator();
    const llmService = new LLMService();
    const transactionService = new TransactionService();
    
    orchestrator.registerAgent(new DataIngestionAgent());
    orchestrator.registerAgent(new CopilotChatAgent(llmService, transactionService));
    orchestrator.registerAgent(new TransactionCategorizationAgent(llmService));
    */
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Clean up resources on shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

export default app;