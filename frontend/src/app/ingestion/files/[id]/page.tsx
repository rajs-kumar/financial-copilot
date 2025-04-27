import React from "react";
import FileDetail from "../../../../components/FileDetail";
import Link from "next/link";

interface FileDetailPageProps {
  params: {
    id: string;
  };
}

const FileDetailPage = ({ params }: FileDetailPageProps) => {
  const { id } = params;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/ingestion/files"
          className="text-blue-600 hover:text-blue-900 mb-4 inline-block"
        >
          &larr; Back to Files
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">File Details</h1>
      </div>

      <FileDetail fileId={id} />
    </div>
  );
};

export default FileDetailPage;