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
exports.CopilotChatAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const agent_1 = require("../types/agent");
class CopilotChatAgent extends baseAgent_1.BaseAgent {
    constructor(llmService, transactionService) {
        super(agent_1.AgentType.COPILOT_CHAT);
        this.llmService = llmService;
        this.transactionService = transactionService;
    }
    process(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                if (context) {
                    this.setContext(context);
                }
                this.logEvent('chat_request', {
                    userId: input.userId,
                    sessionId: input.sessionId,
                    messagePreview: input.message.substring(0, 50)
                });
                // Analyze the user message to determine intent
                const intent = yield this.analyzeIntent(input.message);
                let response = {
                    message: '',
                    insights: [],
                    actions: [],
                    referenceData: null
                };
                // Handle based on intent
                switch (intent.type) {
                    case 'transaction_query':
                        response = yield this.handleTransactionQuery(input);
                        break;
                    case 'insight_request':
                        response = yield this.handleInsightRequest(input);
                        break;
                    case 'general_question':
                        response = yield this.handleGeneralQuestion(input);
                        break;
                    default:
                        response = yield this.generateDefaultResponse(input);
                }
                this.logEvent('chat_response', {
                    intent: intent.type,
                    hasInsights: !!((_a = response.insights) === null || _a === void 0 ? void 0 : _a.length),
                    hasActions: !!((_b = response.actions) === null || _b === void 0 ? void 0 : _b.length)
                });
                return {
                    success: true,
                    data: response
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
    analyzeIntent(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Define intents to check for
                const intents = [
                    {
                        type: 'transaction_query',
                        patterns: [
                            'how much did i spend', 'my transactions', 'recent purchases',
                            'spending on', 'transactions in', 'how much have i'
                        ]
                    },
                    {
                        type: 'insight_request',
                        patterns: [
                            'insights', 'analyze my', 'what can you tell me about',
                            'patterns in', 'trends', 'suggestions', 'advice', 'improve'
                        ]
                    },
                    {
                        type: 'general_question',
                        patterns: [
                            'what is', 'how do', 'explain', 'define', 'difference between',
                            'should i', 'when should', 'why is'
                        ]
                    }
                ];
                // Normalize message
                const normalizedMessage = message.toLowerCase();
                // Check each intent
                for (const intent of intents) {
                    for (const pattern of intent.patterns) {
                        if (normalizedMessage.includes(pattern)) {
                            return { type: intent.type, confidence: 0.8 }; // Simple pattern matching for now
                        }
                    }
                }
                // Default to general question if no patterns match
                return { type: 'general_question', confidence: 0.5 };
            }
            catch (error) {
                console.error('Error analyzing intent:', error);
                return { type: 'general_question', confidence: 0.5 };
            }
        });
    }
    handleTransactionQuery(input) {
        return __awaiter(this, void 0, void 0, function* () {
            // Extract potential date ranges, categories, and amounts from the query
            const dateMatches = input.message.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|last month|this month|yesterday|today|last week|this week|last year|this year)/gi) || [];
            const categoryMatches = input.message.match(/(groceries|dining|restaurant|food|shopping|travel|entertainment|bills|utilities|rent|mortgage|salary|income)/gi) || [];
            // Fetch relevant transactions based on extracted entities
            // This is a simplified implementation - in a real app, we'd use more sophisticated NLP
            const filter = {
                userId: input.userId,
                limit: 10
            };
            if (dateMatches.length > 0) {
                // Very simplified date handling - in a real app, use a date parsing library
                if (input.message.includes('last month')) {
                    const now = new Date();
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    filter.startDate = lastMonth;
                    filter.endDate = endOfLastMonth;
                }
            }
            if (categoryMatches.length > 0) {
                // Very simplified category handling
                filter.search = categoryMatches[0]; // Just use the first match
            }
            try {
                const transactions = yield this.transactionService.getTransactions(filter);
                // Generate response with transaction summary
                const llmPrompt = `
You are a helpful financial assistant. The user asked: "${input.message}"

Here's a summary of the relevant transactions:
${transactions.map((t) => `- Date: ${t.date.toISOString().split('T')[0]}, Description: ${t.description}, Amount: $${t.amount.toFixed(2)}, Type: ${t.type}`).join('\n')}

Provide a helpful response that summarizes these transactions and answers the user's question.
Include specific numbers and insights when relevant.
`;
                const llmResponse = yield this.llmService.generateText({
                    prompt: llmPrompt,
                    temperature: 0.7,
                    maxTokens: 300
                });
                return {
                    message: llmResponse.text,
                    referenceData: {
                        transactions: transactions.map((t) => ({
                            id: t.id,
                            date: t.date,
                            description: t.description,
                            amount: t.amount,
                            type: t.type,
                            category: t.accountCode
                        }))
                    },
                    insights: [
                        {
                            type: 'transaction_summary',
                            content: `Found ${transactions.length} relevant transactions.`,
                            confidence: 1.0
                        }
                    ]
                };
            }
            catch (error) {
                console.error('Error handling transaction query:', error);
                return {
                    message: `I'm sorry, I encountered an error while retrieving your transaction information. Please try again or rephrase your question.`
                };
            }
        });
    }
    handleInsightRequest(input) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch recent transactions
                const transactions = yield this.transactionService.getTransactions({
                    userId: input.userId,
                    limit: 50 // Get more transactions for better insights
                });
                if (transactions.length === 0) {
                    return {
                        message: "I don't have enough transaction data to generate insights yet. Once you've imported some transactions, I can provide personalized insights about your finances."
                    };
                }
                // Generate insights based on transaction data
                // This is where you'd implement financial analysis logic
                // For this example, we'll use the LLM to generate insights
                const llmPrompt = `
You are a financial analyst assistant. The user asked: "${input.message}"

Here's a summary of their recent transactions:
${transactions.slice(0, 10).map((t) => `- Date: ${t.date.toISOString().split('T')[0]}, Description: ${t.description}, Amount: $${t.amount.toFixed(2)}, Type: ${t.type}`).join('\n')}
...and ${transactions.length - 10} more transactions.

Based on the transactions data, provide 3-5 specific, actionable financial insights and advice.
Format each insight as a separate bullet point.
Be specific and quantitative when possible.
`;
                const llmResponse = yield this.llmService.generateText({
                    prompt: llmPrompt,
                    temperature: 0.7,
                    maxTokens: 500
                });
                // Extract insights from the response
                const insightBullets = llmResponse.text
                    .split('\n')
                    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
                    .map(line => line.replace(/^[-•]\s*/, '').trim());
                return {
                    message: llmResponse.text,
                    insights: insightBullets.map((content, i) => ({
                        type: 'financial_insight',
                        content,
                        confidence: 0.8 - (i * 0.1) // Decreasing confidence for subsequent insights
                    })),
                    actions: [
                        {
                            type: 'view_detailed_analysis',
                            label: 'View Detailed Analysis',
                            payload: { userId: input.userId }
                        }
                    ]
                };
            }
            catch (error) {
                console.error('Error handling insight request:', error);
                return {
                    message: `I'm sorry, I encountered an error while analyzing your financial data. Please try again later.`
                };
            }
        });
    }
    handleGeneralQuestion(input) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // For general questions, we'll just use the LLM directly
                const systemPrompt = `
You are an AI financial advisor assistant. Your name is Financial Copilot.
- You help users understand financial concepts and make better financial decisions.
- Keep responses concise, practical, and easy to understand.
- Don't make up specific financial details about the user unless they were mentioned.
- When discussing investments, always include appropriate disclaimers about risks.
`;
                const llmRequest = {
                    prompt: input.message,
                    temperature: 0.7,
                    maxTokens: 500,
                    context: [
                        { role: 'system', content: systemPrompt },
                        ...((input.history || []).map(h => ({ role: h.role, content: h.content })))
                    ]
                };
                const llmResponse = yield this.llmService.generateText(llmRequest);
                return {
                    message: llmResponse.text
                };
            }
            catch (error) {
                console.error('Error handling general question:', error);
                return {
                    message: `I'm sorry, I encountered an error while processing your question. Please try again or rephrase your question.`
                };
            }
        });
    }
    generateDefaultResponse(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                message: `I'm here to help with your financial questions. You can ask me about your transactions, request insights about your spending, or ask general financial questions. How can I assist you today?`
            };
        });
    }
}
exports.CopilotChatAgent = CopilotChatAgent;
