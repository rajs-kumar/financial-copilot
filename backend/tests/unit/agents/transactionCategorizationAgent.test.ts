// Create a new file: backend/tests/unit/agents/transactionCategorizationAgent.test.ts
import { TransactionCategorizationAgent } from '../../../src/agents/transactionCategorizationAgent';
import { LLMService } from '../../../src/services/llmService';
import { Transaction } from '../../../src/types/transaction';

interface ProcessResponse {
  success: boolean;
  data: {
    categorizedTransactions: Array<Transaction & { confidence: number }>;
  };
}

// Mock the LLM service
jest.mock('../../../src/services/llmService');

describe('TransactionCategorizationAgent', () => {
  let agent: TransactionCategorizationAgent;
  let mockLLMService: jest.Mocked<LLMService>;
  
  beforeEach(() => {
    // Setup mocks
    mockLLMService = new LLMService() as jest.Mocked<LLMService>;
    mockLLMService.generateText = jest.fn();
    
    // Create agent with mock
    agent = new TransactionCategorizationAgent(mockLLMService);
  });
  
  test('should categorize transactions', async () => {
    // Mock LLM response
    mockLLMService.generateText.mockResolvedValue({
      text: '{"accountCode": "272", "confidence": 0.85, "reasoning": "This is dining out"}',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    });
    
    // Sample transaction
    const transaction: Transaction = {
      id: 'test-id',
      userId: 'user-id',
      amount: 45.67,
      type: 'debit' as 'debit' | 'credit',
      accountCode: '',  // Adding required accountCode property
      date: new Date(),
      description: 'Test transaction'
    };
    
    // Process with agent
    const result = await agent.process({
      transactions: [transaction],
      userId: 'user-id',
      useLLM: true
    }) as ProcessResponse;
    
    // Expectations
    expect(result.success).toBe(true);
    expect(result.data.categorizedTransactions.length).toBe(1);
    expect(result.data.categorizedTransactions[0].accountCode).toBe('272');
    expect(result.data.categorizedTransactions[0].confidence).toBeCloseTo(0.85);
  });
});

function beforeEach(arg0: () => void) {
  throw new Error('Function not implemented.');
}
function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toBeCloseTo: (expected: number) => {
      const diff = Math.abs(value - expected);
      if (diff > 0.01) {
        throw new Error(`Expected ${value} to be close to ${expected}`);
      }
    }
  };
}

