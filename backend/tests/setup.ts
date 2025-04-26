import dotenv from 'dotenv';

// Load environment variables from .env.test if it exists
dotenv.config({ path: '.env.test' });

// Set environment to test
process.env.NODE_ENV = 'test';

// Setup a test database connection if needed
// This could be an in-memory database or a test-specific PostgreSQL database
process.env.DB_NAME = process.env.TEST_DB_NAME || 'financial_copilot_test';

// Mock any external services as needed
jest.mock('../src/services/llmService', () => {
  return {
    LLMService: jest.fn().mockImplementation(() => ({
      generateText: jest.fn().mockResolvedValue({
        text: 'This is a mock LLM response for testing.',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      }),
      generateEmbeddings: jest.fn().mockResolvedValue(Array(384).fill(0.1))
    }))
  };
});

// Global setup before all tests
beforeAll(async () => {
  // Setup any test fixtures or database connections
  // For now, we'll just log that tests are starting
  console.log('Starting tests...');
});

// Global teardown after all tests
afterAll(async () => {
  // Clean up any resources
  console.log('Tests complete.');
});