'use client';

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  type: 'income' | 'expense' | 'balance';
  icon?: React.ReactNode;
}

export default function StatsCard({ title, value, type, icon }: StatsCardProps) {
  const getColorClasses = () => {
    switch (type) {
      case 'income':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'expense':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'balance':
        return value >= 0
          ? 'bg-blue-50 border-blue-200 text-blue-700'
          : 'bg-orange-50 border-orange-200 text-orange-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'income':
        return <TrendingUp size={24} />;
      case 'expense':
        return <TrendingDown size={24} />;
      case 'balance':
        return <Wallet size={24} />;
      default:
        return null;
    }
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getColorClasses()}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium opacity-80">{title}</h3>
        {getIcon()}
      </div>
      <p className="text-3xl font-bold">
        ${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

