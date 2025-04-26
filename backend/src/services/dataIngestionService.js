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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngestionService = void 0;
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const agentOrchestrator_1 = require("../orchestration/agentOrchestrator");
const agent_1 = require("../types/agent");
const database_1 = require("../config/database");
class DataIngestionService {
    constructor(dataIngestionAgent) {
        this.dataIngestionAgent = dataIngestionAgent;
    }
    // Save file record to database
    saveFileRecord(fileInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = (0, uuid_1.v4)();
            const now = new Date();
            const result = yield (0, database_1.query)(`INSERT INTO files 
       (id, user_id, file_path, original_name, file_size, mime_type, file_type, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`, [
                id,
                fileInfo.userId,
                fileInfo.filePath,
                fileInfo.originalName,
                fileInfo.fileSize,
                fileInfo.mimeType,
                fileInfo.fileType,
                'pending',
                now
            ]);
            return {
                id,
                userId: fileInfo.userId,
                filePath: fileInfo.filePath,
                originalName: fileInfo.originalName,
                fileSize: fileInfo.fileSize,
                mimeType: fileInfo.mimeType,
                fileType: fileInfo.fileType,
                status: 'pending',
                createdAt: now
            };
        });
    }
    // Get all files for a user
    getFilesByUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, database_1.query)(`SELECT id, original_name, file_size, mime_type, file_type, status, processed_at, created_at
       FROM files
       WHERE user_id = $1
       ORDER BY created_at DESC`, [userId]);
            return result.rows;
        });
    }
    // Get file processing status
    getFileStatus(fileId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, database_1.query)(`SELECT f.id, f.status, f.processed_at, f.error,
       (SELECT COUNT(*) FROM transactions WHERE file_id = f.id) as transaction_count
       FROM files f
       WHERE f.id = $1 AND f.user_id = $2`, [fileId, userId]);
            if (result.rows.length === 0) {
                return null;
            }
            return {
                id: result.rows[0].id,
                status: result.rows[0].status,
                processedAt: result.rows[0].processed_at,
                transactionCount: parseInt(result.rows[0].transaction_count),
                error: result.rows[0].error
            };
        });
    }
    // Check if a file exists and is accessible by the user
    checkFileAccess(fileId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, database_1.query)(`SELECT id FROM files WHERE id = $1 AND user_id = $2`, [fileId, userId]);
            return result.rows.length > 0;
        });
    }
    // Process a file asynchronously
    processFileAsync(fileId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Update file status to processing
                yield (0, database_1.query)(`UPDATE files SET status = $1 WHERE id = $2`, ['processing', fileId]);
                // Get file details
                const fileResult = yield (0, database_1.query)(`SELECT * FROM files WHERE id = $1`, [fileId]);
                if (fileResult.rows.length === 0) {
                    throw new Error(`File ${fileId} not found`);
                }
                const file = fileResult.rows[0];
                // Process the file using DataIngestionAgent
                const result = yield this.dataIngestionAgent.process({
                    filePath: file.file_path,
                    fileType: file.file_type,
                    userId
                }, {
                    userId,
                    requestId: fileId
                });
                if (!result.success) {
                    // Update file status to failed
                    yield (0, database_1.query)(`UPDATE files SET status = $1, error = $2, processed_at = $3 WHERE id = $4`, ['failed', result.error, new Date(), fileId]);
                    return { success: false, error: result.error };
                }
                // Save extracted transactions to database
                const data = result.data;
                const savedTransactions = yield this.saveTransactions(data.transactions, fileId);
                // Update file status to completed
                yield (0, database_1.query)(`UPDATE files SET status = $1, processed_at = $2 WHERE id = $3`, ['completed', new Date(), fileId]);
                // Notify transaction categorization agent
                if (savedTransactions.length > 0) {
                    const orchestrator = (0, agentOrchestrator_1.getAgentOrchestrator)();
                    const categorizationAgent = orchestrator.getAgent(agent_1.AgentType.TRANSACTION_CATEGORIZATION);
                    if (categorizationAgent) {
                        // Process the transactions for categorization
                        categorizationAgent.process({
                            transactions: savedTransactions,
                            userId,
                            useLLM: true
                        }, {
                            userId,
                            requestId: `categorize-${fileId}`
                        });
                    }
                }
                return {
                    success: true,
                    transactionCount: savedTransactions.length
                };
            }
            catch (error) {
                console.error(`Error processing file ${fileId}:`, error);
                // Update file status to failed
                yield (0, database_1.query)(`UPDATE files SET status = $1, error = $2, processed_at = $3 WHERE id = $4`, ['failed', error.message, new Date(), fileId]);
                return { success: false, error: error.message };
            }
        });
    }
    // Save transactions to database
    saveTransactions(transactions, fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const savedTransactions = [];
            for (const transaction of transactions) {
                try {
                    const id = (0, uuid_1.v4)();
                    const result = yield (0, database_1.query)(`INSERT INTO transactions 
           (id, user_id, file_id, date, description, amount, type, account_code, confidence, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
           RETURNING *`, [
                        id,
                        transaction.userId,
                        fileId,
                        transaction.date,
                        transaction.description,
                        transaction.amount,
                        transaction.type,
                        transaction.accountCode,
                        transaction.confidence || 0.5,
                        new Date(),
                        new Date()
                    ]);
                    savedTransactions.push(Object.assign(Object.assign({}, transaction), { id }));
                }
                catch (error) {
                    console.error('Error saving transaction:', error);
                    // Continue with the next transaction
                }
            }
            return savedTransactions;
        });
    }
    // Delete a file and its transactions
    deleteFile(fileId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // First check if the file exists and belongs to the user
                const fileResult = yield (0, database_1.query)(`SELECT * FROM files WHERE id = $1 AND user_id = $2`, [fileId, userId]);
                if (fileResult.rows.length === 0) {
                    return false;
                }
                const file = fileResult.rows[0];
                // Begin transaction
                const client = yield (0, database_1.query)('BEGIN');
                try {
                    // Delete transactions associated with the file
                    yield (0, database_1.query)(`DELETE FROM transactions WHERE file_id = $1`, [fileId]);
                    // Delete file record
                    yield (0, database_1.query)(`DELETE FROM files WHERE id = $1`, [fileId]);
                    // Delete physical file if it exists
                    if (file.file_path && fs_1.default.existsSync(file.file_path)) {
                        fs_1.default.unlinkSync(file.file_path);
                    }
                    yield (0, database_1.query)('COMMIT');
                    return true;
                }
                catch (error) {
                    yield (0, database_1.query)('ROLLBACK');
                    throw error;
                }
            }
            catch (error) {
                console.error(`Error deleting file ${fileId}:`, error);
                return false;
            }
        });
    }
}
exports.DataIngestionService = DataIngestionService;
