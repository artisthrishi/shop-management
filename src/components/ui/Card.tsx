// ============================================================================
// Context: Shop Manager MVP - Card Component
// ============================================================================
import React from 'react';
import { classNames } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({ children, className = '', onClick, hover = false }: CardProps) {
  return (
    <div
      className={classNames(
        'bg-white rounded-lg shadow-sm border border-gray-100',
        hover && 'hover:bg-gray-50 transition-colors cursor-pointer',
      className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={classNames(
      'px-4 py-3 border-b border-gray-200',
      className
    )}>
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={classNames('p-4', className)}>
      {children}
    </div>
  );
} 