import { v4 as uuidv4 } from 'uuid';
import { CopilotChatAgent, ChatInput, ChatResponse } from '../agents/copilotChatAgent';
import { query } from '../config/database';
import { LLMService } from './llmService';

interface ChatSession {
  id: string;
  userId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class CopilotChatService {
  private copilotChatAgent: CopilotChatAgent;
  private llmService: LLMService;
  
  constructor(copilotChatAgent: CopilotChatAgent, llmService: LLMService) {
    this.copilotChatAgent = copilotChatAgent;
    this.llmService = llmService;
  }
  
  // Send a message to the copilot
  async sendMessage(userId: string, message: string, sessionId?: string): Promise<{
    response: ChatResponse;
    sessionId: string;
    messageId: string;
  }> {
    try {
      // Get or create chat session
      const session = await this.getOrCreateSession(userId, sessionId);
      
      // Get session history
      const history = await this.getSessionHistory(session.id);
      
      // Generate a unique message ID
      const messageId = uuidv4();
      
      // Save user message to database
      await this.saveMessage(session.id, {
        id: messageId,
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      
      // Process the message with the copilot agent
      const result = await this.copilotChatAgent.process({
        userId,
        message,
        sessionId: session.id,
        history
      }, {
        userId,
        sessionId: session.id,
        requestId: messageId
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process message');
      }
      
      const response = result.data as ChatResponse;
      
      // Save assistant response to database
      const responseId = uuidv4();
      await this.saveMessage(session.id, {
        id: responseId,
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      });
      
      // Save insights if any
      if (response.insights && response.insights.length > 0) {
        await this.saveInsights(userId, session.id, response.insights);
      }
      
      return {
        response,
        sessionId: session.id,
        messageId: responseId
      };
    } catch (error) {
      console.error('Error sending message to copilot:', error);
      throw error;
    }
  }
  
  // Get or create a chat session
  private async getOrCreateSession(userId: string, sessionId?: string): Promise<{ id: string; isNew: boolean }> {
    // If sessionId provided, verify it exists and belongs to user
    if (sessionId) {
      const result = await query(
        `SELECT id FROM chat_sessions 
         WHERE id = $1 AND user_id = $2`,
        [sessionId, userId]
      );
      
      if (result.rows.length > 0) {
        // Update session timestamp
        await query(
          `UPDATE chat_sessions SET updated_at = $1 WHERE id = $2`,
          [new Date(), sessionId]
        );
        
        return { id: sessionId, isNew: false };
      }
    }
    
    // Create new session
    const newSessionId = uuidv4();
    const now = new Date();
    
    await query(
      `INSERT INTO chat_sessions (id, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [newSessionId, userId, now, now]
    );
    
    return { id: newSessionId, isNew: true };
  }
  
  // Get session history
  private async getSessionHistory(sessionId: string): Promise<Array<{ role: 'user' | 'assistant', content: string }>> {
    const result = await query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1
       ORDER BY timestamp ASC
       LIMIT $2`,
      [sessionId, 20] // Limit to last 20 messages
    );
    
    return result.rows.map((row: { role: string; content: any; }) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content
    }));
  }
  
  // Save a message to the database
  private async saveMessage(sessionId: string, message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }): Promise<void> {
    await query(
      `INSERT INTO chat_messages (id, session_id, role, content, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      [message.id, sessionId, message.role, message.content, message.timestamp]
    );
  }
  
  // Save insights from chat response
  private async saveInsights(userId: string, sessionId: string, insights: Array<{
    type: string;
    content: string;
    confidence: number;
  }>): Promise<void> {
    for (const insight of insights) {
      const id = uuidv4();
      
      await query(
        `INSERT INTO insights (id, user_id, session_id, type, content, confidence, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, userId, sessionId, insight.type, insight.content, insight.confidence, new Date()]
      );
    }
  }
  
  // Get chat sessions for a user
  async getChatSessions(userId: string): Promise<Partial<ChatSession>[]> {
    const result = await query(
      `SELECT id, created_at, updated_at,
       (SELECT COUNT(*) FROM chat_messages WHERE session_id = chat_sessions.id) as message_count,
       (SELECT content FROM chat_messages 
         WHERE session_id = chat_sessions.id AND role = 'user' 
         ORDER BY timestamp DESC LIMIT 1) as last_message
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    
    return result.rows.map((row: { id: any; last_message: any; message_count: string; created_at: any; updated_at: any; }) => ({
      id: row.id,
      lastMessage: row.last_message,
      messageCount: parseInt(row.message_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
  
  // Get messages for a chat session
  async getMessages(sessionId: string, userId: string): Promise<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>> {
    // Verify session belongs to user
    const sessionResult = await query(
      `SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    
    if (sessionResult.rows.length === 0) {
      throw new Error('Chat session not found or access denied');
    }
    
    // Get messages
    const result = await query(
      `SELECT id, role, content, timestamp 
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY timestamp ASC`,
      [sessionId]
    );
    
    return result.rows.map((row: { id: any; role: string; content: any; timestamp: any; }) => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: row.timestamp
    }));
  }
  
  // Delete a chat session
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Begin transaction
      const client = await query('BEGIN');
      
      try {
        // Delete messages
        await query(
          `DELETE FROM chat_messages WHERE session_id = $1`,
          [sessionId]
        );
        
        // Delete insights
        await query(
          `DELETE FROM insights WHERE session_id = $1`,
          [sessionId]
        );
        
        // Delete session
        const result = await query(
          `DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id`,
          [sessionId, userId]
        );
        
        await query('COMMIT');
        
        return result.rows.length > 0;
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`Error deleting chat session ${sessionId}:`, error);
      return false;
    }
  }
  
  // Get insights for a user
  async getInsights(userId: string, limit: number = 10): Promise<Array<{
    id: string;
    type: string;
    content: string;
    confidence: number;
    createdAt: Date;
  }>> {
    const result = await query(
      `SELECT id, type, content, confidence, created_at
       FROM insights
       WHERE user_id = $1
       ORDER BY confidence DESC, created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows.map((row: { id: any; type: any; content: any; confidence: any; created_at: any; }) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      confidence: row.confidence,
      createdAt: row.created_at
    }));
  }
}