import React, { useState, useEffect, useMemo } from 'react';
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
  RotateCcw,
  Star,
  Layers,
  Sparkles,
  Shield,
  HelpCircle,
  Eye,
  Sliders,
  DollarSign,
  Activity,
  Check,
  X
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { StockQuote, PortfolioPosition, TradeOrder } from '../types';
import { RiskRealityCheckModal, ProposedTradeData, PortfolioRiskMetrics } from '../components/simulator/RiskRealityCheckModal';

export const SimulatorPage: React.FC = () => {
  const {
    stocks,
    virtualCash,
    executeTrade,
    positions,
    squareOffPosition,
    orderHistory,
    totalPortfolioValue,
    totalInvested,
    unrealizedPnL,
    unrealizedPnLPercent,
    resetPortfolio
  } = useSimulator();

  // Selected stock
  const [selectedStock, setSelectedStock] = useState<StockQuote>(stocks[0]);

  // Watchlist controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [watchlistFilter, setWatchlistFilter] = useState<'ALL' | 'FAVORITES' | 'GAINERS' | 'LOSERS'>('ALL');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('mindmark_fav_stocks');
    return saved ? JSON.parse(saved) : ['RELIANCE', 'TCS', 'HDFCBANK'];
  });

  // Chart controls
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y' | 'ALL'>('1D');
  const [chartMode, setChartMode] = useState<'LINE' | 'CANDLE'>('LINE');

  // Trade form state
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [productType, setProductType] = useState<'CNC' | 'MIS_LEVERAGED' | 'OPTIONS'>('CNC');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(5);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [reasonTag, setReasonTag] = useState<string>('Long-term Fundamental Value');
  const [hasAcknowledgedVirtual, setHasAcknowledgedVirtual] = useState<boolean>(true);

  // Risk Reality Check Engine State
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [pendingTrade, setPendingTrade] = useState<ProposedTradeData | null>(null);

  // Active view tab below trading panel: HOLDINGS vs ORDER HISTORY
  const [activeBottomTab, setActiveBottomTab] = useState<'HOLDINGS' | 'ORDERS'>('HOLDINGS');
  const [orderHistoryFilter, setOrderHistoryFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  // Notifications and Learning Moment Modal
  const [tradeNotification, setTradeNotification] = useState<{ message: string; isError: boolean } | null>(null);
  const [learningMomentData, setLearningMomentData] = useState<{
    stockSymbol: string;
    action: 'BUY' | 'SELL';
    qty: number;
    price: number;
    insight: string;
  } | null>(null);

  // Reset confirmation modal
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('mindmark_fav_stocks', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  // Watchlist filtering
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (watchlistFilter === 'FAVORITES') return favorites.includes(stock.symbol);
    if (watchlistFilter === 'GAINERS') return stock.change >= 0;
    if (watchlistFilter === 'LOSERS') return stock.change < 0;
    return true;
  });

  // Current position held in selected stock
  const existingPosition = positions.find(p => p.symbol === selectedStock.symbol);

  // Execution pricing and cost calculations
  const effectivePrice = orderType === 'LIMIT' && limitPrice && parseFloat(limitPrice) > 0
    ? parseFloat(limitPrice)
    : selectedStock.price;

  const estimatedValue = effectivePrice * quantity;
  const leverageMultiplier = productType === 'MIS_LEVERAGED' ? 5 : 1;
  const marginRequired = productType === 'MIS_LEVERAGED'
    ? estimatedValue / 5
    : productType === 'OPTIONS'
    ? Math.max(500, Math.round(estimatedValue * 0.05))
    : estimatedValue;

  const simulatedCharges = Math.max(5, Math.round(estimatedValue * 0.0005 * 100) / 100); // 0.05% simulated STT/brokerage fees
  const totalRequiredCapital = marginRequired + simulatedCharges;

  // Max affordable shares calculation
  const maxAffordableQty = Math.max(
    1,
    Math.floor((virtualCash * (productType === 'MIS_LEVERAGED' ? 5 : 1)) / (selectedStock.price * 1.0005))
  );

  // Risk Reward calculation
  const parsedStopLoss = parseFloat(stopLoss);
  const parsedTarget = parseFloat(targetPrice);
  let riskRewardRatio = 'N/A';
  if (parsedStopLoss && parsedTarget && parsedStopLoss < selectedStock.price && parsedTarget > selectedStock.price) {
    const risk = selectedStock.price - parsedStopLoss;
    const reward = parsedTarget - selectedStock.price;
    riskRewardRatio = `1 : ${(reward / risk).toFixed(2)}`;
  }

  // Proposed Trade Object for Risk Reality Check
  const proposedTrade: ProposedTradeData = useMemo(() => ({
    symbol: selectedStock.symbol,
    name: selectedStock.name,
    type: tradeType,
    orderType,
    productType,
    leverageMultiplier,
    quantity,
    price: effectivePrice,
    totalValue: estimatedValue,
    marginRequired,
    charges: simulatedCharges,
    stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
    targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
    sector: selectedStock.sector
  }), [selectedStock, tradeType, orderType, productType, leverageMultiplier, quantity, effectivePrice, estimatedValue, marginRequired, simulatedCharges, stopLoss, targetPrice]);

  const existingStockVal = existingPosition ? existingPosition.currentValue : 0;
  const existingSectorVal = positions.filter(p => p.sector === selectedStock.sector).reduce((acc, p) => acc + p.currentValue, 0);

  const portfolioRiskMetrics: PortfolioRiskMetrics = useMemo(() => ({
    totalPortfolioValue,
    virtualCash,
    existingStockValue: existingStockVal,
    existingSectorValue: existingSectorVal,
    isAfterLosingTrade: orderHistory.length > 0 && orderHistory[0].type === 'SELL' && (orderHistory[0].learningMoment?.toLowerCase().includes('loss') || false)
  }), [totalPortfolioValue, virtualCash, existingStockVal, existingSectorVal, orderHistory]);

  // Execute Trade Directly
  const executeTradeDirectly = () => {
    const result = executeTrade({
      symbol: selectedStock.symbol,
      type: tradeType,
      quantity,
      orderType,
      productType,
      leverageMultiplier,
      limitPrice: orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      reasonTag,
    });

    if (result.success) {
      setTradeNotification({ message: result.message, isError: false });
      if (result.learningMoment) {
        setLearningMomentData({
          stockSymbol: selectedStock.symbol,
          action: tradeType,
          qty: quantity,
          price: effectivePrice,
          insight: result.learningMoment
        });
      }
    } else {
      setTradeNotification({ message: result.message, isError: true });
    }

    setTimeout(() => {
      setTradeNotification(null);
    }, 5000);
  };

  // Handle Trade Execution with Pre-Trade Risk Reality Check Interception
  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      setTradeNotification({ message: 'Quantity must be greater than zero.', isError: true });
      return;
    }

    if (tradeType === 'BUY' && totalRequiredCapital > virtualCash) {
      setTradeNotification({
        message: `Insufficient virtual funds. Required: ₹${totalRequiredCapital.toFixed(2)}, Available: ₹${virtualCash.toFixed(2)}`,
        isError: true
      });
      return;
    }

    if (tradeType === 'SELL' && (!existingPosition || existingPosition.quantity < quantity)) {
      setTradeNotification({
        message: `Cannot sell ${quantity} shares. You currently own ${existingPosition ? existingPosition.quantity : 0} shares of ${selectedStock.symbol}.`,
        isError: true
      });
      return;
    }

    // Evaluate Risk Triggers
    const positionRatio = (estimatedValue / totalPortfolioValue) * 100;
    const postStockConc = ((existingStockVal + (tradeType === 'BUY' ? estimatedValue : 0)) / totalPortfolioValue) * 100;
    const postSectorConc = ((existingSectorVal + (tradeType === 'BUY' ? estimatedValue : 0)) / totalPortfolioValue) * 100;
    const postCashRatio = ((virtualCash - (tradeType === 'BUY' ? totalRequiredCapital : 0)) / totalPortfolioValue) * 100;

    const isLargePosition = positionRatio > 25;
    const isConcentrated = postStockConc > 35;
    const isSectorHeavy = postSectorConc > 45;
    const isLowCash = tradeType === 'BUY' && postCashRatio < 15;
    const isLeveragedOrOptions = productType !== 'CNC';
    const isAfterLoss = portfolioRiskMetrics.isAfterLosingTrade && positionRatio > 20;

    // Trigger Risk Reality Check if any educational risk threshold is met
    if (isLargePosition || isConcentrated || isSectorHeavy || isLowCash || isLeveragedOrOptions || isAfterLoss) {
      setPendingTrade(proposedTrade);
      setIsRiskModalOpen(true);
      return;
    }

    executeTradeDirectly();
  };

  const handleConfirmReset = () => {
    resetPortfolio();
    setIsResetModalOpen(false);
    setTradeNotification({
      message: 'Virtual portfolio restored to ₹1,00,000. Simulation history cleared.',
      isError: false
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 font-sans">
      {/* ========================================================================= */}
      {/* TOP HEADER: Simulation Ledger Status & Reset Confirmation                 */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
              Paper Trading Simulator
            </span>
            <Badge variant="warning" size="sm">SAMPLE MARKET DATASET • SIMULATION ONLY</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
            Dalal Street Virtual Execution Desk
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Test trading strategies with ₹1,00,000 paper funds. No deposits, no withdrawals, zero real-money risk.
          </p>
        </div>

        {/* Financial Ledger Mini Strip & Reset */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2.5 px-3.5 rounded-xl bg-surface-elevated border border-primary/25 font-mono text-right">
            <span className="text-[10px] text-text-muted uppercase block">Available Virtual Cash</span>
            <span className="font-bold text-sm text-primary text-tabular">
              ₹{virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-2.5 px-3.5 rounded-xl bg-surface-elevated border border-border font-mono text-right hidden sm:block">
            <span className="text-[10px] text-text-muted uppercase block">Total Net Worth</span>
            <span className="font-bold text-sm text-text-primary text-tabular">
              ₹{totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetModalOpen(true)}
            icon={<RotateCcw size={14} />}
            className="text-xs font-mono text-text-muted hover:text-warning"
          >
            Reset Funds
          </Button>
        </div>
      </div>

      {/* Trade Notification Alert */}
      {tradeNotification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono transition-all animate-in fade-in duration-200 ${
          tradeNotification.isError
            ? 'bg-danger/10 border-danger/40 text-danger'
            : 'bg-primary/10 border-primary/40 text-primary'
        }`}>
          <div className="flex items-center gap-2">
            {tradeNotification.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{tradeNotification.message}</span>
          </div>
          <button onClick={() => setTradeNotification(null)} className="underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN 3-PANEL TRADING WORKSPACE GRID                                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================================= */}
        {/* LEFT PANEL: Watchlist, Search, Price, Daily % Change (3.5 cols)          */}
        {/* ======================================================================= */}
        <Card variant="elevated" className="lg:col-span-4 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/50 text-xs font-mono">
            <span className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-primary" /> Indian Equities
            </span>
            <span className="text-[10px] text-text-muted">{filteredStocks.length} Stocks</span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search symbol (e.g. RELIANCE, TCS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border pl-8 pr-3 py-1.5 rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-primary placeholder:text-text-muted"
            />
          </div>

          {/* Watchlist Filter Tabs */}
          <div className="flex gap-1 bg-surface p-1 rounded-lg border border-border text-[10px] font-mono">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'FAVORITES', label: '⭐ Starred' },
              { id: 'GAINERS', label: 'Gainers' },
              { id: 'LOSERS', label: 'Losers' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setWatchlistFilter(tab.id as any)}
                className={`flex-1 py-1 rounded transition-colors ${
                  watchlistFilter === tab.id
                    ? 'bg-primary text-background font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stock List Scroll area */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredStocks.map((stock) => {
              const isSelected = selectedStock.symbol === stock.symbol;
              const isFav = favorites.includes(stock.symbol);
              const isUp = stock.change >= 0;

              return (
                <div
                  key={stock.symbol}
                  onClick={() => setSelectedStock(stock)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-surface-elevated border-primary/50 shadow-glow'
                      : 'bg-surface border-border/70 hover:border-text-secondary/40 hover:bg-surface-elevated/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleFavorite(stock.symbol, e)}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      className={`p-1 rounded hover:bg-background transition-colors ${
                        isFav ? 'text-warning' : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <Star size={13} fill={isFav ? '#F5B942' : 'none'} />
                    </button>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-text-primary group-hover:text-primary transition-colors">
                          {stock.symbol}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-background border border-border text-text-muted">
                          {stock.exchange}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted truncate block max-w-[130px]">
                        {stock.name}
                      </span>
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
        </Card>

        {/* ======================================================================= */}
        {/* MAIN PANEL: Stock Details, Interactive Chart & Fundamentals (5.5 cols)  */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="elevated" className="p-5 space-y-4">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-mono text-text-primary">
                    {selectedStock.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5 font-mono">
                  <span>NSE: {selectedStock.symbol}</span>
                  <span>•</span>
                  <span>{selectedStock.sector}</span>
                  <span>•</span>
                  <span className="text-primary font-semibold">Beta: 1.05</span>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono">
                <div className="text-2xl font-extrabold text-text-primary text-tabular">
                  ₹{selectedStock.price.toFixed(2)}
                </div>
                <div className={`text-xs font-semibold ${
                  selectedStock.change >= 0 ? 'text-primary' : 'text-danger'
                }`}>
                  {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} ({selectedStock.changePercent.toFixed(2)}%) Today
                </div>
              </div>
            </div>

            {/* Timeframe & Chart Style Toolbar */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex gap-1 bg-surface p-0.5 rounded-lg border border-border">
                {(['1D', '1W', '1M', '1Y', 'ALL'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-0.5 rounded text-[11px] transition-colors ${
                      timeframe === tf
                        ? 'bg-primary text-background font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 bg-surface p-0.5 rounded-lg border border-border">
                <button
                  onClick={() => setChartMode('LINE')}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    chartMode === 'LINE' ? 'bg-secondary text-background font-bold' : 'text-text-muted'
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartMode('CANDLE')}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    chartMode === 'CANDLE' ? 'bg-secondary text-background font-bold' : 'text-text-muted'
                  }`}
                >
                  Candles
                </button>
              </div>
            </div>

            {/* Dynamic Interactive SVG Chart */}
            <div className="h-60 w-full bg-background/60 rounded-xl p-4 flex flex-col justify-between border border-border/50 relative overflow-hidden">
              <div className="flex justify-between text-[11px] font-mono text-text-muted">
                <span>Low: ₹{selectedStock.dayLow.toFixed(2)}</span>
                <span className="text-secondary font-semibold">Period: {timeframe} View</span>
                <span>High: ₹{selectedStock.dayHigh.toFixed(2)}</span>
              </div>

              {chartMode === 'LINE' ? (
                /* Dynamic SVG Area Graph */
                <svg className="w-full h-36 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                  <defs>
                    <linearGradient id="stockAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={selectedStock.change >= 0 ? '#45D6B5' : '#F16D75'} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={selectedStock.change >= 0 ? '#45D6B5' : '#F16D75'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* 20-period Moving Average dashed line */}
                  <path
                    d="M0,65 Q120,55 240,48 T360,42 T500,28"
                    fill="none"
                    stroke="#78A9FF"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />

                  {/* Main Price Action line */}
                  <path
                    d={selectedStock.change >= 0
                      ? 'M0,75 Q100,55 200,68 T340,35 T500,18'
                      : 'M0,25 Q120,35 220,48 T350,70 T500,82'}
                    fill="none"
                    stroke={selectedStock.change >= 0 ? '#45D6B5' : '#F16D75'}
                    strokeWidth="2.5"
                  />
                  <path
                    d={selectedStock.change >= 0
                      ? 'M0,75 Q100,55 200,68 T340,35 T500,18 L500,100 L0,100 Z'
                      : 'M0,25 Q120,35 220,48 T350,70 T500,82 L500,100 L0,100 Z'}
                    fill="url(#stockAreaGrad)"
                  />
                  <circle
                    cx="500"
                    cy={selectedStock.change >= 0 ? 18 : 82}
                    r="4"
                    fill={selectedStock.change >= 0 ? '#45D6B5' : '#F16D75'}
                  />
                </svg>
              ) : (
                /* Simulated Candlestick Bars */
                <div className="h-36 flex items-end justify-between px-3 pt-4">
                  {[
                    { h: 45, up: true, o: 15, c: 38 },
                    { h: 60, up: false, o: 50, c: 25 },
                    { h: 70, up: true, o: 20, c: 62 },
                    { h: 55, up: true, o: 30, c: 50 },
                    { h: 80, up: false, o: 70, c: 35 },
                    { h: 65, up: true, o: 25, c: 58 },
                    { h: 90, up: true, o: 40, c: 85 },
                    { h: 75, up: false, o: 65, c: 45 },
                    { h: 88, up: true, o: 42, c: 80 },
                    { h: 95, up: true, o: 55, c: 92 },
                  ].map((bar, bIdx) => (
                    <div key={bIdx} className="flex flex-col items-center w-3">
                      {/* Upper wick */}
                      <div className={`w-0.5 ${bar.up ? 'bg-primary' : 'bg-danger'}`} style={{ height: '10px' }} />
                      {/* Body */}
                      <div
                        className={`w-2.5 rounded-sm ${bar.up ? 'bg-primary' : 'bg-danger'}`}
                        style={{ height: `${bar.h}px` }}
                      />
                      {/* Lower wick */}
                      <div className={`w-0.5 ${bar.up ? 'bg-primary' : 'bg-danger'}`} style={{ height: '8px' }} />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-[10px] font-mono text-text-muted">
                <span>09:15 IST (Open: ₹{selectedStock.open.toFixed(2)})</span>
                <span>Volume: {selectedStock.volume}</span>
                <span>15:30 IST (Close)</span>
              </div>
            </div>

            {/* Fundamental & Technical Stat Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center font-mono">
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Market Cap</span>
                <span className="text-xs font-bold text-text-primary">{selectedStock.marketCap}</span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">P/E Ratio</span>
                <span className="text-xs font-bold text-text-primary">{selectedStock.pe}x</span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Prev. Close</span>
                <span className="text-xs font-bold text-text-primary">₹{selectedStock.previousClose.toFixed(2)}</span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border/60">
                <span className="text-[10px] text-text-muted block">Risk Rating</span>
                <span className="text-xs font-bold text-primary">{selectedStock.riskRating}</span>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed pt-1">
              {selectedStock.description}
            </p>
          </Card>
        </div>

        {/* ======================================================================= */}
        {/* TRADE PANEL: Buy/Sell, Quantity, Validation & Confirmation (3.5 cols)   */}
        {/* ======================================================================= */}
        <Card variant="elevated" className="lg:col-span-3 p-5 space-y-4">
          {/* Buy / Sell Selector */}
          <div className="flex border-b border-border/60 pb-3">
            <button
              type="button"
              onClick={() => setTradeType('BUY')}
              className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition-colors ${
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
              className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition-colors ${
                tradeType === 'SELL'
                  ? 'bg-danger text-background'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              SELL (SQUARE)
            </button>
          </div>

          <form onSubmit={handleTradeSubmit} className="space-y-3.5 text-xs">
            {/* Product Exposure Mode */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                <span>Product / Exposure Mode</span>
                <span className="text-primary font-bold">
                  {productType === 'CNC' ? '1x Delivery (Cash)' : productType === 'MIS_LEVERAGED' ? '5x Intraday Leverage' : 'F&O Options Sim'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setProductType('CNC')}
                  className={`py-1.5 px-1 rounded-md font-mono text-[10px] border transition-colors text-center ${
                    productType === 'CNC'
                      ? 'border-primary text-primary bg-primary/10 font-bold'
                      : 'border-border text-text-muted hover:bg-surface'
                  }`}
                >
                  Delivery 1x
                </button>
                <button
                  type="button"
                  onClick={() => setProductType('MIS_LEVERAGED')}
                  className={`py-1.5 px-1 rounded-md font-mono text-[10px] border transition-colors text-center ${
                    productType === 'MIS_LEVERAGED'
                      ? 'border-warning text-warning bg-warning/10 font-bold'
                      : 'border-border text-text-muted hover:bg-surface'
                  }`}
                >
                  5x Leverage
                </button>
                <button
                  type="button"
                  onClick={() => setProductType('OPTIONS')}
                  className={`py-1.5 px-1 rounded-md font-mono text-[10px] border transition-colors text-center ${
                    productType === 'OPTIONS'
                      ? 'border-danger text-danger bg-danger/10 font-bold'
                      : 'border-border text-text-muted hover:bg-surface'
                  }`}
                >
                  Options (F&O)
                </button>
              </div>
            </div>

            {/* Order Type: Market vs Limit */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                <span>Order Execution Type</span>
                <span>{orderType}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`py-1.5 px-2 rounded-md font-mono text-xs border transition-colors ${
                    orderType === 'MARKET'
                      ? 'border-secondary text-secondary bg-secondary/10 font-bold'
                      : 'border-border text-text-muted hover:bg-surface'
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('LIMIT')}
                  className={`py-1.5 px-2 rounded-md font-mono text-xs border transition-colors ${
                    orderType === 'LIMIT'
                      ? 'border-secondary text-secondary bg-secondary/10 font-bold'
                      : 'border-border text-text-muted hover:bg-surface'
                  }`}
                >
                  Limit
                </button>
              </div>
            </div>

            {/* Limit Price Input (if limit selected) */}
            {orderType === 'LIMIT' && (
              <div>
                <label className="text-[11px] font-mono text-secondary block mb-1">
                  Limit Price (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={`Current: ₹${selectedStock.price.toFixed(2)}`}
                  className="w-full bg-surface border border-border px-3 py-1.5 rounded-lg font-mono text-text-primary text-xs focus:outline-none focus:border-secondary"
                />
              </div>
            )}

            {/* Quantity Input */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                <span>Quantity (Shares)</span>
                {existingPosition && (
                  <span className="text-secondary font-semibold">
                    Owned: {existingPosition.quantity} shares
                  </span>
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

              {/* Quick Multiplier Chips */}
              <div className="flex gap-1.5 mt-1.5">
                {[5, 10, 25, 50].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className="flex-1 py-0.5 rounded bg-surface hover:bg-surface-elevated border border-border text-[10px] font-mono text-text-muted"
                  >
                    +{q}
                  </button>
                ))}
                {tradeType === 'BUY' && (
                  <button
                    type="button"
                    onClick={() => setQuantity(maxAffordableQty)}
                    className="flex-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 text-[10px] font-mono font-bold"
                  >
                    Max ({maxAffordableQty})
                  </button>
                )}
              </div>
            </div>

            {/* Stop Loss (Safe Habit) */}
            <div>
              <label className="text-[11px] font-mono text-warning block mb-1">
                Pre-set Stop-Loss (₹) *Disciplined Exit
              </label>
              <input
                type="number"
                step="0.05"
                placeholder={`e.g. ${(selectedStock.price * 0.97).toFixed(2)}`}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-1.5 rounded-lg font-mono text-text-primary text-xs focus:outline-none focus:border-warning placeholder:text-text-muted"
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
                className="w-full bg-surface border border-border px-3 py-1.5 rounded-lg font-mono text-text-primary text-xs focus:outline-none focus:border-primary placeholder:text-text-muted"
              />
            </div>

            {/* Risk:Reward ratio readout */}
            <div className="flex justify-between text-[11px] font-mono text-text-muted">
              <span>Risk : Reward Ratio:</span>
              <span className="font-bold text-primary">{riskRewardRatio}</span>
            </div>

            {/* Trade Thesis / Journal Tag */}
            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">
                Trading Thesis Tag
              </label>
              <select
                value={reasonTag}
                onChange={(e) => setReasonTag(e.target.value)}
                className="w-full bg-surface border border-border px-2.5 py-1.5 rounded-lg text-text-primary text-xs focus:outline-none focus:border-primary font-mono"
              >
                <option value="Long-term Fundamental Value">Long-term Fundamental Value</option>
                <option value="Technical Support / Breakout">Technical Support / Breakout</option>
                <option value="Quarterly Earnings Catalyst">Quarterly Earnings Catalyst</option>
                <option value="Sector Macro Rotation">Sector Macro Rotation</option>
                <option value="Experimental / Testing Setup">Experimental / Testing Setup</option>
              </select>
            </div>

            {/* Cost & Simulated Fees Breakdown */}
            <div className="p-3 rounded-xl bg-surface border border-border/80 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-text-muted">
                <span>Estimated Value:</span>
                <span className="text-text-primary font-bold">₹{estimatedValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Simulated Fees (STT/Exch):</span>
                <span>₹{simulatedCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-muted pt-1 border-t border-border/50">
                <span>Total Capital Required:</span>
                <span className="font-bold text-primary text-xs">₹{totalRequiredCapital.toFixed(2)}</span>
              </div>
            </div>

            {/* Mandatory Virtual Understanding Checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="virtualAcknowledge"
                checked={hasAcknowledgedVirtual}
                onChange={(e) => setHasAcknowledgedVirtual(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer mt-0.5"
              />
              <label htmlFor="virtualAcknowledge" className="text-[10px] text-text-muted leading-tight cursor-pointer">
                I understand this is a 100% virtual paper trade using simulated capital.
              </label>
            </div>

            {/* Run Risk Reality Check Button */}
            <button
              type="button"
              onClick={() => {
                setPendingTrade(proposedTrade);
                setIsRiskModalOpen(true);
              }}
              className="w-full py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-warning/40 text-warning text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShieldAlert size={14} /> Run Pre-Trade Risk Reality Check
            </button>

            {/* Submit Trade Button */}
            <Button
              type="submit"
              variant={tradeType === 'BUY' ? 'primary' : 'danger'}
              size="md"
              disabled={!hasAcknowledgedVirtual}
              className="w-full font-bold font-mono text-xs"
            >
              Confirm Virtual {tradeType} ({quantity} Shares)
            </Button>
          </form>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM TABS: ACTIVE HOLDINGS vs SIMULATED TRANSACTION HISTORY             */}
      {/* ========================================================================= */}
      <Card variant="elevated" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveBottomTab('HOLDINGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                activeBottomTab === 'HOLDINGS'
                  ? 'bg-primary text-background'
                  : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              Active Paper Holdings ({positions.length})
            </button>
            <button
              onClick={() => setActiveBottomTab('ORDERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                activeBottomTab === 'ORDERS'
                  ? 'bg-secondary text-background'
                  : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              Simulation History ({orderHistory.length})
            </button>
          </div>

          {activeBottomTab === 'HOLDINGS' ? (
            <span className="text-xs font-mono text-text-muted">
              Total Holdings Value: ₹{(totalPortfolioValue - virtualCash).toFixed(2)}
            </span>
          ) : (
            <div className="flex gap-1 text-[11px] font-mono">
              {(['ALL', 'BUY', 'SELL'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setOrderHistoryFilter(f)}
                  className={`px-2 py-0.5 rounded ${
                    orderHistoryFilter === f ? 'bg-surface-elevated text-text-primary font-bold border border-border' : 'text-text-muted'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab 1: Active Holdings Table */}
        {activeBottomTab === 'HOLDINGS' && (
          positions.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-xs text-text-muted">You have no active simulated holdings.</p>
              <span className="text-[11px] text-text-muted block">Use the order desk above to take your first paper position.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border/40 text-[11px] text-text-muted">
                    <th className="py-2.5 px-2">Stock</th>
                    <th className="py-2.5 px-2 text-right">Qty</th>
                    <th className="py-2.5 px-2 text-right">Avg Buy (₹)</th>
                    <th className="py-2.5 px-2 text-right">LTP (₹)</th>
                    <th className="py-2.5 px-2 text-right">Invested</th>
                    <th className="py-2.5 px-2 text-right">Current Value</th>
                    <th className="py-2.5 px-2 text-right">P&L</th>
                    <th className="py-2.5 px-2 text-center">Stop Loss</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {positions.map((pos) => {
                    const isProfit = pos.unrealizedPnL >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="py-3 px-2">
                          <span className="font-bold text-text-primary block">{pos.symbol}</span>
                          <span className="text-[10px] text-text-muted">{pos.sector}</span>
                        </td>
                        <td className="py-3 px-2 text-right text-tabular font-bold">{pos.quantity}</td>
                        <td className="py-3 px-2 text-right text-tabular">₹{pos.averageBuyPrice.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right text-tabular font-semibold">₹{pos.currentPrice.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right text-tabular">₹{pos.totalCost.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right text-tabular font-bold">₹{pos.currentValue.toFixed(2)}</td>
                        <td className={`py-3 px-2 text-right text-tabular font-bold ${
                          isProfit ? 'text-primary' : 'text-danger'
                        }`}>
                          {isProfit ? '+' : ''}₹{pos.unrealizedPnL.toFixed(2)} ({isProfit ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%)
                        </td>
                        <td className="py-3 px-2 text-center text-warning text-[11px]">
                          {pos.stopLoss ? `₹${pos.stopLoss.toFixed(2)}` : 'None'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] py-1 px-2 text-danger hover:bg-danger/10 hover:border-danger/40"
                            onClick={() => squareOffPosition(pos.id)}
                          >
                            Exit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tab 2: Transaction History Table */}
        {activeBottomTab === 'ORDERS' && (
          orderHistory.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-muted">
              No transactions executed in this session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border/40 text-[11px] text-text-muted">
                    <th className="py-2.5 px-2">Timestamp</th>
                    <th className="py-2.5 px-2">Action</th>
                    <th className="py-2.5 px-2">Symbol</th>
                    <th className="py-2.5 px-2 text-right">Qty</th>
                    <th className="py-2.5 px-2 text-right">Price (₹)</th>
                    <th className="py-2.5 px-2 text-right">Total (₹)</th>
                    <th className="py-2.5 px-2 text-right">Fees</th>
                    <th className="py-2.5 px-2">Reason Tag</th>
                    <th className="py-2.5 px-2 text-center">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {orderHistory
                    .filter(ord => orderHistoryFilter === 'ALL' || ord.type === orderHistoryFilter)
                    .map((ord) => (
                      <tr key={ord.id} className="hover:bg-surface-elevated/40 transition-colors">
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
                        <td className="py-2.5 px-2 text-right text-tabular font-bold">₹{ord.totalValue.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right text-text-muted text-[10px]">₹{(ord.charges || 5).toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-text-secondary text-[11px] truncate max-w-[160px]">{ord.reasonTag}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted">
                            PAPER
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      {/* ========================================================================= */}
      {/* LEARNING MOMENT MODAL (Pops up after every simulated trade)                */}
      {/* ========================================================================= */}
      {learningMomentData && (
        <Modal
          isOpen={true}
          onClose={() => setLearningMomentData(null)}
          title="Learning Moment: Trade Analysis"
          description="Every simulated trade teaches you about risk, position sizing, and emotional control."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface border border-primary/25 font-mono text-xs flex items-center justify-between">
              <div>
                <span className="text-text-muted block text-[10px]">Simulated Execution</span>
                <span className="font-bold text-text-primary">
                  {learningMomentData.action} {learningMomentData.qty} Shares of {learningMomentData.stockSymbol}
                </span>
              </div>
              <span className="text-primary font-bold text-sm">
                ₹{(learningMomentData.price * learningMomentData.qty).toFixed(2)}
              </span>
            </div>

            {/* The Educational Insight */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-secondary/30 space-y-2 text-xs">
              <span className="font-bold text-secondary flex items-center gap-1.5 font-mono">
                <Sparkles size={15} /> Educational Behavioral Feedback:
              </span>
              <p className="text-text-primary leading-relaxed text-xs">
                "{learningMomentData.insight}"
              </p>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed">
              Notice that MINDMARK does not praise trades based on whether prices go up or down. A disciplined trade with a pre-set stop loss is a success, even if the market moves against you.
            </p>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setLearningMomentData(null)}
              >
                Got It, Continue Practicing
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* RESET PORTFOLIO CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Virtual Trading Funds"
        description="Are you sure you want to restore your virtual funds to ₹1,00,000?"
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary leading-relaxed">
            This will wipe your open simulated holdings and reset your liquid cash to exactly <strong className="text-primary font-mono">₹1,00,000.00</strong>. Your completed course tracks will remain saved.
          </p>

          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning flex items-start gap-2">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              In real market investing, there is no reset button. Use virtual resets thoughtfully to test distinct asset allocation frameworks.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="warning" size="sm" onClick={handleConfirmReset}>
              Confirm Reset to ₹1,00,000
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pre-Trade Risk Reality Check Modal */}
      {isRiskModalOpen && (
        <RiskRealityCheckModal
          isOpen={isRiskModalOpen}
          onClose={() => setIsRiskModalOpen(false)}
          onConfirmTrade={executeTradeDirectly}
          onAdjustSize={(recommendedQty) => setQuantity(recommendedQty)}
          trade={pendingTrade || proposedTrade}
          portfolio={portfolioRiskMetrics}
        />
      )}
    </div>
  );
};
