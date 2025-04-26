// frontend/src/app/ingestion/upload/page.tsx

import React from "react";
import FileUploader from "../../../components/FileUploader";

const UploadPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Upload Financial Statements
        </h1>
        <FileUploader />
      </div>
    </div>
  );
};

export default UploadPage;
