import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Calculator,
  CheckCircle2,
  Copy,
  Flame,
  PieChart,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { useSimulator } from '../context/SimulatorContext';
import { AssetClass, InstrumentMeta } from '../types/markets';
import {
  PortfolioRiskPosition,
  TradeDirection,
  calculatePositionSize,
} from '../utils/riskCalculator';
import {
  DEFAULT_RISK_BUDGETS,
  RiskBudgetConfig,
  loadRiskBudgets,
  saveRiskBudgets,
} from '../utils/riskBudgets';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { BeginnerTooltip } from '../components/common/BeginnerTooltip';
import { InstrumentSearchInput } from '../components/markets/InstrumentSearchInput';
import { FreshnessBadge } from '../components/markets/FreshnessBadge';
import {
  CorrelationHeatmap,
  FeatureImportanceChart,
  MlOutOfSampleChart,
  ReturnDistributionChart,
  RiskContributionChart,
  UnderwaterDrawdownChart,
} from '../components/risk/RiskVisualizations';

type RiskTab = 'POSITION' | 'PORTFOLIO' | 'ANALYTICS' | 'ML' | 'STRESS';
type PortfolioMode = 'LIVE' | 'SANDBOX';

interface ExtendedPortfolioPosition extends Omit<PortfolioRiskPosition, 'stopLoss'> {
  stopLoss?: number;
  name?: string;
  currentPrice?: number;
  currency?: 'INR' | 'USD';
}

export const RiskCalculatorPage: React.FC = () => {
  const navigate = useNavigate();
  const simulator = useSimulator();
  const { experienceMode, setExperienceMode } = simulator;
  const [activeTab, setActiveTab] = useState<RiskTab>('POSITION');
  const [showQuantDetails, setShowQuantDetails] = useState(false);
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);

  // Selected Instrument for Position, Analytics & ML
  const [assetClass, setAssetClass] = useState<AssetClass>('STOCK');
  const [symbol, setSymbol] = useState<string>('RELIANCE');
  const [instrumentName, setInstrumentName] = useState<string>('Reliance Industries Ltd.');

  // Position Size Inputs
  const [accountBalance, setAccountBalance] = useState<number>(100000);
  const [accountCurrency, setAccountCurrency] = useState<'INR' | 'USD'>('INR');
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(2900);
  const [stopLoss, setStopLoss] = useState<number>(2820);
  const [targetPrice, setTargetPrice] = useState<number>(3100);
  const [lotSize, setLotSize] = useState<number>(1);
  const [leverage, setLeverage] = useState<number>(1);
  const [brokeragePercent, setBrokeragePercent] = useState<number>(0.05);
  const [slippagePercent, setSlippagePercent] = useState<number>(0.05);
  const [fetchingPrice, setFetchingPrice] = useState<boolean>(false);
  const [quoteStatus, setQuoteStatus] = useState<any>(null);
  const [liveTickPrice, setLiveTickPrice] = useState<number | null>(null);
  const [autoSyncEntry, setAutoSyncEntry] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Portfolio Sync Mode & State
  const [portfolioMode, setPortfolioMode] = useState<PortfolioMode>('LIVE');
  const [portfolioBaseCurrency, setPortfolioBaseCurrency] = useState<'INR' | 'USD'>('INR');
  const [backendPortfolio, setBackendPortfolio] = useState<{
    cash: number;
    positions: ExtendedPortfolioPosition[];
  } | null>(null);
  const [sandboxPositions, setSandboxPositions] = useState<ExtendedPortfolioPosition[]>([]);
  const [sandboxCash, setSandboxCash] = useState<number>(50000);
  const [livePricesByKey, setLivePricesByKey] = useState<Record<string, number>>({});

  // Add Position in Sandbox
  const [newPosSym, setNewPosSym] = useState('TCS');
  const [newPosName, setNewPosName] = useState('Tata Consultancy Services');
  const [newPosClass, setNewPosClass] = useState<AssetClass>('STOCK');
  const [newPosSector, setNewPosSector] = useState('IT');
  const [newPosCurrency, setNewPosCurrency] = useState<'INR' | 'USD'>('INR');
  const [newPosQty, setNewPosQty] = useState(10);
  const [newPosEntry, setNewPosEntry] = useState(4100);
  const [newPosStop, setNewPosStop] = useState(3980);

  // Portfolio Risk Engine Response
  const [portfolioRisk, setPortfolioRisk] = useState<any>(null);
  const [loadingPortfolioRisk, setLoadingPortfolioRisk] = useState<boolean>(false);
  const [portfolioRiskError, setPortfolioRiskError] = useState<string | null>(null);

  // Risk Budgets (persisted & shared with RiskRealityCheckModal)
  const [riskBudgets, setRiskBudgets] = useState<RiskBudgetConfig>(() => loadRiskBudgets());
  const [showBudgetEditor, setShowBudgetEditor] = useState<boolean>(false);

  // Historical Risk Analytics & ML Risk Intelligence
  const [confidence, setConfidence] = useState<number>(0.95);
  const [lookback, setLookback] = useState<number>(252);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);
  const [mlData, setMlData] = useState<any>(null);
  const [loadingMl, setLoadingMl] = useState<boolean>(false);

  // Stress Testing State
  const [equityShockPct, setEquityShockPct] = useState<number>(-5);
  const [cryptoShockPct, setCryptoShockPct] = useState<number>(-15);
  const [forexShockPct, setForexShockPct] = useState<number>(0);
  const [volMultiplier, setVolMultiplier] = useState<number>(1.5);
  const [shockSector, setShockSector] = useState<string>('ALL');
  const [sectorShockPct, setSectorShockPct] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch backend portfolio once on mount to enrich LIVE sync when authenticated
  const refreshBackendPortfolio = useCallback(async () => {
    try {
      const res = await api.portfolio.get();
      if (res.success && res.data && Array.isArray(res.data.positions) && res.data.positions.length > 0) {
        const mapped: ExtendedPortfolioPosition[] = res.data.positions.map((p: any) => ({
          id: p.id || `api-${p.symbol}`,
          symbol: p.symbol,
          name: p.name || p.symbol,
          assetClass: 'STOCK',
          sector: p.sector || 'Equities',
          direction: 'LONG',
          quantity: Number(p.quantity) || 0,
          entryPrice: Number(p.average_buy_price) || 0,
          currentPrice: Number(p.current_price) || Number(p.average_buy_price) || 0,
          stopLoss: p.stop_loss ? Number(p.stop_loss) : undefined,
          currency: 'INR',
        }));
        setBackendPortfolio({
          cash: Number(res.data.current_cash) || 0,
          positions: mapped,
        });
      }
    } catch {
      // Fallback gracefully to SimulatorContext
    }
  }, []);

  useEffect(() => {
    refreshBackendPortfolio();
  }, [refreshBackendPortfolio]);

  // Active Live Portfolio (prefers backend DB portfolio if non-empty, else SimulatorContext)
  const livePortfolioPositions: ExtendedPortfolioPosition[] = useMemo(() => {
    if (backendPortfolio && backendPortfolio.positions.length > 0) {
      return backendPortfolio.positions.map((p) => ({
        ...p,
        currentPrice: livePricesByKey[`${p.assetClass}:${p.symbol}`] ?? p.currentPrice ?? p.entryPrice,
      }));
    }
    return simulator.positions.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      name: p.name,
      assetClass: 'STOCK' as AssetClass,
      sector: p.sector || 'Equities',
      direction: 'LONG' as TradeDirection,
      quantity: p.quantity,
      entryPrice: p.averageBuyPrice,
      currentPrice: livePricesByKey[`STOCK:${p.symbol}`] ?? p.currentPrice ?? p.averageBuyPrice,
      stopLoss: p.stopLoss,
      currency: 'INR' as const,
    }));
  }, [backendPortfolio, simulator.positions, livePricesByKey]);

  const liveCashBalance = backendPortfolio && backendPortfolio.positions.length > 0
    ? backendPortfolio.cash
    : simulator.virtualCash;

  const activePositions = portfolioMode === 'LIVE' ? livePortfolioPositions : sandboxPositions;
  const activeCash = portfolioMode === 'LIVE' ? liveCashBalance : sandboxCash;

  // Initialize sandbox once from live portfolio if empty
  useEffect(() => {
    if (sandboxPositions.length === 0 && livePortfolioPositions.length > 0) {
      setSandboxPositions(livePortfolioPositions);
      setSandboxCash(liveCashBalance);
    }
  }, [livePortfolioPositions, liveCashBalance, sandboxPositions.length]);

  const fetchLatestPrice = useCallback(async (ac: AssetClass, sym: string, applyEntry = true) => {
    setFetchingPrice(true);
    try {
      const res = await api.markets.getQuote(ac, sym);
      if (res.success && res.data?.quote) {
        const q = res.data.quote;
        setQuoteStatus(q);
        setLiveTickPrice(q.price);
        if (q.currency === 'USD' || q.currency === 'INR') {
          setAccountCurrency(q.currency);
        }
        if (applyEntry && q.price > 0) {
          const rounded = Number(q.price.toFixed(ac === 'FOREX' ? 4 : 2));
          setEntryPrice(rounded);
          setStopLoss(Number((rounded * (direction === 'LONG' ? 0.97 : 1.03)).toFixed(ac === 'FOREX' ? 4 : 2)));
          setTargetPrice(Number((rounded * (direction === 'LONG' ? 1.06 : 0.94)).toFixed(ac === 'FOREX' ? 4 : 2)));
        }
      }
    } finally {
      setFetchingPrice(false);
    }
  }, [direction]);

  const loadAnalyticsAndMl = useCallback(async (ac: AssetClass, sym: string, conf: number, lb: number) => {
    setLoadingAnalytics(true);
    setLoadingMl(true);
    try {
      const [aRes, mRes] = await Promise.all([
        api.markets.getRiskAnalytics(ac, sym, conf, lb),
        api.markets.getMlRisk(ac, sym),
      ]);
      if (aRes.success) setAnalytics(aRes.data);
      if (mRes.success) setMlData(mRes.data);
    } finally {
      setLoadingAnalytics(false);
      setLoadingMl(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestPrice(assetClass, symbol, false);
    loadAnalyticsAndMl(assetClass, symbol, confidence, lookback);
  }, [assetClass, symbol, confidence, lookback, fetchLatestPrice, loadAnalyticsAndMl]);

  // SharedStreamManager WebSocket for Active Instrument (Position / Analytics / ML)
  useEffect(() => {
    let closedByCleanup = false;
    setWsConnected(false);

    try {
      const ws = new WebSocket(api.markets.getWsUrl(assetClass, symbol));
      wsRef.current = ws;

      ws.onopen = () => {
        if (!closedByCleanup) setWsConnected(true);
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const price = msg?.quote?.price ?? msg?.candle?.close ?? msg?.price;
          if (typeof price === 'number' && price > 0) {
            setLiveTickPrice(price);
            setLivePricesByKey((prev) => ({ ...prev, [`${assetClass}:${symbol}`]: price }));
            if (autoSyncEntry) {
              setEntryPrice(Number(price.toFixed(assetClass === 'FOREX' ? 4 : 2)));
            }
            if (msg.quote) {
              setQuoteStatus(msg.quote);
            }
          }
        } catch {
          // Ignore malformed WS frame
        }
      };
      ws.onclose = () => {
        if (!closedByCleanup) setWsConnected(false);
      };
      ws.onerror = () => {
        if (!closedByCleanup) setWsConnected(false);
      };

      const heartbeat = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);

      return () => {
        closedByCleanup = true;
        window.clearInterval(heartbeat);
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };
    } catch {
      setWsConnected(false);
    }
  }, [assetClass, symbol, autoSyncEntry]);

  // Portfolio-wide WebSocket subscriptions when PORTFOLIO or STRESS tab is active
  useEffect(() => {
    if (activeTab !== 'PORTFOLIO' && activeTab !== 'STRESS') return;
    const uniqueTargets = new Map<string, { assetClass: AssetClass; symbol: string }>();
    for (const p of activePositions.slice(0, 8)) {
      uniqueTargets.set(`${p.assetClass}:${p.symbol}`, { assetClass: p.assetClass, symbol: p.symbol });
    }
    const sockets: WebSocket[] = [];
    uniqueTargets.forEach(({ assetClass: ac, symbol: sym }, key) => {
      try {
        const ws = new WebSocket(api.markets.getWsUrl(ac, sym));
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            const price = msg?.quote?.price ?? msg?.candle?.close ?? msg?.price;
            if (typeof price === 'number' && price > 0) {
              setLivePricesByKey((prev) => ({ ...prev, [key]: price }));
            }
          } catch {
            // Ignore
          }
        };
        sockets.push(ws);
      } catch {
        // Ignore WS connection error
      }
    });

    return () => {
      sockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      });
    };
  }, [activeTab, activePositions.map((p) => `${p.assetClass}:${p.symbol}`).join(',')]);

  // Debounced Backend Correlated Portfolio Risk Analysis
  useEffect(() => {
    if (activePositions.length === 0) {
      setPortfolioRisk(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingPortfolioRisk(true);
      setPortfolioRiskError(null);
      try {
        const res = await api.markets.analyzePortfolioRisk({
          positions: activePositions.map((p) => ({
            symbol: p.symbol,
            name: p.name,
            assetClass: p.assetClass,
            quantity: p.quantity,
            entryPrice: p.entryPrice,
            currentPrice: livePricesByKey[`${p.assetClass}:${p.symbol}`] ?? p.currentPrice ?? p.entryPrice,
            stopLoss: p.stopLoss ?? null,
            sector: p.sector,
            currency: p.currency,
          })),
          cashBalance: activeCash,
          baseCurrency: portfolioBaseCurrency,
          confidence,
          lookbackDays: lookback,
        });
        if (res.success) {
          setPortfolioRisk(res.data);
        } else {
          setPortfolioRiskError(res.error || 'Failed to compute correlated portfolio risk.');
        }
      } catch (err: any) {
        setPortfolioRiskError(err?.message || 'Portfolio risk engine error.');
      } finally {
        setLoadingPortfolioRisk(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [activePositions, activeCash, portfolioBaseCurrency, confidence, lookback, livePricesByKey]);

  useEffect(() => {
    if (experienceMode === 'beginner' || activeTab === 'ANALYTICS') {
      setLoadingAnalytics(true);
      api.markets.getRiskAnalytics(assetClass, symbol, confidence, lookback).then((res) => {
        if (res.success) setAnalytics(res.data);
        setLoadingAnalytics(false);
      });
    }
    if (experienceMode === 'beginner' || activeTab === 'ML') {
      setLoadingMl(true);
      api.markets.getMlRisk(assetClass, symbol).then((res) => {
        if (res.success) setMlData(res.data);
        setLoadingMl(false);
      });
    }
  }, [experienceMode, activeTab, assetClass, symbol, confidence, lookback]);

  const posResult = useMemo(
    () =>
      calculatePositionSize({
        accountBalance,
        accountCurrency,
        riskPercent,
        entryPrice,
        stopLoss,
        targetPrice,
        direction,
        assetClass,
        lotSize,
        leverage,
        brokeragePercent,
        slippagePercent,
      }),
    [
      accountBalance,
      accountCurrency,
      riskPercent,
      entryPrice,
      stopLoss,
      targetPrice,
      direction,
      assetClass,
      lotSize,
      leverage,
      brokeragePercent,
      slippagePercent,
    ]
  );

  // ML-assisted Stop-Loss Advisory (never auto-modifies SL)
  const mlStopAdvisory = useMemo(() => {
    if (!analytics?.available || !mlData?.available) return null;
    const atr14 = Number(analytics.atr14 || 0);
    const slDist = Math.abs(entryPrice - stopLoss);
    const isHighVolOrAnomaly = mlData.volatilityRegime === 'HIGH' || Boolean(mlData.anomalyDetected);
    if (atr14 > 0 && slDist > 0 && slDist < atr14 && isHighVolOrAnomaly) {
      return {
        severity: 'HIGH' as const,
        message: `Your stop-loss distance (${slDist.toFixed(2)}) is tighter than 1× ATR(14) (${atr14.toFixed(
          2
        )}) while ML detects a ${mlData.volatilityRegime} volatility regime${
          mlData.anomalyDetected ? ' & statistical return/volume anomaly' : ''
        }. Consider widening SL or reducing size to avoid noise stop-outs.`,
      };
    }
    if (atr14 > 0 && slDist > 0 && slDist < 0.75 * atr14) {
      return {
        severity: 'MODERATE' as const,
        message: `Stop-loss (${slDist.toFixed(2)}) is below 0.75× ATR(14) (${atr14.toFixed(
          2
        )}). Normal intraday noise may trigger this stop.`,
      };
    }
    return null;
  }, [analytics, mlData, entryPrice, stopLoss]);

  // Stress Testing Computations
  const stressResults = useMemo(() => {
    if (!portfolioRisk || !Array.isArray(portfolioRisk.positions) || portfolioRisk.positions.length === 0) {
      return null;
    }
    const baseTotalEquity = Number(portfolioRisk.totalEquity || 0);
    let totalShockPnl = 0;

    const rows = portfolioRisk.positions.map((pos: any) => {
      const val = Number(pos.marketValueBase || 0);
      const beta = Number(pos.beta ?? 1.0);
      let shockPct = 0;
      if (pos.assetClass === 'STOCK') {
        shockPct = equityShockPct * Math.max(0.2, beta);
      } else if (pos.assetClass === 'CRYPTO') {
        shockPct = cryptoShockPct;
      } else if (pos.assetClass === 'FOREX') {
        shockPct = forexShockPct;
      }
      if (shockSector !== 'ALL' && pos.sector === shockSector) {
        shockPct += sectorShockPct;
      }
      const pnl = val * (shockPct / 100);
      totalShockPnl += pnl;
      return {
        symbol: pos.symbol,
        assetClass: pos.assetClass,
        sector: pos.sector,
        beta,
        currentValue: val,
        shockPct,
        pnl,
        stressedValue: Math.max(0, val + pnl),
      };
    });

    const stressedEquity = Math.max(0, baseTotalEquity + totalShockPnl);
    const portfolioImpactPct = baseTotalEquity > 0 ? (totalShockPnl / baseTotalEquity) * 100 : 0;
    const stressedDailyVar = Number(portfolioRisk.portfolioDailyVarAmount || 0) * volMultiplier;

    return {
      rows,
      totalShockPnl,
      stressedEquity,
      portfolioImpactPct,
      stressedDailyVar,
    };
  }, [portfolioRisk, equityShockPct, cryptoShockPct, forexShockPct, volMultiplier, shockSector, sectorShockPct]);

  const handleInstrumentSelect = (item: InstrumentMeta) => {
    setAssetClass(item.assetClass);
    setSymbol(item.symbol);
    setInstrumentName(item.name);
    fetchLatestPrice(item.assetClass, item.symbol, true);
  };

  const handleSandboxInstrumentSelect = (item: InstrumentMeta) => {
    setNewPosClass(item.assetClass);
    setNewPosSym(item.symbol);
    setNewPosName(item.name);
    setNewPosSector(item.assetClass === 'STOCK' ? ((item as any).sector || 'Equities') : 'N/A');
    setNewPosCurrency(item.currency === 'USD' ? 'USD' : 'INR');
    api.markets.getQuote(item.assetClass, item.symbol).then((res) => {
      if (res.success && res.data?.quote?.price) {
        const px = Number(res.data.quote.price.toFixed(item.assetClass === 'FOREX' ? 4 : 2));
        setNewPosEntry(px);
        setNewPosStop(Number((px * 0.96).toFixed(item.assetClass === 'FOREX' ? 4 : 2)));
      }
    });
  };

  const addSandboxPosition = () => {
    if (!newPosSym.trim() || newPosQty <= 0 || newPosEntry <= 0) return;
    setSandboxPositions((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        symbol: newPosSym.trim().toUpperCase(),
        name: newPosName || newPosSym.trim().toUpperCase(),
        assetClass: newPosClass,
        sector: newPosClass === 'STOCK' ? newPosSector || 'Equities' : 'N/A',
        direction: 'LONG',
        quantity: newPosQty,
        entryPrice: newPosEntry,
        currentPrice: livePricesByKey[`${newPosClass}:${newPosSym.trim().toUpperCase()}`] ?? newPosEntry,
        stopLoss: newPosStop > 0 ? newPosStop : undefined,
        currency: newPosCurrency,
      },
    ]);
  };

  const updateBudgetField = (field: keyof RiskBudgetConfig, val: number) => {
    const next = { ...riskBudgets, [field]: Math.max(0.1, val) };
    setRiskBudgets(next);
    saveRiskBudgets(next);
  };

  const formatMoney = (val: number, curr: 'INR' | 'USD' = accountCurrency) =>
    `${curr === 'INR' ? '₹' : '$'}${val.toLocaleString(curr === 'INR' ? 'en-IN' : 'en-US', {
      maximumFractionDigits: 2,
    })}`;

  const effectiveFreshnessStatus = wsConnected
    ? 'LIVE'
    : quoteStatus?.freshness?.status || 'POLLING';

  const uniqueSectors = useMemo(() => {
    const set = new Set<string>();
    activePositions.forEach((p) => {
      if (p.sector && p.sector !== 'N/A') set.add(p.sector);
    });
    return Array.from(set);
  }, [activePositions]);

  // Beginner-friendly risk regime mapping driven by actual backend calculations
  const beginnerRiskState = useMemo(() => {
    const regime = (mlData?.regime?.label || analytics?.regime || '').toUpperCase();
    if (regime.includes('HIGH') || regime.includes('STRESS') || regime.includes('TURBULENT')) {
      return {
        badge: '🔴 Turbulent',
        color: 'text-[#F16D75] border-[#F16D75]/30 bg-[#F16D75]/10',
        summary: 'Prices have been moving sharply. You could see larger gains or losses than usual.',
      };
    }
    if (regime.includes('MODERATE') || regime.includes('ELEVATED') || regime.includes('MEDIUM')) {
      return {
        badge: '🟡 Choppy',
        color: 'text-[#F5B942] border-[#F5B942]/30 bg-[#F5B942]/10',
        summary: 'Prices are moving up and down more than usual. Your investment value may change quickly.',
      };
    }
    return {
      badge: '🟢 Calm',
      color: 'text-[#45D6B5] border-[#45D6B5]/30 bg-[#45D6B5]/10',
      summary: 'Prices have been moving less than usual recently.',
    };
  }, [mlData, analytics]);

  if (experienceMode === 'beginner') {
    const currSym = accountCurrency === 'INR' ? '₹' : '$';
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button onClick={() => navigate('/markets')} className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary">
              <ArrowLeft size={14} /> Back to Markets
            </button>
            <h1 className="text-2xl font-extrabold text-text-primary mt-1">Simple Risk &amp; Position Sizing</h1>
            <p className="text-xs text-text-secondary">
              Plan how much virtual money to put into one stock without taking oversized risks.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setExperienceMode('pro')} className="text-xs font-mono">
            Switch to Pro Risk Lab
          </Button>
        </div>

        {/* Beginner Risk Summary First */}
        <Card className={`p-5 border space-y-3 ${beginnerRiskState.color}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{beginnerRiskState.badge}</span>
              <span className="text-xs font-mono text-text-primary">• {symbol} ({instrumentName})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuantDetails((v) => !v)}
              className="text-xs font-semibold text-[#78A9FF] hover:underline"
            >
              {showQuantDetails ? 'Hide Quant Details' : 'View Quant Details'}
            </button>
          </div>
          <p className="text-xs text-[#F3F6F8]">{beginnerRiskState.summary}</p>

          {showQuantDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#0B1017]">
                <div className="text-[#93A2B4] text-[10px]">Daily VaR (95%)</div>
                <div className="text-white font-bold">{analytics?.var_pct != null ? `${analytics.var_pct}%` : '—'}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B1017]">
                <div className="text-[#93A2B4] text-[10px]">CVaR / Expected Shortfall</div>
                <div className="text-white font-bold">{analytics?.cvar_pct != null ? `${analytics.cvar_pct}%` : '—'}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B1017]">
                <div className="text-[#93A2B4] text-[10px]">Volatility Regime</div>
                <div className="text-white font-bold">{mlData?.regime?.label || 'Normal'}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B1017]">
                <div className="text-[#93A2B4] text-[10px]">OOS MAE</div>
                <div className="text-white font-bold">{mlData?.validation?.oos_mae != null ? `${mlData.validation.oos_mae}%` : '—'}</div>
              </div>
            </div>
          )}
        </Card>

        {/* Simplified Position Sizing Inputs */}
        <Card className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block">1. Stock or Asset</label>
            <InstrumentSearchInput
              onSelect={handleInstrumentSelect}
              placeholder="Search stock (e.g., RELIANCE, TCS, INFY)..."
              ariaLabel="Select stock for position sizing"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">2. Total Virtual Account Size ({currSym})</label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Number(e.target.value))}
                className="w-full rounded-xl bg-[#0B1017] border border-white/10 px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">3. Entry Price ({currSym})</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="w-full rounded-xl bg-[#0B1017] border border-white/10 px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-secondary flex items-center">
                4. How much are you willing to lose if the decision is wrong?
                <BeginnerTooltip
                  term="Stop Loss & Planned Risk"
                  definition="A price level you set to help limit a loss if the market moves against you. It cannot guarantee the final loss amount."
                  example="Risking 1% of ₹1,00,000 means planning to limit your loss to ₹1,000."
                />
              </span>
              <span className="font-mono font-bold text-[#45D6B5]">{riskPercent}% ({currSym}{Math.round((accountBalance * riskPercent) / 100).toLocaleString('en-IN')})</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              className="w-full accent-[#45D6B5]"
            />
            <p className="text-[11px] text-[#93A2B4]">
              Limit your potential loss on this practice trade to {riskPercent}% of your virtual account. If the trade moves against you, this is the amount you are planning to risk — not a guarantee that the loss will never be higher.
            </p>
          </div>

          {/* Suggested Result */}
          <div className="p-4 rounded-2xl bg-[#0B1017] border border-[#45D6B5]/30 grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-[#93A2B4]">Suggested Practice Quantity</div>
              <div className="text-2xl font-extrabold font-mono text-[#45D6B5]">
                {posResult.valid ? `${posResult.recommendedQuantity} shares` : 'Check inputs'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#93A2B4]">Planned Max Risk Amount</div>
              <div className="text-2xl font-extrabold font-mono text-white">
                {currSym}{Math.round((accountBalance * riskPercent) / 100).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Advanced Cost & Margin Settings Accordion */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowAdvancedInputs((v) => !v)}
              className="text-xs font-semibold text-[#78A9FF] hover:underline"
            >
              {showAdvancedInputs ? 'Hide Advanced Cost & Margin Settings' : 'Advanced Cost & Margin Settings'}
            </button>
            {showAdvancedInputs && (
              <div className="grid sm:grid-cols-3 gap-3 mt-3 text-xs">
                <div>
                  <label className="text-[#93A2B4] block mb-1">Stop Loss ({currSym})</label>
                  <input type="number" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} className="w-full rounded-lg bg-[#0B1017] border border-white/10 px-2.5 py-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[#93A2B4] block mb-1">Lot Size</label>
                  <input type="number" value={lotSize} onChange={(e) => setLotSize(Number(e.target.value))} className="w-full rounded-lg bg-[#0B1017] border border-white/10 px-2.5 py-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[#93A2B4] block mb-1">Leverage (x)</label>
                  <input type="number" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className="w-full rounded-lg bg-[#0B1017] border border-white/10 px-2.5 py-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[#93A2B4] block mb-1">Brokerage %</label>
                  <input type="number" step="0.01" value={brokeragePercent} onChange={(e) => setBrokeragePercent(Number(e.target.value))} className="w-full rounded-lg bg-[#0B1017] border border-white/10 px-2.5 py-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[#93A2B4] block mb-1">Slippage %</label>
                  <input type="number" step="0.01" value={slippagePercent} onChange={(e) => setSlippagePercent(Number(e.target.value))} className="w-full rounded-lg bg-[#0B1017] border border-white/10 px-2.5 py-1.5 text-white font-mono" />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/markets')}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary mb-2"
          >
            <ArrowLeft size={14} /> Back to Markets
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Calculator className="text-primary" size={24} /> Quantitative Risk & ML Lab
            </h1>
            <FreshnessBadge
              status={effectiveFreshnessStatus}
              source={wsConnected ? 'SharedStreamManager WS' : quoteStatus?.freshness?.source}
              providerTimestamp={quoteStatus?.freshness?.providerTimestamp}
            />
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Live-synced portfolio VaR/CVaR, N×N correlation matrix, walk-forward ML volatility diagnostics, and shock stress testing.
          </p>
        </div>

        {/* 5-Tab Navigation */}
        <div role="tablist" aria-label="Risk Lab Sections" className="flex flex-wrap gap-2">
          {(
            [
              { id: 'POSITION', label: 'Position Sizer', icon: Calculator },
              { id: 'PORTFOLIO', label: 'Portfolio Risk', icon: PieChart },
              { id: 'ANALYTICS', label: 'VaR & Drawdown', icon: Activity },
              { id: 'ML', label: 'ML Volatility', icon: BrainCircuit },
              { id: 'STRESS', label: 'Stress Testing', icon: Flame },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  activeTab === t.id
                    ? 'bg-primary text-background'
                    : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Instrument Selector Bar for Position, Analytics, ML */}
      {(activeTab === 'POSITION' || activeTab === 'ANALYTICS' || activeTab === 'ML') && (
        <Card className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="w-full md:w-96">
            <InstrumentSearchInput
              placeholder="Search Indian stocks, crypto, or forex..."
              onSelect={handleInstrumentSelect}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-mono">
              <span className="text-text-muted">Active: </span>
              <span className="font-bold text-text-primary">{symbol}</span>{' '}
              <span className="text-text-secondary">({instrumentName})</span>
              {liveTickPrice !== null && (
                <span className="ml-2 px-2 py-0.5 rounded bg-primary/15 text-primary font-bold">
                  {formatMoney(liveTickPrice, quoteStatus?.currency === 'USD' ? 'USD' : 'INR')}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchLatestPrice(assetClass, symbol, true)}
              disabled={fetchingPrice}
              icon={<RefreshCw size={13} className={fetchingPrice ? 'animate-spin' : ''} />}
            >
              Use Live Price
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 1: POSITION SIZER */}
      {activeTab === 'POSITION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">Trade Parameters</h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncEntry}
                    onChange={(e) => setAutoSyncEntry(e.target.checked)}
                    className="accent-primary"
                  />
                  Live Tick Entry
                </label>
                <div className="flex rounded-lg overflow-hidden border border-border text-xs font-mono">
                  {(['LONG', 'SHORT'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={`px-3 py-1 ${
                        direction === d
                          ? d === 'LONG'
                            ? 'bg-primary text-background font-bold'
                            : 'bg-danger text-white font-bold'
                          : 'bg-surface text-text-muted'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-text-muted mb-1">Account Balance</label>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Currency</label>
                <select
                  value={accountCurrency}
                  onChange={(e) => setAccountCurrency(e.target.value as 'INR' | 'USD')}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-text-muted mb-1">Risk per Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Stop-Loss Price</label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Target Price</label>
                <input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Lot Size</label>
                <input
                  type="number"
                  min={1}
                  value={lotSize}
                  onChange={(e) => setLotSize(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Leverage (x)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Brokerage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={brokeragePercent}
                  onChange={(e) => setBrokeragePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Slippage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={slippagePercent}
                  onChange={(e) => setSlippagePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary font-mono"
                />
              </div>
            </div>
          </Card>

          <div className="lg:col-span-7 space-y-4">
            {mlStopAdvisory && (
              <Card
                className={`p-4 border ${
                  mlStopAdvisory.severity === 'HIGH'
                    ? 'border-danger/60 bg-danger/10'
                    : 'border-warning/60 bg-warning/10'
                }`}
              >
                <div className="flex items-start gap-2.5 text-xs">
                  <BrainCircuit
                    size={16}
                    className={`shrink-0 mt-0.5 ${
                      mlStopAdvisory.severity === 'HIGH' ? 'text-danger' : 'text-warning'
                    }`}
                  />
                  <div>
                    <div className="font-bold uppercase tracking-wider text-text-primary">
                      ML-Assisted Stop-Loss Advisory (Non-Blocking)
                    </div>
                    <p className="text-text-secondary mt-1">{mlStopAdvisory.message}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Deterministic Position Sizing Output
                </h2>
                {riskPercent > riskBudgets.maxPositionRiskPct && (
                  <span className="px-2 py-0.5 rounded bg-danger/15 text-danger text-[11px] font-mono">
                    Exceeds {riskBudgets.maxPositionRiskPct}% Risk Budget
                  </span>
                )}
              </div>

              {!posResult.valid ? (
                <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-2">
                  <AlertTriangle size={18} /> {posResult.error || 'Invalid position parameters.'}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-background border border-border">
                      <div className="text-[11px] text-text-muted uppercase">Recommended Qty</div>
                      <div className="text-2xl font-bold font-mono text-primary mt-1">
                        {posResult.recommendedQuantity.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-background border border-border">
                      <div className="text-[11px] text-text-muted uppercase">Max Permitted Risk</div>
                      <div className="text-xl font-bold font-mono text-text-primary mt-1">
                        {formatMoney(posResult.maxMonetaryRisk)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-background border border-border">
                      <div className="text-[11px] text-text-muted uppercase">Risk / Reward</div>
                      <div
                        className={`text-xl font-bold font-mono mt-1 ${
                          (posResult.riskRewardRatio ?? 0) >= 2 ? 'text-primary' : 'text-warning'
                        }`}
                      >
                        1 : {(posResult.riskRewardRatio ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-background border border-border">
                      <div className="text-[11px] text-text-muted uppercase">Position Value</div>
                      <div className="text-lg font-bold font-mono text-text-primary mt-1">
                        {formatMoney(posResult.totalPositionValue)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-background border border-border">
                      <div className="text-[11px] text-text-muted uppercase">Required Margin</div>
                      <div className="text-lg font-bold font-mono text-text-primary mt-1">
                        {formatMoney(posResult.requiredMargin)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-background border border-border">
                      <div className="text-[11px] text-text-muted uppercase">Net Potential Profit</div>
                      <div className="text-lg font-bold font-mono text-primary mt-1">
                        +{formatMoney(posResult.netPotentialProfit ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-background/60 p-4 rounded-lg border border-border">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Risk Per Unit:</span>
                      <span className="text-text-primary">{formatMoney(posResult.riskPerUnit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Stop-Loss Distance:</span>
                      <span className="text-danger">{posResult.stopLossPercent.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Target Distance:</span>
                      <span className="text-primary">{(posResult.targetPercent ?? 0).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Est. Fees & Slippage:</span>
                      <span className="text-text-primary">
                        {formatMoney(posResult.estimatedFees + posResult.estimatedSlippage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Net Potential Loss:</span>
                      <span className="text-danger">-{formatMoney(posResult.netPotentialLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Breakeven Win Rate:</span>
                      <span className="text-text-primary">
                        {posResult.effectiveRiskRewardRatio
                          ? `${(100 / (1 + posResult.effectiveRiskRewardRatio)).toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CORRELATED PORTFOLIO RISK */}
      {activeTab === 'PORTFOLIO' && (
        <div className="space-y-6">
          {/* Mode Switcher & Risk Budget Controls */}
          <Card className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg overflow-hidden border border-border text-xs font-semibold">
                <button
                  onClick={() => setPortfolioMode('LIVE')}
                  className={`px-3.5 py-2 flex items-center gap-1.5 ${
                    portfolioMode === 'LIVE'
                      ? 'bg-primary text-background'
                      : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Zap size={13} /> Live / Simulator Portfolio
                </button>
                <button
                  onClick={() => setPortfolioMode('SANDBOX')}
                  className={`px-3.5 py-2 flex items-center gap-1.5 ${
                    portfolioMode === 'SANDBOX'
                      ? 'bg-secondary text-background'
                      : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sliders size={13} /> What-If Sandbox
                </button>
              </div>

              <span className="text-xs font-mono text-text-muted">
                {portfolioMode === 'LIVE'
                  ? backendPortfolio && backendPortfolio.positions.length > 0
                    ? 'Synced from Backend Portfolio (Read-Only)'
                    : 'Synced from Simulator Context (Read-Only)'
                  : 'Hypothetical Sandbox (Non-Mutating)'}
              </span>

              {portfolioMode === 'LIVE' && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Copy size={13} />}
                  onClick={() => {
                    setSandboxPositions(livePortfolioPositions);
                    setSandboxCash(liveCashBalance);
                    setPortfolioMode('SANDBOX');
                  }}
                >
                  Clone to Sandbox
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <select
                value={portfolioBaseCurrency}
                onChange={(e) => setPortfolioBaseCurrency(e.target.value as 'INR' | 'USD')}
                className="px-2.5 py-1.5 rounded bg-background border border-border text-text-primary"
              >
                <option value="INR">Base: INR (₹)</option>
                <option value="USD">Base: USD ($)</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                icon={<ShieldAlert size={13} />}
                onClick={() => setShowBudgetEditor((v) => !v)}
              >
                Risk Budgets
              </Button>
            </div>
          </Card>

          {/* Configurable Risk Budgets Drawer */}
          {showBudgetEditor && (
            <Card className="p-4 border-secondary/40 bg-secondary/5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Portfolio Risk Budgets (Synced with Trade Reality Check Modal)
                </h3>
                <button
                  onClick={() => {
                    setRiskBudgets(DEFAULT_RISK_BUDGETS);
                    saveRiskBudgets(DEFAULT_RISK_BUDGETS);
                  }}
                  className="text-[11px] font-mono text-text-muted hover:text-text-primary"
                >
                  Reset Defaults
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-text-muted mb-1">Max Portfolio Heat (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={riskBudgets.maxPortfolioHeatPct}
                    onChange={(e) => updateBudgetField('maxPortfolioHeatPct', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-background border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1">Max Sector Exposure (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={riskBudgets.maxSectorExposurePct}
                    onChange={(e) => updateBudgetField('maxSectorExposurePct', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-background border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1">Max Position Risk (%)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={riskBudgets.maxPositionRiskPct}
                    onChange={(e) => updateBudgetField('maxPositionRiskPct', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-background border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1">Max Single Position (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={riskBudgets.maxSinglePositionPct}
                    onChange={(e) => updateBudgetField('maxSinglePositionPct', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded bg-background border border-border font-mono"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Top KPI Row from Backend Correlated Portfolio Risk Engine */}
          {portfolioRiskError && (
            <Card className="p-4 border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
              <AlertTriangle size={16} /> {portfolioRiskError}
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="text-[11px] text-text-muted uppercase">Total Equity</div>
              <div className="text-lg font-bold font-mono text-text-primary mt-1">
                {portfolioRisk ? formatMoney(portfolioRisk.totalEquity, portfolioBaseCurrency) : '—'}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                Cash: {portfolioRisk ? formatMoney(portfolioRisk.cashBalance, portfolioBaseCurrency) : '—'}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] text-text-muted uppercase">Portfolio Heat (SL)</div>
              <div
                className={`text-lg font-bold font-mono mt-1 ${
                  (portfolioRisk?.portfolioHeatPct || 0) > riskBudgets.maxPortfolioHeatPct
                    ? 'text-danger'
                    : 'text-primary'
                }`}
              >
                {portfolioRisk ? `${portfolioRisk.portfolioHeatPct.toFixed(2)}%` : '—'}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                Budget ≤ {riskBudgets.maxPortfolioHeatPct}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] text-text-muted uppercase">
                Correlated VaR ({Math.round(confidence * 100)}%)
              </div>
              <div className="text-lg font-bold font-mono text-warning mt-1">
                {portfolioRisk ? formatMoney(portfolioRisk.portfolioDailyVarAmount, portfolioBaseCurrency) : '—'}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                {portfolioRisk ? `${portfolioRisk.portfolioDailyVarPct.toFixed(2)}% / day` : '—'}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] text-text-muted uppercase">Correlated CVaR</div>
              <div className="text-lg font-bold font-mono text-danger mt-1">
                {portfolioRisk ? formatMoney(portfolioRisk.portfolioDailyCvarAmount, portfolioBaseCurrency) : '—'}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                Div Benefit: {portfolioRisk ? `${portfolioRisk.diversificationBenefitPct.toFixed(1)}%` : '—'}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] text-text-muted uppercase">Portfolio Beta</div>
              <div className="text-lg font-bold font-mono text-text-primary mt-1">
                {portfolioRisk ? portfolioRisk.portfolioBeta.toFixed(2) : '—'}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                vs {portfolioRisk?.benchmarkSymbol || 'NIFTY50'}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] text-text-muted uppercase">Ann. Vol / Max DD</div>
              <div className="text-lg font-bold font-mono text-text-primary mt-1">
                {portfolioRisk ? `${portfolioRisk.annualizedVolatilityPct.toFixed(1)}%` : '—'}
              </div>
              <div className="text-[10px] font-mono text-danger mt-0.5">
                Max DD: -{portfolioRisk ? portfolioRisk.maxDrawdownPct.toFixed(1) : '0.0'}%
              </div>
            </Card>
          </div>

          {/* Sandbox Add Position Form */}
          {portfolioMode === 'SANDBOX' && (
            <Card className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Add Hypothetical Position to Sandbox
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-text-muted">Sandbox Cash:</span>
                  <input
                    type="number"
                    value={sandboxCash}
                    onChange={(e) => setSandboxCash(Math.max(0, Number(e.target.value)))}
                    className="w-32 px-2.5 py-1 rounded bg-background border border-border text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
                <div className="md:col-span-4">
                  <label className="block text-text-muted mb-1">Search Instrument</label>
                  <InstrumentSearchInput
                    placeholder="Search Stock, Crypto, or Forex..."
                    onSelect={handleSandboxInstrumentSelect}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-text-muted mb-1">Symbol ({newPosClass})</label>
                  <input
                    value={newPosSym}
                    onChange={(e) => setNewPosSym(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded bg-background border border-border font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-text-muted mb-1">Sector</label>
                  <input
                    value={newPosClass === 'STOCK' ? newPosSector : 'N/A'}
                    disabled={newPosClass !== 'STOCK'}
                    onChange={(e) => setNewPosSector(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-background border border-border disabled:opacity-50"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-text-muted mb-1">Qty</label>
                  <input
                    type="number"
                    value={newPosQty}
                    onChange={(e) => setNewPosQty(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded bg-background border border-border font-mono"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-text-muted mb-1">Entry</label>
                  <input
                    type="number"
                    value={newPosEntry}
                    onChange={(e) => setNewPosEntry(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded bg-background border border-border font-mono"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-text-muted mb-1">Stop</label>
                  <input
                    type="number"
                    value={newPosStop}
                    onChange={(e) => setNewPosStop(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded bg-background border border-border font-mono"
                  />
                </div>
                <div className="md:col-span-1">
                  <Button onClick={addSandboxPosition} size="sm" icon={<Plus size={14} />} className="w-full">
                    Add
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Positions Table */}
          <Card className="p-5 overflow-x-auto space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Open Holdings & Risk Attribution
              </h2>
              {loadingPortfolioRisk && (
                <span className="text-xs font-mono text-primary flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin" /> Computing correlated VaR...
                </span>
              )}
            </div>

            {activePositions.length === 0 ? (
              <div className="text-xs text-text-muted py-6 text-center">
                No positions in active portfolio. Switch to What-If Sandbox or place a trade in the Simulator.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border text-text-muted uppercase font-mono">
                  <tr>
                    <th className="py-2.5 pr-4">Symbol</th>
                    <th className="py-2.5 pr-4">Class / Sector</th>
                    <th className="py-2.5 pr-4">Qty</th>
                    <th className="py-2.5 pr-4">Live Price</th>
                    <th className="py-2.5 pr-4">Weight</th>
                    <th className="py-2.5 pr-4">Risk Contrib</th>
                    <th className="py-2.5 pr-4">Beta</th>
                    <th className="py-2.5 pr-4">Stop-Loss</th>
                    {portfolioMode === 'SANDBOX' && <th className="py-2.5 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {activePositions.map((p) => {
                    const backendPos = portfolioRisk?.positions?.find((bp: any) => bp.symbol === p.symbol);
                    const livePx = livePricesByKey[`${p.assetClass}:${p.symbol}`] ?? p.currentPrice ?? p.entryPrice;
                    return (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 font-bold text-text-primary">{p.symbol}</td>
                        <td className="py-2.5 pr-4 text-text-secondary">
                          {p.assetClass} · {p.sector}
                        </td>
                        <td className="py-2.5 pr-4">{p.quantity}</td>
                        <td className="py-2.5 pr-4 text-primary">
                          {formatMoney(livePx, p.currency || 'INR')}
                        </td>
                        <td className="py-2.5 pr-4">
                          {backendPos ? `${backendPos.weightPct.toFixed(1)}%` : '—'}
                        </td>
                        <td
                          className={`py-2.5 pr-4 font-semibold ${
                            backendPos && backendPos.riskContributionPct > backendPos.weightPct * 1.25
                              ? 'text-danger'
                              : 'text-text-primary'
                          }`}
                        >
                          {backendPos ? `${backendPos.riskContributionPct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 pr-4">{backendPos ? backendPos.beta.toFixed(2) : '—'}</td>
                        <td className="py-2.5 pr-4 text-danger">
                          {p.stopLoss ? formatMoney(p.stopLoss, p.currency || 'INR') : 'No SL'}
                        </td>
                        {portfolioMode === 'SANDBOX' && (
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => setSandboxPositions((prev) => prev.filter((x) => x.id !== p.id))}
                              className="text-danger hover:opacity-80"
                              title="Remove Position"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          {/* Visualizations: Risk Contribution, Correlation Matrix, Sector & Drawdown */}
          {portfolioRisk && portfolioRisk.positions?.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Marginal Risk Contribution vs Capital Weight
                </h3>
                <RiskContributionChart positions={portfolioRisk.positions} />
                <div className="text-[11px] font-mono text-text-muted pt-2 border-t border-border flex justify-between">
                  <span>Effective N: {portfolioRisk.concentration?.effectiveN}</span>
                  <span>
                    Top Position: {portfolioRisk.concentration?.largestSymbol} (
                    {portfolioRisk.concentration?.largestPositionPct}%)
                  </span>
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  N×N Asset Return Correlation Matrix
                </h3>
                <CorrelationHeatmap
                  labels={portfolioRisk.correlationMatrix?.labels || []}
                  matrix={portfolioRisk.correlationMatrix?.matrix || []}
                />
                <div className="text-[11px] font-mono text-text-muted">
                  Methodology: {portfolioRisk.methodology} · FX USD/INR: {portfolioRisk.usdInrRate}
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Sector Exposure & Budget Checks
                </h3>
                <div className="space-y-2.5">
                  {(portfolioRisk.sectorExposure || []).map((sec: any) => {
                    const breached = sec.sector !== 'N/A' && sec.weightPct > riskBudgets.maxSectorExposurePct;
                    return (
                      <div key={sec.sector} className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-text-primary">{sec.sector}</span>
                          <span className={breached ? 'text-danger font-bold' : 'text-text-secondary'}>
                            {sec.weightPct.toFixed(1)}% {breached ? '(BREACH)' : ''}
                          </span>
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${breached ? 'bg-danger' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, sec.weightPct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-5">
                <UnderwaterDrawdownChart
                  drawdownSeries={portfolioRisk.drawdownSeries || []}
                  maxDrawdownPct={portfolioRisk.maxDrawdownPct || 0}
                  currentDrawdownPct={portfolioRisk.currentDrawdownPct || 0}
                />
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUANTITATIVE ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Historical Volatility, VaR & Drawdown ({symbol})
                </h2>
                <p className="text-xs text-text-muted">
                  Empirical distribution computed from real historical daily candles.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="px-3 py-1.5 rounded bg-background border border-border"
                >
                  <option value={0.95}>95% Confidence</option>
                  <option value={0.99}>99% Confidence</option>
                </select>
                <select
                  value={lookback}
                  onChange={(e) => setLookback(Number(e.target.value))}
                  className="px-3 py-1.5 rounded bg-background border border-border"
                >
                  <option value={90}>90D Lookback</option>
                  <option value={180}>180D Lookback</option>
                  <option value={252}>252D (1Y)</option>
                  <option value={365}>365D</option>
                </select>
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="py-10 text-center text-xs text-text-muted">Computing historical risk metrics...</div>
            ) : analytics?.available ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Historical Vol (Ann.)</div>
                    <div className="text-xl font-bold font-mono text-text-primary mt-1">
                      {analytics.historicalVolatilityPct}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Downside Deviation</div>
                    <div className="text-xl font-bold font-mono text-text-primary mt-1">
                      {analytics.downsideDeviationPct}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">ATR(14)</div>
                    <div className="text-xl font-bold font-mono text-text-primary mt-1">
                      {analytics.atr14} ({analytics.atrPercent}%)
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Max Drawdown</div>
                    <div className="text-xl font-bold font-mono text-danger mt-1">
                      -{analytics.maxDrawdownPct}%
                    </div>
                    <div className="text-[10px] font-mono text-text-muted">
                      Longest: {analytics.maxDrawdownDurationDays ?? 0}d
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">
                      Daily VaR ({Math.round(confidence * 100)}%)
                    </div>
                    <div className="text-xl font-bold font-mono text-warning mt-1">
                      -{analytics.var.dailyVarPct}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Daily CVaR</div>
                    <div className="text-xl font-bold font-mono text-danger mt-1">
                      -{analytics.var.dailyCvarPct}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ReturnDistributionChart
                    dailyReturnsPct={analytics.dailyReturnsPct || []}
                    dailyVarPct={analytics.var.dailyVarPct}
                    dailyCvarPct={analytics.var.dailyCvarPct}
                  />
                  <UnderwaterDrawdownChart
                    drawdownSeries={analytics.drawdownSeries || []}
                    maxDrawdownPct={analytics.maxDrawdownPct}
                    currentDrawdownPct={analytics.currentDrawdownPct || 0}
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-warning">
                {analytics?.reason || 'Historical analytics unavailable for this instrument.'}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: ML VOLATILITY INTELLIGENCE */}
      {activeTab === 'ML' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <BrainCircuit size={18} className="text-secondary" /> Walk-Forward ML Volatility Intelligence ({symbol})
                </h2>
                <p className="text-xs text-text-muted">
                  Strict 70% chronological train / 30% unseen out-of-sample test vs 20D persistence baseline.
                </p>
              </div>
              {mlData?.available && <FreshnessBadge status={mlData.status} source={mlData.source} />}
            </div>

            {loadingMl ? (
              <div className="py-10 text-center text-xs text-text-muted">
                Running walk-forward ML training & out-of-sample validation...
              </div>
            ) : mlData?.available ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Volatility Regime</div>
                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        mlData.volatilityRegime === 'HIGH'
                          ? 'text-danger'
                          : mlData.volatilityRegime === 'MODERATE'
                          ? 'text-warning'
                          : 'text-primary'
                      }`}
                    >
                      {mlData.volatilityRegime} ({mlData.volatilityPercentile}th pct)
                    </div>
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full ${
                          mlData.volatilityRegime === 'HIGH'
                            ? 'bg-danger'
                            : mlData.volatilityRegime === 'MODERATE'
                            ? 'bg-warning'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, mlData.volatilityPercentile))}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Est. Next 5D Vol</div>
                    <div className="text-xl font-bold font-mono text-text-primary mt-1">
                      {mlData.estimatedNext5dVolPct}%
                    </div>
                    <div className="text-[11px] text-text-muted font-mono">
                      Band: [{mlData.estimatedVolRangePct[0]}% – {mlData.estimatedVolRangePct[1]}%]
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Vol Trend</div>
                    <div className="text-xl font-bold font-mono text-text-primary mt-1">
                      {mlData.volatilityTrend}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono">
                      20D: {mlData.current20dVolPct}% | 60D: {mlData.current60dVolPct}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Anomaly Check</div>
                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        mlData.anomalyDetected ? 'text-danger' : 'text-primary'
                      }`}
                    >
                      {mlData.anomalyDetected ? 'ALERT' : 'NORMAL'}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono">
                      Ret Z: {mlData.latestReturnZScore} | Vol Z: {mlData.latestVolumeZScore}
                    </div>
                  </div>
                </div>

                {/* Out-of-Sample Predicted vs Actual + Feature Importance */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8">
                    <MlOutOfSampleChart series={mlData.outOfSampleSeries || []} />
                  </div>
                  <div className="lg:col-span-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Feature Importance ({mlData.modelName})
                    </h3>
                    <FeatureImportanceChart items={mlData.featureImportance || []} />
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-background/70 border border-border space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-text-primary">
                    {mlData.beatsBaseline ? (
                      <CheckCircle2 size={16} className="text-primary" />
                    ) : (
                      <AlertTriangle size={16} className="text-warning" />
                    )}
                    {mlData.recommendation}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-[11px]">
                    <div>Model: {mlData.modelName}</div>
                    <div>
                      ML MAE: <strong className="text-text-primary">{mlData.evaluation.modelMaePct}%</strong> (vs Base{' '}
                      {mlData.evaluation.baselineMaePct}%)
                    </div>
                    <div>
                      ML RMSE: <strong className="text-text-primary">{mlData.evaluation.modelRmsePct}%</strong> (vs Base{' '}
                      {mlData.evaluation.baselineRmsePct}%)
                    </div>
                    <div>
                      Test Window: {mlData.evaluation.testStartDate} → {mlData.evaluation.dataEndDate} (
                      {mlData.evaluation.testSamples} samples)
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-text-muted">
                  {(mlData.limitations || []).map((l: string, i: number) => (
                    <div key={i}>• {l}</div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-warning">
                {mlData?.reason || 'ML Volatility Intelligence requires at least 120 daily candles.'}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 5: INTERACTIVE STRESS TESTING */}
      {activeTab === 'STRESS' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <Flame size={18} className="text-danger" /> Portfolio Shock & Stress Simulator
                </h2>
                <p className="text-xs text-text-muted">
                  Applies beta-adjusted market, crypto, FX, sector, and volatility-regime shocks to your active portfolio.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEquityShockPct(-5);
                    setCryptoShockPct(-10);
                    setVolMultiplier(1.5);
                    setSectorShockPct(0);
                  }}
                >
                  Market -5%
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEquityShockPct(-10);
                    setCryptoShockPct(-25);
                    setVolMultiplier(2.0);
                    setSectorShockPct(0);
                  }}
                >
                  Crash -10% / Vol ×2
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEquityShockPct(-3);
                    setCryptoShockPct(-20);
                    setVolMultiplier(1.75);
                  }}
                >
                  Crypto -20%
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEquityShockPct(0);
                    setCryptoShockPct(0);
                    setForexShockPct(0);
                    setVolMultiplier(1.0);
                    setSectorShockPct(0);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-mono bg-background/60 p-4 rounded-lg border border-border">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-muted">Equity Shock (β-scaled)</span>
                  <span className={equityShockPct < 0 ? 'text-danger' : 'text-primary'}>{equityShockPct}%</span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={20}
                  step={1}
                  value={equityShockPct}
                  onChange={(e) => setEquityShockPct(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-muted">Crypto Shock</span>
                  <span className={cryptoShockPct < 0 ? 'text-danger' : 'text-primary'}>{cryptoShockPct}%</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={30}
                  step={1}
                  value={cryptoShockPct}
                  onChange={(e) => setCryptoShockPct(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-muted">Forex Shock</span>
                  <span className={forexShockPct < 0 ? 'text-danger' : 'text-primary'}>{forexShockPct}%</span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={forexShockPct}
                  onChange={(e) => setForexShockPct(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-muted">Vol Regime Multiplier</span>
                  <span className="text-warning">{volMultiplier.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.25}
                  value={volMultiplier}
                  onChange={(e) => setVolMultiplier(Number(e.target.value))}
                  className="w-full accent-warning"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-muted">Sector Extra Shock</span>
                  <span className={sectorShockPct < 0 ? 'text-danger' : 'text-text-primary'}>{sectorShockPct}%</span>
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={shockSector}
                    onChange={(e) => setShockSector(e.target.value)}
                    className="w-1/2 px-1.5 py-1 rounded bg-surface border border-border text-[11px]"
                  >
                    <option value="ALL">None</option>
                    {uniqueSectors.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={-40}
                    max={20}
                    value={sectorShockPct}
                    onChange={(e) => setSectorShockPct(Number(e.target.value))}
                    className="w-1/2 px-2 py-1 rounded bg-surface border border-border text-[11px]"
                  />
                </div>
              </div>
            </div>

            {stressResults ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Shock P&L Impact</div>
                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        stressResults.totalShockPnl >= 0 ? 'text-primary' : 'text-danger'
                      }`}
                    >
                      {stressResults.totalShockPnl >= 0 ? '+' : ''}
                      {formatMoney(stressResults.totalShockPnl, portfolioBaseCurrency)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Portfolio Drawdown</div>
                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        stressResults.portfolioImpactPct >= 0 ? 'text-primary' : 'text-danger'
                      }`}
                    >
                      {stressResults.portfolioImpactPct >= 0 ? '+' : ''}
                      {stressResults.portfolioImpactPct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Post-Shock Equity</div>
                    <div className="text-xl font-bold font-mono text-text-primary mt-1">
                      {formatMoney(stressResults.stressedEquity, portfolioBaseCurrency)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <div className="text-[11px] text-text-muted uppercase">Stressed Daily VaR</div>
                    <div className="text-xl font-bold font-mono text-warning mt-1">
                      {formatMoney(stressResults.stressedDailyVar, portfolioBaseCurrency)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-mono">
                    <thead className="border-b border-border text-text-muted uppercase">
                      <tr>
                        <th className="py-2 pr-4">Symbol</th>
                        <th className="py-2 pr-4">Beta</th>
                        <th className="py-2 pr-4">Current Value</th>
                        <th className="py-2 pr-4">Effective Shock</th>
                        <th className="py-2 pr-4">Stressed P&L</th>
                        <th className="py-2 text-right">Post-Shock Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {stressResults.rows.map((r: any) => (
                        <tr key={r.symbol}>
                          <td className="py-2 pr-4 font-bold text-text-primary">{r.symbol}</td>
                          <td className="py-2 pr-4">{r.beta.toFixed(2)}</td>
                          <td className="py-2 pr-4">{formatMoney(r.currentValue, portfolioBaseCurrency)}</td>
                          <td className={`py-2 pr-4 ${r.shockPct < 0 ? 'text-danger' : 'text-primary'}`}>
                            {r.shockPct.toFixed(2)}%
                          </td>
                          <td className={`py-2 pr-4 font-bold ${r.pnl < 0 ? 'text-danger' : 'text-primary'}`}>
                            {r.pnl >= 0 ? '+' : ''}
                            {formatMoney(r.pnl, portfolioBaseCurrency)}
                          </td>
                          <td className="py-2 text-right">{formatMoney(r.stressedValue, portfolioBaseCurrency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-text-muted">
                Add positions in the Portfolio Risk tab to run stress simulations.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Disclaimer */}
      <div className="p-4 rounded-xl bg-surface/60 border border-border text-[11px] text-text-muted flex items-start gap-2.5">
        <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
        <div>
          <strong>Educational Risk Lab Notice:</strong> Position sizing formulas are strictly deterministic. Historical VaR,
          CVaR, correlation matrices, and ML volatility regimes reflect past price behavior and do not predict future price
          direction or guarantee loss limits.
        </div>
      </div>
    </div>
  );
};
