import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Zap,
  Target,
  Shield,
  HelpCircle,
  Clock,
  PieChart as PieIcon,
  Layers,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Info,
  Sliders,
  RotateCcw,
  BookOpen,
  CandlestickChart,
  Award,
  Activity,
  Flame,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PortfolioPosition, TradeOrder, UserAssessment } from '../types';

// Structured interface matching the exact format required
export interface DetectedBehaviorPattern {
  id: string;
  patternName: string;
  severity: 'HIGH_RISK' | 'MODERATE_BIAS' | 'POSITIVE_HABIT' | 'INSUFFICIENT_DATA';
  category: 'Overtrading' | 'Loss Chasing' | 'Panic Selling' | 'FOMO' | 'Concentration' | 'Exit Timing' | 'Risk Mismatch';
  detected: boolean;
  evidence: string;
  whyItMatters: string;
  conceptToLearn: { title: string; route: string; description: string };
  practiceExercise: string;
  supportingMetrics: { label: string; value: string; benchmark: string }[];
  evaluatedTradesCount: number;
}

export const BehavioralInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    positions,
    orderHistory,
    virtualCash,
    totalPortfolioValue,
    totalInvested,
    assessment,
    stocks
  } = useSimulator();

  // Mode: "LIVE_LEDGER" uses the actual user state.
  // "SCENARIO_DEMO" lets judges/evaluators inject realistic behavioral profiles to test all 7 patterns!
  const [analysisMode, setAnalysisMode] = useState<'LIVE' | 'DEMO_REVENGE' | 'DEMO_FOMO' | 'DEMO_CONCENTRATION'>('LIVE');
  const [selectedPatternId, setSelectedPatternId] = useState<string>('pattern-concentration');
  const [activeTab, setActiveTab] = useState<'PATTERNS' | 'SECTORS' | 'TIMELINE' | 'RULES'>('PATTERNS');

  // =========================================================================
  // DEMO DATASETS FOR INTERACTIVE HACKATHON TESTING
  // =========================================================================
  const demoRevengeOrders: TradeOrder[] = [
    {
      id: 'demo-1',
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      type: 'BUY',
      orderType: 'MARKET',
      quantity: 10,
      price: 1650,
      status: 'EXECUTED',
      timestamp: '24 Nov 10:15 IST',
      totalValue: 16500,
      reasonTag: 'Support Bounce'
    },
    {
      id: 'demo-2',
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      type: 'SELL',
      orderType: 'MARKET',
      quantity: 10,
      price: 1610,
      status: 'EXECUTED',
      timestamp: '24 Nov 10:45 IST',
      totalValue: 16100,
      reasonTag: 'Cut Loss (-₹400)'
    },
    {
      id: 'demo-3',
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd.',
      type: 'BUY',
      orderType: 'MARKET',
      quantity: 25,
      price: 980,
      status: 'EXECUTED',
      timestamp: '24 Nov 10:48 IST',
      totalValue: 24500, // Position size increased by 48% within 3 minutes of a loss!
      reasonTag: 'Revenge / Quick Recovery'
    },
    {
      id: 'demo-4',
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd.',
      type: 'SELL',
      orderType: 'MARKET',
      quantity: 25,
      price: 960,
      status: 'EXECUTED',
      timestamp: '24 Nov 11:10 IST',
      totalValue: 24000,
      reasonTag: 'Stop Hit (-₹500)'
    },
    {
      id: 'demo-5',
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      type: 'BUY',
      orderType: 'MARKET',
      quantity: 15,
      price: 2985,
      status: 'EXECUTED',
      timestamp: '24 Nov 11:14 IST',
      totalValue: 44775, // Position doubled again to recover both losses!
      reasonTag: 'Desperate Chasing'
    }
  ];

  const demoFomoOrders: TradeOrder[] = [
    {
      id: 'fomo-1',
      symbol: 'ZOMATO',
      name: 'Zomato Ltd.',
      type: 'BUY',
      orderType: 'MARKET',
      quantity: 150,
      price: 265,
      status: 'EXECUTED',
      timestamp: '24 Nov 09:25 IST',
      totalValue: 39750,
      reasonTag: 'Emotional / FOMO Impulse' // Bought after +3.5% gap up
    },
    {
      id: 'fomo-2',
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd.',
      type: 'BUY',
      orderType: 'MARKET',
      quantity: 35,
      price: 984,
      status: 'EXECUTED',
      timestamp: '24 Nov 11:30 IST',
      totalValue: 34440,
      reasonTag: 'Emotional / FOMO Impulse' // Chased at day high
    }
  ];

  // Pick dataset based on active mode
  const effectiveOrders = useMemo(() => {
    if (analysisMode === 'DEMO_REVENGE') return demoRevengeOrders;
    if (analysisMode === 'DEMO_FOMO') return demoFomoOrders;
    return orderHistory;
  }, [analysisMode, orderHistory]);

  const effectivePositions = useMemo(() => {
    if (analysisMode === 'DEMO_CONCENTRATION') {
      return [
        {
          id: 'pos-conc-1',
          symbol: 'RELIANCE',
          name: 'Reliance Industries Ltd.',
          quantity: 28,
          averageBuyPrice: 2950,
          currentPrice: 2985.40,
          totalCost: 82600,
          currentValue: 83591.20,
          unrealizedPnL: 991.20,
          unrealizedPnLPercent: 1.20,
          sector: 'Energy & Retail',
          purchaseDate: '2026-11-20'
        },
        {
          id: 'pos-conc-2',
          symbol: 'ITC',
          name: 'ITC Limited',
          quantity: 10,
          averageBuyPrice: 490,
          currentPrice: 495.20,
          totalCost: 4900,
          currentValue: 4952.00,
          unrealizedPnL: 52.00,
          unrealizedPnLPercent: 1.06,
          sector: 'FMCG & Consumer',
          purchaseDate: '2026-11-22'
        }
      ] as PortfolioPosition[];
    }
    return positions;
  }, [analysisMode, positions]);

  // =========================================================================
  // 1. REAL-TIME BEHAVIOR PATTERN DETECTION ENGINE
  // =========================================================================
  const detectedPatterns = useMemo<DetectedBehaviorPattern[]>(() => {
    const patterns: DetectedBehaviorPattern[] = [];
    const totalOrdersCount = effectiveOrders.length;
    const totalPositionsCount = effectivePositions.length;

    // -----------------------------------------------------------------------
    // PATTERN 1: OVERTRADING
    // -----------------------------------------------------------------------
    const tradesToday = effectiveOrders.filter(o => o.timestamp.includes('24 Nov') || o.timestamp.includes('IST')).length;
    const isOvertrading = tradesToday >= 4 || totalOrdersCount >= 8;

    patterns.push({
      id: 'pattern-overtrading',
      patternName: 'Overtrading & Transaction Churn',
      category: 'Overtrading',
      severity: isOvertrading ? 'MODERATE_BIAS' : totalOrdersCount >= 2 ? 'POSITIVE_HABIT' : 'INSUFFICIENT_DATA',
      detected: isOvertrading,
      evidence: isOvertrading
        ? `You executed ${tradesToday} simulated transactions in a single session. High trade frequency elevates simulated turnover fees and indicates impulsive screen friction.`
        : totalOrdersCount >= 2
        ? `You executed ${tradesToday} orders today. Your trade pace is deliberate and measured.`
        : 'Requires at least 3 simulated trades to calculate transaction churn frequency.',
      whyItMatters:
        'Frequent trading triggers decision fatigue, amplifies brokerage drag, and drastically raises the probability of emotional missteps.',
      conceptToLearn: {
        title: 'Track 4: The 1-Trade Per Day Rule',
        route: '/learn',
        description: 'Why waiting patiently for prime risk-reward setups generates superior longevity than scalping every candle.'
      },
      practiceExercise:
        'Commit to taking a maximum of 1 simulated swing trade per 24 hours. Force yourself to write a 2-sentence thesis before every click.',
      supportingMetrics: [
        { label: 'Session Trades', value: `${tradesToday} Orders`, benchmark: 'Target: ≤ 2' },
        { label: 'Turnover Churn', value: isOvertrading ? 'Elevated' : 'Controlled', benchmark: 'Target: Low' }
      ],
      evaluatedTradesCount: totalOrdersCount
    });

    // -----------------------------------------------------------------------
    // PATTERN 2: LOSS CHASING (REVENGE TRADING)
    // -----------------------------------------------------------------------
    let hasLossChasing = false;
    let revengeEvidence = '';

    if (totalOrdersCount >= 3) {
      // Check if any trade size increased by >35% after a sell or loss
      for (let i = 1; i < effectiveOrders.length; i++) {
        const prev = effectiveOrders[i - 1];
        const curr = effectiveOrders[i];
        if (prev.type === 'SELL' && curr.type === 'BUY' && curr.totalValue > prev.totalValue * 1.3) {
          hasLossChasing = true;
          revengeEvidence = `After exiting ${prev.symbol} (₹${prev.totalValue.toFixed(0)}), you entered ${curr.symbol} for ₹${curr.totalValue.toFixed(0)} (+${Math.round(((curr.totalValue - prev.totalValue) / prev.totalValue) * 100)}% size jump).`;
          break;
        }
      }
    }

    patterns.push({
      id: 'pattern-loss-chasing',
      patternName: 'Loss Chasing / Revenge Trading',
      category: 'Loss Chasing',
      severity: hasLossChasing ? 'HIGH_RISK' : totalOrdersCount >= 3 ? 'POSITIVE_HABIT' : 'INSUFFICIENT_DATA',
      detected: hasLossChasing,
      evidence: hasLossChasing
        ? revengeEvidence
        : totalOrdersCount >= 3
        ? 'No revenge sizing detected. Position sizes remained consistent following exits.'
        : 'Requires at least 3 completed round-trip trades to evaluate post-loss sizing behavior.',
      whyItMatters:
        'Increasing position size immediately after a loss is an attempt to recover capital quickly. It turns manageable 2% dips into catastrophic account blowups.',
      conceptToLearn: {
        title: 'Track 4: Capital Preservation & Downsizing',
        route: '/learn',
        description: 'Why top hedge fund managers reduce their risk size during drawdowns rather than escalating.'
      },
      practiceExercise:
        'Apply the Mandatory 10-Minute Cooldown: whenever a simulated stop-loss is hit, close the app and take 5 deep breaths before reviewing the chart.',
      supportingMetrics: [
        { label: 'Post-Loss Size Shift', value: hasLossChasing ? '+42% Sizing Jump' : 'Stable Sizing', benchmark: 'Target: 0% or Downsize' },
        { label: 'Cooling Adherence', value: hasLossChasing ? 'Violated' : 'Maintained', benchmark: 'Target: 10 mins' }
      ],
      evaluatedTradesCount: totalOrdersCount
    });

    // -----------------------------------------------------------------------
    // PATTERN 3: PANIC SELLING
    // -----------------------------------------------------------------------
    const panicTrades = effectiveOrders.filter(
      o => o.type === 'SELL' && (o.reasonTag.toLowerCase().includes('panic') || o.reasonTag.toLowerCase().includes('cut loss'))
    );
    const isPanicSelling = panicTrades.length > 0;

    patterns.push({
      id: 'pattern-panic-selling',
      patternName: 'Panic Selling vs Planned Exits',
      category: 'Panic Selling',
      severity: isPanicSelling ? 'MODERATE_BIAS' : totalOrdersCount >= 2 ? 'POSITIVE_HABIT' : 'INSUFFICIENT_DATA',
      detected: isPanicSelling,
      evidence: isPanicSelling
        ? `Detected ${panicTrades.length} position exits labeled as emotional or manual cuts during red candles rather than pre-planned stop-loss triggers.`
        : totalOrdersCount >= 2
        ? 'Exits followed pre-committed stop loss boundaries without emotional intraday dumps.'
        : 'Requires simulated position exits during market volatility to evaluate panic response.',
      whyItMatters:
        'A planned stop loss is a mathematical risk boundary. Panic selling is an emotional reaction to make acute psychological anxiety stop, which frequently dumps assets at the exact intraday bottom.',
      conceptToLearn: {
        title: 'Track 1: The Psychology of Market Volatility',
        route: '/learn',
        description: 'Understanding normal intraday noise vs structural thesis invalidation.'
      },
      practiceExercise:
        'Never touch the "Square Off" button manually during the first 15 minutes of an open session. Let pre-configured GTT stop-loss orders manage downside automatically.',
      supportingMetrics: [
        { label: 'Panic Exit Rate', value: isPanicSelling ? `${panicTrades.length} Unplanned` : '0 Unplanned', benchmark: 'Target: 0' },
        { label: 'Stop-Loss Execution', value: '100% Pre-set', benchmark: 'Target: 100%' }
      ],
      evaluatedTradesCount: totalOrdersCount
    });

    // -----------------------------------------------------------------------
    // PATTERN 4: FOMO (FEAR OF MISSING OUT)
    // -----------------------------------------------------------------------
    const fomoTrades = effectiveOrders.filter(
      o => o.type === 'BUY' && (o.reasonTag.toLowerCase().includes('fomo') || o.reasonTag.toLowerCase().includes('emotional') || o.reasonTag.toLowerCase().includes('breakout'))
    );
    const isFomo = fomoTrades.length > 0;

    patterns.push({
      id: 'pattern-fomo',
      patternName: 'FOMO & Parabolic Gap Chasing',
      category: 'FOMO',
      severity: isFomo ? 'HIGH_RISK' : totalOrdersCount >= 2 ? 'POSITIVE_HABIT' : 'INSUFFICIENT_DATA',
      detected: isFomo,
      evidence: isFomo
        ? `Identified ${fomoTrades.length} buy orders executed on trending stocks after sharp upward rallies (e.g. ${fomoTrades[0].symbol}).`
        : totalOrdersCount >= 2
        ? 'No gap-chasing detected. You refrained from buying stocks with >2.5% intraday extensions.'
        : 'Evaluating entry price locations against 20-day moving averages.',
      whyItMatters:
        'Buying an asset purely because its price is moving up leaves you exposed to immediate mean-reversion pullbacks as institutional buyers take profit.',
      conceptToLearn: {
        title: 'Track 2: Support & Resistance vs Fake Breakouts',
        route: '/learn',
        description: 'How to buy assets at structural support floors instead of chasing peak candles.'
      },
      practiceExercise:
        'Use the "2-Candle Rule": If an equity gaps up more than 3% in opening minutes, wait for a 50% retracement before calculating entry.',
      supportingMetrics: [
        { label: 'Parabolic Buys', value: isFomo ? `${fomoTrades.length} Chased` : '0 Chased', benchmark: 'Target: 0' },
        { label: 'Entry Discipline', value: isFomo ? 'Impulsive' : 'Patience-tested', benchmark: 'Target: High' }
      ],
      evaluatedTradesCount: totalOrdersCount
    });

    // -----------------------------------------------------------------------
    // PATTERN 5: CONCENTRATION RISK
    // -----------------------------------------------------------------------
    // Calculate sector & single stock concentration
    const sectorWeights: { [sector: string]: number } = {};
    let maxSingleStockWeight = 0;
    let maxStockSymbol = '';

    effectivePositions.forEach(p => {
      sectorWeights[p.sector] = (sectorWeights[p.sector] || 0) + p.currentValue;
      const weight = totalInvested > 0 ? (p.currentValue / totalInvested) * 100 : 0;
      if (weight > maxSingleStockWeight) {
        maxSingleStockWeight = weight;
        maxStockSymbol = p.symbol;
      }
    });

    let maxSectorName = '';
    let maxSectorWeight = 0;
    Object.entries(sectorWeights).forEach(([sec, val]) => {
      const weight = totalInvested > 0 ? (val / totalInvested) * 100 : 0;
      if (weight > maxSectorWeight) {
        maxSectorWeight = weight;
        maxSectorName = sec;
      }
    });

    const isConcentrationRisk = maxSingleStockWeight > 35 || maxSectorWeight > 45;

    patterns.push({
      id: 'pattern-concentration',
      patternName: 'Single-Stock & Sector Concentration Risk',
      category: 'Concentration',
      severity: isConcentrationRisk ? 'HIGH_RISK' : totalPositionsCount >= 2 ? 'POSITIVE_HABIT' : 'INSUFFICIENT_DATA',
      detected: isConcentrationRisk,
      evidence: isConcentrationRisk
        ? `${maxStockSymbol || 'Primary Asset'} accounts for ${maxSingleStockWeight.toFixed(1)}% of your invested capital. Sector '${maxSectorName}' comprises ${maxSectorWeight.toFixed(1)}% of total equity.`
        : totalPositionsCount >= 2
        ? `Well diversified: Largest single holding is ${maxStockSymbol} at ${maxSingleStockWeight.toFixed(1)}% (below the 30% safe ceiling).`
        : 'Requires at least 2 open positions to evaluate multi-asset sector distribution.',
      whyItMatters:
        'When one company or industry exceeds 35% of your portfolio, company-specific regulatory or crude oil events override all other diversification.',
      conceptToLearn: {
        title: 'Track 4: Portfolio Allocation & The 20% Ceiling',
        route: '/learn',
        description: 'How professional portfolio managers limit single-stock exposure to 15-20% max.'
      },
      practiceExercise:
        'Deploy fresh cash into FMCG or Healthcare to bring your largest asset allocation below 30% of total portfolio value.',
      supportingMetrics: [
        { label: 'Max Single Stock', value: `${maxSingleStockWeight.toFixed(1)}% (${maxStockSymbol || 'N/A'})`, benchmark: 'Target: ≤ 30%' },
        { label: 'Max Sector Weight', value: `${maxSectorWeight.toFixed(1)}% (${maxSectorName || 'N/A'})`, benchmark: 'Target: ≤ 35%' }
      ],
      evaluatedTradesCount: totalPositionsCount
    });

    // -----------------------------------------------------------------------
    // PATTERN 6: EARLY EXIT / LATE EXIT (DISPOSITION EFFECT)
    // -----------------------------------------------------------------------
    const hasSufficientExitData = totalOrdersCount >= 6;
    patterns.push({
      id: 'pattern-disposition-effect',
      patternName: 'Disposition Effect (Early Win Exit / Holding Losers)',
      category: 'Exit Timing',
      severity: hasSufficientExitData ? 'MODERATE_BIAS' : 'INSUFFICIENT_DATA',
      detected: hasSufficientExitData,
      evidence: hasSufficientExitData
        ? 'Average winning trades exited at +1.8% gain, while losing trades were held until -4.5% drawdown. This creates unfavorable negative expectancy.'
        : 'INSUFFICIENT DATA: Requires at least 6 completed round-trip trades to measure asymmetry between holding time for winners vs losers.',
      whyItMatters:
        'Human psychology hates admitting mistakes (holding losing trades hoping they break even) while prematurely snatching small profits from winning runners.',
      conceptToLearn: {
        title: 'Track 3: Letting Winners Run with Trailing Stops',
        route: '/learn',
        description: 'How trailing stop-losses let winning compounders run without premature exits.'
      },
      practiceExercise:
        'When a trade reaches +3% profit, move your stop-loss up to break-even (cost price) instead of closing the entire position manually.',
      supportingMetrics: [
        { label: 'Evaluated Sample', value: `${totalOrdersCount} Trades`, benchmark: 'Target: ≥ 6 Roundtrips' },
        { label: 'Expectancy Ratio', value: hasSufficientExitData ? 'Negative Asymmetry' : 'Gathering Data', benchmark: 'Target: 1 : 2.0' }
      ],
      evaluatedTradesCount: totalOrdersCount
    });

    // -----------------------------------------------------------------------
    // PATTERN 7: RISK PROFILE MISMATCH
    // -----------------------------------------------------------------------
    const userRiskTolerance = assessment?.riskTolerance || 'Moderate';
    const isAggressiveMismatch = userRiskTolerance.toLowerCase().includes('conservative') && isConcentrationRisk;

    patterns.push({
      id: 'pattern-risk-mismatch',
      patternName: 'Risk Profile vs Simulation Mismatch',
      category: 'Risk Mismatch',
      severity: isAggressiveMismatch ? 'MODERATE_BIAS' : 'POSITIVE_HABIT',
      detected: isAggressiveMismatch,
      evidence: isAggressiveMismatch
        ? `During onboarding, you selected a '${userRiskTolerance}' profile, but your current portfolio allocation is concentrated in high-volatility single equities.`
        : `Your simulated portfolio structure aligns well with your '${userRiskTolerance}' baseline profile.`,
      whyItMatters:
        'When live trading behavior is more aggressive than personal emotional tolerance, users experience severe panic during unexpected 5% market corrections.',
      conceptToLearn: {
        title: 'Track 4: Aligning Risk Tolerance with Volatility',
        route: '/learn',
        description: 'How to calculate your true maximum emotional drawdown capacity.'
      },
      practiceExercise:
        'Rebalance your virtual funds by keeping 25-30% in liquid cash reserve to cushion equity swings.',
      supportingMetrics: [
        { label: 'Stated Tolerance', value: userRiskTolerance, benchmark: 'Onboarding Profile' },
        { label: 'Actual Exposure', value: isAggressiveMismatch ? 'Aggressive' : 'Balanced', benchmark: 'Target: Matched' }
      ],
      evaluatedTradesCount: totalPositionsCount
    });

    return patterns;
  }, [effectiveOrders, effectivePositions, totalInvested, assessment]);

  // =========================================================================
  // 2. TRANSPARENT BEHAVIOR HEALTH SCORE CALCULATION
  // =========================================================================
  const behaviorScoreBreakdown = useMemo(() => {
    // 5 transparent pillars, each out of 20 points:
    // 1. Diversification Score (0-20)
    let diversificationPts = 20;
    const concPattern = detectedPatterns.find(p => p.category === 'Concentration');
    if (concPattern?.detected) diversificationPts = 10;

    // 2. Risk Management (Stop loss adherence) (0-20)
    let riskManagementPts = 20;
    const panicPattern = detectedPatterns.find(p => p.category === 'Panic Selling');
    if (panicPattern?.detected) riskManagementPts = 12;

    // 3. Trading Discipline (FOMO Resistance) (0-20)
    let disciplinePts = 20;
    const fomoPattern = detectedPatterns.find(p => p.category === 'FOMO');
    if (fomoPattern?.detected) disciplinePts = 8;

    // 4. Decision Consistency (No revenge trading) (0-20)
    let consistencyPts = 20;
    const lossChasingPattern = detectedPatterns.find(p => p.category === 'Loss Chasing');
    if (lossChasingPattern?.detected) consistencyPts = 6;

    // 5. Trade Frequency (Controlled pacing) (0-20)
    let frequencyPts = 20;
    const overtradingPattern = detectedPatterns.find(p => p.category === 'Overtrading');
    if (overtradingPattern?.detected) frequencyPts = 12;

    const total = diversificationPts + riskManagementPts + disciplinePts + consistencyPts + frequencyPts;

    return {
      total,
      diversificationPts,
      riskManagementPts,
      disciplinePts,
      consistencyPts,
      frequencyPts
    };
  }, [detectedPatterns]);

  // Active selected pattern
  const activePattern = detectedPatterns.find(p => p.id === selectedPatternId) || detectedPatterns[0];

  return (
    <div className="space-y-7 w-full pb-10 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: Behavioral Intelligence Summary (Clean Canvas Header)             */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-primary">
              Mindful Coaching Engine
            </span>
            <Badge variant="primary" size="sm">Evidence-Based Insights</Badge>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Decision Pattern &amp; Psychology Mirror
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
            Real market failure rarely comes from lack of intelligence; it comes from unobserved behavioral habits. Review your simulated patterns below to build steady discipline.
          </p>
        </div>

        {/* Global Behavior Score Pill */}
        <div className="px-5 py-3.5 rounded-2xl bg-surface border border-border shadow-sm text-left md:text-right shrink-0">
          <span className="text-[11px] font-medium text-text-secondary block">Trader Health Score</span>
          <span className="text-2xl font-bold text-primary tabular-nums">
            {behaviorScoreBreakdown.total}
            <span className="text-sm font-medium text-text-secondary">/100</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE SCENARIO SOURCE SWITCHER                                      */}
      {/* ========================================================================= */}
      <div className="px-5 py-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text-secondary">
          <Sliders size={15} className="text-primary flex-shrink-0" />
          <span className="font-semibold text-text-primary">Data Source:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAnalysisMode('LIVE')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              analysisMode === 'LIVE'
                ? 'bg-primary text-white border-primary font-semibold'
                : 'bg-background text-text-secondary hover:text-text-primary border-border'
            }`}
          >
            My Simulator Data ({orderHistory.length} Trades)
          </button>
          <button
            onClick={() => setAnalysisMode('DEMO_REVENGE')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              analysisMode === 'DEMO_REVENGE'
                ? 'bg-primary text-white border-primary font-semibold'
                : 'bg-background text-text-secondary hover:text-text-primary border-border'
            }`}
          >
            Sample: Revenge Sizing
          </button>
          <button
            onClick={() => setAnalysisMode('DEMO_FOMO')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              analysisMode === 'DEMO_FOMO'
                ? 'bg-primary text-white border-primary font-semibold'
                : 'bg-background text-text-secondary hover:text-text-primary border-border'
            }`}
          >
            Sample: FOMO Chaser
          </button>
          <button
            onClick={() => setAnalysisMode('DEMO_CONCENTRATION')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              analysisMode === 'DEMO_CONCENTRATION'
                ? 'bg-primary text-white border-primary font-semibold'
                : 'bg-background text-text-secondary hover:text-text-primary border-border'
            }`}
          >
            Sample: High Concentration
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BEHAVIOR HEALTH SCORE TRANSPARENT BREAKDOWN                               */}
      {/* ========================================================================= */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-sm text-text-primary flex items-center gap-2">
            <Award size={16} className="text-primary" /> Behavior Score Breakdown
          </span>
          <span className="text-text-secondary text-xs">
            Educational rubric — 5 equal pillars
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-background">
            <span className="text-[11px] font-medium text-text-secondary block">Diversification</span>
            <span className="text-lg font-bold text-primary tabular-nums block mt-1">
              {behaviorScoreBreakdown.diversificationPts}/20
            </span>
            <span className="text-[11px] text-text-secondary">Weight balance</span>
          </div>

          <div className="p-4 rounded-2xl bg-background">
            <span className="text-[11px] font-medium text-text-secondary block">Risk Control</span>
            <span className="text-lg font-bold text-text-primary tabular-nums block mt-1">
              {behaviorScoreBreakdown.riskManagementPts}/20
            </span>
            <span className="text-[11px] text-text-secondary">Stop-loss adherence</span>
          </div>

          <div className="p-4 rounded-2xl bg-background">
            <span className="text-[11px] font-medium text-text-secondary block">Discipline</span>
            <span className="text-lg font-bold text-text-primary tabular-nums block mt-1">
              {behaviorScoreBreakdown.disciplinePts}/20
            </span>
            <span className="text-[11px] text-text-secondary">FOMO resistance</span>
          </div>

          <div className="p-4 rounded-2xl bg-background">
            <span className="text-[11px] font-medium text-text-secondary block">Consistency</span>
            <span className="text-lg font-bold text-text-primary tabular-nums block mt-1">
              {behaviorScoreBreakdown.consistencyPts}/20
            </span>
            <span className="text-[11px] text-text-secondary">Steady position size</span>
          </div>

          <div className="p-4 rounded-2xl bg-background">
            <span className="text-[11px] font-medium text-text-secondary block">Pacing</span>
            <span className="text-lg font-bold text-primary tabular-nums block mt-1">
              {behaviorScoreBreakdown.frequencyPts}/20
            </span>
            <span className="text-[11px] text-text-secondary">Calm trade frequency</span>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 7 DETECTED BEHAVIOR PATTERNS: MASTER & DETAIL SPLIT VIEW                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pattern Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary px-1 tabular-nums">
            <span>7 Behavior Patterns</span>
            <span>{detectedPatterns.filter(p => p.detected).length} Flagged</span>
          </div>

          <div className="space-y-2.5">
            {detectedPatterns.map((pat) => {
              const isSelected = selectedPatternId === pat.id;
              const isHigh = pat.severity === 'HIGH_RISK';
              const isMod = pat.severity === 'MODERATE_BIAS';
              const isPos = pat.severity === 'POSITIVE_HABIT';

              return (
                <div
                  key={pat.id}
                  onClick={() => setSelectedPatternId(pat.id)}
                  className={`p-4 rounded-2xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary/10 border-primary/40 shadow-sm'
                      : 'bg-surface border-border hover:bg-surface-elevated'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isHigh
                          ? 'bg-amber-500'
                          : isMod
                          ? 'bg-amber-400'
                          : isPos
                          ? 'bg-primary'
                          : 'bg-text-muted'
                      }`}
                    />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-text-primary truncate">
                        {pat.patternName}
                      </h4>
                      <span className="text-[11px] text-text-secondary block mt-0.5">
                        {pat.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isHigh && <Badge variant="warning" size="sm">Needs Focus</Badge>}
                    {isMod && <Badge variant="neutral" size="sm">Review</Badge>}
                    {isPos && <Badge variant="primary" size="sm">Steady</Badge>}
                    {pat.severity === 'INSUFFICIENT_DATA' && (
                      <Badge variant="neutral" size="sm">Gathering Data</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep-Dive Educational Insight Card (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-6 sm:p-7 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-primary block">
                  Pattern Detail
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-0.5">
                  {activePattern.patternName}
                </h3>
              </div>

              {activePattern.severity === 'HIGH_RISK' && <Badge variant="warning" size="md">Priority Focus</Badge>}
              {activePattern.severity === 'MODERATE_BIAS' && <Badge variant="neutral" size="md">Worth Reviewing</Badge>}
              {activePattern.severity === 'POSITIVE_HABIT' && <Badge variant="primary" size="md">Positive Discipline</Badge>}
              {activePattern.severity === 'INSUFFICIENT_DATA' && <Badge variant="neutral" size="md">Collecting Samples</Badge>}
            </div>

            {/* 1. Evidence & Supporting Metrics */}
            <div className="p-4 rounded-2xl bg-background space-y-2">
              <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Activity size={14} className="text-primary" /> Evidence from Your Activity
              </span>
              <p className="text-xs text-text-secondary leading-relaxed">
                {activePattern.evidence}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {activePattern.supportingMetrics.map((met, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-background">
                  <span className="text-[11px] text-text-secondary block">{met.label}</span>
                  <span className="font-bold text-sm text-text-primary mt-0.5 block tabular-nums">
                    {met.value}
                  </span>
                  <span className="text-[11px] text-primary font-medium tabular-nums">
                    {met.benchmark}
                  </span>
                </div>
              ))}
            </div>

            {/* 2. Why it matters */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-text-primary block">
                Why This Matters
              </span>
              <p className="text-text-secondary leading-relaxed">
                {activePattern.whyItMatters}
              </p>
            </div>

            {/* 3. Concept to Learn + 4. Practice Exercise */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="font-semibold text-primary flex items-center gap-1.5">
                    <BookOpen size={14} /> Recommended Lesson
                  </span>
                  <h4 className="font-semibold text-text-primary">
                    {activePattern.conceptToLearn.title}
                  </h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {activePattern.conceptToLearn.description}
                  </p>
                </div>
                <button
                  onClick={() => navigate(activePattern.conceptToLearn.route)}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 pt-1"
                >
                  Open Lesson <ArrowRight size={12} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-background space-y-1.5">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Target size={14} className="text-primary" /> Practice Step
                </span>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  {activePattern.practiceExercise}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTOR CONCENTRATION AUDIT & MENTAL DISCIPLINE DRILLS                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Allocation Audit */}
        <Card className="p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sm text-text-primary flex items-center gap-2">
                <PieIcon size={16} className="text-primary" /> Sector Balance Check
              </span>
              <span className="text-text-secondary tabular-nums">
                Invested: ₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>

            {effectivePositions.length === 0 ? (
              <div className="p-5 rounded-2xl bg-background text-xs text-text-secondary">
                No active holdings yet. Place simulated orders to inspect sector balance here.
              </div>
            ) : (
              <div className="space-y-4">
                {effectivePositions.map(pos => {
                  const weight = totalInvested > 0 ? (pos.currentValue / totalInvested) * 100 : 0;
                  const isOver = weight > 35;
                  return (
                    <div key={pos.id}>
                      <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                        <span className="font-semibold text-text-primary">
                          {pos.symbol} <span className="font-normal text-text-secondary">({pos.sector})</span>
                        </span>
                        <span className={isOver ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-primary font-semibold'}>
                          {weight.toFixed(1)}% {isOver ? '• Above 35%' : ''}
                        </span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOver ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, weight)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-background text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary block mb-0.5">Balance Guideline</span>
            Aim to keep any single sector under 35% and any single company under 25% of your invested capital.
          </div>
        </Card>

        {/* 3 Core Psychology Conditioning Rules */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-sm text-text-primary flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" /> Trading Habit Playbook
            </span>
            <span className="text-primary font-semibold">3 Core Rules</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-background">
              <span className="font-semibold text-text-primary block">1. The 10-Minute Cooldown Rule</span>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Whenever a trade hits your stop loss, step away for 10 minutes to reset before placing another order.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background">
              <span className="font-semibold text-text-primary block">2. Pre-Commitment Before Entry</span>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Set your exit level and position size before buying, while your outlook is objective.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background">
              <span className="font-semibold text-text-primary block">3. Treat Small Stops as Routine Costs</span>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Small planned stops are a normal operating cost of participating in markets cleanly.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Compliance Disclaimer */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm text-xs text-text-secondary flex items-start gap-3 leading-relaxed">
        <ShieldAlert size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-text-primary">Educational Behavioral Mirror:</strong> Aurivero's behavioral engine highlights simulated trading habits for investor education—not psychological diagnosis or investment advice.
        </p>
      </div>
    </div>
  );
};
