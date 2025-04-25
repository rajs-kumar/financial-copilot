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
exports.parseCSVFile = void 0;
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const chartOfAccounts_1 = require("./chartOfAccounts");
const parseCSVFile = (filePath) => {
    return new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        const results = [];
        const chartOfAccounts = yield (0, chartOfAccounts_1.getFullChartOfAccounts)();
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (data) => {
            // Try to parse the csv row into our expected format
            try {
                const transaction = {
                    date: data.date || data.Date || data.DATE || data.transaction_date || '',
                    description: data.description || data.Description || data.DESC || data.narrative || '',
                    amount: parseFloat(data.amount || data.Amount || data.AMOUNT || '0'),
                    type: parseTransactionType(data)
                };
                // Only include valid transactions
                if (transaction.date && transaction.description && !isNaN(transaction.amount)) {
                    // Try to categorize the transaction
                    const accountCode = (0, chartOfAccounts_1.findMatchingAccountCategory)(transaction.description, transaction.amount, chartOfAccounts);
                    if (accountCode) {
                        transaction.accountCode = accountCode;
                    }
                    results.push(transaction);
                }
            }
            catch (error) {
                console.error('Error parsing CSV row:', error, data);
                // Continue processing remaining rows
            }
        })
            .on('end', () => {
            resolve(results);
        })
            .on('error', (error) => {
            reject(error);
        });
    }));
};
exports.parseCSVFile = parseCSVFile;
const parseTransactionType = (data) => {
    // Different banks use different formats
    if (data.type && typeof data.type === 'string') {
        const type = data.type.toLowerCase();
        if (type === 'debit' || type === 'dr' || type === 'd')
            return 'debit';
        if (type === 'credit' || type === 'cr' || type === 'c')
            return 'credit';
    }
    // Try to infer from amount
    // Some CSVs use negative values for debits
    if (data.amount && parseFloat(data.amount) < 0) {
        return 'debit';
    }
    // If there's a separate debit and credit column
    if (data.debit && parseFloat(data.debit) > 0) {
        return 'debit';
    }
    if (data.credit && parseFloat(data.credit) > 0) {
        return 'credit';
    }
    // Default
    return 'debit';
};
