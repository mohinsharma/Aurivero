import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Calculator,
  CheckCircle2,
  PieChart,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { AssetClass, InstrumentMeta } from '../types/markets';
import {
  PortfolioRiskPosition,
  TradeDirection,
  calculatePortfolioRisk,
  calculatePositionSize,
} from '../utils/riskCalculator';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { InstrumentSearchInput } from '../components/markets/InstrumentSearchInput';
import { FreshnessBadge } from '../components/markets/FreshnessBadge';

type RiskTab = 'POSITION' | 'PORTFOLIO' | 'ANALYTICS' | 'ML';

export const RiskCalculatorPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RiskTab>('POSITION');

  // Selected Instrument for Position & Analytics
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

  // Portfolio Risk Positions
  const [positions, setPositions] = useState<PortfolioRiskPosition[]>([
    {
      id: 'p-1',
      symbol: 'RELIANCE',
      assetClass: 'STOCK',
      sector: 'Energy',
      direction: 'LONG',
      quantity: 15,
      entryPrice: 2900,
      stopLoss: 2820,
    },
    {
      id: 'p-2',
      symbol: 'TCS',
      assetClass: 'STOCK',
      sector: 'IT',
      direction: 'LONG',
      quantity: 10,
      entryPrice: 4100,
      stopLoss: 3980,
    },
  ]);
  const [newPosSym, setNewPosSym] = useState('INFY');
  const [newPosClass, setNewPosClass] = useState<AssetClass>('STOCK');
  const [newPosSector, setNewPosSector] = useState('IT');
  const [newPosQty, setNewPosQty] = useState(10);
  const [newPosEntry, setNewPosEntry] = useState(1780);
  const [newPosStop, setNewPosStop] = useState(1720);

  // Historical Risk Analytics
  const [confidence, setConfidence] = useState<number>(0.95);
  const [lookback, setLookback] = useState<number>(252);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);

  // ML Risk Intelligence
  const [mlData, setMlData] = useState<any>(null);
  const [loadingMl, setLoadingMl] = useState<boolean>(false);

  const fetchLatestPrice = async (ac: AssetClass, sym: string) => {
    setFetchingPrice(true);
    const res = await api.markets.getQuote(ac, sym);
    if (res.success && res.data?.quote) {
      const q = res.data.quote;
      setQuoteStatus(q);
      if (q.price && q.price > 0) {
        const p = Number(q.price);
        setEntryPrice(p);
        setStopLoss(Number((direction === 'LONG' ? p * 0.97 : p * 1.03).toFixed(ac === 'FOREX' ? 4 : 2)));
        setTargetPrice(Number((direction === 'LONG' ? p * 1.06 : p * 0.94).toFixed(ac === 'FOREX' ? 4 : 2)));
        setAccountCurrency(ac === 'STOCK' && q.currency === 'INR' ? 'INR' : 'USD');
      }
    }
    setFetchingPrice(false);
  };

  const handleInstrumentSelect = (item: InstrumentMeta) => {
    setAssetClass(item.assetClass);
    setSymbol(item.symbol);
    setInstrumentName(item.name);
    setLotSize(item.assetClass === 'FOREX' ? 1000 : 1);
    fetchLatestPrice(item.assetClass, item.symbol);
  };

  useEffect(() => {
    fetchLatestPrice('STOCK', 'RELIANCE');
  }, []);

  useEffect(() => {
    if (activeTab === 'ANALYTICS') {
      setLoadingAnalytics(true);
      api.markets.getRiskAnalytics(assetClass, symbol, confidence, lookback).then((res) => {
        if (res.success) setAnalytics(res.data);
        setLoadingAnalytics(false);
      });
    } else if (activeTab === 'ML') {
      setLoadingMl(true);
      api.markets.getMlRisk(assetClass, symbol).then((res) => {
        if (res.success) setMlData(res.data);
        setLoadingMl(false);
      });
    }
  }, [activeTab, assetClass, symbol, confidence, lookback]);

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

  const portfolioSummary = useMemo(
    () => calculatePortfolioRisk(accountBalance, positions),
    [accountBalance, positions]
  );

  const currSym = accountCurrency === 'INR' ? '₹' : '$';

  // Risk/Reward Visualizer proportions
  const rrRatioWidth = useMemo(() => {
    if (!posResult.valid || !posResult.targetDistance) return { lossPct: 50, profitPct: 50 };
    const total = posResult.stopLossDistance + posResult.targetDistance;
    return {
      lossPct: Math.max(15, Math.min(85, (posResult.stopLossDistance / total) * 100)),
      profitPct: Math.max(15, Math.min(85, (posResult.targetDistance / total) * 100)),
    };
  }, [posResult]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/markets')}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            <ArrowLeft size={14} /> Back to Markets
          </button>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <Calculator size={22} className="text-primary" />
            Risk Management & Quantitative Analytics
          </h1>
          <p className="text-xs text-text-secondary">
            Deterministic position sizing, portfolio heat, Value at Risk (VaR/CVaR), and walk-forward validated volatility intelligence.
          </p>
        </div>

        <div className="w-full sm:w-80">
          <InstrumentSearchInput
            onSelect={handleInstrumentSelect}
            placeholder="Load live price (RELIANCE, BTC, EURUSD)..."
            ariaLabel="Select instrument for risk calculation"
          />
        </div>
      </div>

      {/* Selected Instrument Banner */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30 font-mono text-xs font-bold">
            {symbol}
          </span>
          <div>
            <div className="text-sm font-bold text-text-primary">{instrumentName}</div>
            <div className="text-[11px] text-text-muted font-mono">
              {assetClass} • {quoteStatus?.exchange || assetClass}
            </div>
          </div>
          {quoteStatus?.status && (
            <FreshnessBadge status={quoteStatus.status} source={quoteStatus.source} compact />
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          icon={<RefreshCw size={13} />}
          isLoading={fetchingPrice}
          onClick={() => fetchLatestPrice(assetClass, symbol)}
        >
          Sync Market Price
        </Button>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Risk Management Sections">
        {[
          { id: 'POSITION', label: 'Position Size & R:R', icon: Calculator },
          { id: 'PORTFOLIO', label: 'Portfolio Risk', icon: PieChart },
          { id: 'ANALYTICS', label: 'VaR / CVaR & Volatility', icon: Activity },
          { id: 'ML', label: 'ML Volatility Intelligence', icon: BrainCircuit },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(t.id as RiskTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-secondary border-border hover:text-text-primary'
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: POSITION SIZE & RISK/REWARD VISUALIZER */}
      {activeTab === 'POSITION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-text-primary">Trade Parameters</h2>
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setDirection('LONG')}
                  className={`px-3 py-1 font-bold ${
                    direction === 'LONG' ? 'bg-primary text-white' : 'bg-background text-text-muted'
                  }`}
                >
                  ▲ LONG
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SHORT')}
                  className={`px-3 py-1 font-bold ${
                    direction === 'SHORT' ? 'bg-danger text-white' : 'bg-background text-text-muted'
                  }`}
                >
                  ▼ SHORT
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="rc-balance" className="text-[11px] text-text-muted block mb-1">
                  Account Balance ({currSym})
                </label>
                <input
                  id="rc-balance"
                  type="number"
                  min={1}
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="rc-risk-pct" className="text-[11px] text-text-muted block mb-1">
                  Risk Per Trade (%)
                </label>
                <input
                  id="rc-risk-pct"
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={100}
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-text-primary"
                />
              </div>

              <div>
                <label htmlFor="rc-entry" className="text-[11px] text-text-muted block mb-1">
                  Entry Price ({currSym})
                </label>
                <input
                  id="rc-entry"
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="rc-sl" className="text-[11px] text-text-muted block mb-1">
                  Stop-Loss Price ({currSym})
                </label>
                <input
                  id="rc-sl"
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-text-primary"
                />
              </div>

              <div>
                <label htmlFor="rc-target" className="text-[11px] text-text-muted block mb-1">
                  Target Price ({currSym})
                </label>
                <input
                  id="rc-target"
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="rc-lot" className="text-[11px] text-text-muted block mb-1">
                  Lot Size / Step
                </label>
                <input
                  id="rc-lot"
                  type="number"
                  min={1}
                  value={lotSize}
                  onChange={(e) => setLotSize(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-text-primary"
                />
              </div>

              <div>
                <label htmlFor="rc-lev" className="text-[11px] text-text-muted block mb-1">
                  Leverage (x)
                </label>
                <input
                  id="rc-lev"
                  type="number"
                  min={1}
                  max={50}
                  value={leverage}
                  onChange={(e) => setLeverage(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-text-primary"
                />
              </div>
              <div>
                <label htmlFor="rc-fee" className="text-[11px] text-text-muted block mb-1">
                  Est. Brokerage + Slippage (%)
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="rc-fee"
                    type="number"
                    step="0.01"
                    min={0}
                    value={brokeragePercent}
                    onChange={(e) => setBrokeragePercent(Number(e.target.value))}
                    title="Estimated Brokerage %"
                    className="w-1/2 bg-background border border-border rounded-lg px-2 py-2 font-mono text-text-primary"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={slippagePercent}
                    onChange={(e) => setSlippagePercent(Number(e.target.value))}
                    title="Estimated Slippage %"
                    aria-label="Estimated Slippage %"
                    className="w-1/2 bg-background border border-border rounded-lg px-2 py-2 font-mono text-text-primary"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-7 space-y-5">
            {!posResult.valid ? (
              <Card className="border-danger/40 bg-danger/10 text-danger text-sm flex items-center gap-3">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <span>{posResult.error}</span>
              </Card>
            ) : (
              <>
                {/* Key Outputs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-[11px] text-text-muted">Recommended Quantity</div>
                    <div className="text-2xl font-extrabold font-mono text-primary mt-1">
                      {posResult.recommendedQuantity.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">units ({symbol})</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-[11px] text-text-muted">Max Monetary Risk</div>
                    <div className="text-2xl font-extrabold font-mono text-danger mt-1">
                      -{currSym}{posResult.potentialLoss.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      Budget: {currSym}{posResult.maxMonetaryRisk.toLocaleString()} ({riskPercent}%)
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-[11px] text-text-muted">Risk / Reward Ratio</div>
                    <div className="text-2xl font-extrabold font-mono text-text-primary mt-1">
                      {posResult.riskRewardRatio ? `1 : ${posResult.riskRewardRatio}` : '—'}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      Net est: {posResult.effectiveRiskRewardRatio ? `1 : ${posResult.effectiveRiskRewardRatio}` : '—'}
                    </div>
                  </Card>
                </div>

                {/* Risk/Reward Visualizer */}
                <Card className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-primary">
                      Interactive Risk / Reward Visualizer ({direction})
                    </h3>
                    <span className="text-xs font-mono text-text-muted">
                      Risk/Unit: {currSym}{posResult.riskPerUnit}
                    </span>
                  </div>

                  <div className="h-12 w-full rounded-xl overflow-hidden flex border border-border font-mono text-xs font-bold">
                    <div
                      style={{ width: `${rrRatioWidth.lossPct}%` }}
                      className="bg-danger/25 border-r-2 border-text-primary flex items-center justify-center text-danger px-2 truncate"
                    >
                      ▼ Loss Zone (-{posResult.stopLossPercent}%)
                    </div>
                    <div
                      style={{ width: `${rrRatioWidth.profitPct}%` }}
                      className="bg-primary/25 flex items-center justify-center text-primary px-2 truncate"
                    >
                      ▲ Profit Zone ({posResult.targetPercent ? `+${posResult.targetPercent}%` : 'No Target'})
                    </div>
                  </div>

                  <div className="grid grid-cols-3 text-xs font-mono text-center pt-1">
                    <div className="text-danger">
                      Stop-Loss: {currSym}{stopLoss}
                    </div>
                    <div className="text-text-primary font-bold">
                      Entry: {currSym}{entryPrice}
                    </div>
                    <div className="text-primary">
                      Target: {currSym}{targetPrice}
                    </div>
                  </div>
                </Card>

                {/* Detailed Breakdown */}
                <Card className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-text-muted">Position Value</div>
                    <div className="font-mono font-bold text-text-primary mt-1">
                      {currSym}{posResult.totalPositionValue.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-muted">Required Margin</div>
                    <div className="font-mono font-bold text-text-primary mt-1">
                      {currSym}{posResult.requiredMargin.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-muted">Potential Profit (Gross)</div>
                    <div className="font-mono font-bold text-primary mt-1">
                      +{currSym}{(posResult.potentialProfit ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-muted">Est. Fees & Slippage</div>
                    <div className="font-mono font-bold text-warning mt-1">
                      {currSym}{(posResult.estimatedFees + posResult.estimatedSlippage).toLocaleString()}
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PORTFOLIO RISK CALCULATOR */}
      {activeTab === 'PORTFOLIO' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-[11px] text-text-muted">Total Exposure</div>
              <div className="text-xl font-extrabold font-mono text-text-primary mt-1">
                {currSym}{portfolioSummary.totalExposure.toLocaleString()}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] text-text-muted">Available Capital</div>
              <div className="text-xl font-extrabold font-mono text-primary mt-1">
                {currSym}{portfolioSummary.availableCapital.toLocaleString()}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] text-text-muted">Total Potential Downside</div>
              <div className="text-xl font-extrabold font-mono text-danger mt-1">
                -{currSym}{portfolioSummary.totalPotentialDownside.toLocaleString()}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] text-text-muted">Combined Portfolio Risk</div>
              <div className="text-xl font-extrabold font-mono text-warning mt-1">
                {portfolioSummary.combinedRiskPercent}%
              </div>
            </Card>
          </div>

          {portfolioSummary.warnings.length > 0 && (
            <Card className="border-warning/40 bg-warning/10 space-y-1.5 text-xs text-warning">
              {portfolioSummary.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-bold text-text-primary">Tracked / Hypothetical Positions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <input
                  value={newPosSym}
                  onChange={(e) => setNewPosSym(e.target.value.toUpperCase())}
                  placeholder="Symbol"
                  aria-label="New position symbol"
                  className="bg-background border border-border rounded-lg px-2 py-1.5 font-mono"
                />
                <select
                  value={newPosClass}
                  onChange={(e) => setNewPosClass(e.target.value as AssetClass)}
                  aria-label="New position asset class"
                  className="bg-background border border-border rounded-lg px-2 py-1.5"
                >
                  <option value="STOCK">STOCK</option>
                  <option value="CRYPTO">CRYPTO</option>
                  <option value="FOREX">FOREX</option>
                </select>
                <input
                  value={newPosSector}
                  onChange={(e) => setNewPosSector(e.target.value)}
                  placeholder="Sector"
                  aria-label="New position sector"
                  className="bg-background border border-border rounded-lg px-2 py-1.5"
                />
                <input
                  type="number"
                  value={newPosQty}
                  onChange={(e) => setNewPosQty(Number(e.target.value))}
                  placeholder="Qty"
                  aria-label="New position quantity"
                  className="bg-background border border-border rounded-lg px-2 py-1.5 font-mono"
                />
                <input
                  type="number"
                  value={newPosEntry}
                  onChange={(e) => setNewPosEntry(Number(e.target.value))}
                  placeholder="Entry"
                  aria-label="New position entry price"
                  className="bg-background border border-border rounded-lg px-2 py-1.5 font-mono"
                />
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={newPosStop}
                    onChange={(e) => setNewPosStop(Number(e.target.value))}
                    placeholder="SL"
                    aria-label="New position stop loss"
                    className="w-2/3 bg-background border border-border rounded-lg px-2 py-1.5 font-mono"
                  />
                  <Button
                    size="sm"
                    icon={<Plus size={13} />}
                    aria-label="Add position"
                    onClick={() => {
                      if (!newPosSym.trim() || newPosQty <= 0) return;
                      setPositions((prev) => [
                        ...prev,
                        {
                          id: `p-${Date.now()}`,
                          symbol: newPosSym.trim(),
                          assetClass: newPosClass,
                          sector: newPosSector || 'Other',
                          direction: 'LONG',
                          quantity: newPosQty,
                          entryPrice: newPosEntry,
                          stopLoss: newPosStop,
                        },
                      ]);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-border/50 text-xs">
                {positions.map((p, idx) => {
                  const detail = portfolioSummary.positionRisks[idx];
                  return (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-mono font-bold text-text-primary">{p.symbol}</span>{' '}
                        <span className="text-[11px] text-text-muted">
                          ({p.assetClass} • {p.sector}) • {p.quantity} @ {currSym}{p.entryPrice} (SL {currSym}{p.stopLoss})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono">
                        <span className="text-danger">-{currSym}{detail?.potentialLoss.toLocaleString()} ({detail?.riskPercentOfAccount}%)</span>
                        <button
                          onClick={() => setPositions((prev) => prev.filter((x) => x.id !== p.id))}
                          className="text-text-muted hover:text-danger"
                          aria-label={`Remove ${p.symbol}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-sm font-bold text-text-primary">Concentration Breakdown</h2>
              <div className="space-y-2.5 text-xs">
                {portfolioSummary.sectorConcentration.map((sc) => (
                  <div key={sc.sector} className="space-y-1">
                    <div className="flex justify-between font-mono">
                      <span className="text-text-primary">{sc.sector}</span>
                      <span className="text-text-secondary">{sc.weightPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-background overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${sc.weightPercent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORICAL RISK ANALYTICS (VaR / CVaR / ATR / MDD) */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-5">
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="text-text-muted">
                Confidence:
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="ml-2 bg-background border border-border rounded-lg px-2 py-1 font-mono text-text-primary"
                >
                  <option value={0.95}>95%</option>
                  <option value={0.99}>99%</option>
                </select>
              </label>
              <label className="text-text-muted">
                Lookback:
                <select
                  value={lookback}
                  onChange={(e) => setLookback(Number(e.target.value))}
                  className="ml-2 bg-background border border-border rounded-lg px-2 py-1 font-mono text-text-primary"
                >
                  <option value={90}>90 Days</option>
                  <option value={180}>180 Days</option>
                  <option value={252}>252 Days (1Y)</option>
                </select>
              </label>
            </div>
            {analytics?.source && (
              <span className="font-mono text-text-muted">Source: {analytics.source}</span>
            )}
          </Card>

          {loadingAnalytics ? (
            <Card className="p-10 text-center text-xs font-mono text-text-muted">
              Computing historical VaR, CVaR, ATR, and drawdown for {symbol}...
            </Card>
          ) : !analytics?.available ? (
            <Card className="p-8 text-center text-xs text-warning">{analytics?.reason || 'Analytics unavailable.'}</Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Annualized Volatility</div>
                  <div className="text-xl font-extrabold font-mono text-text-primary mt-1">
                    {analytics.historicalVolatilityPct}%
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Downside Deviation</div>
                  <div className="text-xl font-extrabold font-mono text-warning mt-1">
                    {analytics.downsideDeviationPct}%
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">ATR (14)</div>
                  <div className="text-xl font-extrabold font-mono text-secondary mt-1">
                    {analytics.atr14} ({analytics.atrPercent}%)
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Max Drawdown</div>
                  <div className="text-xl font-extrabold font-mono text-danger mt-1">
                    -{analytics.maxDrawdownPct}%
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Daily VaR ({Math.round(confidence * 100)}%)</div>
                  <div className="text-xl font-extrabold font-mono text-danger mt-1">
                    -{analytics.var.dailyVarPct}%
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Daily CVaR (ES)</div>
                  <div className="text-xl font-extrabold font-mono text-danger mt-1">
                    -{analytics.var.dailyCvarPct}%
                  </div>
                </Card>
              </div>
              <Card className="text-xs text-text-secondary space-y-1">
                <div>
                  <strong>Methodology:</strong> {analytics.var.methodology} over {analytics.lookbackCandles} daily candles.
                </div>
                <div className="text-text-muted">{analytics.disclaimer}</div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 4: ML-POWERED RISK INTELLIGENCE */}
      {activeTab === 'ML' && (
        <div className="space-y-5">
          {loadingMl ? (
            <Card className="p-10 text-center text-xs font-mono text-text-muted">
              Running chronological walk-forward validation on {symbol}...
            </Card>
          ) : !mlData?.available ? (
            <Card className="p-8 text-center text-xs text-warning">{mlData?.reason || 'ML risk data unavailable.'}</Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Volatility Regime</div>
                  <div
                    className={`text-xl font-extrabold font-mono mt-1 ${
                      mlData.volatilityRegime === 'HIGH'
                        ? 'text-danger'
                        : mlData.volatilityRegime === 'MODERATE'
                          ? 'text-warning'
                          : 'text-primary'
                    }`}
                  >
                    {mlData.volatilityRegime} ({mlData.volatilityPercentile}th pct)
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Volatility Trend</div>
                  <div className="text-xl font-extrabold font-mono text-text-primary mt-1">
                    {mlData.volatilityTrend}
                  </div>
                  <div className="text-[11px] text-text-muted font-mono">
                    20D: {mlData.current20dVolPct}% vs 60D: {mlData.current60dVolPct}%
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Est. Next 5D Vol Range</div>
                  <div className="text-xl font-extrabold font-mono text-secondary mt-1">
                    {mlData.estimatedVolRangePct[0]}% – {mlData.estimatedVolRangePct[1]}%
                  </div>
                  <div className="text-[11px] text-text-muted font-mono">
                    Point est: {mlData.estimatedNext5dVolPct}% (Estimate only)
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-[11px] text-text-muted">Unusual Movement Anomaly</div>
                  <div
                    className={`text-xl font-extrabold font-mono mt-1 ${
                      mlData.anomalyDetected ? 'text-danger' : 'text-primary'
                    }`}
                  >
                    {mlData.anomalyDetected ? 'ANOMALY DETECTED' : 'NORMAL'}
                  </div>
                  <div className="text-[11px] text-text-muted font-mono">
                    Ret Z: {mlData.latestReturnZScore} • Vol Z: {mlData.latestVolumeZScore}
                  </div>
                </Card>
              </div>

              <Card className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-text-primary flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" />
                    Walk-Forward Out-of-Sample Validation ({mlData.modelName})
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] border ${
                      mlData.beatsBaseline
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-warning/15 text-warning border-warning/30'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    {mlData.beatsBaseline ? 'Outperformed Baseline' : 'Baseline Preferred'}
                  </span>
                </div>
                <p className="text-text-secondary">{mlData.recommendation}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono pt-2 border-t border-border/60">
                  <div>
                    <div className="text-text-muted">Model OOS MAE</div>
                    <div className="text-text-primary font-bold">{mlData.evaluation.modelMaePct}%</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Baseline OOS MAE</div>
                    <div className="text-text-primary font-bold">{mlData.evaluation.baselineMaePct}%</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Train / Test Samples</div>
                    <div className="text-text-primary font-bold">
                      {mlData.evaluation.trainSamples} / {mlData.evaluation.testSamples}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-muted">Data Coverage</div>
                    <div className="text-text-primary font-bold">
                      {mlData.evaluation.trainStartDate} → {mlData.evaluation.dataEndDate}
                    </div>
                  </div>
                </div>
                <ul className="list-disc pl-5 text-text-muted space-y-1 pt-2">
                  {mlData.limitations.map((lim: string, i: number) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
};
