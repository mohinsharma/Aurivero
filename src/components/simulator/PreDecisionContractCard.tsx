import React, { useState } from 'react';
import { FileCheck2, ChevronDown, ChevronUp } from 'lucide-react';

export interface PreDecisionContractData {
  why_making_decision: string;
  biggest_risk: string;
  what_proves_wrong: string;
  planned_exposure_pct: number;
  confidence_level: number;
  short_explanation?: string;
}

interface PreDecisionContractCardProps {
  proposedExposurePct: number;
  value: PreDecisionContractData | null;
  onChange: (contract: PreDecisionContractData | null) => void;
}

const QUICK_REASONS = [
  'Long-term valuation',
  'Sector diversification',
  'Trend & support setup',
  'Risk reduction / rebalance',
];

const QUICK_RISKS = [
  'Earnings miss / margin drop',
  'Market-wide volatility',
  'Over-concentration in sector',
  'Stop-loss gap risk',
];

export const PreDecisionContractCard: React.FC<PreDecisionContractCardProps> = ({
  proposedExposurePct,
  value,
  onChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const current: PreDecisionContractData = value || {
    why_making_decision: QUICK_REASONS[0],
    biggest_risk: QUICK_RISKS[0],
    what_proves_wrong: 'Price breaks below my stop-loss or thesis changes',
    planned_exposure_pct: Math.max(1, Math.min(100, Math.round(proposedExposurePct || 10))),
    confidence_level: 3,
    short_explanation: '',
  };

  const updateField = (patch: Partial<PreDecisionContractData>) => {
    const next = { ...current, ...patch };
    setEnabled(true);
    onChange(next);
  };

  const toggleEnabled = (checked: boolean) => {
    setEnabled(checked);
    if (checked) {
      setExpanded(true);
      onChange(current);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="rounded-xl bg-surface-elevated/70 border border-primary/25 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 cursor-pointer font-mono font-bold text-text-primary">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggleEnabled(e.target.checked)}
            className="accent-primary"
          />
          <FileCheck2 size={14} className="text-primary" />
          <span>Pre-Decision Contract</span>
          <span className="text-[10px] font-normal text-primary px-1.5 py-0.2 rounded bg-primary/10">
            Recommended
          </span>
        </label>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-text-muted hover:text-text-primary p-1"
          aria-label="Toggle Pre-Decision Contract details"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="pt-2 border-t border-border/50 space-y-2.5 text-[11px]">
          <div>
            <span className="text-text-muted font-mono block mb-1">1. Why this decision?</span>
            <div className="flex flex-wrap gap-1">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updateField({ why_making_decision: r })}
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                    current.why_making_decision === r
                      ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                      : 'bg-surface border-border text-text-secondary'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-text-muted font-mono block mb-1">2. Biggest risk?</span>
            <div className="flex flex-wrap gap-1">
              {QUICK_RISKS.map((rk) => (
                <button
                  key={rk}
                  type="button"
                  onClick={() => updateField({ biggest_risk: rk })}
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                    current.biggest_risk === rk
                      ? 'bg-warning/20 text-warning border-warning/40 font-bold'
                      : 'bg-surface border-border text-text-secondary'
                  }`}
                >
                  {rk}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-text-muted font-mono block mb-1">3. What proves your reasoning wrong?</span>
            <input
              type="text"
              value={current.what_proves_wrong}
              onChange={(e) => updateField({ what_proves_wrong: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary text-[11px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-text-muted font-mono block mb-1">4. Planned Exposure %</span>
              <input
                type="number"
                min={1}
                max={100}
                value={current.planned_exposure_pct}
                onChange={(e) => updateField({ planned_exposure_pct: Number(e.target.value) || 10 })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary font-mono text-[11px]"
              />
            </div>

            <div>
              <span className="text-text-muted font-mono block mb-1">5. Confidence (1–5)</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => updateField({ confidence_level: lvl })}
                    className={`flex-1 py-1 rounded-md border font-mono text-[11px] ${
                      current.confidence_level === lvl
                        ? 'bg-secondary text-background border-secondary font-bold'
                        : 'bg-surface border-border text-text-muted'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <input
            type="text"
            placeholder="Optional short note (max 1-2 lines)..."
            value={current.short_explanation || ''}
            onChange={(e) => updateField({ short_explanation: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary text-[11px]"
          />
        </div>
      )}
    </div>
  );
};
