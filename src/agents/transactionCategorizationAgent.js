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
exports.TransactionCategorizationAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const agent_1 = require("../types/agent");
const chartOfAccounts_1 = require("../utils/chartOfAccounts");
class TransactionCategorizationAgent extends baseAgent_1.BaseAgent {
    constructor(llmService) {
        super(agent_1.AgentType.TRANSACTION_CATEGORIZATION);
        this.llmService = llmService;
    }
    process(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (context) {
                    this.setContext(context);
                }
                this.logEvent('categorization_start', {
                    transactionCount: input.transactions.length,
                    useLLM: input.useLLM
                });
                const startTime = Date.now();
                // Load chart of accounts
                const chartOfAccounts = yield (0, chartOfAccounts_1.getFullChartOfAccounts)();
                // Initialize result variables
                const categorizedTransactions = [];
                const categorizations = [];
                let successCount = 0;
                let failedCount = 0;
                let confidenceSum = 0;
                let llmUsed = false;
                // Process each transaction
                for (const transaction of input.transactions) {
                    try {
                        // Skip if already has high-confidence categorization and not updating
                        if (transaction.accountCode &&
                            transaction.confidence &&
                            transaction.confidence > 0.8 &&
                            !input.updateExisting) {
                            categorizedTransactions.push(transaction);
                            categorizations.push({
                                transactionId: transaction.id || '',
                                categoryCode: transaction.accountCode,
                                confidence: transaction.confidence,
                                source: 'system' // Using existing categorization
                            });
                            successCount++;
                            confidenceSum += transaction.confidence;
                            continue;
                        }
                        // Try rule-based categorization first
                        let accountCode = (0, chartOfAccounts_1.findMatchingAccountCategory)(transaction.description, transaction.amount, chartOfAccounts);
                        let confidence = 0.7; // Default confidence for rule-based
                        let source = 'rule';
                        let reasoning;
                        // If rule-based failed or confidence is low, try LLM if enabled
                        if ((!accountCode || confidence < 0.6) && input.useLLM) {
                            const llmResult = yield this.categorizeThroughLLM(transaction, chartOfAccounts);
                            if (llmResult.accountCode) {
                                accountCode = llmResult.accountCode;
                                confidence = llmResult.confidence;
                                source = 'llm';
                                reasoning = llmResult.reasoning;
                                llmUsed = true;
                            }
                        }
                        // Update transaction with categorization
                        const updatedTransaction = Object.assign(Object.assign({}, transaction), { accountCode: accountCode || transaction.accountCode || '000', confidence: confidence, updatedAt: new Date() });
                        // Add to results
                        categorizedTransactions.push(updatedTransaction);
                        // Create categorization record
                        categorizations.push({
                            transactionId: transaction.id || '',
                            categoryCode: updatedTransaction.accountCode,
                            confidence,
                            source,
                            reasoning
                        });
                        successCount++;
                        confidenceSum += confidence;
                    }
                    catch (error) {
                        failedCount++;
                        this.logEvent('categorization_error', {
                            transactionId: transaction.id,
                            error: error.message
                        });
                    }
                }
                const processingTimeMs = Date.now() - startTime;
                this.logEvent('categorization_complete', {
                    success: successCount,
                    failed: failedCount,
                    processingTimeMs
                });
                return {
                    success: true,
                    data: {
                        categorizedTransactions,
                        categorizations,
                        successCount,
                        failedCount,
                        metrics: {
                            confidenceAvg: successCount > 0 ? confidenceSum / successCount : 0,
                            llmUsed,
                            processingTimeMs
                        }
                    }
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
    categorizeThroughLLM(transaction, chartOfAccounts) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Convert chart of accounts to a simplified format for the prompt
                const accountOptions = Object.entries(chartOfAccounts)
                    .map(([code, account]) => ({
                    code,
                    accountType: account.accountType,
                    parentAccount: account.parentAccount,
                    account: account.account,
                    description: account.description || ''
                }))
                    .slice(0, 30); // Limit to first 30 accounts to keep prompt size reasonable
                // Create the prompt
                const prompt = `
You are a financial categorization expert. Given the following transaction:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.amount}
- Type: ${transaction.type}

Please categorize this transaction into the most appropriate account code from the chart of accounts below.
Return a JSON response with the following structure:
{
  "accountCode": "string", // The code from the chart of accounts
  "confidence": 0.0-1.0, // Your confidence in this categorization
  "reasoning": "string" // Brief explanation of your reasoning
}

Chart of Accounts (excerpt):
${JSON.stringify(accountOptions, null, 2)}
`;
                const llmRequest = {
                    prompt,
                    temperature: 0.1, // Low temperature for more deterministic results
                    maxTokens: 500,
                    model: 'gpt-4' // Assuming this is the model we want to use
                };
                // Call LLM service
                const llmResponse = yield this.llmService.generateText(llmRequest);
                // Parse the response
                let parsedResponse;
                try {
                    // Extract JSON from the response (handle cases where there might be extra text)
                    const jsonMatch = llmResponse.text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsedResponse = JSON.parse(jsonMatch[0]);
                    }
                    else {
                        throw new Error('Could not extract JSON from LLM response');
                    }
                }
                catch (error) {
                    if (error instanceof Error) {
                        throw new Error(`Failed to parse LLM response: ${error.message}`);
                    }
                    throw new Error(`Failed to parse LLM response: ${String(error)}`);
                }
                // Validate the accountCode
                if (!parsedResponse.accountCode || !chartOfAccounts[parsedResponse.accountCode]) {
                    return { accountCode: null, confidence: 0 };
                }
                return {
                    accountCode: parsedResponse.accountCode,
                    confidence: Math.min(Math.max(parsedResponse.confidence, 0), 1), // Ensure between 0 and 1
                    reasoning: parsedResponse.reasoning
                };
            }
            catch (error) {
                this.logEvent('llm_categorization_error', { error: error.message });
                return { accountCode: null, confidence: 0 };
            }
        });
    }
}
exports.TransactionCategorizationAgent = TransactionCategorizationAgent;
