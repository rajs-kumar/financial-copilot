// frontend/src/app/transactions/page.tsx
"use client";

import React, { Suspense } from "react";
import TransactionsClient from "./TransactionsClient";
import Link from "next/link";

const TransactionsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex space-x-2">
          <Link
            href="/transactions/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Transaction
          </Link>
          <Link
            href="/transactions/import"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Import
          </Link>
        </div>
      </div>

      <Suspense fallback={<div>Loading transactions...</div>}>
        <TransactionsClient />
      </Suspense>
    </div>
  );
};

export default TransactionsPage;