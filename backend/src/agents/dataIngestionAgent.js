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
exports.DataIngestionAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const agent_1 = require("../types/agent");
const csvParser_1 = require("../utils/csvParser");
const pdfParser_1 = require("../utils/pdfParser");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chartOfAccounts_1 = require("../utils/chartOfAccounts");
class DataIngestionAgent extends baseAgent_1.BaseAgent {
    constructor() {
        super(agent_1.AgentType.DATA_INGESTION);
    }
    process(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (context) {
                    this.setContext(context);
                }
                this.logEvent('process_start', {
                    filePath: input.filePath,
                    fileType: input.fileType
                });
                // Check if file exists
                if (!fs_1.default.existsSync(input.filePath)) {
                    throw new Error(`File not found: ${input.filePath}`);
                }
                let rawTransactions = [];
                // Parse file based on type
                if (input.fileType === 'csv') {
                    rawTransactions = yield (0, csvParser_1.parseCSVFile)(input.filePath);
                }
                else if (input.fileType === 'pdf') {
                    rawTransactions = yield (0, pdfParser_1.parsePDFFile)(input.filePath);
                }
                else {
                    throw new Error(`Unsupported file type: ${input.fileType}`);
                }
                this.logEvent('file_parsed', {
                    count: rawTransactions.length
                });
                // Load chart of accounts for categorization
                const chartOfAccounts = yield (0, chartOfAccounts_1.getFullChartOfAccounts)();
                // Convert to Transaction objects
                const transactions = [];
                const warnings = [];
                let failedCount = 0;
                for (const raw of rawTransactions) {
                    try {
                        // Skip if missing required fields
                        if (!raw.date || !raw.description || isNaN(raw.amount)) {
                            warnings.push(`Skipping transaction: Missing required fields`);
                            failedCount++;
                            continue;
                        }
                        // Convert to Transaction object
                        const transaction = {
                            userId: input.userId,
                            date: new Date(raw.date),
                            description: raw.description,
                            amount: Math.abs(parseFloat(raw.amount)),
                            type: raw.type || 'debit',
                            accountCode: raw.accountCode || '000', // Default code if not categorized
                            confidence: raw.accountCode ? 0.9 : 0.5, // Higher confidence if pre-categorized
                            tags: [],
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        transactions.push(transaction);
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            warnings.push(`Failed to process transaction: ${error.message}`);
                        }
                        else {
                            warnings.push('Failed to process transaction: Unknown error');
                        }
                        failedCount++;
                    }
                }
                this.logEvent('process_complete', {
                    processed: transactions.length,
                    failed: failedCount,
                    warnings: warnings.length
                });
                // Send to categorization agent if needed
                if (transactions.length > 0) {
                    this.emit('transactions_ready', {
                        transactions,
                        userId: input.userId
                    });
                }
                return {
                    success: true,
                    data: {
                        transactions,
                        processedCount: transactions.length,
                        failedCount,
                        warnings
                    },
                    warnings: warnings.length > 0 ? warnings : undefined
                };
            }
            catch (error) {
                if (error instanceof Error) {
                    return this.handleError(error);
                }
                return this.handleError(new Error(String(error)));
            }
        });
    }
    // Helper method to determine file type from extension
    static getFileTypeFromPath(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        if (ext === '.csv') {
            return 'csv';
        }
        else if (ext === '.pdf') {
            return 'pdf';
        }
        return null;
    }
}
exports.DataIngestionAgent = DataIngestionAgent;
