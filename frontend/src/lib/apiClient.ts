import axios, { AxiosError, AxiosRequestConfig, AxiosProgressEvent } from 'axios';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  // const token = process.env.NEXT_PUBLIC_ACCESS_TOKEN; // Use environment variable for token
  if (token) {
    if (config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      // If token expired or invalid, redirect to login
      if (typeof window !== 'undefined') {
        // Only clear token in browser environment
        localStorage.removeItem("accessToken");
        // Redirect to login page if we're in a browser context
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    // Generic error messaging
    const errorMessage = 
      (error.response?.data as { message?: string })?.message || 
      error.message || 
      'An error occurred';
    
    console.error('API Error:', errorMessage);
    
    return Promise.reject(error);
  }
);

// File upload function
export const uploadFile = async (file: File, onProgress?: (percentage: number) => void): Promise<unknown> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post(`/data-ingestion/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentage);
        }
      },
    } as AxiosRequestConfig);

    return response.data;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

// Get all uploaded files
export const getUploadedFiles = async (): Promise<unknown> => {
  try {
    const response = await apiClient.get('/data-ingestion/files');
    return response.data;
  } catch (error) {
    console.error("Error fetching files:", error);
    throw error;
  }
};

// Get file status
export const getFileStatus = async (fileId: string): Promise<unknown> => {
  try {
    const response = await apiClient.get(`/data-ingestion/files/${fileId}/status`);
    return response.data;
  } catch (error) {
    console.error("Error fetching file status:", error);
    throw error;
  }
};

// Reprocess a file
export const reprocessFile = async (fileId: string): Promise<unknown> => {
  try {
    const response = await apiClient.post(`/data-ingestion/files/${fileId}/reprocess`);
    return response.data;
  } catch (error) {
    console.error("Error reprocessing file:", error);
    throw error;
  }
};

// Delete a file
export const deleteFile = async (fileId: string): Promise<unknown> => {
  try {
    const response = await apiClient.delete(`/data-ingestion/files/${fileId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

// frontend/src/lib/apiClient.ts
// Add these methods to your existing apiClient

// Get transactions
export const getTransactions = async (params?: Record<string, string>): Promise<unknown> => {
  try {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const response = await apiClient.get(`/transactions${queryString ? `?${queryString}` : ''}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
};

// Get transaction by ID
export const getTransaction = async (id: string): Promise<unknown> => {
  try {
    const response = await apiClient.get(`/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching transaction:", error);
    throw error;
  }
};

// Create transaction
export const createTransaction = async (data: unknown): Promise<unknown> => {
  try {
    const response = await apiClient.post(`/transactions`, data);
    return response.data;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
};

// Update transaction
export const updateTransaction = async (id: string, data: unknown): Promise<unknown> => {
  try {
    const response = await apiClient.put(`/transactions/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }
};

// Delete transaction
export const deleteTransaction = async (id: string): Promise<unknown> => {
  try {
    const response = await apiClient.delete(`/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

// Categorize transactions
export const categorizeTransactions = async (transactionIds: string[], accountCode: string): Promise<unknown> => {
  try {
    const response = await apiClient.post(`/transactions/categorize`, {
      transactionIds,
      accountCode,
    });
    return response.data;
  } catch (error) {
    console.error("Error categorizing transactions:", error);
    throw error;
  }
};

export default apiClient;