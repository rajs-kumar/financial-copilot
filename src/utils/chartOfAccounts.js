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
exports.getAccountByCode = exports.validateAccountCode = exports.loadChartOfAccounts = exports.findMatchingAccountCategory = exports.getFullChartOfAccounts = void 0;
const getFullChartOfAccounts = () => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implement actual chart of accounts loading
    return {
        "111": { accountType: "Income", parentAccount: "Salary", account: "Base Salary" },
        "112": { accountType: "Income", parentAccount: "Salary", account: "Bonus and commissions" },
        "113": { accountType: "Income", parentAccount: "Salary", account: "Reimbursements" },
        "114": { accountType: "Income", parentAccount: "Salary", account: "Equity compensation" },
        "231": { accountType: "Expense", parentAccount: "Daily Living", account: "Groceries and Food" },
        "232": { accountType: "Expense", parentAccount: "Daily Living", account: "Child Education" },
        "272": { accountType: "Expense", parentAccount: "Leisure", account: "Dining out" },
        "311": { accountType: "Assets", parentAccount: "Bank and Cash", account: "Cash on hand" },
        "312": { accountType: "Assets", parentAccount: "Bank and Cash", account: "Bank account 1" },
        "421": { accountType: "Liabilities", parentAccount: "Accounts Payable", account: "Credit Card 1" }
    };
});
exports.getFullChartOfAccounts = getFullChartOfAccounts;
const findMatchingAccountCategory = (description, amount, chartOfAccounts) => {
    // TODO: Implement actual account matching logic
    return null;
};
exports.findMatchingAccountCategory = findMatchingAccountCategory;
// Load and parse the Chart of Accounts
const loadChartOfAccounts = () => {
    // In a real application, this might be loaded from a database or file
    // Here we hardcode a subset for demonstration
    const chartOfAccounts = {
        "111": {
            accountType: "Income",
            parentAccount: "Salary",
            account: "Base Salary",
            description: "M"
        },
        "112": {
            accountType: "Income",
            parentAccount: "Salary",
            account: "Bonus and commissions",
            description: "Y"
        },
        "113": {
            accountType: "Income",
            parentAccount: "Salary",
            account: "Reimbursements",
            description: "Medical, travel, phone, health etc"
        },
        "114": {
            accountType: "Income",
            parentAccount: "Salary",
            account: "Equity compensation",
            description: "RSU/ ESPP / Options / Grants"
        },
        "231": {
            accountType: "Expense",
            parentAccount: "Daily Living",
            account: "Groceries and Food",
            description: "M"
        },
        "232": {
            accountType: "Expense",
            parentAccount: "Daily Living",
            account: "Child Education",
            description: "Y"
        },
        "272": {
            accountType: "Expense",
            parentAccount: "Leisure",
            account: "Dining out",
            description: "M"
        },
        "311": {
            accountType: "Assets",
            parentAccount: "Bank and Cash",
            account: "Cash on hand",
            description: ""
        },
        "312": {
            accountType: "Assets",
            parentAccount: "Bank and Cash",
            account: "Bank account 1",
            description: ""
        },
        "421": {
            accountType: "Liabilities",
            parentAccount: "Accounts Payable",
            account: "Credit Card 1",
            description: ""
        }
        // Additional accounts would be loaded from the CSV file
    };
    return chartOfAccounts;
};
exports.loadChartOfAccounts = loadChartOfAccounts;
// Validate if an account code exists in the chart of accounts
const validateAccountCode = (code, chartOfAccounts) => {
    return !!chartOfAccounts[code];
};
exports.validateAccountCode = validateAccountCode;
// Get account information by code
const getAccountByCode = (code, chartOfAccounts) => {
    return chartOfAccounts[code] || null;
};
exports.getAccountByCode = getAccountByCode;
