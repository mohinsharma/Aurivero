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
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { StockQuote, PortfolioPosition, TradeOrder } from '../types';
import { RiskRealityCheckModal, ProposedTradeData, PortfolioRiskMetrics } from '../components/simulator/RiskRealityCheckModal';
import { PreDecisionContractCard, PreDecisionContractData } from '../components/simulator/PreDecisionContractCard';
import { api } from '../services/api';

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
  const [preDecisionContract, setPreDecisionContract] = useState<PreDecisionContractData | null>(null);
  const [decisionStartTime] = useState<number>(Date.now());

  // Active view tab below trading panel: HOLDINGS vs ORDER HISTORY
  const [activeBottomTab, setActiveBottomTab] = useState<'HOLDINGS' | 'ORDERS'>('HOLDINGS');
  const [orderHistoryFilter, setOrderHistoryFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  // Right-side dock tab (Order Ticket vs Watchlist) & beginner-friendly Advanced Options group
  const [activeRightTab, setActiveRightTab] = useState<'ORDER' | 'WATCHLIST'>('ORDER');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

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
      const durationSec = Math.max(1, Math.round((Date.now() - decisionStartTime) / 1000));
      api.behavior.recordEvent({
        client_event_id: `sim-${Date.now()}-${selectedStock.symbol}`,
        symbol: selectedStock.symbol,
        sector: selectedStock.sector,
        action: tradeType,
        execution_price: effectivePrice,
        quantity,
        market_change_pct: selectedStock.changePercent,
        stated_reason: preDecisionContract?.why_making_decision || reasonTag,
        confidence_level: preDecisionContract?.confidence_level,
        viewed_info: ['quote_panel', 'price_chart'],
        decision_duration_sec: durationSec,
        pre_decision_contract: preDecisionContract || undefined,
      }).catch(() => {});
      setPreDecisionContract(null);
    }

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

  const isSelectedUp = selectedStock.change >= 0;
  const isTotalPnlUp = unrealizedPnL >= 0;

  return (
    <div className="space-y-6 w-full pb-8 font-sans">
      {/* ========================================================================= */}
      {/* ZONE 1: TOP TOOLBAR (Stock Selector, Price, % Change & Virtual Ledger)    */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Slim Desk Identity & Ledger Strip */}
        <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#2962FF]" />
            <span className="text-xs font-semibold text-[#2962FF]">
              Paper Trading Simulator
            </span>
            <Badge variant="warning" size="sm">SAMPLE MARKET DATASET • SIMULATION ONLY</Badge>
            <span className="hidden xl:inline text-xs font-semibold text-[#131722] pl-2.5 border-l border-[#E2E8F0]">
              Dalal Street Virtual Execution Desk
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Test trading strategies with ₹1,00,000 paper funds. No deposits, no withdrawals, zero real-money risk.
          </p>
        </div>

        {/* Main TradingView-Style Instrument & Capital Toolbar */}
        <div className="px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left: Stock Selector, Current Price & % Change */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <label htmlFor="top-stock-selector" className="sr-only">
                Select Stock
              </label>
              <div className="relative">
                <select
                  id="top-stock-selector"
                  value={selectedStock.symbol}
                  onChange={(e) => {
                    const found = stocks.find(s => s.symbol === e.target.value);
                    if (found) setSelectedStock(found);
                  }}
                  className="appearance-none bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2962FF]/50 focus:border-[#2962FF] rounded-lg pl-3.5 pr-9 py-2 font-bold text-sm text-[#131722] focus:outline-none cursor-pointer transition-colors"
                >
                  {stocks.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.exchange}: {s.symbol} — {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
                />
              </div>

              <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#64748B] font-medium">
                {selectedStock.sector}
              </span>
            </div>

            <div className="h-7 w-px bg-[#E2E8F0] hidden sm:block" />

            {/* Current Price & Colorblind-Friendly +/- % Change */}
            <div className="flex items-baseline gap-3 tabular-nums">
              <span className="text-2xl font-bold text-[#131722]">
                ₹{selectedStock.price.toFixed(2)}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  isSelectedUp ? 'text-[#089981]' : 'text-[#F23645]'
                }`}
              >
                {isSelectedUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>
                  {isSelectedUp ? '+' : '-'}{Math.abs(selectedStock.change).toFixed(2)} ({isSelectedUp ? '+' : '-'}{Math.abs(selectedStock.changePercent).toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Right: Financial Ledger Mini Strip & Reset */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] text-right">
              <span className="text-[11px] text-[#64748B] block">Available Virtual Cash</span>
              <span className="font-bold text-sm text-[#131722] tabular-nums">
                ₹{virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] text-right hidden sm:block">
              <span className="text-[11px] text-[#64748B] block">Total Net Worth</span>
              <span className="font-bold text-sm text-[#131722] tabular-nums">
                ₹{totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(true)}
              icon={<RotateCcw size={13} />}
              className="text-xs text-[#64748B] hover:text-amber-600"
            >
              Reset Funds
            </Button>
          </div>
        </div>
      </div>

      {/* Trade Notification Alert */}
      {tradeNotification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all animate-in fade-in duration-200 ${
          tradeNotification.isError
            ? 'bg-[#F23645]/10 border-[#F23645]/30 text-[#F23645]'
            : 'bg-[#089981]/10 border-[#089981]/30 text-[#089981]'
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
      {/* TRADINGVIEW × ARINCEN 2-COLUMN BODY (ZONE 2 CENTER + ZONE 3 RIGHT DOCK)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================================= */}
        {/* ZONE 2: CENTER AREA (Full-Width Chart Container + Holdings/Orders Dock) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
            {/* Chart Instrument Sub-header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-[#131722]">
                  {selectedStock.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] mt-0.5">
                  <span>{selectedStock.exchange}: {selectedStock.symbol}</span>
                  <span>•</span>
                  <span>{selectedStock.sector}</span>
                  <span>•</span>
                  <span className="text-[#2962FF] font-medium">Beta: 1.05</span>
                </div>
              </div>

              <div className="text-left sm:text-right tabular-nums">
                <div className="text-xl font-bold text-[#131722]">
                  ₹{selectedStock.price.toFixed(2)}
                </div>
                <div className={`text-xs font-semibold inline-flex items-center gap-1 ${
                  isSelectedUp ? 'text-[#089981]' : 'text-[#F23645]'
                }`}>
                  {isSelectedUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  <span>
                    {isSelectedUp ? '+' : '-'}{Math.abs(selectedStock.change).toFixed(2)} ({isSelectedUp ? '+' : '-'}{Math.abs(selectedStock.changePercent).toFixed(2)}%) Today
                  </span>
                </div>
              </div>
            </div>

            {/* Timeframe & Chart Style Toolbar */}
            <div className="px-6 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs">
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-[#E2E8F0]">
                {(['1D', '1W', '1M', '1Y', 'ALL'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      timeframe === tf
                        ? 'bg-[#2962FF] text-white font-semibold'
                        : 'text-[#64748B] hover:text-[#131722]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 bg-white p-1 rounded-lg border border-[#E2E8F0]">
                <button
                  onClick={() => setChartMode('LINE')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    chartMode === 'LINE' ? 'bg-[#2962FF] text-white font-semibold' : 'text-[#64748B] hover:text-[#131722]'
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartMode('CANDLE')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    chartMode === 'CANDLE' ? 'bg-[#2962FF] text-white font-semibold' : 'text-[#64748B] hover:text-[#131722]'
                  }`}
                >
                  Candles
                </button>
              </div>
            </div>

            {/* Full-Width Interactive SVG Chart Container */}
            <div className="p-6">
              <div className="h-72 w-full bg-[#F8FAFC] rounded-xl p-5 flex flex-col justify-between border border-[#E2E8F0] relative overflow-hidden">
                <div className="flex justify-between text-xs text-[#64748B] tabular-nums">
                  <span>Low: ₹{selectedStock.dayLow.toFixed(2)}</span>
                  <span className="text-[#2962FF] font-semibold">Period: {timeframe} View</span>
                  <span>High: ₹{selectedStock.dayHigh.toFixed(2)}</span>
                </div>

                {chartMode === 'LINE' ? (
                  /* Dynamic SVG Area Graph */
                  <svg className="w-full h-48 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                    <defs>
                      <linearGradient id="stockAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isSelectedUp ? '#089981' : '#F23645'} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={isSelectedUp ? '#089981' : '#F23645'} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* 20-period Moving Average dashed line */}
                    <path
                      d="M0,65 Q120,55 240,48 T360,42 T500,28"
                      fill="none"
                      stroke="#2962FF"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                    />

                    {/* Main Price Action line */}
                    <path
                      d={isSelectedUp
                        ? 'M0,75 Q100,55 200,68 T340,35 T500,18'
                        : 'M0,25 Q120,35 220,48 T350,70 T500,82'}
                      fill="none"
                      stroke={isSelectedUp ? '#089981' : '#F23645'}
                      strokeWidth="2.5"
                    />
                    <path
                      d={isSelectedUp
                        ? 'M0,75 Q100,55 200,68 T340,35 T500,18 L500,100 L0,100 Z'
                        : 'M0,25 Q120,35 220,48 T350,70 T500,82 L500,100 L0,100 Z'}
                      fill="url(#stockAreaGrad)"
                    />
                    <circle
                      cx="500"
                      cy={isSelectedUp ? 18 : 82}
                      r="4"
                      fill={isSelectedUp ? '#089981' : '#F23645'}
                    />
                  </svg>
                ) : (
                  /* Simulated Candlestick Bars */
                  <div className="h-48 flex items-end justify-between px-4 pt-4">
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
                        <div className={`w-0.5 ${bar.up ? 'bg-[#089981]' : 'bg-[#F23645]'}`} style={{ height: '10px' }} />
                        {/* Body */}
                        <div
                          className={`w-2.5 rounded-sm ${bar.up ? 'bg-[#089981]' : 'bg-[#F23645]'}`}
                          style={{ height: `${bar.h}px` }}
                        />
                        {/* Lower wick */}
                        <div className={`w-0.5 ${bar.up ? 'bg-[#089981]' : 'bg-[#F23645]'}`} style={{ height: '8px' }} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-[11px] text-[#64748B] tabular-nums">
                  <span>09:15 IST (Open: ₹{selectedStock.open.toFixed(2)})</span>
                  <span>Volume: {selectedStock.volume}</span>
                  <span>15:30 IST (Close)</span>
                </div>
              </div>

              {/* Fundamental & Technical Stat Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-center tabular-nums">
                <div className="p-3 rounded-xl bg-[#F8FAFC]">
                  <span className="text-[11px] text-[#64748B] block">Market Cap</span>
                  <span className="text-xs font-bold text-[#131722] mt-0.5 block">{selectedStock.marketCap}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC]">
                  <span className="text-[11px] text-[#64748B] block">P/E Ratio</span>
                  <span className="text-xs font-bold text-[#131722] mt-0.5 block">{selectedStock.pe}x</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC]">
                  <span className="text-[11px] text-[#64748B] block">Prev. Close</span>
                  <span className="text-xs font-bold text-[#131722] mt-0.5 block">₹{selectedStock.previousClose.toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC]">
                  <span className="text-[11px] text-[#64748B] block">Risk Rating</span>
                  <span className="text-xs font-bold text-[#2962FF] mt-0.5 block">{selectedStock.riskRating}</span>
                </div>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed pt-4">
                {selectedStock.description}
              </p>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* HOLDINGS & SIMULATION HISTORY DOCK (Directly below Center Chart)      */}
          {/* ===================================================================== */}
          <div className="rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveBottomTab('HOLDINGS')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeBottomTab === 'HOLDINGS'
                      ? 'bg-[#2962FF] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#131722]'
                  }`}
                >
                  Active Paper Holdings ({positions.length})
                </button>
                <button
                  onClick={() => setActiveBottomTab('ORDERS')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeBottomTab === 'ORDERS'
                      ? 'bg-[#2962FF] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#131722]'
                  }`}
                >
                  Simulation History ({orderHistory.length})
                </button>
              </div>

              {activeBottomTab === 'HOLDINGS' ? (
                <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
                  <span className="text-[#64748B]">
                    Total Holdings Value: <span className="text-[#131722] font-bold">₹{(totalPortfolioValue - virtualCash).toFixed(2)}</span>
                  </span>
                  <span className={`font-semibold ${isTotalPnlUp ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                    {isTotalPnlUp ? '+' : '-'}₹{Math.abs(unrealizedPnL).toFixed(2)} ({isTotalPnlUp ? '+' : '-'}{Math.abs(unrealizedPnLPercent).toFixed(2)}%)
                  </span>
                </div>
              ) : (
                <div className="flex gap-1 text-xs">
                  {(['ALL', 'BUY', 'SELL'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderHistoryFilter(f)}
                      className={`px-3 py-1 rounded-lg font-medium ${
                        orderHistoryFilter === f
                          ? 'bg-[#2962FF]/10 text-[#2962FF] font-semibold'
                          : 'text-[#64748B] hover:text-[#131722]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6">
              {/* Tab 1: Active Holdings Table */}
              {activeBottomTab === 'HOLDINGS' && (
                positions.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-xs text-[#64748B]">You have no active simulated holdings.</p>
                    <span className="text-xs text-[#64748B] block">Use the order desk above to take your first paper position.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B]">
                          <th className="py-3 px-2">Stock</th>
                          <th className="py-3 px-2 text-right">Qty</th>
                          <th className="py-3 px-2 text-right">Avg Buy (₹)</th>
                          <th className="py-3 px-2 text-right">LTP (₹)</th>
                          <th className="py-3 px-2 text-right">Invested</th>
                          <th className="py-3 px-2 text-right">Current Value</th>
                          <th className="py-3 px-2 text-right">P&L</th>
                          <th className="py-3 px-2 text-center">Stop Loss</th>
                          <th className="py-3 px-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {positions.map((pos) => {
                          const isProfit = pos.unrealizedPnL >= 0;
                          return (
                            <tr key={pos.id} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="py-3.5 px-2">
                                <span className="font-bold text-[#131722] block">{pos.symbol}</span>
                                <span className="text-[11px] text-[#64748B]">{pos.sector}</span>
                              </td>
                              <td className="py-3.5 px-2 text-right tabular-nums font-semibold text-[#131722]">{pos.quantity}</td>
                              <td className="py-3.5 px-2 text-right tabular-nums text-[#131722]">₹{pos.averageBuyPrice.toFixed(2)}</td>
                              <td className="py-3.5 px-2 text-right tabular-nums font-semibold text-[#131722]">₹{pos.currentPrice.toFixed(2)}</td>
                              <td className="py-3.5 px-2 text-right tabular-nums text-[#64748B]">₹{pos.totalCost.toFixed(2)}</td>
                              <td className="py-3.5 px-2 text-right tabular-nums font-semibold text-[#131722]">₹{pos.currentValue.toFixed(2)}</td>
                              <td className={`py-3.5 px-2 text-right tabular-nums font-semibold ${
                                isProfit ? 'text-[#089981]' : 'text-[#F23645]'
                              }`}>
                                {isProfit ? '+' : '-'}₹{Math.abs(pos.unrealizedPnL).toFixed(2)} ({isProfit ? '+' : '-'}{Math.abs(pos.unrealizedPnLPercent).toFixed(2)}%)
                              </td>
                              <td className="py-3.5 px-2 text-center text-amber-700 text-xs tabular-nums">
                                {pos.stopLoss ? `₹${pos.stopLoss.toFixed(2)}` : 'None'}
                              </td>
                              <td className="py-3.5 px-2 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs py-1 px-2.5 text-[#F23645] hover:bg-[#F23645]/10 hover:border-[#F23645]/30"
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
                  <div className="py-10 text-center text-xs text-[#64748B]">
                    No transactions executed in this session.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B]">
                          <th className="py-3 px-2">Timestamp</th>
                          <th className="py-3 px-2">Action</th>
                          <th className="py-3 px-2">Symbol</th>
                          <th className="py-3 px-2 text-right">Qty</th>
                          <th className="py-3 px-2 text-right">Price (₹)</th>
                          <th className="py-3 px-2 text-right">Total (₹)</th>
                          <th className="py-3 px-2 text-right">Fees</th>
                          <th className="py-3 px-2">Reason Tag</th>
                          <th className="py-3 px-2 text-center">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {orderHistory
                          .filter(ord => orderHistoryFilter === 'ALL' || ord.type === orderHistoryFilter)
                          .map((ord) => (
                            <tr key={ord.id} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="py-3 px-2 text-[#64748B] text-[11px] tabular-nums">{ord.timestamp}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  ord.type === 'BUY' ? 'bg-[#089981]/10 text-[#089981]' : 'bg-[#F23645]/10 text-[#F23645]'
                                }`}>
                                  {ord.type}
                                </span>
                              </td>
                              <td className="py-3 px-2 font-bold text-[#131722]">{ord.symbol}</td>
                              <td className="py-3 px-2 text-right tabular-nums text-[#131722]">{ord.quantity}</td>
                              <td className="py-3 px-2 text-right tabular-nums text-[#131722]">₹{ord.price.toFixed(2)}</td>
                              <td className="py-3 px-2 text-right tabular-nums font-semibold text-[#131722]">₹{ord.totalValue.toFixed(2)}</td>
                              <td className="py-3 px-2 text-right text-[#64748B] text-[11px] tabular-nums">₹{(ord.charges || 5).toFixed(2)}</td>
                              <td className="py-3 px-2 text-[#64748B] text-xs truncate max-w-[160px]">{ord.reasonTag}</td>
                              <td className="py-3 px-2 text-center">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] font-medium">
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
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* ZONE 3: RIGHT-SIDE DOCK (Tabbed Order Ticket & Stock Watchlist)         */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm overflow-hidden lg:sticky lg:top-28">
          {/* Right Dock Tab Switcher */}
          <div className="grid grid-cols-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <button
              type="button"
              onClick={() => setActiveRightTab('ORDER')}
              className={`py-3.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeRightTab === 'ORDER'
                  ? 'border-[#2962FF] text-[#2962FF] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#131722]'
              }`}
            >
              <CandlestickChart size={15} />
              <span>Order Ticket</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('WATCHLIST')}
              className={`py-3.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 border-l border-l-[#E2E8F0] transition-colors ${
                activeRightTab === 'WATCHLIST'
                  ? 'border-[#2962FF] text-[#2962FF] bg-white'
                  : 'border-transparent text-[#64748B] hover:text-[#131722]'
              }`}
            >
              <Activity size={15} />
              <span>Watchlist ({filteredStocks.length})</span>
            </button>
          </div>

          {/* ===================================================================== */}
          {/* DOCK TAB 1: BUY / SELL ORDER PANEL                                    */}
          {/* ===================================================================== */}
          <div className={activeRightTab === 'ORDER' ? 'p-5 space-y-4' : 'hidden'}>
            {/* Selected Instrument Strip inside Order Ticket */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#F8FAFC]">
              <div>
                <span className="text-xs font-bold text-[#131722]">{selectedStock.symbol}</span>
                <span className="text-[11px] text-[#64748B] ml-1.5">{selectedStock.exchange}</span>
              </div>
              <div className="text-right tabular-nums">
                <span className="text-xs font-bold text-[#131722] mr-2">₹{selectedStock.price.toFixed(2)}</span>
                <span className={`text-xs font-semibold ${isSelectedUp ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                  {isSelectedUp ? '+' : '-'}{Math.abs(selectedStock.changePercent).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Buy / Sell Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setTradeType('BUY')}
                className={`py-2 text-xs font-bold rounded-md transition-colors ${
                  tradeType === 'BUY'
                    ? 'bg-[#089981] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#131722]'
                }`}
              >
                BUY (LONG)
              </button>
              <button
                type="button"
                onClick={() => setTradeType('SELL')}
                className={`py-2 text-xs font-bold rounded-md transition-colors ${
                  tradeType === 'SELL'
                    ? 'bg-[#F23645] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#131722]'
                }`}
              >
                SELL (SQUARE)
              </button>
            </div>

            <form onSubmit={handleTradeSubmit} className="space-y-4 text-xs">
              {/* Essential Input: Quantity */}
              <div>
                <div className="flex justify-between text-xs font-medium text-[#64748B] mb-1.5">
                  <span>Quantity (Shares)</span>
                  {existingPosition && (
                    <span className="text-[#2962FF] font-semibold tabular-nums">
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
                  className="w-full bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg tabular-nums font-semibold text-[#131722] text-sm focus:outline-none focus:border-[#2962FF]"
                />

                {/* Quick Multiplier Chips */}
                <div className="flex gap-1.5 mt-2">
                  {[5, 10, 25, 50].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="flex-1 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-medium tabular-nums text-[#64748B] hover:text-[#131722] transition-colors"
                    >
                      +{q}
                    </button>
                  ))}
                  {tradeType === 'BUY' && (
                    <button
                      type="button"
                      onClick={() => setQuantity(maxAffordableQty)}
                      className="flex-1 py-1.5 rounded-lg bg-[#2962FF]/10 text-[#2962FF] text-xs tabular-nums font-semibold hover:bg-[#2962FF]/15 transition-colors"
                    >
                      Max ({maxAffordableQty})
                    </button>
                  )}
                </div>
              </div>

              {/* Cleanly Grouped Advanced Order & Risk Options */}
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(prev => !prev)}
                  className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#F1F5F9]/70 transition-colors"
                  aria-expanded={showAdvancedOptions}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#131722]">
                      <Sliders size={13} className="text-[#2962FF]" />
                      <span>Advanced Order & Risk Controls</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5 truncate">
                      {productType === 'CNC' ? 'Delivery 1x' : productType === 'MIS_LEVERAGED' ? '5x Leverage' : 'Options (F&O)'} • {orderType} • SL/TP & Thesis
                    </div>
                  </div>
                  {showAdvancedOptions ? (
                    <ChevronUp size={15} className="text-[#64748B] flex-shrink-0" />
                  ) : (
                    <ChevronDown size={15} className="text-[#64748B] flex-shrink-0" />
                  )}
                </button>

                <div className={showAdvancedOptions ? 'p-3.5 pt-3 border-t border-[#E2E8F0] space-y-3.5 bg-white' : 'hidden'}>
                  {/* Product Exposure Mode */}
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-[#64748B] mb-1.5">
                      <span>Product / Exposure Mode</span>
                      <span className="text-[#2962FF] font-semibold">
                        {productType === 'CNC' ? '1x Delivery (Cash)' : productType === 'MIS_LEVERAGED' ? '5x Intraday Leverage' : 'F&O Options Sim'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setProductType('CNC')}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border transition-colors text-center ${
                          productType === 'CNC'
                            ? 'border-[#2962FF] text-[#2962FF] bg-[#2962FF]/10 font-semibold'
                            : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        Delivery 1x
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductType('MIS_LEVERAGED')}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border transition-colors text-center ${
                          productType === 'MIS_LEVERAGED'
                            ? 'border-amber-500 text-amber-700 bg-amber-50 font-semibold'
                            : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        5x Leverage
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductType('OPTIONS')}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border transition-colors text-center ${
                          productType === 'OPTIONS'
                            ? 'border-[#F23645] text-[#F23645] bg-[#F23645]/10 font-semibold'
                            : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        Options (F&O)
                      </button>
                    </div>
                  </div>

                  {/* Order Type: Market vs Limit */}
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-[#64748B] mb-1.5">
                      <span>Order Execution Type</span>
                      <span className="font-semibold text-[#131722]">{orderType}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderType('MARKET')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                          orderType === 'MARKET'
                            ? 'border-[#2962FF] text-[#2962FF] bg-[#2962FF]/10 font-semibold'
                            : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        Market
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('LIMIT')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                          orderType === 'LIMIT'
                            ? 'border-[#2962FF] text-[#2962FF] bg-[#2962FF]/10 font-semibold'
                            : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        Limit
                      </button>
                    </div>
                  </div>

                  {/* Limit Price Input (if limit selected) */}
                  {orderType === 'LIMIT' && (
                    <div>
                      <label className="text-[11px] font-medium text-[#2962FF] block mb-1">
                        Limit Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder={`Current: ₹${selectedStock.price.toFixed(2)}`}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-lg tabular-nums text-[#131722] text-xs focus:outline-none focus:border-[#2962FF]"
                      />
                    </div>
                  )}

                  {/* Stop Loss & Target Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-amber-700 block mb-1">
                        Pre-set Stop-Loss (₹) *Disciplined Exit
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        placeholder={`e.g. ${(selectedStock.price * 0.97).toFixed(2)}`}
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-lg tabular-nums text-[#131722] text-xs focus:outline-none focus:border-[#2962FF] placeholder:text-[#94A3B8]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#089981] block mb-1">
                        Target Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        placeholder={`e.g. ${(selectedStock.price * 1.06).toFixed(2)}`}
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-lg tabular-nums text-[#131722] text-xs focus:outline-none focus:border-[#2962FF] placeholder:text-[#94A3B8]"
                      />
                    </div>
                  </div>

                  {/* Risk:Reward ratio readout */}
                  <div className="flex justify-between text-[11px] text-[#64748B] tabular-nums">
                    <span>Risk : Reward Ratio:</span>
                    <span className="font-bold text-[#2962FF]">{riskRewardRatio}</span>
                  </div>

                  {/* Trade Thesis / Journal Tag */}
                  <div>
                    <label className="text-[11px] font-medium text-[#64748B] block mb-1">
                      Trading Thesis Tag
                    </label>
                    <select
                      value={reasonTag}
                      onChange={(e) => setReasonTag(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1.5 rounded-lg text-[#131722] text-xs focus:outline-none focus:border-[#2962FF]"
                    >
                      <option value="Long-term Fundamental Value">Long-term Fundamental Value</option>
                      <option value="Technical Support / Breakout">Technical Support / Breakout</option>
                      <option value="Quarterly Earnings Catalyst">Quarterly Earnings Catalyst</option>
                      <option value="Sector Macro Rotation">Sector Macro Rotation</option>
                      <option value="Experimental / Testing Setup">Experimental / Testing Setup</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Cost & Simulated Fees Breakdown */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] space-y-2 text-xs tabular-nums">
                <div className="flex justify-between text-[#64748B]">
                  <span>Estimated Value:</span>
                  <span className="text-[#131722] font-semibold">₹{estimatedValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Simulated Fees (STT/Exch):</span>
                  <span>₹{simulatedCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#131722] pt-2 border-t border-[#E2E8F0]">
                  <span className="font-semibold">Total Capital Required:</span>
                  <span className="font-bold text-[#2962FF]">₹{totalRequiredCapital.toFixed(2)}</span>
                </div>
              </div>

              {/* Mandatory Virtual Understanding Checkbox */}
              <div className="flex items-start gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="virtualAcknowledge"
                  checked={hasAcknowledgedVirtual}
                  onChange={(e) => setHasAcknowledgedVirtual(e.target.checked)}
                  className="w-4 h-4 accent-[#2962FF] cursor-pointer mt-0.5"
                />
                <label htmlFor="virtualAcknowledge" className="text-[11px] text-[#64748B] leading-snug cursor-pointer">
                  I understand this is a 100% virtual paper trade using simulated capital.
                </label>
              </div>

              {/* Optional Pre-Decision Contract */}
              <PreDecisionContractCard
                proposedExposurePct={(estimatedValue / Math.max(totalPortfolioValue, 1)) * 100}
                value={preDecisionContract}
                onChange={setPreDecisionContract}
              />

              {/* Run Risk Reality Check Button */}
              <button
                type="button"
                onClick={() => {
                  setPendingTrade(proposedTrade);
                  setIsRiskModalOpen(true);
                }}
                className="w-full py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldAlert size={14} /> Run Pre-Trade Risk Reality Check
              </button>

              {/* Submit Trade Button */}
              <button
                type="submit"
                disabled={!hasAcknowledgedVirtual}
                className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  tradeType === 'BUY'
                    ? 'bg-[#089981] hover:bg-[#067D69]'
                    : 'bg-[#F23645] hover:bg-[#D92B39]'
                }`}
              >
                Confirm Virtual {tradeType} ({quantity} Shares)
              </button>
            </form>
          </div>

          {/* ===================================================================== */}
          {/* DOCK TAB 2: STOCK WATCHLIST                                           */}
          {/* ===================================================================== */}
          <div className={activeRightTab === 'WATCHLIST' ? 'p-5 space-y-3.5' : 'hidden'}>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0] text-xs">
              <span className="font-bold text-[#131722] flex items-center gap-1.5">
                <Activity size={14} className="text-[#2962FF]" /> Indian Equities
              </span>
              <span className="text-[11px] text-[#64748B] tabular-nums">{filteredStocks.length} Stocks</span>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search symbol (e.g. RELIANCE, TCS)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] pl-8 pr-3 py-2 rounded-lg text-xs text-[#131722] focus:outline-none focus:border-[#2962FF] placeholder:text-[#64748B]"
              />
            </div>

            {/* Watchlist Filter Tabs */}
            <div className="flex gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] text-[11px]">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'FAVORITES', label: '⭐ Starred' },
                { id: 'GAINERS', label: 'Gainers' },
                { id: 'LOSERS', label: 'Losers' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setWatchlistFilter(tab.id as any)}
                  className={`flex-1 py-1 rounded-md font-medium transition-colors ${
                    watchlistFilter === tab.id
                      ? 'bg-[#2962FF] text-white font-semibold'
                      : 'text-[#64748B] hover:text-[#131722]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Stock List Scroll area */}
            <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
              {filteredStocks.map((stock) => {
                const isSelected = selectedStock.symbol === stock.symbol;
                const isFav = favorites.includes(stock.symbol);
                const isUp = stock.change >= 0;

                return (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#2962FF]/[0.06] border-[#2962FF]/40'
                        : 'bg-[#F8FAFC] border-transparent hover:border-[#E2E8F0] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={(e) => toggleFavorite(stock.symbol, e)}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        className={`p-1 rounded hover:bg-white transition-colors ${
                          isFav ? 'text-amber-500' : 'text-[#64748B] hover:text-[#131722]'
                        }`}
                      >
                        <Star size={13} fill={isFav ? '#F59E0B' : 'none'} />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[#131722] group-hover:text-[#2962FF] transition-colors">
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#64748B] leading-none">
                            {stock.exchange}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#64748B] truncate block max-w-[140px] mt-0.5">
                          {stock.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right tabular-nums flex-shrink-0">
                      <div className="text-xs font-bold text-[#131722]">
                        ₹{stock.price.toFixed(2)}
                      </div>
                      <div className={`text-[11px] font-semibold inline-flex items-center justify-end gap-0.5 ${
                        isUp ? 'text-[#089981]' : 'text-[#F23645]'
                      }`}>
                        {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        <span>{isUp ? '+' : '-'}{Math.abs(stock.changePercent).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex items-center justify-between">
              <div>
                <span className="text-[#64748B] block text-[11px]">Simulated Execution</span>
                <span className="font-bold text-[#131722] mt-0.5 block">
                  {learningMomentData.action} {learningMomentData.qty} Shares of {learningMomentData.stockSymbol}
                </span>
              </div>
              <span className="text-[#2962FF] font-bold text-sm tabular-nums">
                ₹{(learningMomentData.price * learningMomentData.qty).toFixed(2)}
              </span>
            </div>

            {/* The Educational Insight */}
            <div className="p-4 rounded-xl bg-[#2962FF]/[0.06] border border-[#2962FF]/20 space-y-2 text-xs">
              <span className="font-bold text-[#2962FF] flex items-center gap-1.5">
                <Sparkles size={15} /> Educational Behavioral Feedback:
              </span>
              <p className="text-[#131722] leading-relaxed text-xs">
                "{learningMomentData.insight}"
              </p>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Notice that Aurivero does not praise trades based on whether prices go up or down. A disciplined trade with a pre-set stop loss is a success, even if the market moves against you.
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
          <p className="text-[#64748B] leading-relaxed">
            This will wipe your open simulated holdings and reset your liquid cash to exactly <strong className="text-[#2962FF] tabular-nums">₹1,00,000.00</strong>. Your completed course tracks will remain saved.
          </p>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5 text-amber-600" />
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
