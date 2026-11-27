import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { api } from '../../services/api';

function computeLocalIstDisplay() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(now);
  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  return { dateStr, timeStr };
}

export const IstMarketClock: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [clock, setClock] = useState(computeLocalIstDisplay);
  const [sessionState, setSessionState] = useState<string>('MARKET_CLOSED');
  const [sessionLabel, setSessionLabel] = useState<string>('09:15 – 15:30 IST');

  useEffect(() => {
    const t = window.setInterval(() => setClock(computeLocalIstDisplay()), 1000);
    api.markets.getSession().then((res) => {
      if (res.success && res.data?.indianEquities) {
        setSessionState(res.data.indianEquities.state);
        setSessionLabel(res.data.indianEquities.label);
      }
    });
    return () => window.clearInterval(t);
  }, []);

  const stateBadge =
    sessionState === 'MARKET_OPEN'
      ? 'bg-primary/15 text-primary border-primary/30'
      : sessionState === 'PRE_OPEN'
        ? 'bg-warning/15 text-warning border-warning/30'
        : sessionState === 'HOLIDAY'
          ? 'bg-danger/15 text-danger border-danger/30'
          : 'bg-surface-elevated text-text-secondary border-border';

  return (
    <div className="inline-flex flex-wrap items-center gap-2 text-[11px] font-mono">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-text-primary">
        <Clock size={12} className="text-primary" />
        <span>{clock.dateStr}</span>
        <span className="font-bold">{clock.timeStr} IST</span>
      </span>
      <span className={`px-2.5 py-1 rounded-full border font-semibold ${stateBadge}`}>
        {sessionState.replace('_', ' ')}
      </span>
      {!compact && <span className="text-text-muted hidden sm:inline">{sessionLabel}</span>}
    </div>
  );
};
