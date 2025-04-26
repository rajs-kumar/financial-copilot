"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotChatService = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
class CopilotChatService {
    constructor(copilotChatAgent, llmService) {
        this.copilotChatAgent = copilotChatAgent;
        this.llmService = llmService;
    }
    // Send a message to the copilot
    sendMessage(userId, message, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get or create chat session
                const session = yield this.getOrCreateSession(userId, sessionId);
                // Get session history
                const history = yield this.getSessionHistory(session.id);
                // Generate a unique message ID
                const messageId = (0, uuid_1.v4)();
                // Save user message to database
                yield this.saveMessage(session.id, {
                    id: messageId,
                    role: 'user',
                    content: message,
                    timestamp: new Date()
                });
                // Process the message with the copilot agent
                const result = yield this.copilotChatAgent.process({
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
                const response = result.data;
                // Save assistant response to database
                const responseId = (0, uuid_1.v4)();
                yield this.saveMessage(session.id, {
                    id: responseId,
                    role: 'assistant',
                    content: response.message,
                    timestamp: new Date()
                });
                // Save insights if any
                if (response.insights && response.insights.length > 0) {
                    yield this.saveInsights(userId, session.id, response.insights);
                }
                return {
                    response,
                    sessionId: session.id,
                    messageId: responseId
                };
            }
            catch (error) {
                console.error('Error sending message to copilot:', error);
                throw error;
            }
        });
    }
    // Get or create a chat session
    getOrCreateSession(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            // If sessionId provided, verify it exists and belongs to user
            if (sessionId) {
                const result = yield (0, database_1.query)(`SELECT id FROM chat_sessions 
         WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
                if (result.rows.length > 0) {
                    // Update session timestamp
                    yield (0, database_1.query)(`UPDATE chat_sessions SET updated_at = $1 WHERE id = $2`, [new Date(), sessionId]);
                    return { id: sessionId, isNew: false };
                }
            }
            // Create new session
            const newSessionId = (0, uuid_1.v4)();
            const now = new Date();
            yield (0, database_1.query)(`INSERT INTO chat_sessions (id, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4)`, [newSessionId, userId, now, now]);
            return { id: newSessionId, isNew: true };
        });
    }
    // Get session history
    getSessionHistory(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, database_1.query)(`SELECT role, content FROM chat_messages
       WHERE session_id = $1
       ORDER BY timestamp ASC
       LIMIT $2`, [sessionId, 20] // Limit to last 20 messages
            );
            return result.rows.map((row) => ({
                role: row.role,
                content: row.content
            }));
        });
    }
    // Save a message to the database
    saveMessage(sessionId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, database_1.query)(`INSERT INTO chat_messages (id, session_id, role, content, timestamp)
       VALUES ($1, $2, $3, $4, $5)`, [message.id, sessionId, message.role, message.content, message.timestamp]);
        });
    }
    // Save insights from chat response
    saveInsights(userId, sessionId, insights) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const insight of insights) {
                const id = (0, uuid_1.v4)();
                yield (0, database_1.query)(`INSERT INTO insights (id, user_id, session_id, type, content, confidence, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, userId, sessionId, insight.type, insight.content, insight.confidence, new Date()]);
            }
        });
    }
    // Get chat sessions for a user
    getChatSessions(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, database_1.query)(`SELECT id, created_at, updated_at,
       (SELECT COUNT(*) FROM chat_messages WHERE session_id = chat_sessions.id) as message_count,
       (SELECT content FROM chat_messages 
         WHERE session_id = chat_sessions.id AND role = 'user' 
         ORDER BY timestamp DESC LIMIT 1) as last_message
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC`, [userId]);
            return result.rows.map((row) => ({
                id: row.id,
                lastMessage: row.last_message,
                messageCount: parseInt(row.message_count),
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        });
    }
    // Get messages for a chat session
    getMessages(sessionId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify session belongs to user
            const sessionResult = yield (0, database_1.query)(`SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
            if (sessionResult.rows.length === 0) {
                throw new Error('Chat session not found or access denied');
            }
            // Get messages
            const result = yield (0, database_1.query)(`SELECT id, role, content, timestamp 
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY timestamp ASC`, [sessionId]);
            return result.rows.map((row) => ({
                id: row.id,
                role: row.role,
                content: row.content,
                timestamp: row.timestamp
            }));
        });
    }
    // Delete a chat session
    deleteSession(sessionId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Begin transaction
                const client = yield (0, database_1.query)('BEGIN');
                try {
                    // Delete messages
                    yield (0, database_1.query)(`DELETE FROM chat_messages WHERE session_id = $1`, [sessionId]);
                    // Delete insights
                    yield (0, database_1.query)(`DELETE FROM insights WHERE session_id = $1`, [sessionId]);
                    // Delete session
                    const result = yield (0, database_1.query)(`DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id`, [sessionId, userId]);
                    yield (0, database_1.query)('COMMIT');
                    return result.rows.length > 0;
                }
                catch (error) {
                    yield (0, database_1.query)('ROLLBACK');
                    throw error;
                }
            }
            catch (error) {
                console.error(`Error deleting chat session ${sessionId}:`, error);
                return false;
            }
        });
    }
    // Get insights for a user
    getInsights(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, limit = 10) {
            const result = yield (0, database_1.query)(`SELECT id, type, content, confidence, created_at
       FROM insights
       WHERE user_id = $1
       ORDER BY confidence DESC, created_at DESC
       LIMIT $2`, [userId, limit]);
            return result.rows.map((row) => ({
                id: row.id,
                type: row.type,
                content: row.content,
                confidence: row.confidence,
                createdAt: row.created_at
            }));
        });
    }
}
exports.CopilotChatService = CopilotChatService;
