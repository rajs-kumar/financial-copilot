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
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env.test if it exists
dotenv_1.default.config({ path: '.env.test' });
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
beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
    // Setup any test fixtures or database connections
    // For now, we'll just log that tests are starting
    console.log('Starting tests...');
}));
// Global teardown after all tests
afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
    // Clean up any resources
    console.log('Tests complete.');
}));
