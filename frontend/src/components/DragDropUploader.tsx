"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { uploadFile } from '../lib/apiClient'; // Assuming this is the correct path

interface UploadResponse {
    success: boolean;
    data?: {
        fileId?: string;
    };
    message?: string;
}

const DragDropUploader: React.FC<object> = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Maximum file size: 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const ACCEPTED_FILE_TYPES = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'application/pdf'
    ];

    const validateFile = (file: File): boolean => {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            setFileError(`File is too large. Maximum size is 10MB.`);
            return false;
        }

        // Check file type
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
            setFileError(`Only CSV and PDF files are accepted.`);
            return false;
        }

        setFileError(null);
        return true;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            if (validateFile(selectedFile)) {
                setFile(selectedFile);
            } else {
                e.target.value = '';
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (validateFile(droppedFile)) {
                setFile(droppedFile);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file first.");
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const result = await uploadFile(file, (progress) => {
                setUploadProgress(progress);
            }) as UploadResponse;

            toast.success("File uploaded successfully!");
            // setFile(null);
            // setUploadProgress(0);

            // Navigate to the file details page if available, otherwise go to files list
            if (result.data && result.data.fileId) {
                router.push(`/ingestion/files/${result.data.fileId}`);
            } else {
                router.push('/ingestion/files');
            }
        } catch (error) {
            console.error(error);
            toast.error("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const cancelUpload = () => {
        setFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Drag & Drop Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                    }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileInput}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,.pdf"
                    className="hidden"
                />

                <div className="flex flex-col items-center justify-center py-4">
                    <svg
                        className="w-12 h-12 text-gray-400 mb-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                    <p className="text-lg font-medium text-gray-700">
                        {file ? file.name : "Drag & drop a file here, or click to browse"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Supports CSV and PDF files (max 10MB)
                    </p>
                </div>
            </div>

            {/* Error message */}
            {fileError && (
                <div className="text-red-500 text-sm mt-2">{fileError}</div>
            )}

            {/* File Selected Preview */}
            {file && !uploading && (
                <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center">
                        <svg
                            className="w-6 h-6 text-gray-500 mr-3"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <div>
                            <p className="font-medium text-gray-800">{file.name}</p>
                            <p className="text-sm text-gray-500">
                                {(file.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            cancelUpload();
                        }}
                        className="text-red-500 hover:text-red-700"
                    >
                        <svg
                            className="w-5 h-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            )}

            {/* Upload Progress */}
            {uploading && (
                <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {uploading ? "Uploading..." : "Upload File"}
            </button>
        </div>
    );
};

export default DragDropUploader;