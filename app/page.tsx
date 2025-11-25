'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import StatsCard from '@/components/StatsCard';

interface Stats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: Array<{ id: number; name: string; color: string; total: number }>;
  incomeByCategory: Array<{ id: number; name: string; color: string; total: number }>;
}

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense' | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<Stats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    expensesByCategory: [],
    incomeByCategory: [],
  });

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenForm = (type?: 'income' | 'expense') => {
    setFormType(type);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Finance Manager</h1>
          <p className="text-gray-600">Track your income and expenses day by day</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Income"
            value={stats.totalIncome}
            type="income"
          />
          <StatsCard
            title="Total Expenses"
            value={stats.totalExpenses}
            type="expense"
          />
          <StatsCard
            title="Balance"
            value={stats.balance}
            type="balance"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => handleOpenForm('income')}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium shadow-sm"
          >
            <Plus size={20} />
            Add Income
          </button>
          <button
            onClick={() => handleOpenForm('expense')}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium shadow-sm"
          >
            <Plus size={20} />
            Add Expense
          </button>
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={20} />
            Add Transaction
          </button>
        </div>

        {/* Category Breakdown */}
        {(stats.expensesByCategory.length > 0 || stats.incomeByCategory.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {stats.incomeByCategory.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Income by Category</h2>
                <div className="space-y-3">
                  {stats.incomeByCategory.map((category) => (
                    <div key={category.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-gray-700">{category.name}</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        ${category.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.expensesByCategory.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Expenses by Category</h2>
                <div className="space-y-3">
                  {stats.expensesByCategory.map((category) => (
                    <div key={category.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-gray-700">{category.name}</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        ${category.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Recent Transactions</h2>
          <TransactionList refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Transaction Form Modal */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormType(undefined);
        }}
        onSuccess={handleSuccess}
        initialType={formType}
      />
    </div>
  );
}

