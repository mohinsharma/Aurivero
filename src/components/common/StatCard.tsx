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
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <span>{label}</span>
          {tooltip && (
            <span
              title={tooltip}
              className="cursor-help text-text-muted hover:text-text-primary transition-colors"
            >
              <HelpCircle size={13} />
            </span>
          )}
        </div>
        {icon && (
          <div className="text-text-secondary p-1.5 rounded-lg bg-background">{icon}</div>
        )}
        {badge && (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-text-secondary tabular-nums">{subValue}</span>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-xs tabular-nums">
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${
              isPositive
                ? 'text-profit'
                : isNegative
                ? 'text-loss'
                : 'text-text-secondary'
            }`}
          >
            {isPositive && <TrendingUp size={13} />}
            {isNegative && <TrendingDown size={13} />}
            {isPositive ? '+' : isNegative ? '-' : ''}
            {Math.abs(change).toFixed(2)}%
          </span>
          <span className="text-text-secondary text-[11px]">{changeLabel}</span>
        </div>
      )}
    </Card>
  );
};
