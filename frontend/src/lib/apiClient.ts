import axios from "axios";
import { AxiosError } from "axios";

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
  // const token = localStorage.getItem("accessToken");
  const token = process.env.NEXT_PUBLIC_ACCESS_TOKEN;
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
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
      error.response?.data?.message || 
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
        onUploadProgress: (progressEvent: ProgressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentage);
          }
        }
        }
      });

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

export default apiClient;