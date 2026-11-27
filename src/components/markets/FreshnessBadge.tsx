import React from 'react';
import { Radio, Clock, Database, Moon, AlertTriangle } from 'lucide-react';
import { DataFreshnessStatus } from '../../types/markets';

interface FreshnessBadgeProps {
  status: DataFreshnessStatus;
  source?: string;
  delaySeconds?: number | null;
  providerTimestamp?: string | null;
  compact?: boolean;
}

export const FreshnessBadge: React.FC<FreshnessBadgeProps> = ({
  status,
  source,
  delaySeconds,
  providerTimestamp,
  compact = false,
}) => {
  const config: Record<
    DataFreshnessStatus,
    { label: string; classes: string; icon: React.ReactNode; dotClass?: string }
  > = {
    LIVE: {
      label: 'LIVE',
      classes: 'bg-primary/15 text-primary border-primary/30',
      icon: <Radio size={11} className="animate-pulse" />,
    },
    DELAYED: {
      label: delaySeconds ? `DELAYED ${Math.round(delaySeconds / 60)}M` : 'DELAYED',
      classes: 'bg-warning/15 text-warning border-warning/30',
      icon: <Clock size={11} />,
    },
    CACHED: {
      label: 'CACHED',
      classes: 'bg-secondary/15 text-secondary border-secondary/30',
      icon: <Database size={11} />,
    },
    MARKET_CLOSED: {
      label: 'MARKET CLOSED',
      classes: 'bg-surface-elevated text-text-secondary border-border',
      icon: <Moon size={11} />,
    },
    UNAVAILABLE: {
      label: 'UNAVAILABLE',
      classes: 'bg-danger/15 text-danger border-danger/30',
      icon: <AlertTriangle size={11} />,
    },
  };

  const c = config[status] || config.UNAVAILABLE;
  const titleParts = [
    `Status: ${c.label}`,
    source ? `Source: ${source}` : null,
    providerTimestamp ? `Provider Time: ${new Date(providerTimestamp).toLocaleString()}` : null,
  ].filter(Boolean);

  return (
    <span
      title={titleParts.join(' • ')}
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider font-semibold ${
        compact ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'
      } ${c.classes}`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};
