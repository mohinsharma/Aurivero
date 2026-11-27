import React, { useMemo, useState } from 'react';

interface ReturnDistributionProps {
  dailyReturnsPct: number[];
  dailyVarPct: number;
  dailyCvarPct: number;
}

export const ReturnDistributionChart: React.FC<ReturnDistributionProps> = ({
  dailyReturnsPct,
  dailyVarPct,
  dailyCvarPct,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { bins, maxCount, varThreshold, cvarThreshold } = useMemo(() => {
    if (!dailyReturnsPct || dailyReturnsPct.length === 0) {
      return { bins: [], maxCount: 1, varThreshold: -dailyVarPct, cvarThreshold: -dailyCvarPct };
    }
    const minR = Math.min(...dailyReturnsPct);
    const maxR = Math.max(...dailyReturnsPct);
    const span = Math.max(0.5, maxR - minR);
    const numBins = 24;
    const step = span / numBins;

    const buckets = Array.from({ length: numBins }, (_, i) => {
      const start = minR + i * step;
      const end = start + step;
      return { start, end, mid: (start + end) / 2, count: 0 };
    });

    for (const r of dailyReturnsPct) {
      const idx = Math.min(numBins - 1, Math.max(0, Math.floor((r - minR) / step)));
      buckets[idx].count += 1;
    }

    return {
      bins: buckets,
      maxCount: Math.max(1, ...buckets.map((b) => b.count)),
      varThreshold: -Math.abs(dailyVarPct),
      cvarThreshold: -Math.abs(dailyCvarPct),
    };
  }, [dailyReturnsPct, dailyVarPct, dailyCvarPct]);

  if (bins.length === 0) {
    return <div className="text-xs text-text-muted py-8 text-center">No return distribution data available.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text-muted">
        <span>Empirical Daily Return Histogram ({dailyReturnsPct.length} sessions)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-warning">
            <span className="w-2.5 h-2.5 rounded-xs bg-warning/80 inline-block" /> VaR (-{dailyVarPct.toFixed(2)}%)
          </span>
          <span className="flex items-center gap-1.5 text-danger">
            <span className="w-2.5 h-2.5 rounded-xs bg-danger/80 inline-block" /> CVaR (-{dailyCvarPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="relative h-44 bg-background/60 border border-border rounded-lg p-3 flex items-end gap-1">
        {bins.map((b, i) => {
          const heightPct = (b.count / maxCount) * 100;
          const isTailCvar = b.mid <= cvarThreshold;
          const isTailVar = b.mid <= varThreshold && !isTailCvar;
          const barColor = isTailCvar
            ? 'bg-danger/85 hover:bg-danger'
            : isTailVar
            ? 'bg-warning/85 hover:bg-warning'
            : b.mid >= 0
            ? 'bg-primary/70 hover:bg-primary'
            : 'bg-text-muted/45 hover:bg-text-muted/70';

          return (
            <div
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="flex-1 h-full flex flex-col justify-end items-center group cursor-crosshair"
            >
              <div
                style={{ height: `${Math.max(b.count > 0 ? 4 : 0, heightPct)}%` }}
                className={`w-full rounded-t-xs transition-all ${barColor}`}
              />
            </div>
          );
        })}

        {hoverIdx !== null && bins[hoverIdx] && (
          <div className="absolute top-2 right-2 bg-surface/95 border border-border rounded px-2.5 py-1.5 text-[11px] font-mono shadow-lg pointer-events-none">
            <div className="text-text-primary font-semibold">
              {bins[hoverIdx].start.toFixed(2)}% to {bins[hoverIdx].end.toFixed(2)}%
            </div>
            <div className="text-text-muted">{bins[hoverIdx].count} days</div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] font-mono text-text-muted">
        <span>{bins[0].start.toFixed(1)}%</span>
        <span>0.0%</span>
        <span>+{bins[bins.length - 1].end.toFixed(1)}%</span>
      </div>
    </div>
  );
};

interface UnderwaterDrawdownProps {
  drawdownSeries: Array<{ date: string; drawdownPct: number }>;
  maxDrawdownPct: number;
  currentDrawdownPct?: number;
}

export const UnderwaterDrawdownChart: React.FC<UnderwaterDrawdownProps> = ({
  drawdownSeries,
  maxDrawdownPct,
  currentDrawdownPct = 0,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!drawdownSeries || drawdownSeries.length < 2) {
    return <div className="text-xs text-text-muted py-8 text-center">Insufficient drawdown series.</div>;
  }

  const width = 640;
  const height = 160;
  const pad = 12;
  const minVal = Math.min(-1, ...drawdownSeries.map((d) => d.drawdownPct));

  const points = drawdownSeries.map((d, i) => {
    const x = pad + (i / (drawdownSeries.length - 1)) * (width - 2 * pad);
    const y = pad + (Math.abs(d.drawdownPct) / Math.abs(minVal)) * (height - 2 * pad);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${pad} L ${points[0].x.toFixed(1)} ${pad} Z`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>Underwater Equity Drawdown Curve</span>
        <span>
          Current: <strong className="text-text-primary">-{currentDrawdownPct.toFixed(2)}%</strong> | Max:{' '}
          <strong className="text-danger">-{maxDrawdownPct.toFixed(2)}%</strong>
        </span>
      </div>

      <div className="relative bg-background/60 border border-border rounded-lg p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-40 overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setHoverIdx(Math.round(relX * (points.length - 1)));
          }}
        >
          <line x1={pad} y1={pad} x2={width - pad} y2={pad} stroke="rgba(148,163,184,0.3)" strokeDasharray="3 3" />
          <path d={areaPath} fill="rgba(239, 68, 68, 0.2)" />
          <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2" />
          {hoverIdx !== null && points[hoverIdx] && (
            <>
              <line
                x1={points[hoverIdx].x}
                y1={pad}
                x2={points[hoverIdx].x}
                y2={height - pad}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="2 2"
              />
              <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="4" fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {hoverIdx !== null && points[hoverIdx] && (
          <div className="absolute bottom-2 left-3 bg-surface/95 border border-border rounded px-2 py-1 text-[11px] font-mono">
            {points[hoverIdx].date}: <span className="text-danger font-bold">{points[hoverIdx].drawdownPct.toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface CorrelationHeatmapProps {
  labels: string[];
  matrix: number[][];
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ labels, matrix }) => {
  if (!labels || labels.length === 0) {
    return <div className="text-xs text-text-muted py-6 text-center">Add positions to compute N×N correlation matrix.</div>;
  }

  const cellColor = (val: number, isDiag: boolean) => {
    if (isDiag) return 'bg-secondary/20 text-secondary border-secondary/30';
    if (val >= 0.7) return 'bg-danger/25 text-danger border-danger/40';
    if (val >= 0.35) return 'bg-warning/20 text-warning border-warning/35';
    if (val <= -0.25) return 'bg-primary/20 text-primary border-primary/40';
    return 'bg-background/70 text-text-secondary border-border';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="p-1.5 text-left text-text-muted font-normal">Asset</th>
            {labels.map((lbl) => (
              <th key={lbl} className="p-1.5 text-center text-text-primary font-semibold">
                {lbl}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((rowLbl, i) => (
            <tr key={rowLbl}>
              <td className="p-1.5 font-semibold text-text-primary">{rowLbl}</td>
              {labels.map((colLbl, j) => {
                const v = matrix[i]?.[j] ?? (i === j ? 1 : 0);
                return (
                  <td
                    key={colLbl}
                    title={`${rowLbl} vs ${colLbl}: ${v.toFixed(3)}`}
                    className={`p-2 text-center rounded border ${cellColor(v, i === j)}`}
                  >
                    {v.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface RiskContributionProps {
  positions: Array<{ symbol: string; weightPct: number; riskContributionPct: number }>;
}

export const RiskContributionChart: React.FC<RiskContributionProps> = ({ positions }) => {
  if (!positions || positions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>Capital Allocation vs Marginal Risk Contribution</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-secondary">
            <span className="w-2.5 h-2.5 rounded-xs bg-secondary inline-block" /> Capital %
          </span>
          <span className="flex items-center gap-1 text-danger">
            <span className="w-2.5 h-2.5 rounded-xs bg-danger inline-block" /> Risk Contrib %
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {positions.map((p) => (
          <div key={p.symbol} className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-semibold text-text-primary">{p.symbol}</span>
              <span className="text-text-muted">
                Weight <strong className="text-secondary">{p.weightPct.toFixed(1)}%</strong> · Risk{' '}
                <strong className={p.riskContributionPct > p.weightPct * 1.25 ? 'text-danger' : 'text-text-primary'}>
                  {p.riskContributionPct.toFixed(1)}%
                </strong>
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(100, Math.max(0, p.weightPct))}%` }} />
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-danger rounded-full" style={{ width: `${Math.min(100, Math.max(0, p.riskContributionPct))}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface MlOutOfSampleProps {
  series: Array<{ date: string; actualVolPct: number; mlVolPct: number; baselineVolPct: number }>;
}

export const MlOutOfSampleChart: React.FC<MlOutOfSampleProps> = ({ series }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!series || series.length < 3) {
    return <div className="text-xs text-text-muted py-6 text-center">No out-of-sample walk-forward series available.</div>;
  }

  const width = 640;
  const height = 180;
  const pad = 16;
  const allVals = series.flatMap((s) => [s.actualVolPct, s.mlVolPct, s.baselineVolPct]);
  const minV = Math.max(0, Math.min(...allVals) * 0.9);
  const maxV = Math.max(minV + 1, Math.max(...allVals) * 1.08);

  const toCoords = (getter: (item: MlOutOfSampleProps['series'][number]) => number) =>
    series.map((d, i) => {
      const x = pad + (i / (series.length - 1)) * (width - 2 * pad);
      const y = height - pad - ((getter(d) - minV) / (maxV - minV)) * (height - 2 * pad);
      return { x, y };
    });

  const makePath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const actualPts = toCoords((d) => d.actualVolPct);
  const mlPts = toCoords((d) => d.mlVolPct);
  const basePts = toCoords((d) => d.baselineVolPct);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text-muted">
        <span>Unseen 30% Walk-Forward Test: Predicted vs Realized Volatility (%)</span>
        <div className="flex items-center gap-3">
          <span className="text-text-primary flex items-center gap-1">
            <span className="w-3 h-0.5 bg-text-primary inline-block" /> Actual
          </span>
          <span className="text-primary flex items-center gap-1">
            <span className="w-3 h-0.5 bg-primary inline-block" /> ML Model
          </span>
          <span className="text-warning flex items-center gap-1">
            <span className="w-3 h-0.5 bg-warning inline-block" /> 20D Baseline
          </span>
        </div>
      </div>

      <div className="relative bg-background/60 border border-border rounded-lg p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setHoverIdx(Math.round(relX * (series.length - 1)));
          }}
        >
          <path d={makePath(basePts)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d={makePath(actualPts)} fill="none" stroke="#e2e8f0" strokeWidth="1.8" />
          <path d={makePath(mlPts)} fill="none" stroke="#10b981" strokeWidth="2.2" />

          {hoverIdx !== null && actualPts[hoverIdx] && (
            <line
              x1={actualPts[hoverIdx].x}
              y1={pad}
              x2={actualPts[hoverIdx].x}
              y2={height - pad}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {hoverIdx !== null && series[hoverIdx] && (
          <div className="absolute top-2 right-2 bg-surface/95 border border-border rounded px-2.5 py-1.5 text-[11px] font-mono shadow-lg pointer-events-none space-y-0.5">
            <div className="text-text-muted">{series[hoverIdx].date}</div>
            <div>Actual: <strong className="text-text-primary">{series[hoverIdx].actualVolPct.toFixed(2)}%</strong></div>
            <div>ML Model: <strong className="text-primary">{series[hoverIdx].mlVolPct.toFixed(2)}%</strong></div>
            <div>Baseline: <strong className="text-warning">{series[hoverIdx].baselineVolPct.toFixed(2)}%</strong></div>
          </div>
        )}
      </div>
    </div>
  );
};

interface FeatureImportanceProps {
  items: Array<{ feature: string; importancePct: number }>;
}

export const FeatureImportanceChart: React.FC<FeatureImportanceProps> = ({ items }) => {
  if (!items || items.length === 0) return null;
  const maxVal = Math.max(1, ...items.map((x) => x.importancePct));

  return (
    <div className="space-y-2">
      {items.slice(0, 7).map((item) => (
        <div key={item.feature} className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-text-secondary">{item.feature}</span>
            <span className="text-text-primary font-semibold">{item.importancePct.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all"
              style={{ width: `${Math.min(100, (item.importancePct / maxVal) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
