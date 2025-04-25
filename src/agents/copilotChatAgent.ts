import { BaseAgent } from './baseAgent';
import { AgentType, AgentContext, AgentResult, LLMRequest } from '../types/agent';
import { LLMService } from '../services/llmService';
import { TransactionService } from '../services/transactionService';

export interface ChatInput {
  userId: string;
  message: string;
  sessionId?: string;
  history?: Array<{ role: 'user' | 'assistant', content: string }>;
}

export interface ChatResponse {
  message: string;
  insights?: Array<{
    type: string;
    content: string;
    confidence: number;
  }>;
  actions?: Array<{
    type: string;
    label: string;
    payload: any;
  }>;
  referenceData?: any;
}

export class CopilotChatAgent extends BaseAgent {
  private llmService: LLMService;
  private transactionService: TransactionService;
  
  constructor(llmService: LLMService, transactionService: TransactionService) {
    super(AgentType.COPILOT_CHAT);
    this.llmService = llmService;
    this.transactionService = transactionService;
  }
  
  async process<T>(
    input: ChatInput, 
    context?: AgentContext
  ): Promise<AgentResult<T>> {
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
      const intent = await this.analyzeIntent(input.message);
      
      let response: ChatResponse = {
        message: '',
        insights: [],
        actions: [],
        referenceData: null
      };
      
      // Handle based on intent
      switch (intent.type) {
        case 'transaction_query':
          response = await this.handleTransactionQuery(input);
          break;
        
        case 'insight_request':
          response = await this.handleInsightRequest(input);
          break;
        
        case 'general_question':
          response = await this.handleGeneralQuestion(input);
          break;
        
        default:
          response = await this.generateDefaultResponse(input);
      }
      
      this.logEvent('chat_response', {
        intent: intent.type,
        hasInsights: !!response.insights?.length,
        hasActions: !!response.actions?.length
      });
      
      return {
        success: true,
        data: response as unknown as T
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return this.handleError(error);
      }
      return this.handleError(new Error(String(error)));
    }
  }
  
  private async analyzeIntent(message: string): Promise<{ type: string; confidence: number; entities?: any[] }> {
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
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return { type: 'general_question', confidence: 0.5 };
    }
  }
  
  private async handleTransactionQuery(input: ChatInput): Promise<ChatResponse> {
    // Extract potential date ranges, categories, and amounts from the query
    const dateMatches = input.message.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|last month|this month|yesterday|today|last week|this week|last year|this year)/gi) || [];
    const categoryMatches = input.message.match(/(groceries|dining|restaurant|food|shopping|travel|entertainment|bills|utilities|rent|mortgage|salary|income)/gi) || [];
    
    // Fetch relevant transactions based on extracted entities
    // This is a simplified implementation - in a real app, we'd use more sophisticated NLP
    const filter: any = {
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
      const transactions = await this.transactionService.getTransactions(filter);
      
      // Generate response with transaction summary
      const llmPrompt = `
You are a helpful financial assistant. The user asked: "${input.message}"

Here's a summary of the relevant transactions:
${transactions.map((t: any) => 
  `- Date: ${t.date.toISOString().split('T')[0]}, Description: ${t.description}, Amount: $${t.amount.toFixed(2)}, Type: ${t.type}`
).join('\n')}

Provide a helpful response that summarizes these transactions and answers the user's question.
Include specific numbers and insights when relevant.
`;
      
      const llmResponse = await this.llmService.generateText({
        prompt: llmPrompt,
        temperature: 0.7,
        maxTokens: 300
      });
      
      return {
        message: llmResponse.text,
        referenceData: {
          transactions: transactions.map((t: any) => ({
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
    } catch (error) {
      console.error('Error handling transaction query:', error);
      return {
        message: `I'm sorry, I encountered an error while retrieving your transaction information. Please try again or rephrase your question.`
      };
    }
  }
  
  private async handleInsightRequest(input: ChatInput): Promise<ChatResponse> {
    try {
      // Fetch recent transactions
      const transactions = await this.transactionService.getTransactions({
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
${transactions.slice(0, 10).map((t: any) => 
  `- Date: ${t.date.toISOString().split('T')[0]}, Description: ${t.description}, Amount: $${t.amount.toFixed(2)}, Type: ${t.type}`
).join('\n')}
...and ${transactions.length - 10} more transactions.

Based on the transactions data, provide 3-5 specific, actionable financial insights and advice.
Format each insight as a separate bullet point.
Be specific and quantitative when possible.
`;
      
      const llmResponse = await this.llmService.generateText({
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
    } catch (error) {
      console.error('Error handling insight request:', error);
      return {
        message: `I'm sorry, I encountered an error while analyzing your financial data. Please try again later.`
      };
    }
  }
  
  private async handleGeneralQuestion(input: ChatInput): Promise<ChatResponse> {
    try {
      // For general questions, we'll just use the LLM directly
      const systemPrompt = `
You are an AI financial advisor assistant. Your name is Financial Copilot.
- You help users understand financial concepts and make better financial decisions.
- Keep responses concise, practical, and easy to understand.
- Don't make up specific financial details about the user unless they were mentioned.
- When discussing investments, always include appropriate disclaimers about risks.
`;
      
      const llmRequest: LLMRequest = {
        prompt: input.message,
        temperature: 0.7,
        maxTokens: 500,
        context: [
          { role: 'system', content: systemPrompt },
          ...((input.history || []).map(h => ({ role: h.role, content: h.content })))
        ]
      };
      
      const llmResponse = await this.llmService.generateText(llmRequest);
      
      return {
        message: llmResponse.text
      };
    } catch (error) {
      console.error('Error handling general question:', error);
      return {
        message: `I'm sorry, I encountered an error while processing your question. Please try again or rephrase your question.`
      };
    }
  }
  
  private async generateDefaultResponse(input: ChatInput): Promise<ChatResponse> {
    return {
      message: `I'm here to help with your financial questions. You can ask me about your transactions, request insights about your spending, or ask general financial questions. How can I assist you today?`
    };
  }
}