"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const mockData = {
  transactions: {
    total: 147,
    uncategorized: 23,
    recent: [
      { id: "t1", date: "2025-04-27", description: "Grocery Store", amount: 78.45, type: "debit", accountCode: "231" },
      { id: "t2", date: "2025-04-26", description: "Salary Deposit", amount: 2750.00, type: "credit", accountCode: "111" },
      { id: "t3", date: "2025-04-25", description: "Restaurant Payment", amount: 55.20, type: "debit", accountCode: "272" },
    ]
  },
  files: {
    total: 4,
    processing: 1,
    recent: [
      { id: "f1", name: "April_Bank_Statement.pdf", status: "completed", date: "2025-04-28" },
      { id: "f2", name: "Credit_Card_April.csv", status: "processing", date: "2025-04-28" },
    ]
  },
  spending: [
    { category: "Groceries", amount: 450 },
    { category: "Dining", amount: 320 },
    { category: "Utilities", amount: 280 },
    { category: "Transport", amount: 150 },
    { category: "Entertainment", amount: 200 },
  ]
};

// To be replaced with actual API calls in the future
interface DashboardData {
  transactions: {
    total: number;
    uncategorized: number;
    recent: { id: string; date: string; description: string; amount: number; type: string; accountCode: string }[];
  };
  files: {
    total: number;
    processing: number;
    recent: { id: string; name: string; status: string; date: string }[];
  };
  spending: { category: string; amount: number }[];
}

const loadDashboardData = (): Promise<DashboardData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockData);
    }, 500);
  });
};

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  interface DashboardData {
    transactions: {
      total: number;
      uncategorized: number;
      recent: { id: string; date: string; description: string; amount: number; type: string; accountCode: string }[];
    };
    files: {
      total: number;
      processing: number;
      recent: { id: string; name: string; status: string; date: string }[];
    };
    spending: { category: string; amount: number }[];
  }
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await loadDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your AI Financial Copilot</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/ingestion/upload" className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center h-32">
          <div className="bg-blue-100 p-2 rounded-full mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="font-semibold">Upload Files</h3>
          <p className="text-sm text-gray-500">Add new financial data</p>
        </Link>

        <Link href="/transactions" className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center h-32">
          <div className="bg-green-100 p-2 rounded-full mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold">View Transactions</h3>
          <p className="text-sm text-gray-500">Manage your financial activity</p>
        </Link>

        <Link href="/copilot" className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center h-32">
          <div className="bg-purple-100 p-2 rounded-full mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="font-semibold">Ask Copilot</h3>
          <p className="text-sm text-gray-500">Get AI-powered insights</p>
        </Link>

        <Link href="/insights" className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center h-32">
          <div className="bg-yellow-100 p-2 rounded-full mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold">Financial Insights</h3>
          <p className="text-sm text-gray-500">Discover patterns and trends</p>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-2">Transactions</h3>
          <div className="flex justify-between items-baseline">
            <p className="text-3xl font-semibold text-gray-900">{dashboardData?.transactions?.total ?? 0}</p>
            <Link href="/transactions?filter=uncategorized" className="text-sm text-blue-600 hover:text-blue-800">
              {dashboardData?.transactions?.uncategorized ?? 0} uncategorized
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-2">Uploaded Files</h3>
          <div className="flex justify-between items-baseline">
            <p className="text-3xl font-semibold text-gray-900">{dashboardData?.files?.total ?? 0}</p>
            <Link href="/ingestion/files" className="text-sm text-blue-600 hover:text-blue-800">
              {dashboardData?.files?.processing ?? 0} processing
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-2">Accounts</h3>
          <div className="flex justify-between items-baseline">
            <p className="text-3xl font-semibold text-gray-900">3</p>
            <Link href="/accounts" className="text-sm text-blue-600 hover:text-blue-800">
              View all
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions Section */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="p-6">
            {dashboardData?.transactions?.recent?.length ?? 0 > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboardData?.transactions?.recent?.map((transaction: { id: string; date: string; description: string; amount: number; type: string; accountCode: string }) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.description}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent transactions available.</p>
                <Link href="/ingestion/upload" className="text-blue-600 hover:underline mt-2 inline-block">
                  Upload financial data
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Spending Chart Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">Spending by Category</h2>
          </div>
          <div className="p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboardData?.spending || []}
                margin={{ top: 5, right: 5, bottom: 20, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                <Bar dataKey="amount" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Files Section */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Recent Files</h2>
          <Link href="/ingestion/files" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="p-6">
          {dashboardData?.files?.recent?.length ?? 0 > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dashboardData?.files?.recent?.map((file: { id: string; name: string; status: string; date: string }) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link href={`/ingestion/files/${file.id}`} className="text-blue-600 hover:text-blue-900">
                          {file.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(file.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          file.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          file.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No files have been uploaded yet.</p>
              <Link href="/ingestion/upload" className="text-blue-600 hover:underline mt-2 inline-block">
                Upload your first file
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
