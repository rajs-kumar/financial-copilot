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
exports.CopilotChatController = void 0;
class CopilotChatController {
    constructor(copilotChatService) {
        this.copilotChatService = copilotChatService;
    }
    // Send a message to the copilot
    sendMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const { message, sessionId } = req.body;
                if (!message || typeof message !== 'string') {
                    res.status(400).json({ success: false, message: 'Message is required' });
                    return;
                }
                const result = yield this.copilotChatService.sendMessage(userId, message, sessionId);
                res.status(200).json({
                    success: true,
                    data: {
                        response: result.response,
                        sessionId: result.sessionId,
                        messageId: result.messageId
                    }
                });
            }
            catch (error) {
                console.error('Error sending message to copilot:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error sending message: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error sending message: Unknown error' });
                }
            }
        });
    }
    // Get chat sessions for a user
    getSessions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const sessions = yield this.copilotChatService.getChatSessions(userId);
                res.status(200).json({
                    success: true,
                    data: sessions
                });
            }
            catch (error) {
                console.error('Error getting chat sessions:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error getting sessions: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error getting sessions: Unknown error' });
                }
            }
        });
    }
    // Get messages for a chat session
    getMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const sessionId = req.params.sessionId;
                if (!sessionId) {
                    res.status(400).json({ success: false, message: 'Session ID is required' });
                    return;
                }
                const messages = yield this.copilotChatService.getMessages(sessionId, userId);
                res.status(200).json({
                    success: true,
                    data: messages
                });
            }
            catch (error) {
                console.error('Error getting chat messages:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error getting messages: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error getting messages: Unknown error' });
                }
            }
        });
    }
    // Delete a chat session
    deleteSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const sessionId = req.params.sessionId;
                if (!sessionId) {
                    res.status(400).json({ success: false, message: 'Session ID is required' });
                    return;
                }
                const result = yield this.copilotChatService.deleteSession(sessionId, userId);
                if (!result) {
                    res.status(404).json({ success: false, message: 'Session not found or already deleted' });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Session deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting chat session:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error deleting session: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error deleting session: Unknown error' });
                }
            }
        });
    }
    // Get insights for a user
    getInsights(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'User not authenticated' });
                    return;
                }
                const limit = parseInt(req.query.limit) || 10;
                const insights = yield this.copilotChatService.getInsights(userId, limit);
                res.status(200).json({
                    success: true,
                    data: insights
                });
            }
            catch (error) {
                console.error('Error getting insights:', error);
                if (error instanceof Error) {
                    res.status(500).json({ success: false, message: `Error getting insights: ${error.message}` });
                }
                else {
                    res.status(500).json({ success: false, message: 'Error getting insights: Unknown error' });
                }
            }
        });
    }
}
exports.CopilotChatController = CopilotChatController;
