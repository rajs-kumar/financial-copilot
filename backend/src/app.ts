import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import dataIngestionRoutes from './routes/dataIngestionRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import copilotChatRoutes from './routes/copilotChatRoutes.js';
import { connectDatabase } from './config/database.js';
import { setupMessageQueue } from './orchestration/messageQueue.js';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;  // <-- recommend using 5000 for backend

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
app.use('/api/data-ingestion', dataIngestionRoutes);  // <-- FIXED HERE
app.use('/api/transactions', transactionRoutes);
app.use('/api/copilot', copilotChatRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    await setupMessageQueue();
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

if (require.main === module) {
  startServer();
}

export default app;
