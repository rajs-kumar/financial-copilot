export enum AgentType {
  DATA_INGESTION = 'data_ingestion',
  TRANSACTION_CATEGORIZATION = 'transaction_categorization',
  MONITORING = 'monitoring',
  COPILOT_CHAT = 'copilot_chat'
}

export interface AgentMessage {
  id: string;
  type: string;
  payload: any;
  source: AgentType;
  target: AgentType | 'all';
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface AgentContext {
  userId: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  context?: Array<{ role: 'system' | 'user' | 'assistant', content: string }>;
  model?: string;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface AgentObservation {
  type: string;
  content: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface AgentAction {
  type: string;
  parameters: Record<string, any>;
  reasoning?: string;
}