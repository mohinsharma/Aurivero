import React from 'react';
import {
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Shield,
  Layers,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';

export const PortfolioPage: React.FC = () => {
  const {
    virtualCash,
    totalPortfolioValue,
    totalInvested,
    unrealizedPnL,
    unrealizedPnLPercent,
    positions,
    orderHistory
  } = useSimulator();

  // Calculate sector distribution
  const sectorMap: { [key: string]: number } = {};
  positions.forEach(pos => {
    sectorMap[pos.sector] = (sectorMap[pos.sector] || 0) + pos.currentValue;
  });

  const sectorEntries = Object.entries(sectorMap).map(([sector, val]) => ({
    sector,
    value: val,
    percentage: totalPortfolioValue > 0 ? (val / totalPortfolioValue) * 100 : 0
  }));

  // Cash allocation
  const cashPercentage = totalPortfolioValue > 0 ? (virtualCash / totalPortfolioValue) * 100 : 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
              Performance Intelligence
            </span>
            <Badge variant="primary" size="sm">Virtual Capital Audit</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Portfolio Analytics & Allocation
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Evaluate your simulated capital distribution, risk concentration, and trade efficiency against the NIFTY 50 benchmark.
          </p>
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] text-text-muted uppercase block">Total Net Worth</span>
          <span className="text-2xl font-bold text-primary text-tabular">
            ₹{totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Unrealized Gain / Loss"
          value={`${unrealizedPnL >= 0 ? '+' : ''}₹${unrealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          change={unrealizedPnLPercent}
          changeLabel="on invested capital"
          tooltip="Paper profits or losses on open equity holdings."
        />

        <StatCard
          label="Win / Loss Trade Ratio"
          value="75.0%"
          subValue="3 wins / 1 loss"
          badge="Disciplined"
          tooltip="Percentage of simulated trades that exited or sit in positive territory."
        />

        <StatCard
          label="NIFTY Benchmark Alpha"
          value="+1.85%"
          change={1.85}
          changeLabel="vs Nifty 50"
          tooltip="Excess virtual return generated compared to holding index fund."
        />

        <StatCard
          label="Max Portfolio Drawdown"
          value="-3.40%"
          subValue="Lowest valley"
          tooltip="Maximum peak-to-trough drop observed during your simulation run."
        />
      </div>

      {/* Asset Allocation & Sector Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sector Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="elevated" className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <PieIcon size={18} className="text-primary" />
                <h3 className="font-bold text-sm text-text-primary">
                  Capital Distribution
                </h3>
              </div>
              <span className="text-xs font-mono text-text-muted">
                {positions.length + 1} Slices
              </span>
            </div>

            {/* Cash slice */}
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-text-primary font-semibold">Liquid Cash (Reserve)</span>
                  <span className="text-primary font-bold">{cashPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${cashPercentage}%` }} />
                </div>
              </div>

              {sectorEntries.map((sec, idx) => {
                const colors = ['bg-secondary', 'bg-warning', 'bg-danger', 'bg-text-secondary'];
                const color = colors[idx % colors.length];
                return (
                  <div key={sec.sector}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-text-secondary">{sec.sector}</span>
                      <span className="text-text-primary font-semibold">{sec.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                      <div className={`${color} h-full rounded-full`} style={{ width: `${sec.percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-3 rounded-xl bg-surface border border-border/60 text-xs">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" />
                SEBI Best Practice Advice:
              </span>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                Keeping 20-30% in liquid cash gives you strategic optionality to capitalize on sudden macroeconomic drawdowns without liquidating core investments.
              </p>
            </div>
          </Card>
        </div>

        {/* Right: Detailed Position Audit Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="elevated" className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="font-bold text-sm text-text-primary">
                Detailed Holdings Audit
              </h3>
              <span className="text-xs font-mono text-text-muted">
                Cost Basis: ₹{totalInvested.toFixed(2)}
              </span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-[11px] font-mono text-text-muted">
                    <th className="py-2.5 px-2">Stock</th>
                    <th className="py-2.5 px-2 text-right">Shares</th>
                    <th className="py-2.5 px-2 text-right">Invested</th>
                    <th className="py-2.5 px-2 text-right">Current</th>
                    <th className="py-2.5 px-2 text-right">Return (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono">
                  {positions.map((pos) => {
                    const isProfit = pos.unrealizedPnL >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-surface-elevated/40">
                        <td className="py-3 px-2">
                          <div className="font-bold text-text-primary">{pos.symbol}</div>
                          <div className="text-[10px] text-text-muted">{pos.tradeReason || pos.sector}</div>
                        </td>
                        <td className="py-3 px-2 text-right text-tabular">{pos.quantity}</td>
                        <td className="py-3 px-2 text-right text-tabular">₹{pos.totalCost.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right text-tabular">₹{pos.currentValue.toFixed(2)}</td>
                        <td className={`py-3 px-2 text-right text-tabular font-semibold ${
                          isProfit ? 'text-primary' : 'text-danger'
                        }`}>
                          {isProfit ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
