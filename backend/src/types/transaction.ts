export interface Transaction {
  id?: string;
  userId: string;
  fileId?: string; // Optional, for file-specific transactions
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  accountCode: string;
  category?: string;
  confidence?: number;
  isRecurring?: boolean;
  tags?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  categorizations?: TransactionCategorization[];
}

export interface TransactionCategory {
  code: string;
  name: string;
  parent?: string;
  type: string; // e.g., 'expense', 'income', 'asset', 'liability'
}

export interface TransactionCategorization {
  id: string;
  transactionId: string;
  categoryCode: string;
  confidence: number;
  source: 'rule' | 'llm' | 'user' | 'system';
  reasoning?: string;
  createdAt: Date;
}

export interface TransactionAnalytics {
  transactionId: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  similarTransactions?: string[]; // Array of similar transaction IDs
  anomalyScore?: number; // 0-1 score, higher means more anomalous
  insights?: string[]; // Array of insight strings
}

export interface TransactionFilter {
  fileId: any;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  type?: 'debit' | 'credit';
  accountCode?: string;
  category?: string;
  isRecurring?: boolean;
  search?: string; // For searching in description
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}