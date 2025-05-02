// frontend/src/components/TransactionList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { getTransactions } from "../lib/apiClient";
// import { toast } from "react-toastify";
import Link from "next/link";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  accountCode?: string;
  tags?: string[];
}

interface TransactionListProps {
  fileId?: string;
  limit?: number;
}

const TransactionList: React.FC<TransactionListProps> = ({ fileId, limit = 50 }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    search: "",
    type: "",
    startDate: "",
    endDate: "",
  });

  const fetchTransactions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params: Record<string, string> = {
        limit: limit.toString(),
      };
      
      if (fileId) {
        params.fileId = fileId;
      }
      
      if (filter.search) {
        params.search = filter.search;
      }
      
      if (filter.type) {
        params.type = filter.type;
      }
      
      if (filter.startDate) {
        params.startDate = filter.startDate;
      }
      
      if (filter.endDate) {
        params.endDate = filter.endDate;
      }
      
      const response = await getTransactions(params) as { success: boolean; data: Transaction[]; message?: string };
      
      if (response.success) {
        setTransactions(response.data);
      } else {
        setError(response.message || "Failed to fetch transactions");
      }
    } catch (err) {
      setError("An error occurred while fetching transactions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fileId, limit, filter]); // Add dependency array here
  // Fetch transactions when component mounts or when fileId, limit, or filter changes

  useEffect(() => {
    fetchTransactions();
  }, [fileId, limit, filter, fetchTransactions]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatAmount = (amount: number, type: string) => {
    return `${type === 'credit' ? '+' : '-'}$${amount.toFixed(2)}`;
  };

  const getAccountName = (accountCode?: string) => {
    // This should be replaced with a lookup to your Chart of Accounts
    return accountCode || "Uncategorized";
  };

  if (loading && transactions.length === 0) {
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

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No transactions found.</p>
        <Link href="/ingestion/upload" className="text-blue-500 hover:underline mt-2 inline-block">
          Upload financial data
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter form */}
      <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              id="search"
              name="search"
              value={filter.search}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Search description"
            />
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
            <select
              id="type"
              name="type"
              value={filter.type}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="">All Types</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filter.startDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filter.endDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Transactions table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(transaction.date)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {transaction.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getAccountName(transaction.accountCode)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                  transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatAmount(transaction.amount, transaction.type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/transactions/${transaction.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;