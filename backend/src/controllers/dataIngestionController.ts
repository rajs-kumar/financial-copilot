import { Request, Response } from 'express';
import { DataIngestionService } from '../services/dataIngestionService';
import path from 'path';
import { DataIngestionAgent } from '../agents/dataIngestionAgent';

export class DataIngestionController {
  private dataIngestionService: DataIngestionService;
  
  constructor(dataIngestionService: DataIngestionService) {
    this.dataIngestionService = dataIngestionService;
  }
  
  // Handle file upload
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      // Request should have been processed by multer middleware
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      
      const userId = req.user?.id; // Assuming auth middleware sets req.user
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const filePath = req.file.path;
      const originalName = req.file.originalname;
      const fileSize = req.file.size;
      const mimeType = req.file.mimetype;
      
      // Determine file type from extension
      const fileType = DataIngestionAgent.getFileTypeFromPath(filePath);
      
      if (!fileType) {
        res.status(400).json({ success: false, message: 'Unsupported file type' });
        return;
      }
      
      // Store file metadata in database
      const fileRecord = await this.dataIngestionService.saveFileRecord({
        userId,
        filePath,
        originalName,
        fileSize,
        mimeType,
        fileType
      });
      
      // Process the file asynchronously
      this.dataIngestionService.processFileAsync(fileRecord.id, userId)
        .then((result) => {
          console.log(`File ${fileRecord.id} processed successfully:`, result);
        })
        .catch((error) => {
          console.error(`Error processing file ${fileRecord.id}:`, error);
        });
      
      // Return success with file record
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully and processing started',
        data: {
          fileId: fileRecord.id,
          originalName,
          status: 'processing'
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error uploading file: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error uploading file: Unknown error' });
      }
    }
  }
  
  // Get all uploaded files for a user
  async getFiles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      console.log(`Fetching files for user ${userId}`);
      const files = await this.dataIngestionService.getFilesByUser(userId);
      console.log(`Found ${files.length} files`);
      
      res.status(200).json({
        success: true,
        data: files
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error fetching files: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error fetching files: Unknown error' });
      }
    }
  }
  
  // Get file processing status
  async getFileStatus(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.id;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const fileStatus = await this.dataIngestionService.getFileStatus(fileId, userId);
      
      if (!fileStatus) {
        res.status(404).json({ success: false, message: 'File not found' });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: fileStatus
      });
    } catch (error) {
      console.error('Error fetching file status:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error fetching file status: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error fetching file status: Unknown error' });
      }
    }
  }
  
  // Reprocess a file
  async reprocessFile(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.id;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      // Check if file exists and belongs to user
      const fileExists = await this.dataIngestionService.checkFileAccess(fileId, userId);
      
      if (!fileExists) {
        res.status(404).json({ success: false, message: 'File not found or access denied' });
        return;
      }
      
      // Reprocess the file asynchronously
      this.dataIngestionService.processFileAsync(fileId, userId)
        .then((result) => {
          console.log(`File ${fileId} reprocessed successfully:`, result);
        })
        .catch((error) => {
          console.error(`Error reprocessing file ${fileId}:`, error);
        });
      
      res.status(200).json({
        success: true,
        message: 'File reprocessing started',
        data: {
          fileId,
          status: 'processing'
        }
      });
    } catch (error) {
      console.error('Error reprocessing file:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error reprocessing file: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error reprocessing file: Unknown error' });
      }
    }
  }
  
  // Delete a file
  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.id;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const result = await this.dataIngestionService.deleteFile(fileId, userId);
      
      if (!result) {
        res.status(404).json({ success: false, message: 'File not found or already deleted' });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error deleting file: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error deleting file: Unknown error' });
      }
    }
  }
}