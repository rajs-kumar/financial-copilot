"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getFileStatus, reprocessFile, deleteFile } from "../lib/apiClient";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FileDetailProps {
  fileId: string;
}

interface FileStatus {
  id: string;
  status: string;
  processedAt?: string;
  transactionCount?: number;
  error?: string;
}

const FileDetail: React.FC<FileDetailProps> = ({ fileId }) => {
  const [fileStatus, setFileStatus] = useState<FileStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const router = useRouter();

  const fetchFileStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFileStatus(fileId) as { success: boolean; data?: FileStatus; message?: string };
      if (response.success) {
        setFileStatus(response.data || null);
      } else {
        setError(response.message || "Failed to fetch file status");
      }
    } catch (err) {
      setError("An error occurred while fetching file status");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchFileStatus();

    // Set up polling for files in pending/processing state
    const interval = setInterval(() => {
      if (fileStatus?.status === "pending" || fileStatus?.status === "processing") {
        fetchFileStatus();
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [fileId, fileStatus?.status, fetchFileStatus]);

  const handleReprocess = async () => {
    try {
      setProcessing(true);
      const response = await reprocessFile(fileId) as { success: boolean; message?: string };
      if (response.success) {
        toast.success("File reprocessing started");
        fetchFileStatus(); // Refresh the status
      } else {
        toast.error(response.message || "Failed to reprocess file");
      }
    } catch (err) {
      toast.error("An error occurred while reprocessing the file");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        setProcessing(true);
        const response = await deleteFile(fileId) as { success: boolean; message?: string };
        if (response.success) {
          toast.success("File deleted successfully");
          router.push("/ingestion/files"); // Navigate back to file list
        } else {
          toast.error(response.message || "Failed to delete file");
        }
      } catch (err) {
        toast.error("An error occurred while deleting the file");
        console.error(err);
      } finally {
        setProcessing(false);
      }
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

  if (loading) {
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

  if (!fileStatus) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>File not found.</p>
        <Link href="/ingestion/files" className="text-blue-500 hover:underline mt-2 inline-block">
          Back to file list
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">File Details</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleReprocess}
            disabled={
              fileStatus.status === "processing" ||
              fileStatus.status === "pending" ||
              processing
            }
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            {processing ? "Processing..." : "Reprocess"}
          </button>
          <button
            onClick={handleDelete}
            disabled={processing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span
                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                  fileStatus.status
                )}`}
              >
                {fileStatus.status.charAt(0).toUpperCase() + fileStatus.status.slice(1)}
              </span>
              {fileStatus.status === "processing" && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                </div>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">File ID</dt>
            <dd className="mt-1 text-sm text-gray-900 overflow-auto">{fileStatus.id}</dd>
          </div>

          {fileStatus.processedAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Processed At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(fileStatus.processedAt).toLocaleString()}
              </dd>
            </div>
          )}

          {fileStatus.transactionCount !== undefined && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Transactions</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {fileStatus.transactionCount > 0 ? (
                  <Link
                    href={`/transactions?fileId=${fileId}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {fileStatus.transactionCount} transactions
                  </Link>
                ) : (
                  "No transactions found"
                )}
              </dd>
            </div>
          )}

          {fileStatus.error && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Error</dt>
              <dd className="mt-1 text-sm text-red-600 bg-red-50 p-3 rounded">
                {fileStatus.error}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <Link 
          href="/ingestion/files" 
          className="text-sm text-blue-600 hover:text-blue-900"
        >
          &larr; Back to file list
        </Link>
      </div>
    </div>
  );
};

export default FileDetail;