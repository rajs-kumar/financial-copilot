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
exports.extractTransactionsWithLLM = exports.parsePDFFile = void 0;
const fs_1 = __importDefault(require("fs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const chartOfAccounts_1 = require("./chartOfAccounts");
const parsePDFFile = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dataBuffer = fs_1.default.readFileSync(filePath);
        const data = yield (0, pdf_parse_1.default)(dataBuffer);
        // Get the text content from the PDF
        const text = data.text;
        // Process the text to extract transactions
        const transactions = extractTransactionsFromText(text);
        // Try to categorize each transaction
        const chartOfAccounts = yield (0, chartOfAccounts_1.getFullChartOfAccounts)();
        transactions.forEach(transaction => {
            const accountCode = (0, chartOfAccounts_1.findMatchingAccountCategory)(transaction.description, transaction.amount, chartOfAccounts);
            if (accountCode) {
                transaction.accountCode = accountCode;
            }
        });
        return transactions;
    }
    catch (error) {
        console.error('Error parsing PDF:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to parse PDF: ${error.message}`);
        }
        throw new Error('Failed to parse PDF: Unknown error');
    }
});
exports.parsePDFFile = parsePDFFile;
const extractTransactionsFromText = (text) => {
    const transactions = [];
    // This is a simplified implementation for demonstration
    // In a real application, this would use more sophisticated parsing strategies
    // such as regex patterns for different bank statement formats, or even ML-based extraction
    // Example: simple line-by-line parsing for a common bank statement format
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip empty lines
        if (!line)
            continue;
        // Example pattern: Date followed by description and amount
        // E.g., "2023-01-15  GROCERY STORE XYZ  -45.67"
        const dateMatch = line.match(/^(\d{2}[\/\-]\d{2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
        if (dateMatch) {
            const dateStr = dateMatch[1];
            const remainder = line.substring(dateStr.length).trim();
            // Try to find amount at the end (assumes amount is the last thing on the line)
            const amountMatch = remainder.match(/([\-\+]?\s?\$?\d+\.\d{2})\s*$/);
            if (amountMatch) {
                const amount = parseFloat(amountMatch[1].replace(/[\$\+\s]/g, ''));
                // Everything between date and amount is the description
                let description = remainder.substring(0, remainder.length - amountMatch[0].length).trim();
                // Clean up extra whitespace in description
                description = description.replace(/\s+/g, ' ');
                transactions.push({
                    date: dateStr,
                    description,
                    amount: Math.abs(amount), // Store absolute value
                    type: amount < 0 ? 'debit' : 'credit' // Negative amounts are debits
                });
            }
        }
    }
    return transactions;
};
// This is a more advanced version that would use an LLM to extract transactions
// In a production environment, you might want to use this approach for better accuracy
const extractTransactionsWithLLM = (text) => __awaiter(void 0, void 0, void 0, function* () {
    // This would call an LLM service to extract structured transaction data
    // For the sake of this example, we'll just return an empty array
    // Implementation would depend on the specific LLM API being used
    console.log('LLM extraction would process this text:', text.substring(0, 100) + '...');
    // Mock implementation
    return [];
});
exports.extractTransactionsWithLLM = extractTransactionsWithLLM;
