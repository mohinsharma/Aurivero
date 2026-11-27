import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  CandlestickChart,
  ArrowRight,
  BookOpen,
  Sparkles,
  History,
  ChevronRight,
  Zap,
  Flame,
  CheckCircle2,
  Clock,
  PieChart as PieIcon,
  Compass,
  Target,
  Bot,
  LayoutGrid,
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { BeginnerTooltip } from '../components/common/BeginnerTooltip';
import { INDIAN_INDICES } from '../data/mockData';
import api from '../services/api';

export const DashboardPage: React.FC = () => {
  const {
    virtualCash,
    totalPortfolioValue,
    totalInvested,
    unrealizedPnLPercent,
    dayPnL,
    positions,
    stocks,
    behavioralScore,
    assessment,
    orderHistory,
    experienceMode,
  } = useSimulator();

  const navigate = useNavigate();
  const [showExpandedPortfolio, setShowExpandedPortfolio] = useState(false);
  const [aiQuickPrompt, setAiQuickPrompt] = useState('');
  const [gamStats, setGamStats] = useState<{ skills: number; streak: number; contests: number }>({
    skills: 0,
    streak: 0,
    contests: 0,
  });
  const [skippedSteps, setSkippedSteps] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('mindmark_skipped_onboarding_steps');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    api.gamification.getProfile(false).then((res) => {
      const d = res?.data ?? res;
      if (d) {
        setGamStats({
          skills: d?.skill_tree?.completed_count || 0,
          streak: d?.streak?.current_streak || 0,
          contests: d?.badges?.unlocked_count || 0,
        });
      }
    }).catch(() => {});
  }, []);

  const skipStep = (stepKey: string) => {
    const next = [...skippedSteps, stepKey];
    setSkippedSteps(next);
    try {
      localStorage.setItem('mindmark_skipped_onboarding_steps', JSON.stringify(next));
    } catch {}
  };

  const hasAssessmentDone = Boolean(
    (typeof window !== 'undefined' && localStorage.getItem('mindmark_onboarding_v2')) || assessment
  );
  const hasLessonDone = gamStats.skills > 0;
  const hasSimActivity = orderHistory.length > 1 || positions.length > 0;
  const isFirstRun = !hasLessonDone && orderHistory.length <= 1 && skippedSteps.length < 3;

  // Determine single best next step based on actual progress
  const nextStep = !hasAssessmentDone
    ? { title: 'Complete your investor assessment', desc: 'Take 2 minutes to tailor your learning path.', cta: 'Take Assessment', route: '/onboarding' }
    : !hasLessonDone
    ? { title: 'Start with your first lesson', desc: 'Learn how stocks, indices, and investing risk work in plain English.', cta: 'Start Your First Lesson', route: '/academy' }
    : !hasSimActivity
    ? { title: 'Try your first virtual investment', desc: 'Practise buying a stock using ₹1,00,000 virtual money — zero real-money risk.', cta: 'Try Paper Trading', route: '/simulator' }
    : { title: 'Review your last decision', desc: 'See what behavioral patterns your recent decisions show.', cta: 'View Behavioral Insights', route: '/behavioral-insights' };

  // Dynamic Time-Based Greeting
  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12 ? 'Good morning.' : currentHour < 17 ? 'Good afternoon.' : 'Good evening.';

  // State for Portfolio Chart timeframe
  const [portfolioTimeframe, setPortfolioTimeframe] = useState<'1W' | '1M' | '3M' | 'ALL'>('1M');

  // Check user activity for Coaching Insight
  const hasUserActivity = positions.length > 0 || orderHistory.length > 0;

  // Calculate sector concentration if positions exist
  const reliancePosition = positions.find((p) => p.symbol === 'RELIANCE');
  const reliancePercent =
    reliancePosition && totalInvested > 0
      ? ((reliancePosition.currentValue / totalInvested) * 100).toFixed(1)
      : null;

  // Calm translucent heatmap tiles (green/red reserved purely for price direction)
  const getHeatmapTileStyle = (pct: number) => {
    if (pct >= 0) {
      return 'bg-profit/10 border-profit/25 text-profit hover:bg-profit/15';
    }
    return 'bg-loss/10 border-loss/25 text-loss hover:bg-loss/15';
  };

  // ===========================================================================
  // BEGINNER MODE DASHBOARD (Low Cognitive Load, Plain English, AURIVERO UI)
  // ===========================================================================
  if (experienceMode === 'beginner') {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        {/* A. Calm Welcome Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Badge variant="primary" dot size="sm">
              Beginner Friendly Mode
            </Badge>
            <span className="text-xs text-text-secondary hidden sm:inline">
              Zero real money involved • Learn at your own pace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Welcome back.{' '}
            <span className="text-primary">Let&apos;s build your investing knowledge step by step.</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl">
            Learn how markets work, practise with virtual money, and improve your decisions without risking your savings.
          </p>
        </div>

        {/* Guided First-Run 3-Step Checklist */}
        {isFirstRun && (
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-text-primary">Getting Started Checklist (3 Quick Steps)</h2>
              <span className="text-xs font-medium text-primary">Virtual Learning Only</span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { key: 'assess', title: '1. Discover Your Investor Profile', desc: 'Helps tailor learning to your experience. Not a financial qualification.', cta: 'Take the 2-minute assessment', route: '/onboarding', done: hasAssessmentDone },
                { key: 'lesson', title: '2. Learn One Essential Concept', desc: 'Understand what stocks are and how investing risk works.', cta: 'Start Your First Lesson', route: '/academy', done: hasLessonDone },
                { key: 'trade', title: '3. Make Your First Virtual Investment', desc: 'Uses virtual money only — no real money is involved.', cta: 'Try Paper Trading', route: '/simulator', done: hasSimActivity },
              ].map((step) => (
                <div
                  key={step.key}
                  className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between ${
                    step.done ? 'bg-primary/10 border-primary/30' : 'bg-background border-border'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-text-primary flex items-center justify-between">
                      <span>{step.title}</span>
                      {step.done && <CheckCircle2 size={15} className="text-primary" />}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{step.desc}</p>
                  </div>
                  {!step.done && !skippedSteps.includes(step.key) && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button variant="primary" size="sm" onClick={() => navigate(step.route)} className="text-xs flex-1 rounded-xl">
                        {step.cta}
                      </Button>
                      <button
                        type="button"
                        onClick={() => skipStep(step.key)}
                        className="text-[11px] text-text-secondary hover:text-text-primary px-2"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* B. Your Next Step */}
        <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Your Next Step
            </span>
            <h2 className="text-lg font-bold text-text-primary">{nextStep.title}</h2>
            <p className="text-xs text-text-secondary">{nextStep.desc}</p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(nextStep.route)}
            icon={<ArrowRight size={16} />}
            iconPosition="right"
            className="shrink-0 font-semibold rounded-xl"
          >
            {nextStep.cta}
          </Button>
        </Card>

        {/* C. Portfolio Snapshot (3 Beginner Numbers) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Virtual Portfolio Snapshot</h2>
            <button
              type="button"
              onClick={() => setShowExpandedPortfolio((v) => !v)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {showExpandedPortfolio ? 'Hide Details' : 'Expand Portfolio Details'}
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-5 space-y-1">
              <div className="text-xs text-text-secondary">Total Virtual Money</div>
              <div className="text-2xl font-bold text-text-primary tabular-nums">
                ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-text-secondary">Your demo cash + stock value</div>
            </Card>
            <Card className="p-5 space-y-1">
              <div className="text-xs text-text-secondary flex items-center">
                Today&apos;s Change
                <BeginnerTooltip
                  term="Today's Change (P&L)"
                  definition="Profit and Loss. It shows how much your virtual investments have gained or lost today."
                  example="If ₹1,000 grows to ₹1,020, Today's Change is +₹20."
                />
              </div>
              <div className={`text-2xl font-bold tabular-nums ${dayPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                {dayPnL >= 0 ? '+' : ''}₹{dayPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-text-secondary">Simulated daily movement</div>
            </Card>
            <Card className="p-5 space-y-1">
              <div className="text-xs text-text-secondary">Available Cash</div>
              <div className="text-2xl font-bold text-text-primary tabular-nums">
                ₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-text-secondary">Ready to practise with</div>
            </Card>
          </div>

          {showExpandedPortfolio && (
            <Card className="p-5 space-y-3">
              <div className="text-xs font-bold text-text-primary">Your Practice Holdings ({positions.length})</div>
              {positions.length === 0 ? (
                <p className="text-xs text-text-secondary">No virtual stocks held yet. Try Paper Trading when ready.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {positions.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-text-primary">{p.symbol}</div>
                        <div className="text-text-secondary">{p.quantity} shares • {p.sector}</div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="text-text-primary font-semibold">
                          ₹{p.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className={p.unrealizedPnL >= 0 ? 'text-profit font-semibold' : 'text-loss font-semibold'}>
                          {p.unrealizedPnL >= 0 ? '+' : ''}{p.unrealizedPnLPercent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </section>

        {/* D. AI Buddy Quick Help & E. Your Progress */}
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5 space-y-3">
            <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Bot size={16} className="text-primary" /> AI Buddy Quick Help
            </div>
            <div className="flex gap-2">
              <input
                value={aiQuickPrompt}
                onChange={(e) => setAiQuickPrompt(e.target.value)}
                placeholder="Ask anything about investing in simple words..."
                className="flex-1 rounded-xl bg-background border border-border px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
              />
              <Button variant="primary" size="sm" onClick={() => navigate('/ai-buddy')} className="rounded-xl">
                Ask
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['What is a stock?', 'Why did my investment fall?', 'What is risk?', 'What does diversification mean?'].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => navigate('/ai-buddy')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-background border border-border text-text-secondary hover:text-text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="text-sm font-semibold text-text-primary flex items-center justify-between">
              <span>Your Progress</span>
              <button type="button" onClick={() => navigate('/my-progress')} className="text-xs text-primary hover:underline font-semibold">
                View Full Progress →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-xl font-bold text-primary tabular-nums">{gamStats.skills}</div>
                <div className="text-[11px] text-text-secondary">Skills Completed</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-xl font-bold text-text-primary tabular-nums">{gamStats.streak}d</div>
                <div className="text-[11px] text-text-secondary">Learning Streak</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-xl font-bold text-text-primary tabular-nums">{gamStats.contests}</div>
                <div className="text-[11px] text-text-secondary">Badges Earned</div>
              </div>
            </div>
          </Card>
        </div>

        {/* F. Market Snapshot + NSE Heatmap */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Market at a Glance &amp; NSE Heatmap</h2>
            <button
              type="button"
              onClick={() => navigate('/markets/heatmap')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Full Heatmap →
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {INDIAN_INDICES.slice(0, 3).map((idx) => (
              <Card key={idx.name} className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">{idx.name}</span>
                  <span className={`font-semibold tabular-nums ${idx.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent}%
                  </span>
                </div>
                <div className="text-lg font-bold text-text-primary tabular-nums">{idx.value.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-text-secondary">
                  Tracks top Indian companies to show overall market mood.
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {stocks.slice(0, 8).map((stk) => {
              const isUp = stk.changePercent >= 0;
              return (
                <button
                  key={stk.symbol}
                  type="button"
                  onClick={() => navigate('/simulator')}
                  className={`p-3 rounded-xl border text-left transition-transform hover:-translate-y-0.5 ${getHeatmapTileStyle(
                    stk.changePercent
                  )}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-text-primary truncate">{stk.symbol}</span>
                    <span className="text-xs font-bold tabular-nums">
                      {isUp ? '+' : '-'}{Math.abs(stk.changePercent).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary truncate mt-0.5">
                    ₹{stk.price.toFixed(0)} · {stk.sector.split(' ')[0]}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Explore Aurivero (5 Clean Cards) */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Explore Aurivero</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { title: 'Learn', desc: 'Build your investing knowledge step by step.', route: '/academy', icon: BookOpen },
              { title: 'Practice', desc: 'Try investing decisions using virtual money.', route: '/simulator', icon: CandlestickChart },
              { title: 'AI Buddy', desc: 'Get finance concepts explained in simple language.', route: '/ai-buddy', icon: Bot },
              { title: 'Markets', desc: 'Explore stocks and understand market movements.', route: '/markets', icon: LayoutGrid },
              { title: 'Behavioral Insights', desc: 'Discover patterns in your simulated decisions.', route: '/behavioral-insights', icon: BrainCircuit },
            ].map((m) => (
              <button
                key={m.title}
                type="button"
                onClick={() => navigate(m.route)}
                className="p-4 rounded-2xl bg-surface border border-border hover:border-primary/40 text-left space-y-2 transition shadow-sm"
              >
                <m.icon size={18} className="text-primary" />
                <div className="text-sm font-semibold text-text-primary">{m.title}</div>
                <p className="text-xs text-text-secondary leading-relaxed">{m.desc}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full pb-8">
      {/* ========================================================================= */}
      {/* 1. COMPACT, CALM HEADER                                                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Badge variant="primary" dot size="sm">
              NSE / BSE Learning Session
            </Badge>
            <span className="text-xs text-text-secondary hidden sm:inline">
              IST 09:15 – 15:30 Market Hours • Practice Mode
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {timeGreeting}{' '}
            <span className="text-primary">Ready to learn at your own pace?</span>
          </h1>

          <p className="text-xs text-text-secondary">
            "Your progress is built by the decisions you make, not just the returns you earn."
          </p>
        </div>

        {/* Learning Rank & Quick Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-surface border border-border shadow-sm flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Compass size={15} />
            </div>
            <div>
              <span className="text-[10px] font-medium text-text-secondary block leading-none">
                Learning Rank
              </span>
              <span className="font-semibold text-xs text-text-primary block truncate max-w-[140px] mt-0.5">
                {assessment?.experienceLevel || 'Level 1: Market Explorer'}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/ai-buddy')}
            className="text-xs font-semibold rounded-xl"
          >
            <Bot size={14} className="mr-1.5" />
            Ask AI Buddy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/behavioral-insights')}
            className="text-xs rounded-xl hidden sm:inline-flex"
          >
            Investor Fingerprint
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VIRTUAL PORTFOLIO SUMMARY (4 Stat Cards)                               */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Virtual Paper Portfolio</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-elevated text-text-secondary text-[11px] font-medium">
              Practice Balance
            </span>
          </div>
          <span className="text-xs font-medium text-text-secondary tabular-nums">
            Starting Ledger: ₹10,00,000.00
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Virtual Net Worth"
            value={`₹${totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subValue="Cash + Holdings"
            change={((totalPortfolioValue - 1000000) / 1000000) * 100}
            changeLabel="overall return"
            tooltip="Total simulated net worth combining liquid cash balance and market value of virtual shares."
          />

          <StatCard
            label="Invested Amount"
            value={`₹${totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subValue={`${positions.length} active holdings`}
            change={unrealizedPnLPercent}
            changeLabel="unrealized return"
            tooltip="Total simulated capital deployed into active equity positions."
          />

          <StatCard
            label="Cash Available"
            value={`₹${virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subValue={`${totalPortfolioValue > 0 ? ((virtualCash / totalPortfolioValue) * 100).toFixed(1) : '100.0'}% liquid`}
            tooltip="Simulated unallocated INR available to buy fresh shares."
          />

          <StatCard
            label="Today's Virtual P&L"
            value={`${dayPnL >= 0 ? '+' : ''}₹${dayPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            change={totalPortfolioValue - dayPnL !== 0 ? (dayPnL / (totalPortfolioValue - dayPnL)) * 100 : 0}
            changeLabel="today"
            tooltip="Intraday simulated profit/loss across all held assets."
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PORTFOLIO CURVE (LEFT) + MARKET SNAPSHOT & HEATMAP (RIGHT)             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Equity Performance Chart (7 cols) */}
        <Card className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-text-secondary">
                Simulated Equity Performance Curve
              </span>
              <div className="flex flex-wrap items-center gap-3 mt-0.5 tabular-nums">
                <span className="text-base font-bold text-primary">
                  Aurivero Portfolio{' '}
                  <span className={totalPortfolioValue - 1000000 >= 0 ? 'text-profit' : 'text-loss'}>
                    ({totalPortfolioValue - 1000000 >= 0 ? '+' : '-'}
                    {Math.abs(((totalPortfolioValue - 1000000) / 1000000) * 100).toFixed(2)}%)
                  </span>
                </span>
                <span className="text-xs font-medium text-text-secondary">
                  vs NIFTY 50 (+4.20%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border self-start sm:self-auto">
              {(['1W', '1M', '3M', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setPortfolioTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    portfolioTimeframe === tf
                      ? 'bg-primary text-white font-semibold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-[200px] w-full bg-background rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex justify-between text-xs text-text-secondary">
              <span className="text-primary font-medium flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-primary" /> Your Virtual Portfolio
              </span>
              <span className="text-text-secondary font-medium flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-text-muted" /> NIFTY 50 Benchmark
              </span>
            </div>

            <svg className="w-full h-28 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 80">
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,60 C120,55 240,48 360,40 L500,32"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.8"
                strokeDasharray="4,4"
              />
              <path
                d="M0,65 C100,50 200,58 320,30 L500,12"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
              />
              <path
                d="M0,65 C100,50 200,58 320,30 L500,12 L500,80 L0,80 Z"
                fill="url(#dashGrad)"
              />
              <circle cx="500" cy="12" r="4" fill="#2563EB" />
            </svg>

            <div className="flex justify-between text-[11px] text-text-secondary">
              <span>Nov 01</span>
              <span>Nov 10</span>
              <span>Nov 18</span>
              <span>Today (Nov 24)</span>
            </div>
          </div>
        </Card>

        {/* Right: Market Snapshot + Calm NSE Heatmap (5 cols) */}
        <Card className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-primary" />
              <h2 className="font-semibold text-sm text-text-primary">
                Market Snapshot &amp; NSE Heatmap
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/markets/heatmap')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              <span>Full Heatmap</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Compact 4 Benchmark Indices */}
          <div className="grid grid-cols-2 gap-2.5">
            {INDIAN_INDICES.map((idx) => {
              const isUp = idx.change >= 0;
              return (
                <div key={idx.name} className="px-3 py-2.5 rounded-xl bg-background">
                  <div className="flex justify-between items-center text-[11px] text-text-secondary tabular-nums">
                    <span className="font-medium truncate">{idx.name}</span>
                    <span className={`font-semibold ${isUp ? 'text-profit' : 'text-loss'}`}>
                      {isUp ? '+' : '-'}
                      {Math.abs(idx.changePercent).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm font-bold text-text-primary tabular-nums mt-0.5">
                    {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* NSE Stock / Sector Heatmap Grid */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-text-secondary mb-2">
              <span className="font-medium">NSE Leaders Heatmap (Click to practice)</span>
              <span>Green = Up · Red = Down</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
              {stocks.slice(0, 8).map((stk) => {
                const isUp = stk.changePercent >= 0;
                return (
                  <button
                    key={stk.symbol}
                    type="button"
                    onClick={() => navigate('/simulator')}
                    title={`${stk.name} (${stk.sector}) — Click to open in simulator`}
                    className={`p-2.5 rounded-xl border text-left transition-transform hover:-translate-y-0.5 ${getHeatmapTileStyle(
                      stk.changePercent
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[11px] text-text-primary truncate">
                        {stk.symbol}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums">
                        {isUp ? '+' : '-'}
                        {Math.abs(stk.changePercent).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-text-secondary truncate mt-0.5">
                      ₹{stk.price.toFixed(0)} · {stk.sector.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 4. LEARNING MASTERY + MISSION + MINDFUL COACH (3 Columns in 1 Row)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Card 1: Learning Mastery */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-primary" />
                <h2 className="font-semibold text-sm text-text-primary">Learning Mastery</h2>
              </div>
              <span className="text-[11px] font-semibold text-primary tabular-nums">
                5/20 Lessons (25%)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-background">
                <span className="text-[11px] text-text-secondary block">Knowledge</span>
                <span className="text-lg font-bold text-primary tabular-nums">
                  {assessment?.knowledgeScore || 75}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-background">
                <span className="text-[11px] text-text-secondary block">Active Streak</span>
                <span className="text-lg font-bold text-text-primary tabular-nums flex items-center gap-1">
                  <Flame size={15} className="text-primary" /> 3 Days
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-background flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <Zap size={14} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-semibold text-primary">Up Next</span>
                  <span className="text-text-secondary flex items-center gap-1 tabular-nums">
                    <Clock size={11} /> 12m
                  </span>
                </div>
                <p className="font-semibold text-xs text-text-primary mt-0.5 truncate">
                  Track 2: Candlesticks &amp; Breakouts
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">
                  Learn how volume confirms real trends before placing orders.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/learn')}
            icon={<ArrowRight size={14} />}
            iconPosition="right"
            className="w-full rounded-xl"
          >
            Resume Lesson
          </Button>
        </Card>

        {/* Card 2: Today's Learning Mission (Uses Cobalt Blue, never Trade Green) */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Target size={15} /> Today's Mission
              </span>
              <Badge variant="primary" size="sm">Mission #04</Badge>
            </div>

            <h3 className="text-sm font-bold text-text-primary">
              Portfolio Balance Check
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              See whether your virtual holdings stay balanced below 35% in any single company.
            </p>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 size={14} /> Review sector breakdown
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="w-3.5 h-3.5 rounded-full border border-border shrink-0" /> Place 1 diversifying practice trade
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-[11px] text-text-secondary mb-1.5 tabular-nums">
                <span>Progress</span>
                <span className="text-primary font-semibold">1 of 2 (50%)</span>
              </div>
              <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '50%' }} />
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/portfolio')}
            className="w-full rounded-xl"
            icon={<ArrowRight size={14} />}
            iconPosition="right"
          >
            View Portfolio Mix
          </Button>
        </Card>

        {/* Card 3: Mindful Trading Coach (Calm Cobalt Tone, No Alarming Warnings) */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <BrainCircuit size={15} /> Mindful Trading Coach
              </span>
              <span className="text-xs font-semibold text-primary tabular-nums">
                {behavioralScore.overallHealth}/100
              </span>
            </div>

            {hasUserActivity ? (
              <>
                <h3 className="text-sm font-bold text-text-primary">
                  {reliancePercent && parseFloat(reliancePercent) > 35
                    ? 'Sector Diversification Tip'
                    : 'Steady Trade Discipline Observed'}
                </h3>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {reliancePercent && parseFloat(reliancePercent) > 35 ? (
                    <>
                      <strong className="text-text-primary tabular-nums">{reliancePercent}%</strong> of your practice portfolio is in RELIANCE. Spreading across sectors keeps risk smooth.
                    </>
                  ) : (
                    <>
                      You used clear exit levels on your open holdings and stayed patient between trades.
                    </>
                  )}
                </p>

                <div className="p-3.5 rounded-xl bg-background text-xs">
                  <span className="font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles size={13} /> Helpful Next Step
                  </span>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    {reliancePercent && parseFloat(reliancePercent) > 35
                      ? 'Explore IT, FMCG, or Banking shares to balance your virtual holdings below 30% each.'
                      : 'Keep using planned exit points—consistent habits make trading feel calm and predictable.'}
                  </p>
                </div>
              </>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-text-secondary">
                  Friendly habit insights appear after your first practice trades.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate('/simulator')}>
                  Place Your First Trade
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/behavioral-insights')}
            className="w-full text-xs rounded-xl"
          >
            View Habit Insights →
          </Button>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 5. RECOMMENDED LEARNING ACTIONS (4 Calm Cards)                            */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Recommended Learning Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/simulator')}
            className="p-5 rounded-2xl bg-surface hover:border-primary/40 hover:shadow-md border border-border shadow-glass cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CandlestickChart size={18} />
              </div>
              <h3 className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                Start Paper Trading
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Practice virtual trades on Indian equities with zero rupee risk.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-primary flex items-center justify-between">
              <span>Open Desk</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => navigate('/learn')}
            className="p-5 rounded-2xl bg-surface hover:border-primary/40 hover:shadow-md border border-border shadow-glass cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <h3 className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                Continue Learning
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Resume bite-sized guides on charts, ratios, and calm risk sizing.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-primary flex items-center justify-between">
              <span>5 Tracks Available</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => navigate('/market-replay')}
            className="p-5 rounded-2xl bg-surface hover:border-primary/40 hover:shadow-md border border-border shadow-glass cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <History size={18} />
              </div>
              <h3 className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                Replay a Market Event
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Walk through historical market sessions step-by-step in safety.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-primary flex items-center justify-between">
              <span>Historical Replay</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => navigate('/portfolio')}
            className="p-5 rounded-2xl bg-surface hover:border-primary/40 hover:shadow-md border border-border shadow-glass cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <PieIcon size={18} />
              </div>
              <h3 className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                Analyze My Portfolio
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Review sector balance, holdings breakdown, and recent practice trades.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-primary flex items-center justify-between">
              <span>Full Analytics</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
