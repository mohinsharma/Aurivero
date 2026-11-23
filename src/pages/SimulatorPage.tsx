import React, { useState } from 'react';
import {
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { StockQuote } from '../types';

export const SimulatorPage: React.FC = () => {
  const {
    stocks,
    virtualCash,
    executeTrade,
    positions,
    squareOffPosition,
    orderHistory
  } = useSimulator();

  const [selectedStock, setSelectedStock] = useState<StockQuote>(stocks[0]);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<number>(10);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [reasonTag, setReasonTag] = useState<string>('Long-term Fundamental Value');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1D');
  const [notification, setNotification] = useState<{ message: string; isError: boolean } | null>(null);

  const existingPosition = positions.find(p => p.symbol === selectedStock.symbol);
  const totalCost = selectedStock.price * quantity;
  const isConcentrationRisk = totalCost > (virtualCash + totalCost) * 0.25;

  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    const result = executeTrade({
      symbol: selectedStock.symbol,
      type: tradeType,
      quantity,
      orderType,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      reasonTag,
    });

    setNotification({
      message: result.message,
      isError: !result.success,
    });

    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Quick risk reward calculation
  const parsedStopLoss = parseFloat(stopLoss);
  const parsedTarget = parseFloat(targetPrice);
  let riskRewardRatio = 'N/A';
  if (parsedStopLoss && parsedTarget && parsedStopLoss < selectedStock.price && parsedTarget > selectedStock.price) {
    const risk = selectedStock.price - parsedStopLoss;
    const reward = parsedTarget - selectedStock.price;
    riskRewardRatio = `1 : ${(reward / risk).toFixed(2)}`;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Disclaimer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface border border-border text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="primary" dot size="sm">PAPER SIMULATOR ACTIVE</Badge>
          <span className="text-text-secondary">
            Simulated Dalal Street execution. Available Virtual Cash: <span className="font-mono font-bold text-primary">₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </span>
        </div>
        <span className="text-text-muted font-mono text-[11px]">T+1 Settlement Emulation</span>
      </div>

      {/* Trade Status Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono transition-all animate-in fade-in duration-200 ${
          notification.isError
            ? 'bg-danger/10 border-danger/30 text-danger'
            : 'bg-primary/10 border-primary/30 text-primary'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Main Stock Picker & Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Stock Watchlist (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-text-muted px-1">
            <span>NSE Watchlist</span>
            <span>{stocks.length} Assets</span>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {stocks.map((stock) => {
              const isSelected = selectedStock.symbol === stock.symbol;
              const isUp = stock.change >= 0;
              return (
                <div
                  key={stock.symbol}
                  onClick={() => setSelectedStock(stock)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-surface-elevated border-primary/50 shadow-glow'
                      : 'bg-surface border-border hover:border-text-secondary/40 hover:bg-surface-elevated/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-text-primary">
                        {stock.symbol}
                      </span>
                      <span className="text-[10px] text-text-muted uppercase px-1 py-0.2 rounded bg-background border border-border">
                        {stock.exchange}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted truncate max-w-[160px]">
                      {stock.name}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-text-primary text-tabular">
                      ₹{stock.price.toFixed(2)}
                    </div>
                    <div className={`text-[10px] font-semibold flex items-center justify-end ${
                      isUp ? 'text-primary' : 'text-danger'
                    }`}>
                      {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Interactive Stock Price Chart & Fundamentals (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="elevated" className="p-5">
            {/* Header info */}
            <div className="flex items-start justify-between pb-4 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-text-primary">
                    {selectedStock.name}
                  </h2>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  NSE: {selectedStock.symbol} • {selectedStock.sector}
                </p>
              </div>

              <div className="text-right font-mono">
                <div className="text-xl font-bold text-text-primary text-tabular">
                  ₹{selectedStock.price.toFixed(2)}
                </div>
                <div className={`text-xs font-semibold ${selectedStock.change >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} ({selectedStock.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>

            {/* Timeframe Bar */}
            <div className="flex items-center justify-between pt-3 pb-2 text-xs font-mono">
              <span className="text-text-muted">Interactive Price Action</span>
              <div className="flex gap-1 bg-surface rounded-lg p-0.5 border border-border">
                {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      timeframe === tf
                        ? 'bg-primary text-background font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-56 w-full bg-background/50 rounded-xl p-4 flex flex-col justify-between border border-border/60 relative overflow-hidden">
              <div className="flex justify-between text-[11px] font-mono text-text-muted">
                <span>Low: ₹{selectedStock.dayLow.toFixed(2)}</span>
                <span>High: ₹{selectedStock.dayHigh.toFixed(2)}</span>
              </div>

              {/* Dynamic SVG Visual */}
              <svg className="w-full h-32 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                <defs>
                  <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={selectedStock.change >= 0 ? '#45D6B5' : '#F16D75'} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={selectedStock.change >= 0 ? '#45D6B5' : '#F16D75'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,70 Q120,40 240,60 T380,30 T500,20"
                  fill="none"
                  stroke={selectedStock.change >= 0 ? '#45D6B5' : '#F16D75'}
                  strokeWidth="3"
                />
                <path
                  d="M0,70 Q120,40 240,60 T380,30 T500,20 L500,100 L0,100 Z"
                  fill="url(#simGrad)"
                />
                <circle cx="500" cy="20" r="4" fill={selectedStock.change >= 0 ? '#45D6B5' : '#F16D75'} />
              </svg>

              <div className="flex justify-between text-[10px] font-mono text-text-muted">
                <span>09:15 IST</span>
                <span>Volume: {selectedStock.volume}</span>
                <span>15:30 IST</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/40 text-center font-mono">
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Market Cap</span>
                <span className="text-xs font-bold text-text-primary">{selectedStock.marketCap}</span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">P/E Ratio</span>
                <span className="text-xs font-bold text-text-primary">{selectedStock.pe}x</span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Risk Profile</span>
                <span className="text-xs font-bold text-primary">{selectedStock.riskRating}</span>
              </div>
            </div>

            <p className="text-[11px] text-text-secondary mt-3 leading-relaxed">
              {selectedStock.description}
            </p>
          </Card>
        </div>

        {/* Right Col: Virtual Execution Panel (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card variant="elevated" className="p-5">
            <div className="flex border-b border-border/60 pb-3 mb-4">
              <button
                type="button"
                onClick={() => setTradeType('BUY')}
                className={`flex-1 py-1.5 text-xs font-mono font-bold tracking-wider rounded-lg transition-colors ${
                  tradeType === 'BUY'
                    ? 'bg-primary text-background'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                BUY (LONG)
              </button>
              <button
                type="button"
                onClick={() => setTradeType('SELL')}
                className={`flex-1 py-1.5 text-xs font-mono font-bold tracking-wider rounded-lg transition-colors ${
                  tradeType === 'SELL'
                    ? 'bg-danger text-background'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                SELL / SQUARE
              </button>
            </div>

            <form onSubmit={handleTrade} className="space-y-3.5 text-xs">
              {/* Order Type Toggle */}
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('MARKET')}
                    className={`py-1 px-2 rounded-md font-mono text-[11px] border transition-colors ${
                      orderType === 'MARKET'
                        ? 'border-secondary text-secondary bg-secondary/10'
                        : 'border-border text-text-muted hover:bg-surface'
                    }`}
                  >
                    Market
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('LIMIT')}
                    className={`py-1 px-2 rounded-md font-mono text-[11px] border transition-colors ${
                      orderType === 'LIMIT'
                        ? 'border-secondary text-secondary bg-secondary/10'
                        : 'border-border text-text-muted hover:bg-surface'
                    }`}
                  >
                    Limit
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                  <span>Quantity (Shares)</span>
                  {existingPosition && (
                    <span className="text-secondary">Owned: {existingPosition.quantity}</span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-surface border border-border px-3 py-1.5 rounded-lg font-mono text-text-primary text-xs focus:outline-none focus:border-primary"
                />
                <div className="flex gap-1.5 mt-1.5">
                  {[5, 10, 25, 50].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="px-2 py-0.5 rounded bg-surface hover:bg-surface-elevated border border-border text-[10px] font-mono text-text-muted"
                    >
                      +{q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stop-Loss Price (Risk Guard) */}
              <div>
                <label className="text-[11px] font-mono text-warning block mb-1">
                  Pre-set Stop-Loss (₹) *Safe Habit
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder={`e.g. ${(selectedStock.price * 0.97).toFixed(2)}`}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-surface border border-border px-3 py-1.5 rounded-lg font-mono text-text-primary text-xs focus:outline-none focus:border-warning"
                />
              </div>

              {/* Target Price */}
              <div>
                <label className="text-[11px] font-mono text-primary block mb-1">
                  Target Price (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder={`e.g. ${(selectedStock.price * 1.06).toFixed(2)}`}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-surface border border-border px-3 py-1.5 rounded-lg font-mono text-text-primary text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {/* Risk:Reward preview */}
              <div className="flex justify-between text-[11px] font-mono text-text-muted pt-1">
                <span>Calculated Risk:Reward</span>
                <span className="text-primary font-bold">{riskRewardRatio}</span>
              </div>

              {/* Mandatory Trade Tag (Journaling Habit) */}
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">
                  Trade Thesis Tag
                </label>
                <select
                  value={reasonTag}
                  onChange={(e) => setReasonTag(e.target.value)}
                  className="w-full bg-surface border border-border px-2.5 py-1.5 rounded-lg text-text-primary text-xs focus:outline-none focus:border-primary"
                >
                  <option value="Long-term Fundamental Value">Long-term Fundamental Value</option>
                  <option value="Technical Support / Breakout">Technical Support / Breakout</option>
                  <option value="Quarterly Earnings Play">Quarterly Earnings Play</option>
                  <option value="Sector Rotation Macro">Sector Rotation Macro</option>
                  <option value="Emotional / FOMO Impulse">Emotional / FOMO Impulse</option>
                </select>
              </div>

              {/* Concentration warning */}
              {isConcentrationRisk && tradeType === 'BUY' && (
                <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-[10px] text-warning flex items-start gap-1.5">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Warning: Allocating &gt;25% of virtual capital to one stock violates professional risk diversification!
                  </span>
                </div>
              )}

              {/* Total & Submit Button */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between font-mono text-xs mb-2">
                  <span className="text-text-muted">Estimated Value:</span>
                  <span className="font-bold text-text-primary">₹{totalCost.toFixed(2)}</span>
                </div>

                <Button
                  type="submit"
                  variant={tradeType === 'BUY' ? 'primary' : 'danger'}
                  size="md"
                  className="w-full"
                >
                  Confirm Virtual {tradeType}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* Order Log and Active Holdings Bottom View */}
      <Card variant="elevated" className="p-5">
        <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">
          Simulated Orders & Active Executions
        </h3>

        {orderHistory.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">No trades placed in this simulation session yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-mono text-text-muted">
                  <th className="py-2 px-2">Time</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2">Symbol</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Price</th>
                  <th className="py-2 px-2 text-right">Total (₹)</th>
                  <th className="py-2 px-2">Reason Tag</th>
                  <th className="py-2 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-mono">
                {orderHistory.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-surface-elevated/40">
                    <td className="py-2.5 px-2 text-text-muted text-[11px]">{ord.timestamp}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ord.type === 'BUY' ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'
                      }`}>
                        {ord.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-bold text-text-primary">{ord.symbol}</td>
                    <td className="py-2.5 px-2 text-right text-tabular">{ord.quantity}</td>
                    <td className="py-2.5 px-2 text-right text-tabular">₹{ord.price.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right text-tabular font-semibold">₹{ord.totalValue.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-text-secondary text-[11px]">{ord.reasonTag}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
