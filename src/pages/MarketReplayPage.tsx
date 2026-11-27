import React, { useState, useMemo } from 'react';
import {
  History,
  Play,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Award,
  Clock,
  EyeOff,
  CheckCircle2,
  DollarSign,
  PieChart as PieIcon,
  HelpCircle,
  BookOpen,
  Newspaper,
  Compass,
  ArrowUpRight,
  BarChart2,
  Layers,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { HISTORICAL_REPLAY_EVENTS } from '../data/mockData';
import { ReplayEvent, ReplayCheckpoint, ReplayUserDecision } from '../types';

type DecisionActionId = 'AGGRESSIVE_BUY' | 'MODERATE_BUY' | 'HOLD' | 'REDUCE_EXPOSURE' | 'PANIC_EXIT';

interface DecisionOption {
  id: DecisionActionId;
  label: string;
  shortDesc: string;
  badge: string;
  badgeVariant: 'primary' | 'secondary' | 'warning' | 'danger' | 'neutral';
  icon: React.ReactNode;
}

const DECISION_OPTIONS: DecisionOption[] = [
  {
    id: 'AGGRESSIVE_BUY',
    label: 'Aggressive Buy',
    shortDesc: 'Deploy 50% of available cash into the index',
    badge: 'High Conviction',
    badgeVariant: 'primary',
    icon: <Zap size={14} className="text-primary" />
  },
  {
    id: 'MODERATE_BUY',
    label: 'Disciplined SIP / Dip Buy',
    shortDesc: 'Deploy 20% of cash systematically (Rupee-Cost Average)',
    badge: 'Staggered Entry',
    badgeVariant: 'secondary',
    icon: <TrendingUp size={14} className="text-secondary" />
  },
  {
    id: 'HOLD',
    label: 'Hold Ground Patiently',
    shortDesc: 'Maintain existing cash & equity allocation (No trade)',
    badge: 'Ride the Wave',
    badgeVariant: 'neutral',
    icon: <Clock size={14} className="text-text-secondary" />
  },
  {
    id: 'REDUCE_EXPOSURE',
    label: 'De-risk / Partial Profit',
    shortDesc: 'Sell 35% of existing equity units into cash safety',
    badge: 'Defensive Trim',
    badgeVariant: 'warning',
    icon: <Shield size={14} className="text-warning" />
  },
  {
    id: 'PANIC_EXIT',
    label: 'Liquidate to 100% Cash',
    shortDesc: 'Sell all equity positions immediately to stop stress',
    badge: 'Capital Flight',
    badgeVariant: 'danger',
    icon: <AlertTriangle size={14} className="text-danger" />
  }
];

const REASONING_PRESETS = [
  'Fear of a much deeper crash ahead',
  'Valuations look attractive; buying blue-chips on sale',
  'Sticking strictly to long-term asset allocation',
  'Waiting for clearer policy & macroeconomic signals',
  'Too much uncertainty in the news headlines',
  'Disciplined systematic accumulation'
];

export const MarketReplayPage: React.FC = () => {
  // Active Scenario
  const [selectedEventId, setSelectedEventId] = useState<string>(HISTORICAL_REPLAY_EVENTS[0].id);
  const activeEvent = useMemo<ReplayEvent>(() => {
    return HISTORICAL_REPLAY_EVENTS.find(e => e.id === selectedEventId) || HISTORICAL_REPLAY_EVENTS[0];
  }, [selectedEventId]);

  // Simulation State
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [userCash, setUserCash] = useState<number>(50000);
  const [userUnits, setUserUnits] = useState<number>(() => 50000 / (HISTORICAL_REPLAY_EVENTS[0].checkpoints[0]?.nifty || 12113));
  
  // Interactive choices
  const [selectedActionId, setSelectedActionId] = useState<DecisionActionId | null>(null);
  const [selectedReasoning, setSelectedReasoning] = useState<string>('');
  const [customReasoning, setCustomReasoning] = useState<string>('');
  
  // Progression history & outcome
  const [decisionsHistory, setDecisionsHistory] = useState<ReplayUserDecision[]>([]);
  const [revealedStepOutcome, setRevealedStepOutcome] = useState<ReplayCheckpoint | null>(null);
  const [isScenarioComplete, setIsScenarioComplete] = useState<boolean>(false);
  const [showDebriefModal, setShowDebriefModal] = useState<boolean>(false);

  const activeCheckpoint: ReplayCheckpoint = activeEvent.checkpoints[currentStep] || activeEvent.checkpoints[0];
  const initialCheckpoint: ReplayCheckpoint = activeEvent.checkpoints[0];

  // Derived current metrics
  const currentEquityValue = userUnits * activeCheckpoint.nifty;
  const currentTotalPortfolio = userCash + currentEquityValue;
  const initialPortfolioValue = 100000;
  const userTotalReturnPercent = ((currentTotalPortfolio - initialPortfolioValue) / initialPortfolioValue) * 100;
  
  // Benchmark buy and hold
  const benchmarkReturnPercent = ((activeCheckpoint.nifty - initialCheckpoint.nifty) / initialCheckpoint.nifty) * 100;
  const benchmarkPortfolioValue = initialPortfolioValue * (activeCheckpoint.nifty / initialCheckpoint.nifty);
  const alphaPercent = userTotalReturnPercent - benchmarkReturnPercent;

  // Handle Scenario Switch
  const handleSelectScenario = (eventId: string) => {
    const target = HISTORICAL_REPLAY_EVENTS.find(e => e.id === eventId);
    if (!target) return;
    setSelectedEventId(eventId);
    resetSimulation(target);
  };

  // Reset Simulation
  const resetSimulation = (eventToReset: ReplayEvent = activeEvent) => {
    const initialPrice = eventToReset.checkpoints[0]?.nifty || 10000;
    setCurrentStep(0);
    setUserCash(50000);
    setUserUnits(50000 / initialPrice);
    setSelectedActionId(null);
    setSelectedReasoning('');
    setCustomReasoning('');
    setDecisionsHistory([]);
    setRevealedStepOutcome(null);
    setIsScenarioComplete(false);
    setShowDebriefModal(false);
  };

  // Execute User Decision at Checkpoint
  const handleExecuteDecision = () => {
    if (!selectedActionId) return;

    const action = selectedActionId;
    const finalReasoning = customReasoning.trim() || selectedReasoning || 'Discretionary market assessment';
    const currentPrice = activeCheckpoint.nifty;

    let newCash = userCash;
    let newUnits = userUnits;

    if (action === 'AGGRESSIVE_BUY') {
      const deployAmount = userCash * 0.5;
      const boughtUnits = deployAmount / currentPrice;
      newCash -= deployAmount;
      newUnits += boughtUnits;
    } else if (action === 'MODERATE_BUY') {
      const deployAmount = userCash * 0.2;
      const boughtUnits = deployAmount / currentPrice;
      newCash -= deployAmount;
      newUnits += boughtUnits;
    } else if (action === 'HOLD') {
      // Keep cash and units unchanged
    } else if (action === 'REDUCE_EXPOSURE') {
      const soldUnits = userUnits * 0.35;
      const proceed = soldUnits * currentPrice;
      newUnits -= soldUnits;
      newCash += proceed;
    } else if (action === 'PANIC_EXIT') {
      const proceed = userUnits * currentPrice;
      newUnits = 0;
      newCash += proceed;
    }

    const decisionRecord: ReplayUserDecision = {
      checkpointIndex: currentStep,
      date: activeCheckpoint.date,
      actionId: action,
      actionLabel: DECISION_OPTIONS.find(o => o.id === action)?.label || action,
      reasoning: finalReasoning,
      portfolioValueBefore: currentTotalPortfolio,
      cashBefore: userCash,
      unitsBefore: userUnits,
      portfolioValueAfter: newCash + (newUnits * currentPrice),
      cashAfter: newCash,
      unitsAfter: newUnits,
      indexPriceAtDecision: currentPrice
    };

    setUserCash(newCash);
    setUserUnits(newUnits);
    setDecisionsHistory(prev => [...prev, decisionRecord]);
    setRevealedStepOutcome(activeCheckpoint);
  };

  // Advance to Next Historical Checkpoint
  const handleAdvanceToNextCheckpoint = () => {
    if (currentStep < activeEvent.checkpoints.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      setSelectedActionId(null);
      setSelectedReasoning('');
      setCustomReasoning('');
      setRevealedStepOutcome(null);
    } else {
      setIsScenarioComplete(true);
      setShowDebriefModal(true);
    }
  };

  // Alternative benchmark comparison figures for post-scenario debrief
  const alternativeScenarios = useMemo(() => {
    const startPrice = initialCheckpoint.nifty;
    const endPrice = activeEvent.checkpoints[activeEvent.checkpoints.length - 1]?.nifty || startPrice;
    const troughPrice = Math.min(...activeEvent.checkpoints.map(c => c.nifty));

    // 1. 100% Panic Seller (exited at worst trough)
    const panicSellerReturn = ((troughPrice - startPrice) / startPrice) * 50; // assumed 50% equity was liquidated at trough
    // 2. Buy & Hold (stayed invested with 50% cash, 50% equity)
    const buyAndHoldReturn = ((endPrice - startPrice) / startPrice) * 50;
    // 3. Perfect Dip Buyer (accumulated at trough)
    const dipBuyerReturn = (((endPrice - startPrice) / startPrice) * 50) + (((endPrice - troughPrice) / troughPrice) * 35);

    return {
      userReturn: userTotalReturnPercent,
      buyAndHoldReturn,
      panicSellerReturn,
      dipBuyerReturn
    };
  }, [activeEvent, initialCheckpoint, userTotalReturnPercent]);

  // Min and max simulated drawdown
  const performanceStats = useMemo(() => {
    let peakVal = 100000;
    let maxDrawdownVal = 0;
    let biggestSingleGain = 0;

    decisionsHistory.forEach((d, idx) => {
      const val = d.portfolioValueAfter;
      if (val > peakVal) peakVal = val;
      const dd = ((peakVal - val) / peakVal) * 100;
      if (dd > maxDrawdownVal) maxDrawdownVal = dd;

      if (idx > 0) {
        const prevVal = decisionsHistory[idx - 1].portfolioValueAfter;
        const gain = ((val - prevVal) / prevVal) * 100;
        if (gain > biggestSingleGain) biggestSingleGain = gain;
      }
    });

    return {
      maxDrawdown: maxDrawdownVal,
      biggestGain: biggestSingleGain
    };
  }, [decisionsHistory]);

  // SVG Chart Dimensions & Coordinates
  const chartPoints = useMemo(() => {
    const revealedCheckpoints = activeEvent.checkpoints.slice(0, currentStep + 1);
    const allNifties = activeEvent.checkpoints.map(c => c.nifty);
    const minVal = Math.min(...allNifties) * 0.95;
    const maxVal = Math.max(...allNifties) * 1.05;
    const totalSteps = activeEvent.checkpoints.length;

    const width = 800;
    const height = 240;
    const paddingX = 40;
    const paddingY = 30;

    const getX = (idx: number) => paddingX + (idx / (totalSteps - 1)) * (width - 2 * paddingX);
    const getY = (val: number) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);

    const revealedCoords = revealedCheckpoints.map((c, idx) => ({
      x: getX(idx),
      y: getY(c.nifty),
      date: c.date,
      nifty: c.nifty,
      step: idx
    }));

    // Future placeholder points (Fog of War)
    const futureCoords = activeEvent.checkpoints.slice(currentStep).map((c, idx) => ({
      x: getX(currentStep + idx),
      y: getY(c.nifty),
      date: c.date,
      step: currentStep + idx
    }));

    const pathString = revealedCoords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const areaString = revealedCoords.length > 0
      ? `${pathString} L ${revealedCoords[revealedCoords.length - 1].x} ${height - paddingY} L ${revealedCoords[0].x} ${height - paddingY} Z`
      : '';

    return {
      revealedCoords,
      futureCoords,
      pathString,
      areaString,
      width,
      height,
      minVal,
      maxVal,
      getX,
      getY,
      paddingY
    };
  }, [activeEvent, currentStep]);

  return (
    <div className="space-y-6 pb-12">
      {/* Cinematic Header */}
      <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <History size={14} className="text-amber-600" /> Historical Market Time Machine
            </span>
            <Badge variant="warning" size="sm">Blind Decision Sandbox</Badge>
            <Badge variant="primary" size="sm">NSE/BSE Verified Archives</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#131722] mt-1">
            Historical Market Replay Simulator
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Step back into past crises and recoveries without hindsight bias. Make real-time decisions using only information known on that date; the future remains strictly hidden until you commit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetSimulation()}
            icon={<RotateCcw size={14} />}
          >
            Reset Scenario
          </Button>
          {isScenarioComplete && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowDebriefModal(true)}
              icon={<Award size={14} />}
            >
              View AI Debrief
            </Button>
          )}
        </div>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {HISTORICAL_REPLAY_EVENTS.map(event => {
          const isSelected = event.id === selectedEventId;
          const typeBadgeMap: Record<'CRASH' | 'CRISIS' | 'RECOVERY' | 'VOLATILITY', { label: string; variant: 'danger' | 'warning' | 'primary' | 'secondary' }> = {
            CRASH: { label: 'CRASH', variant: 'danger' },
            CRISIS: { label: 'CRISIS', variant: 'warning' },
            RECOVERY: { label: 'RECOVERY', variant: 'primary' },
            VOLATILITY: { label: 'VOLATILITY', variant: 'secondary' }
          };
          const typeBadge = typeBadgeMap[event.scenarioType];

          return (
            <div
              key={event.id}
              onClick={() => handleSelectScenario(event.id)}
              className={`p-5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between shadow-sm ${
                isSelected
                  ? 'bg-[#2962FF]/[0.04] border-[#2962FF]/60'
                  : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <Badge variant={typeBadge.variant} size="sm">{typeBadge.label}</Badge>
                  <span className="text-[11px] text-[#64748B] tabular-nums">{event.period}</span>
                </div>
                <h3 className={`font-bold text-xs ${isSelected ? 'text-[#2962FF]' : 'text-[#131722]'} line-clamp-1`}>
                  {event.title}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                  {event.subtitle}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                <span className="text-[#64748B] tabular-nums">Magnitude: <strong className="text-[#131722]">{event.dropPercentage}</strong></span>
                <span className="text-[#2962FF] font-semibold flex items-center gap-0.5">
                  Select <ChevronRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Simulation Top HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <span className="text-xs font-medium text-[#64748B] block">Simulated Portfolio</span>
          <div className="flex items-baseline gap-2 mt-1.5 tabular-nums">
            <span className="text-lg font-bold text-[#131722]">
              ₹{Math.round(currentTotalPortfolio).toLocaleString('en-IN')}
            </span>
            <span className={`text-xs font-semibold ${userTotalReturnPercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
              {userTotalReturnPercent >= 0 ? '+' : '-'}{Math.abs(userTotalReturnPercent).toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5 tabular-nums">Initial: ₹1,00,000</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <span className="text-xs font-medium text-[#64748B] block">Liquid Cash Reserve</span>
          <div className="flex items-baseline gap-2 mt-1.5 tabular-nums">
            <span className="text-lg font-bold text-[#131722]">
              ₹{Math.round(userCash).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-[#64748B]">
              ({((userCash / currentTotalPortfolio) * 100).toFixed(0)}% Cash)
            </span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5">Dry powder available</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <span className="text-xs font-medium text-[#64748B] block">Index Equity Value</span>
          <div className="flex items-baseline gap-2 mt-1.5 tabular-nums">
            <span className="text-lg font-bold text-[#131722]">
              ₹{Math.round(currentEquityValue).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-[#64748B]">
              ({userUnits.toFixed(2)} units)
            </span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5">Market exposure</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <span className="text-xs font-medium text-[#64748B] block">Benchmark Buy & Hold</span>
          <div className="flex items-baseline gap-2 mt-1.5 tabular-nums">
            <span className="text-lg font-bold text-[#131722]">
              ₹{Math.round(benchmarkPortfolioValue).toLocaleString('en-IN')}
            </span>
            <span className={`text-xs font-semibold ${benchmarkReturnPercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
              {benchmarkReturnPercent >= 0 ? '+' : '-'}{Math.abs(benchmarkReturnPercent).toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5 tabular-nums">
            Alpha: <strong className={alphaPercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}>{alphaPercent >= 0 ? '+' : '-'}{Math.abs(alphaPercent).toFixed(1)}%</strong>
          </span>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <Card className="p-6 space-y-6">
        {/* Step Indicator Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#2962FF] font-semibold tabular-nums">
                Checkpoint {currentStep + 1} of {activeEvent.checkpoints.length}
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-xs text-[#131722] font-bold tabular-nums">
                {activeCheckpoint.date}
              </span>
              <Badge
                variant={
                  activeCheckpoint.marketSentiment === 'Extreme Fear' ? 'danger' :
                  activeCheckpoint.marketSentiment === 'Fear' ? 'warning' :
                  activeCheckpoint.marketSentiment === 'Euphoria' ? 'primary' :
                  activeCheckpoint.marketSentiment === 'Optimism' ? 'secondary' : 'neutral'
                }
                size="sm"
              >
                Sentiment: {activeCheckpoint.marketSentiment}
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#131722] mt-1">
              {activeEvent.title}
            </h2>
          </div>

          <div className="flex items-center gap-6 bg-[#F8FAFC] px-4 py-2.5 rounded-xl border border-[#E2E8F0] tabular-nums">
            <div>
              <span className="text-[11px] text-[#64748B] block">NIFTY 50 Level</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-[#131722]">
                  {activeCheckpoint.nifty.toLocaleString('en-IN')}
                </span>
                <span className={`text-xs font-semibold ${activeCheckpoint.nifty >= initialCheckpoint.nifty ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                  ({((activeCheckpoint.nifty - initialCheckpoint.nifty) / initialCheckpoint.nifty * 100) >= 0 ? '+' : ''}{((activeCheckpoint.nifty - initialCheckpoint.nifty) / initialCheckpoint.nifty * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="hidden sm:block border-l border-[#E2E8F0] pl-4">
              <span className="text-[11px] text-[#64748B] block">SENSEX Level</span>
              <span className="text-lg font-bold text-[#131722]">
                {activeCheckpoint.sensex.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Visual Track */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#64748B] tabular-nums">
            <span>Historical Timeline Progress</span>
            <span className="font-semibold text-[#131722]">{Math.round(((currentStep + 1) / activeEvent.checkpoints.length) * 100)}% Revealed</span>
          </div>
          <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden flex">
            {activeEvent.checkpoints.map((cp, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div
                  key={idx}
                  className={`h-full flex-1 border-r border-white/60 transition-all duration-300 ${
                    isCurrent ? 'bg-[#2962FF]' :
                    isPast ? 'bg-[#089981]' : 'bg-[#E2E8F0]'
                  }`}
                  title={`${cp.date} - ${cp.nifty}`}
                />
              );
            })}
          </div>
        </div>

        {/* Interactive Blind Historical Chart (Future Hidden) */}
        <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-[#2962FF]" />
              <span className="font-semibold text-[#131722]">
                {activeEvent.benchmark} Closing Track
              </span>
              <Badge variant="warning" size="sm">Blind Mode Active</Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#2962FF] inline-block"></span> Known History
              </span>
              <span className="flex items-center gap-1">
                <EyeOff size={11} /> Future Data Strictly Masked
              </span>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
              className="w-full h-56 sm:h-64 select-none"
            >
              <defs>
                <linearGradient id="chartFillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2962FF" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#2962FF" stopOpacity="0.0" />
                </linearGradient>
                <pattern id="fogPattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#E2E8F0" strokeWidth="2" />
                </pattern>
              </defs>

              {/* Gridlines */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
                const y = chartPoints.paddingY + ratio * (chartPoints.height - 2 * chartPoints.paddingY);
                return (
                  <line
                    key={i}
                    x1="40"
                    y1={y}
                    x2={chartPoints.width - 40}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Fog of War mask for future portion */}
              {currentStep < activeEvent.checkpoints.length - 1 && (
                <g>
                  <rect
                    x={chartPoints.revealedCoords[chartPoints.revealedCoords.length - 1].x}
                    y="10"
                    width={chartPoints.width - chartPoints.revealedCoords[chartPoints.revealedCoords.length - 1].x - 30}
                    height={chartPoints.height - 20}
                    fill="url(#fogPattern)"
                    rx="8"
                    opacity="0.9"
                  />
                  <line
                    x1={chartPoints.revealedCoords[chartPoints.revealedCoords.length - 1].x}
                    y1="10"
                    x2={chartPoints.revealedCoords[chartPoints.revealedCoords.length - 1].x}
                    y2={chartPoints.height - 20}
                    stroke="#D97706"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={chartPoints.revealedCoords[chartPoints.revealedCoords.length - 1].x + 15}
                    y="35"
                    fill="#64748B"
                    fontSize="10"
                    fontWeight="600"
                  >
                    🔒 UNREVEALED FUTURE
                  </text>
                </g>
              )}

              {/* Gradient Area Fill */}
              {chartPoints.areaString && (
                <path d={chartPoints.areaString} fill="url(#chartFillGradient)" />
              )}

              {/* Revealed Line Path */}
              {chartPoints.pathString && (
                <path
                  d={chartPoints.pathString}
                  fill="none"
                  stroke="#2962FF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {chartPoints.revealedCoords.map((pt, idx) => {
                const isLatest = idx === currentStep;
                return (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isLatest ? '5' : '3.5'}
                      fill={isLatest ? '#2962FF' : '#089981'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={chartPoints.height - 8}
                      textAnchor="middle"
                      fill={isLatest ? '#2962FF' : '#64748B'}
                      fontSize="9"
                      fontWeight={isLatest ? 'bold' : 'normal'}
                    >
                      {pt.date.split(' ')[0]} {pt.date.split(' ')[1]}
                    </text>
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      fill={isLatest ? '#131722' : '#64748B'}
                      fontSize="10"
                      fontWeight={isLatest ? 'bold' : 'normal'}
                    >
                      {pt.nifty}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
            <span>{activeEvent.historicalDisclaimer}</span>
            <span>All values in INR points</span>
          </div>
        </div>

        {/* Breaking News Flash known at this date */}
        <div className="p-4 rounded-xl bg-amber-50/70 border-l-4 border-l-amber-500 border-y border-r border-[#E2E8F0] space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
              <Newspaper size={14} /> Breaking News Flash • {activeCheckpoint.date}
            </span>
            <span className="text-[11px] text-[#64748B] bg-white px-2.5 py-0.5 rounded-full border border-[#E2E8F0]">
              Source: {activeCheckpoint.newsSource}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[#131722] leading-snug">
            "{activeCheckpoint.headline}"
          </h3>
          <p className="text-xs text-[#64748B] leading-relaxed">
            {activeCheckpoint.narrative}
          </p>
          <div className="mt-2 pt-2 border-t border-amber-200/70 flex items-center gap-2 text-xs text-[#64748B]">
            <Info size={13} className="text-[#2962FF] shrink-0" />
            <span><strong className="text-[#131722]">Historical Reality:</strong> {activeCheckpoint.historicalFact}</span>
          </div>
        </div>

        {/* Decision Simulation Prompt */}
        {!revealedStepOutcome ? (
          <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-[#E2E8F0]">
              <div>
                <span className="text-xs text-[#2962FF] font-semibold">
                  Decision Checkpoint #{currentStep + 1}
                </span>
                <h3 className="text-base font-bold text-[#131722] mt-0.5">
                  What is your decision right now?
                </h3>
              </div>
              <span className="text-xs text-[#64748B] tabular-nums">
                Available Cash: <strong className="text-[#131722] font-bold">₹{Math.round(userCash).toLocaleString('en-IN')}</strong>
              </span>
            </div>

            {/* Options grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {DECISION_OPTIONS.map((opt) => {
                const isSelected = selectedActionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedActionId(opt.id)}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#2962FF]/[0.06] border-[#2962FF] text-[#131722]'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="flex items-center gap-1.5 font-bold text-xs text-[#131722]">
                          {opt.icon} {opt.label}
                        </span>
                        <Badge variant={opt.badgeVariant} size="sm">{opt.badge}</Badge>
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {opt.shortDesc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                      <span className={isSelected ? 'text-[#2962FF] font-semibold' : 'text-[#64748B]'}>
                        {isSelected ? '✓ Selected' : 'Click to select'}
                      </span>
                      <ChevronRight size={12} className={isSelected ? 'text-[#2962FF]' : 'text-[#64748B]'} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional Reasoning Input */}
            <div className="pt-2 space-y-2.5">
              <label className="text-xs font-medium text-[#131722] flex items-center gap-1.5">
                <Compass size={13} className="text-[#2962FF]" /> Why are you making this decision? (Optional reasoning)
              </label>
              
              <div className="flex items-center gap-1.5 flex-wrap">
                {REASONING_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedReasoning(preset);
                      setCustomReasoning('');
                    }}
                    className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
                      selectedReasoning === preset
                        ? 'bg-[#2962FF]/10 border-[#2962FF] text-[#2962FF] font-medium'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#131722]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={customReasoning}
                onChange={(e) => {
                  setCustomReasoning(e.target.value);
                  setSelectedReasoning('');
                }}
                placeholder="Or type your personal rationale here (e.g. Risk-reward looks skewed...)"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#131722] placeholder:text-[#64748B] focus:outline-none focus:border-[#2962FF]"
              />
            </div>

            {/* Commit Button */}
            <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
              <Button
                variant="primary"
                size="md"
                disabled={!selectedActionId}
                onClick={handleExecuteDecision}
                icon={<ArrowRight size={15} />}
                iconPosition="right"
              >
                Lock In My Decision & Advance Market
              </Button>
            </div>
          </div>
        ) : (
          /* Decision Revealed / What Happened Next Outcome */
          <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#089981]" />
                <span className="text-xs font-bold text-[#089981]">
                  Decision Executed: {decisionsHistory[decisionsHistory.length - 1]?.actionLabel}
                </span>
              </div>
              <span className="text-xs text-[#64748B] tabular-nums">
                Portfolio Net Worth: <strong className="text-[#131722] font-bold">₹{Math.round(currentTotalPortfolio).toLocaleString('en-IN')}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5">
                <span className="text-[11px] text-amber-700 font-semibold block">
                  What Happened Next in History
                </span>
                <p className="text-xs text-[#131722] leading-relaxed">
                  {revealedStepOutcome.whatHappenedNext}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5">
                <span className="text-[11px] text-[#2962FF] font-semibold block">
                  Portfolio Impact Analysis
                </span>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {decisionsHistory[decisionsHistory.length - 1]?.actionId === 'AGGRESSIVE_BUY' &&
                    'You deployed ₹' + Math.round(decisionsHistory[decisionsHistory.length - 1]?.cashBefore * 0.5).toLocaleString('en-IN') + ' into index equity units at this valuation level.'
                  }
                  {decisionsHistory[decisionsHistory.length - 1]?.actionId === 'MODERATE_BUY' &&
                    'You deployed ₹' + Math.round(decisionsHistory[decisionsHistory.length - 1]?.cashBefore * 0.2).toLocaleString('en-IN') + ' systematically while preserving dry powder.'
                  }
                  {decisionsHistory[decisionsHistory.length - 1]?.actionId === 'HOLD' &&
                    'You kept your allocation stable, avoiding emotional trading commissions and timing mistakes.'
                  }
                  {decisionsHistory[decisionsHistory.length - 1]?.actionId === 'REDUCE_EXPOSURE' &&
                    'You locked in liquidity, raising cash while lowering downside equity volatility.'
                  }
                  {decisionsHistory[decisionsHistory.length - 1]?.actionId === 'PANIC_EXIT' &&
                    'You liquidated all equity into cash, eliminating further market fluctuations at the expense of potential future recoveries.'
                  }
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleAdvanceToNextCheckpoint}
                icon={<ArrowRight size={15} />}
                iconPosition="right"
              >
                {currentStep < activeEvent.checkpoints.length - 1 ? 'Reveal Next Market Phase' : 'Complete Scenario & View Full AI Debrief'}
              </Button>
            </div>
          </div>
        )}

        {/* Historical Educational Lessons */}
        <div className="pt-4 border-t border-[#E2E8F0]">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3 flex items-center gap-1.5">
            <BookOpen size={13} className="text-[#2962FF]" /> Key Principles From This Scenario
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeEvent.keyLessons.map((lesson, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#F8FAFC] text-xs text-[#64748B] leading-relaxed">
                <span className="text-[#2962FF] font-bold mr-1">#{idx + 1}</span>
                {lesson}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Post-Scenario AI Reflection Debrief Modal */}
      {showDebriefModal && (
        <Modal
          isOpen={showDebriefModal}
          onClose={() => setShowDebriefModal(false)}
          title="Post-Scenario AI Reflection & Behavioral Debrief"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Top Scorecard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Final Net Worth</span>
                <span className="text-lg font-bold text-[#131722] block mt-0.5">
                  ₹{Math.round(currentTotalPortfolio).toLocaleString('en-IN')}
                </span>
                <span className={`text-xs font-semibold ${userTotalReturnPercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                  {userTotalReturnPercent >= 0 ? '+' : '-'}{Math.abs(userTotalReturnPercent).toFixed(1)}% Return
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Benchmark Buy & Hold</span>
                <span className="text-lg font-bold text-[#131722] block mt-0.5">
                  ₹{Math.round(benchmarkPortfolioValue).toLocaleString('en-IN')}
                </span>
                <span className={`text-xs font-semibold ${benchmarkReturnPercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                  {benchmarkReturnPercent >= 0 ? '+' : '-'}{Math.abs(benchmarkReturnPercent).toFixed(1)}% Return
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Max Drawdown Experienced</span>
                <span className="text-lg font-bold text-[#F23645] block mt-0.5">
                  -{performanceStats.maxDrawdown.toFixed(1)}%
                </span>
                <span className="text-[11px] text-[#64748B]">Peak-to-trough decline</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Final Allocation</span>
                <div className="flex items-center gap-1.5 mt-1 text-xs">
                  <span className="text-[#089981] font-bold">{((userCash / currentTotalPortfolio) * 100).toFixed(0)}% Cash</span>
                  <span className="text-[#64748B]">/</span>
                  <span className="text-[#2962FF] font-bold">{((currentEquityValue / currentTotalPortfolio) * 100).toFixed(0)}% Eq</span>
                </div>
                <span className="text-[11px] text-[#64748B] block mt-0.5">Portfolio balance</span>
              </div>
            </div>

            {/* AI Pedagogical Reflection: 5 Core Dimensions */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#131722] flex items-center gap-2">
                <Sparkles size={16} className="text-[#2962FF]" /> AI Pedagogical Reflection
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* 1. What the market did */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] space-y-1.5">
                  <span className="text-amber-700 font-bold text-[11px] flex items-center gap-1">
                    1. What the Market Did
                  </span>
                  <p className="text-[#64748B] leading-relaxed">
                    The {activeEvent.benchmark} moved from {initialCheckpoint.nifty.toLocaleString('en-IN')} to {activeCheckpoint.nifty.toLocaleString('en-IN')} ({benchmarkReturnPercent >= 0 ? '+' : ''}{benchmarkReturnPercent.toFixed(1)}%).
                    It experienced extreme volatility of {activeEvent.dropPercentage}, testing the emotional fortitude of every market participant before recovering over {activeEvent.recoveryDuration}.
                  </p>
                </div>

                {/* 2. What you did */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] space-y-1.5">
                  <span className="text-[#2962FF] font-bold text-[11px] flex items-center gap-1">
                    2. What You Did
                  </span>
                  <p className="text-[#64748B] leading-relaxed">
                    You executed {decisionsHistory.length} distinct decisions across the scenario timeline.
                    You ended with ₹{Math.round(currentTotalPortfolio).toLocaleString('en-IN')}, generating {alphaPercent >= 0 ? 'an outperformance' : 'an underperformance'} of {Math.abs(alphaPercent).toFixed(1)}% compared to the passive benchmark.
                  </p>
                </div>

                {/* 3. What your decisions were based on */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] space-y-1.5">
                  <span className="text-[#2962FF] font-bold text-[11px] flex items-center gap-1">
                    3. What Your Decisions Were Based On
                  </span>
                  <p className="text-[#64748B] leading-relaxed">
                    Reviewing your decision logs, you demonstrated {
                      decisionsHistory.some(d => d.actionId === 'PANIC_EXIT') ? 'a tendency toward sudden defensive flight when headlines turned bleak.' :
                      decisionsHistory.some(d => d.actionId === 'AGGRESSIVE_BUY') ? 'a strong opportunistic orientation to buy heavily into weakness.' :
                      'a balanced, steady temperament focused on capital preservation and disciplined holding.'
                    }
                  </p>
                </div>

                {/* 4. What you could learn from this scenario */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] space-y-1.5">
                  <span className="text-amber-700 font-bold text-[11px] flex items-center gap-1">
                    4. What You Could Learn
                  </span>
                  <p className="text-[#64748B] leading-relaxed">
                    Markets move fastest at the extremes. Trying to time the exact bottom or top creates immense psychological fatigue. Having a predetermined rebalancing rule or automated SIP removes the emotional urge to predict black swan events.
                  </p>
                </div>
              </div>

              {/* 5. How different approaches affected simulated portfolios */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                <span className="text-[#131722] font-bold text-xs flex items-center gap-1.5">
                  <Layers size={13} className="text-[#2962FF]" /> 5. How Different Approaches Affected Simulated Portfolios
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs tabular-nums">
                  <div className="p-3 rounded-lg bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[11px]">Your Strategy</span>
                    <span className={`text-sm font-bold block mt-0.5 ${alternativeScenarios.userReturn >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                      {alternativeScenarios.userReturn >= 0 ? '+' : '-'}{Math.abs(alternativeScenarios.userReturn).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[11px]">Buy & Hold</span>
                    <span className={`text-sm font-bold block mt-0.5 ${alternativeScenarios.buyAndHoldReturn >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                      {alternativeScenarios.buyAndHoldReturn >= 0 ? '+' : '-'}{Math.abs(alternativeScenarios.buyAndHoldReturn).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[11px]">Panic Seller (Trough Exit)</span>
                    <span className="text-sm font-bold block mt-0.5 text-[#F23645]">
                      {alternativeScenarios.panicSellerReturn.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[11px]">Disciplined Dip Buyer</span>
                    <span className="text-sm font-bold block mt-0.5 text-[#089981]">
                      +{alternativeScenarios.dipBuyerReturn.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Log Timeline */}
            <div className="space-y-2">
              <span className="text-xs text-[#64748B] block font-semibold">
                Chronological Decision Audit Log
              </span>
              <div className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
                {decisionsHistory.map((d, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[#64748B] text-[11px] tabular-nums">#{idx + 1}</span>
                      <span className="text-[#131722] font-semibold tabular-nums">{d.date}</span>
                      <Badge variant="neutral" size="sm">{d.actionLabel}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] tabular-nums">
                      <span className="text-[#64748B]">NIFTY: <strong className="text-[#131722]">{d.indexPriceAtDecision}</strong></span>
                      <span className="text-[#131722]">Net Worth: <strong>₹{Math.round(d.portfolioValueAfter).toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEBI Pedagogical Disclaimer */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Educational Retrospective Notice:</strong> Historical performance does not guarantee future results. This simulation uses historical market data to build psychological resilience and decision discipline, not to promote market timing.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setShowDebriefModal(false);
                  resetSimulation();
                }}
                icon={<RotateCcw size={14} />}
              >
                Replay This Scenario
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowDebriefModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
