// frontend/src/app/transactions/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTransaction, updateTransaction, deleteTransaction } from "../../../lib/apiClient";
import { toast } from "react-toastify";
import Link from "next/link";
import { useParams } from 'next/navigation';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  accountCode?: string;
  tags?: string[];
  notes?: string;
}

interface ApiResponse {
  success: boolean;
  data: Transaction;
  message?: string;
}

const TransactionDetailPage = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({});

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getTransaction(id) as ApiResponse;
        if (response.success) {
          setTransaction(response.data);
          setFormData(response.data);
        } else {
          setError(response.message || "Failed to fetch transaction");
        }
      } catch (err) {
        setError("An error occurred while fetching the transaction");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await updateTransaction(id, formData) as ApiResponse;
      
      if (response.success) {
        setTransaction(response.data);
        setIsEditing(false);
        toast.success("Transaction updated successfully");
      } else {
        toast.error(response.message || "Failed to update transaction");
      }
    } catch (err) {
      toast.error("An error occurred while updating the transaction");
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      try {
        const response = await deleteTransaction(id) as ApiResponse;
        
        if (response.success) {
          toast.success("Transaction deleted successfully");
          router.push("/transactions");
        } else {
          toast.error(response.message || "Failed to delete transaction");
        }
      } catch (err) {
        toast.error("An error occurred while deleting the transaction");
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong> 
          <span className="block sm:inline">{error || "Transaction not found"}</span>
        </div>
        <div className="mt-4">
          <Link href="/transactions" className="text-blue-600 hover:text-blue-900">
            &larr; Back to Transactions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/transactions" className="text-blue-600 hover:text-blue-900">
          &larr; Back to Transactions
        </Link>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Transaction Details
          </h3>
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData(transaction);
                }}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="border-t border-gray-200">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <div className="mt-1">
                    <input
                      type="date"
                      name="date"
                      id="date"
                      required
                      value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <div className="mt-1">
                    <select
                      id="type"
                      name="type"
                      required
                      value={formData.type || ''}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="description"
                      id="description"
                      required
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      required
                      step="0.01"
                      min="0"
                      value={formData.amount || ''}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="accountCode" className="block text-sm font-medium text-gray-700">
                    Category Code
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="accountCode"
                      id="accountCode"
                      value={formData.accountCode || ''}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                    Tags (comma separated)
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="tags"
                      id="tags"
                      value={formData.tags ? formData.tags.join(', ') : ''}
                      onChange={(e) => {
                        const tagsString = e.target.value;
                        const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
                        setFormData({
                          ...formData,
                          tags: tagsArray,
                        });
                      }}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      value={formData.notes || ''}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        ) : (
          <dl className="border-t border-gray-200">
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{transaction.description}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                  {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </span>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(transaction.date).toLocaleDateString()}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {transaction.accountCode || 'Uncategorized'}
              </dd>
            </div>
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Tags</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {transaction.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
            {transaction.notes && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{transaction.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
};

export default TransactionDetailPage;