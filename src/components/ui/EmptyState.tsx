// ============================================================================
// Context: Shop Manager MVP - Empty State Component
// ============================================================================
import React from 'react';
import { classNames } from '@/lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ 
  icon = '📦',
  title, 
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={classNames('p-8 text-center', className)}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 mb-6">
          {description}
        </p>
      )}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
} 