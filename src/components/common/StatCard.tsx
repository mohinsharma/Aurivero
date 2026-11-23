import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  badge?: string;
  variant?: 'default' | 'elevated' | 'glass';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  change,
  changeLabel = 'vs benchmark',
  tooltip,
  icon,
  badge,
  variant = 'default',
  className = '',
}) => {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card variant={variant} className={`relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary uppercase tracking-wider">
          <span>{label}</span>
          {tooltip && (
            <span title={tooltip} className="cursor-help text-text-muted hover:text-text-secondary transition-colors">
              <HelpCircle size={13} />
            </span>
          )}
        </div>
        {icon && <div className="text-text-muted p-1.5 rounded-lg bg-surface-elevated">{icon}</div>}
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-text-primary text-tabular">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-text-muted font-mono">{subValue}</span>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${
              isPositive
                ? 'text-primary'
                : isNegative
                ? 'text-danger'
                : 'text-text-secondary'
            }`}
          >
            {isPositive && <TrendingUp size={13} />}
            {isNegative && <TrendingDown size={13} />}
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
          <span className="text-text-muted text-[11px]">{changeLabel}</span>
        </div>
      )}
    </Card>
  );
};
