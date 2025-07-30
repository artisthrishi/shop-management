// ============================================================================
// Context: Shop Manager MVP - Loading Component
// ============================================================================
import React from 'react';
import { classNames } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton';
  className?: string;
  children?: React.ReactNode;
}

export default function Loading({ 
  size = 'md', 
  variant = 'spinner',
  className = '',
  children
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  if (variant === 'skeleton') {
    return (
      <div className={classNames('animate-pulse', className)}>
        {children || (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={classNames('flex justify-center items-center', className)}>
      <div
        className={classNames(
          'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
          sizeClasses[size]
        )}
      />
    </div>
  );
} 