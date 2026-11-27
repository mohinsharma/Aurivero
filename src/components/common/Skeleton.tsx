import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse rounded-lg bg-surface-card/80 ${className}`} />
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-6 rounded-2xl bg-surface/60 border border-border">
    {icon && (
      <div className="w-11 h-11 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-gold mb-3">
        {icon}
      </div>
    )}
    <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    {description && <p className="text-xs text-text-muted mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
