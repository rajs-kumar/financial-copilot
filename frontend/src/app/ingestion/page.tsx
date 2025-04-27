// /src/app/ingestion/page.tsx

import React from "react";
import Link from "next/link";

const IngestionHomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">Ingestion Dashboard</h1>
      <p className="mb-6 text-gray-700 text-center">
        Welcome to the Ingestion section. You can upload financial files and track their processing status.
      </p>
      <Link href="/ingestion/upload">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded">
          Upload a New File
        </button>
      </Link>
    </div>
  );
};

export default IngestionHomePage;
