import React, { useState } from 'react';
import { Card } from '../common/Card';

type DiagramId =
  | 'TRENDS'
  | 'SUPPORT_RESISTANCE'
  | 'BREAKOUT_FAKEOUT'
  | 'STOP_LOSS'
  | 'RISK_REWARD'
  | 'POSITION_SIZING'
  | 'DIVERSIFICATION'
  | 'COMPOUNDING'
  | 'DRAWDOWNS'
  | 'LEVERAGE';

const DIAGRAMS: Array<{
  id: DiagramId;
  title: string;
  takeaway: string;
}> = [
  {
    id: 'TRENDS',
    title: '1. Bullish vs Bearish Trends',
    takeaway: 'Bullish trends form Higher Highs (HH) & Higher Lows (HL). Bearish trends form Lower Highs (LH) & Lower Lows (LL).',
  },
  {
    id: 'SUPPORT_RESISTANCE',
    title: '2. Support & Resistance Zones',
    takeaway: 'Support is where demand historically absorbs selling; resistance is where supply caps rallies. Broken support often flips into resistance.',
  },
  {
    id: 'BREAKOUT_FAKEOUT',
    title: '3. Breakouts vs Fakeouts',
    takeaway: 'True breakouts expand on strong volume and hold retests. Low-volume breakouts frequently snap back inside the range (bull trap).',
  },
  {
    id: 'STOP_LOSS',
    title: '4. Structural Stop-Loss Placement',
    takeaway: 'Place stop-loss where your trade thesis is invalidated (below support), not at an arbitrary rupee amount. Remember gaps can cause slippage.',
  },
  {
    id: 'RISK_REWARD',
    title: '5. Risk / Reward Asymmetry',
    takeaway: 'With a 1:2.5 Risk/Reward ratio, even a 40% win rate produces positive expectancy over a large sample.',
  },
  {
    id: 'POSITION_SIZING',
    title: '6. Position Sizing Formula',
    takeaway: 'Quantity = (Capital × Risk %) / (Entry − Stop-Loss). Wider stop-losses require smaller share quantities to keep monetary risk constant.',
  },
  {
    id: 'DIVERSIFICATION',
    title: '7. Portfolio Diversification',
    takeaway: 'Combining low-correlation assets (e.g., Equities + Cash/Gold/Global) smooths portfolio drawdowns without eliminating market risk.',
  },
  {
    id: 'COMPOUNDING',
    title: '8. Power of Compounding',
    takeaway: 'Consistent 12–15% annual compounding over 15–20 years outperforms sporadic high-risk speculation that suffers wipeouts.',
  },
  {
    id: 'DRAWDOWNS',
    title: '9. Asymmetric Drawdown Recovery',
    takeaway: 'A 10% loss needs +11.1% to recover, a 25% loss needs +33.3%, and a 50% loss requires +100% just to break even.',
  },
  {
    id: 'LEVERAGE',
    title: '10. Leverage & Liquidation',
    takeaway: 'At 5x leverage, a -20% move wipes out 100% of margin. Per SEBI studies, 93% of retail F&O traders incurred net losses.',
  },
];

export const VisualLearningDiagrams: React.FC = () => {
  const [active, setActive] = useState<DiagramId>('TRENDS');
  const current = DIAGRAMS.find((d) => d.id === active) || DIAGRAMS[0];

  const renderSvg = () => {
    switch (active) {
      case 'TRENDS':
        return (
          <svg viewBox="0 0 560 170" className="w-full h-44">
            <text x="20" y="22" fill="#10b981" fontSize="12" fontFamily="monospace">BULLISH (HH / HL)</text>
            <polyline points="20,140 70,95 105,115 160,65 195,85 250,35" fill="none" stroke="#10b981" strokeWidth="3" />
            <text x="300" y="22" fill="#ef4444" fontSize="12" fontFamily="monospace">BEARISH (LH / LL)</text>
            <polyline points="300,40 350,85 385,65 440,115 475,95 530,145" fill="none" stroke="#ef4444" strokeWidth="3" />
          </svg>
        );
      case 'SUPPORT_RESISTANCE':
        return (
          <svg viewBox="0 0 560 170" className="w-full h-44">
            <line x1="20" y1="35" x2="540" y2="35" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 4" />
            <text x="24" y="26" fill="#ef4444" fontSize="11" fontFamily="monospace">RESISTANCE (Supply Zone)</text>
            <line x1="20" y1="135" x2="540" y2="135" stroke="#10b981" strokeWidth="2" strokeDasharray="5 4" />
            <text x="24" y="153" fill="#10b981" fontSize="11" fontFamily="monospace">SUPPORT (Demand Zone)</text>
            <polyline points="30,130 110,40 190,132 280,42 360,131 460,40 520,95" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          </svg>
        );
      case 'BREAKOUT_FAKEOUT':
        return (
          <svg viewBox="0 0 560 170" className="w-full h-44">
            <line x1="20" y1="75" x2="540" y2="75" stroke="#94a3b8" strokeDasharray="4 4" />
            <text x="20" y="22" fill="#10b981" fontSize="11" fontFamily="monospace">TRUE BREAKOUT + RETEST (High Vol)</text>
            <polyline points="20,130 90,85 130,45 170,75 240,28" fill="none" stroke="#10b981" strokeWidth="3" />
            <text x="300" y="22" fill="#ef4444" fontSize="11" fontFamily="monospace">FAKEOUT / BULL TRAP (Low Vol)</text>
            <polyline points="300,125 360,80 400,52 440,85 510,145" fill="none" stroke="#ef4444" strokeWidth="3" />
          </svg>
        );
      case 'STOP_LOSS':
      case 'RISK_REWARD':
        return (
          <svg viewBox="0 0 560 170" className="w-full h-44">
            <rect x="60" y="25" width="440" height="65" fill="rgba(16,185,129,0.16)" stroke="#10b981" />
            <text x="72" y="55" fill="#10b981" fontSize="12" fontFamily="monospace">TARGET REWARD (+2.5R)</text>
            <line x1="40" y1="90" x2="520" y2="90" stroke="#e2e8f0" strokeWidth="2" />
            <text x="72" y="84" fill="#e2e8f0" fontSize="11" fontFamily="monospace">ENTRY</text>
            <rect x="60" y="90" width="440" height="30" fill="rgba(239,68,68,0.18)" stroke="#ef4444" />
            <text x="72" y="110" fill="#ef4444" fontSize="12" fontFamily="monospace">STOP-LOSS RISK (-1R) · Invalidation Level</text>
          </svg>
        );
      case 'DRAWDOWNS':
        return (
          <svg viewBox="0 0 560 170" className="w-full h-44">
            {[
              { lbl: '-10% Loss → +11.1% Needed', w: 90, col: '#10b981', y: 24 },
              { lbl: '-25% Loss → +33.3% Needed', w: 170, col: '#f59e0b', y: 66 },
              { lbl: '-50% Loss → +100% Needed', w: 340, col: '#ef4444', y: 108 },
            ].map((b) => (
              <g key={b.lbl}>
                <rect x="20" y={b.y} width={b.w} height="24" rx="4" fill={b.col} opacity="0.85" />
                <text x={b.w + 32} y={b.y + 16} fill="#e2e8f0" fontSize="12" fontFamily="monospace">{b.lbl}</text>
              </g>
            ))}
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 560 170" className="w-full h-44">
            <polyline points="30,140 120,125 220,105 320,75 430,42 530,18" fill="none" stroke="#10b981" strokeWidth="3" />
            <line x1="30" y1="140" x2="530" y2="95" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="2" />
            <text x="35" y="30" fill="#10b981" fontSize="12" fontFamily="monospace">{current.title}</text>
          </svg>
        );
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-text-primary">Visual Learning Engine (Annotated Diagrams)</h2>
          <p className="text-xs text-text-muted">Interactive visual blueprints for core risk & price-action concepts.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {DIAGRAMS.map((d) => (
          <button
            key={d.id}
            onClick={() => setActive(d.id)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-colors ${
              active === d.id
                ? 'bg-primary text-background font-bold'
                : 'bg-background border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {d.title}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-background/80 border border-border p-3">{renderSvg()}</div>

      <div className="p-3 rounded-lg bg-surface-elevated border border-border text-xs text-text-secondary">
        <strong className="text-text-primary">{current.title}:</strong> {current.takeaway}
      </div>
    </Card>
  );
};
