"use client";

import React, { useState, useEffect } from "react";
import { getUploadedFiles, reprocessFile, deleteFile } from "../lib/apiClient";
import { toast } from "react-toastify";
import Link from "next/link";

interface FileRecord {
  id: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  status: string;
  createdAt: string;
  processedAt?: string;
}

interface ApiResponse {
  success: boolean;
  data: FileRecord[];
  message?: string;
}

const FileList: React.FC = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState<Record<string, boolean>>({});

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUploadedFiles() as ApiResponse;
      if (response.success) {
        setFiles(response.data);
      } else {
        setError(response.message || "Failed to fetch files");
      }
    } catch (err) {
      setError("An error occurred while fetching files");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();

    // Set up polling for files in pending/processing state
    const interval = setInterval(() => {
      // Only refetch if we have files in pending or processing state
      if (
        files.some(
          (file) => file.status === "pending" || file.status === "processing"
        )
      ) {
        fetchFiles();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [files]);

  const handleReprocess = async (fileId: string) => {
    try {
      setProcessingFiles((prev) => ({ ...prev, [fileId]: true }));
      const response = await reprocessFile(fileId) as ApiResponse;
      if (response.success) {
        toast.success("File reprocessing started");
        fetchFiles(); // Refresh the list
      } else {
        toast.error(response.message || "Failed to reprocess file");
      }
    } catch (err) {
      toast.error("An error occurred while reprocessing the file");
      console.error(err);
    } finally {
      setProcessingFiles((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleDelete = async (fileId: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        setProcessingFiles((prev) => ({ ...prev, [fileId]: true }));
        const response = await deleteFile(fileId) as ApiResponse;
        if (response.success) {
          toast.success("File deleted successfully");
          setFiles((prev) => prev.filter((file) => file.id !== fileId));
        } else {
          toast.error(response.message || "Failed to delete file");
        }
      } catch (err) {
        toast.error("An error occurred while deleting the file");
        console.error(err);
      } finally {
        setProcessingFiles((prev) => ({ ...prev, [fileId]: false }));
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) {
      return sizeInBytes + " B";
    } else if (sizeInBytes < 1024 * 1024) {
      return (sizeInBytes / 1024).toFixed(2) + " KB";
    } else {
      return (sizeInBytes / (1024 * 1024)).toFixed(2) + " MB";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No files have been uploaded yet.</p>
        <Link href="/ingestion/upload" className="text-blue-500 hover:underline mt-2 inline-block">
          Upload your first file
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              File Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Uploaded
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Processed
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {files.map((file) => (
            <tr key={file.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <Link href={`/ingestion/files/${file.id}`} className="text-blue-600 hover:text-blue-900">
                  {file.originalName}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatFileSize(file.fileSize)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {file.fileType.toUpperCase()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                    file.status
                  )}`}
                >
                  {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(file.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {file.processedAt ? formatDate(file.processedAt) : "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleReprocess(file.id)}
                    disabled={
                      file.status === "processing" ||
                      file.status === "pending" ||
                      processingFiles[file.id]
                    }
                    className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Reprocess
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={processingFiles[file.id]}
                    className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileList;