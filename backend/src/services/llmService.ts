import { LLMRequest, LLMResponse } from '../types/agent';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class LLMService {
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;
  
  constructor() {
    this.apiKey = process.env.AI_API_KEY || '';
    this.apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1';
    this.defaultModel = 'gpt-4';
    
    if (!this.apiKey) {
      console.warn('LLM API key not set. LLM functionality will not work.');
    }
  }
  
  async generateText(request: LLMRequest): Promise<LLMResponse> {
    try {
      const { prompt, temperature = 0.7, maxTokens = 500, context = [], model = this.defaultModel } = request;
      
      // If this is an OpenAI API call
      if (this.apiUrl.includes('openai')) {
        const messages = [];
        
        // Add context messages if provided
        if (context && context.length > 0) {
          messages.push(...context);
        }
        
        // Add the user prompt if not in context
        if (!context.some(msg => msg.role === 'user' && msg.content === prompt)) {
          messages.push({ role: 'user', content: prompt });
        }
        
        const response = await axios.post(
          `${this.apiUrl}/chat/completions`,
          {
            model,
            messages,
            temperature,
            max_tokens: maxTokens
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );
        
        return {
          text: response.data.choices[0].message.content,
          usage: {
            promptTokens: response.data.usage.prompt_tokens,
            completionTokens: response.data.usage.completion_tokens,
            totalTokens: response.data.usage.total_tokens
          }
        };
      } 
      else {
        // Fallback to a simple mock if API key not set or different API
        console.warn('Using mock LLM response - set up proper API integration for production');
        return this.generateMockResponse(prompt);
      }
    } catch (error) {
      console.error('Error calling LLM API:', error);
      
      // For development, return a mock response on error
      if (process.env.NODE_ENV === 'development') {
        return this.generateMockResponse(request.prompt);
      }
      
      throw new Error(`LLM API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private generateMockResponse(prompt: string): LLMResponse {
    // Simple mock response for development/testing
    return {
      text: `This is a mock LLM response for development purposes. In production, this would be a real response to: "${prompt.substring(0, 50)}..."`,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      },
      metadata: {
        isMock: true
      }
    };
  }
  
  // Method to generate embeddings for vector search
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      if (!this.apiKey) {
        console.warn('API key not set. Returning mock embeddings.');
        return this.generateMockEmbeddings();
      }
      
      // Call embedding API - this example uses OpenAI
      const response = await axios.post(
        `${this.apiUrl}/embeddings`,
        {
          model: 'text-embedding-ada-002',
          input: text
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      
      // For development, return mock embeddings
      if (process.env.NODE_ENV === 'development') {
        return this.generateMockEmbeddings();
      }
      
      throw new Error(`Embedding generation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private generateMockEmbeddings(): number[] {
    // Generate random embeddings for development/testing
    const dimension = 384; // Standard dimension for many embedding models
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
  }
}