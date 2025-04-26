import { Request, Response } from 'express';
import { CopilotChatService } from '../services/copilotChatService';

export class CopilotChatController {
  private copilotChatService: CopilotChatService;
  
  constructor(copilotChatService: CopilotChatService) {
    this.copilotChatService = copilotChatService;
  }
  
  // Send a message to the copilot
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const { message, sessionId } = req.body;
      
      if (!message || typeof message !== 'string') {
        res.status(400).json({ success: false, message: 'Message is required' });
        return;
      }
      
      const result = await this.copilotChatService.sendMessage(userId, message, sessionId);
      
      res.status(200).json({
        success: true,
        data: {
          response: result.response,
          sessionId: result.sessionId,
          messageId: result.messageId
        }
      });
    } catch (error) {
      console.error('Error sending message to copilot:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error sending message: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error sending message: Unknown error' });
      }
    }
  }
  
  // Get chat sessions for a user
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const sessions = await this.copilotChatService.getChatSessions(userId);
      
      res.status(200).json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Error getting chat sessions:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error getting sessions: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error getting sessions: Unknown error' });
      }
    }
  }
  
  // Get messages for a chat session
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const sessionId = req.params.sessionId;
      
      if (!sessionId) {
        res.status(400).json({ success: false, message: 'Session ID is required' });
        return;
      }
      
      const messages = await this.copilotChatService.getMessages(sessionId, userId);
      
      res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error getting chat messages:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error getting messages: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error getting messages: Unknown error' });
      }
    }
  }
  
  // Delete a chat session
  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const sessionId = req.params.sessionId;
      
      if (!sessionId) {
        res.status(400).json({ success: false, message: 'Session ID is required' });
        return;
      }
      
      const result = await this.copilotChatService.deleteSession(sessionId, userId);
      
      if (!result) {
        res.status(404).json({ success: false, message: 'Session not found or already deleted' });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting chat session:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error deleting session: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error deleting session: Unknown error' });
      }
    }
  }
  
  // Get insights for a user
  async getInsights(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      
      const insights = await this.copilotChatService.getInsights(userId, limit);
      
      res.status(200).json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error getting insights:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: `Error getting insights: ${error.message}` });
      } else {
        res.status(500).json({ success: false, message: 'Error getting insights: Unknown error' });
      }
    }
  }
}