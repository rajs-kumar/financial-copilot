// frontend/src/app/ingestion/upload/page.tsx

// frontend/src/app/ingestion/upload/page.tsx

import React from "react";
import DragDropUploader from "../../../components/DragDropUploader";
import Link from "next/link";

const UploadPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Upload Financial Statements
          </h1>
          <p className="text-gray-600 mt-2">
            Upload CSV files or bank statements in PDF format
          </p>
        </div>
        
        <DragDropUploader />
        
        <div className="mt-4 text-center">
          <Link 
            href="/ingestion/files" 
            className="text-sm text-blue-600 hover:text-blue-900"
          >
            View uploaded files
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
