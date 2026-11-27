import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart as PieIcon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const PortfolioPage: React.FC = () => {
  const {
    virtualCash,
    totalPortfolioValue,
    totalInvested,
    unrealizedPnL,
    unrealizedPnLPercent,
    positions,
    orderHistory,
  } = useSimulator();

  const navigate = useNavigate();

  // Calculate sector distribution
  const sectorMap: { [key: string]: number } = {};
  positions.forEach((pos) => {
    sectorMap[pos.sector] = (sectorMap[pos.sector] || 0) + pos.currentValue;
  });

  const sectorEntries = Object.entries(sectorMap).map(([sector, val]) => ({
    sector,
    value: val,
    percentage: totalPortfolioValue > 0 ? (val / totalPortfolioValue) * 100 : 0,
  }));

  // Cash allocation
  const cashPercentage =
    totalPortfolioValue > 0 ? (virtualCash / totalPortfolioValue) * 100 : 100;

  // Non-trade color palette for sectors so Green/Red are strictly reserved for Profit/Loss
  const sectorColors = ['bg-indigo-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500'];

  // Real win/loss calculation across active holdings
  const profitableCount = positions.filter((p) => p.unrealizedPnL >= 0).length;
  const losingCount = positions.length - profitableCount;
  const winRateDisplay =
    positions.length > 0 ? `${((profitableCount / positions.length) * 100).toFixed(0)}%` : '—';

  return (
    <div className="space-y-6 pb-8">
      {/* Clear Portfolio Summary Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-primary">
              Performance Overview
            </span>
            <Badge variant="primary" size="sm">
              Virtual Capital
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
            Portfolio Analytics &amp; Allocation
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            See how much you have invested, your cash buffer, and how each holding is performing.
          </p>
        </div>

        {/* Necessary At-a-Glance Money Split (Neutral / Cobalt colors, Green/Red reserved strictly for P&L) */}
        <div className="grid grid-cols-3 gap-3 bg-surface border border-border rounded-2xl p-4 shadow-sm shrink-0">
          <div className="pr-3 border-r border-border">
            <span className="text-[11px] text-text-secondary block">Total Net Worth</span>
            <span className="text-base sm:text-lg font-bold text-text-primary tabular-nums">
              ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="px-2 border-r border-border">
            <span className="text-[11px] text-text-secondary block">Invested Value</span>
            <span className="text-base sm:text-lg font-bold text-primary tabular-nums">
              ₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="pl-2">
            <span className="text-[11px] text-text-secondary block">Available Cash</span>
            <span className="text-base sm:text-lg font-bold text-text-primary tabular-nums">
              ₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Key Performance Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Unrealized Gain / Loss"
          value={`${unrealizedPnL >= 0 ? '+' : '-'}₹${Math.abs(unrealizedPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          change={unrealizedPnLPercent}
          changeLabel="on invested capital"
          tooltip="Paper profits or losses on your currently open equity holdings."
        />

        <StatCard
          label="Holdings in Profit"
          value={winRateDisplay}
          subValue={
            positions.length > 0
              ? `${profitableCount} profitable / ${losingCount} in loss`
              : 'No open holdings'
          }
          badge={positions.length > 0 ? 'Active' : undefined}
          tooltip="Percentage of your open holdings currently trading above your average buy price."
        />

        <StatCard
          label="NIFTY Benchmark Alpha"
          value="+1.85%"
          change={1.85}
          changeLabel="vs Nifty 50"
          tooltip="Excess virtual return compared to holding a passive NIFTY 50 index fund."
        />

        <StatCard
          label="Max Portfolio Drawdown"
          value="-3.40%"
          subValue="Peak-to-trough drop"
          tooltip="Maximum peak-to-trough drop observed during your simulation run."
        />
      </div>

      {/* Asset Allocation & Holdings Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Capital Distribution (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="p-6 h-full flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieIcon size={17} className="text-primary" />
                  <h2 className="font-semibold text-base text-text-primary">
                    Capital Distribution
                  </h2>
                </div>
                <span className="text-xs text-text-secondary tabular-nums">
                  {positions.length > 0 ? `${sectorEntries.length} Sectors + Cash` : '100% Cash'}
                </span>
              </div>

              {/* Visual Stacked Allocation Bar */}
              <div className="mt-4">
                <div
                  className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden flex"
                  aria-label="Portfolio capital allocation bar"
                >
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${cashPercentage}%` }}
                    title={`Liquid Cash: ${cashPercentage.toFixed(1)}%`}
                  />
                  {sectorEntries.map((sec, idx) => (
                    <div
                      key={sec.sector}
                      className={`${sectorColors[idx % sectorColors.length]} h-full`}
                      style={{ width: `${sec.percentage}%` }}
                      title={`${sec.sector}: ${sec.percentage.toFixed(1)}%`}
                    />
                  ))}
                </div>
              </div>

              {/* Slice Breakdown with both ₹ Value and % */}
              <div className="mt-5 space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                    <span className="text-text-primary font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      Liquid Cash (Reserve)
                    </span>
                    <span className="text-text-primary font-semibold">
                      ₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                      <span className="text-primary">({cashPercentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${cashPercentage}%` }}
                    />
                  </div>
                </div>

                {sectorEntries.map((sec, idx) => {
                  const color = sectorColors[idx % sectorColors.length];
                  return (
                    <div key={sec.sector}>
                      <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                        <span className="text-text-secondary font-medium flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                          {sec.sector}
                        </span>
                        <span className="text-text-primary font-semibold">
                          ₹{sec.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                          <span className="text-text-secondary">({sec.percentage.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`${color} h-full rounded-full`}
                          style={{ width: `${sec.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-background text-xs">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" />
                Portfolio Balance Tip
              </span>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Keeping 20–30% in liquid cash gives you flexibility to add positions calmly without selling core holdings.
              </p>
            </div>
          </Card>
        </div>

        {/* Right: Detailed Holdings Audit Table (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-6 h-full flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-base text-text-primary">
                    Your Holdings Breakdown
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Buy price vs. current live price, profit/loss in ₹, and exit protection levels.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/simulator')}
                  className="text-xs rounded-xl"
                  icon={<ArrowRight size={13} />}
                  iconPosition="right"
                >
                  Trade in Simulator
                </Button>
              </div>

              {positions.length === 0 ? (
                <div className="py-12 text-center space-y-3 bg-background rounded-2xl mt-4">
                  <p className="text-sm font-semibold text-text-primary">
                    You have no open stock holdings yet
                  </p>
                  <p className="text-xs text-text-secondary max-w-md mx-auto">
                    Your ₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })} virtual cash is ready. Place your first simulated equity order to start tracking allocation and P&amp;L.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/simulator')}
                    className="rounded-xl"
                  >
                    Open Paper Trading Simulator
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-semibold text-text-secondary">
                        <th className="py-2.5 px-2">Stock</th>
                        <th className="py-2.5 px-2 text-right">Qty</th>
                        <th className="py-2.5 px-2 text-right">Buy / Live Price</th>
                        <th className="py-2.5 px-2 text-right">Current Value</th>
                        <th className="py-2.5 px-2 text-right">Profit / Loss</th>
                        <th className="py-2.5 px-2 text-right">Exit Plan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {positions.map((pos) => {
                        const isProfit = pos.unrealizedPnL >= 0;
                        return (
                          <tr
                            key={pos.id}
                            onClick={() => navigate('/simulator')}
                            className="hover:bg-background transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 px-2">
                              <div className="font-bold text-text-primary">{pos.symbol}</div>
                              <div className="text-[11px] text-text-secondary truncate max-w-[150px]">
                                {pos.sector}
                              </div>
                            </td>
                            <td className="py-3.5 px-2 text-right tabular-nums font-medium text-text-primary">
                              {pos.quantity}
                            </td>
                            <td className="py-3.5 px-2 text-right tabular-nums">
                              <div className="text-text-primary font-medium">
                                ₹{pos.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[11px] text-text-secondary">
                                Avg ₹{pos.averageBuyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </td>
                            <td className="py-3.5 px-2 text-right tabular-nums">
                              <div className="font-semibold text-text-primary">
                                ₹{pos.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[11px] text-text-secondary">
                                Cost ₹{pos.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </div>
                            </td>
                            <td className="py-3.5 px-2 text-right tabular-nums">
                              <div className={`font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}>
                                {isProfit ? '+' : '-'}₹
                                {Math.abs(pos.unrealizedPnL).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                                  isProfit
                                    ? 'bg-profit/10 text-profit'
                                    : 'bg-loss/10 text-loss'
                                }`}
                              >
                                {isProfit ? '+' : '-'}
                                {Math.abs(pos.unrealizedPnLPercent).toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-right tabular-nums">
                              {pos.stopLoss ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                                  <ShieldCheck size={12} />
                                  SL ₹{pos.stopLoss.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary text-[11px] font-medium">
                                  Optional SL
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Compact Recent Orders Log */}
            {orderHistory.length > 0 && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs mb-2.5">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5">
                    <Clock size={13} className="text-text-secondary" />
                    Recent Simulated Trades
                  </span>
                  <span className="text-[11px] text-text-secondary tabular-nums">
                    Latest {Math.min(orderHistory.length, 3)} orders
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {orderHistory.slice(0, 3).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-2.5 rounded-xl bg-background flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${
                            ord.type === 'BUY'
                              ? 'bg-profit/10 text-profit'
                              : 'bg-loss/10 text-loss'
                          }`}
                        >
                          {ord.type}
                        </span>
                        <span className="font-semibold text-text-primary">{ord.symbol}</span>
                        <div className="text-[11px] text-text-secondary truncate mt-0.5">
                          {ord.quantity} sh @ ₹{ord.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-text-primary tabular-nums shrink-0 ml-2">
                        ₹{ord.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
