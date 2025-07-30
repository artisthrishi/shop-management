// ============================================================================
// Context: Shop Manager MVP - Stats Card Component
// ============================================================================
import React from 'react';
import { classNames } from '@/lib/utils';
import Card from './Card';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'green' | 'blue' | 'purple' | 'red' | 'yellow' | 'gray';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle,
  color = 'gray',
  icon,
  onClick,
  className = ''
}: StatsCardProps) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600',
  };

  return (
    <Card 
      className={classNames('p-4', className)}
      onClick={onClick}
      hover={!!onClick}
    >
      <div className="flex flex-col items-center text-center">
        {icon && (
          <div className="mb-2">
            {icon}
          </div>
        )}
        <span className="text-sm text-gray-500 mb-1">{title}</span>
        <span className={classNames('text-2xl font-bold', colorClasses[color])}>
          {value}
        </span>
        {subtitle && (
          <span className="text-xs text-gray-500 mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </Card>
  );
} 