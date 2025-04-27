// /src/app/ingestion/layout.tsx

import React from "react";

const IngestionLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4">
        <h1 className="text-lg font-bold">Ingestion Section</h1>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
};

export default IngestionLayout;
