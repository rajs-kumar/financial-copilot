// filepath: backend/src/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface FileStatus {
  id: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}