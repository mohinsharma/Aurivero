import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  BrainCircuit,
  CandlestickChart,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Sparkles,
  History,
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap,
  Flame,
  CheckCircle2,
  Clock,
  PieChart as PieIcon,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  Compass,
  Award,
  Target,
  Bot
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { BeginnerTooltip } from '../components/common/BeginnerTooltip';
import { INDIAN_INDICES, POPULAR_INDIAN_STOCKS } from '../data/mockData';
import api from '../services/api';

export const DashboardPage: React.FC = () => {
  const {
    virtualCash,
    totalPortfolioValue,
    totalInvested,
    unrealizedPnL,
    unrealizedPnLPercent,
    dayPnL,
    positions,
    behavioralScore,
    assessment,
    squareOffPosition,
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
  const timeGreeting = currentHour < 12 ? 'Good morning.' : currentHour < 17 ? 'Good afternoon.' : 'Good evening.';

  // State for Portfolio Chart timeframe
  const [portfolioTimeframe, setPortfolioTimeframe] = useState<'1W' | '1M' | '3M' | 'ALL'>('1M');

  // Check user activity for Section 4 AI Behavioral Insight
  const hasUserActivity = positions.length > 0 || orderHistory.length > 0;

  // Calculate sector concentration if positions exist
  const reliancePosition = positions.find(p => p.symbol === 'RELIANCE');
  const reliancePercent = reliancePosition && totalInvested > 0
    ? ((reliancePosition.currentValue / totalInvested) * 100).toFixed(1)
    : null;

  // ===========================================================================
  // BEGINNER MODE DASHBOARD (Low Cognitive Load, Plain English, Progressive)
  // ===========================================================================
  if (experienceMode === 'beginner') {
    return (
      <div className="space-y-8 max-w-5xl mx-auto pb-10">
        {/* A. Welcome Section */}
        <div className="rounded-3xl bg-gradient-to-br from-[#101720] via-[#151F29] to-[#090D12] border border-white/10 p-6 sm:p-8 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F1EB] tracking-tight">
            Welcome back. Let&apos;s build your investing knowledge one step at a time.
          </h1>
          <p className="text-sm text-[#A5B0BB] max-w-2xl">
            Learn how investing works, practise with virtual money, and improve your decisions without risking real money.
          </p>
        </div>

        {/* Guided First-Run 3-Step Checklist */}
        {isFirstRun && (
          <Card className="p-6 bg-[#101720] border-[#31B89A]/30 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F3F1EB]">Getting Started Checklist (3 Quick Steps)</h2>
              <span className="text-xs font-mono text-[#31B89A]">Virtual Learning Only</span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { key: 'assess', title: '1. Discover Your Investor Profile', desc: 'Helps tailor learning to your experience. Not a financial qualification.', cta: 'Take the 2-minute assessment', route: '/onboarding', done: hasAssessmentDone },
                { key: 'lesson', title: '2. Learn One Essential Concept', desc: 'Understand what stocks are and how investing risk works.', cta: 'Start Your First Lesson', route: '/academy', done: hasLessonDone },
                { key: 'trade', title: '3. Make Your First Virtual Investment', desc: 'Uses virtual money only — no real money is involved.', cta: 'Try Paper Trading', route: '/simulator', done: hasSimActivity },
              ].map((step) => (
                <div key={step.key} className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between ${step.done ? 'bg-[#31B89A]/10 border-[#31B89A]/40' : 'bg-[#090D12] border-white/10'}`}>
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-[#F3F1EB] flex items-center justify-between">
                      <span>{step.title}</span>
                      {step.done && <CheckCircle2 size={15} className="text-[#31B89A]" />}
                    </div>
                    <p className="text-xs text-[#A5B0BB] leading-relaxed">{step.desc}</p>
                  </div>
                  {!step.done && !skippedSteps.includes(step.key) && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button variant="primary" size="sm" onClick={() => navigate(step.route)} className="text-xs flex-1">
                        {step.cta}
                      </Button>
                      <button type="button" onClick={() => skipStep(step.key)} className="text-[11px] text-[#A5B0BB] hover:text-white px-2">
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
        <Card className="p-6 bg-[#101720] border-[#31B89A]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#31B89A] font-semibold">
              Your Next Step
            </span>
            <h2 className="text-lg font-bold text-[#F3F1EB]">{nextStep.title}</h2>
            <p className="text-xs text-[#A5B0BB]">{nextStep.desc}</p>
          </div>
          <Button variant="primary" size="md" onClick={() => navigate(nextStep.route)} icon={<ArrowRight size={16} />} iconPosition="right" className="shrink-0 font-bold">
            {nextStep.cta}
          </Button>
        </Card>

        {/* C. Portfolio Snapshot (3 Beginner Numbers) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#F3F1EB] uppercase tracking-wider">Virtual Portfolio Snapshot</h2>
            <button
              type="button"
              onClick={() => setShowExpandedPortfolio((v) => !v)}
              className="text-xs font-semibold text-[#C9A96E] hover:underline"
            >
              {showExpandedPortfolio ? 'Hide Details' : 'Expand Portfolio Details'}
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-[#101720] border-white/10 space-y-1">
              <div className="text-xs text-[#A5B0BB]">Total Virtual Money</div>
              <div className="text-2xl font-extrabold font-mono text-[#F3F1EB]">
                ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-[#A5B0BB]">Your demo cash + stock value</div>
            </Card>
            <Card className="p-5 bg-[#101720] border-white/10 space-y-1">
              <div className="text-xs text-[#A5B0BB] flex items-center">
                Today&apos;s Change
                <BeginnerTooltip
                  term="Today's Change (P&L)"
                  definition="Profit and Loss. It shows how much your virtual investments have gained or lost today."
                  example="If ₹1,000 grows to ₹1,020, Today's Change is +₹20."
                />
              </div>
              <div className={`text-2xl font-extrabold font-mono ${dayPnL >= 0 ? 'text-[#31B89A]' : 'text-[#F16D75]'}`}>
                {dayPnL >= 0 ? '+' : ''}₹{dayPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-[#A5B0BB]">Simulated daily movement</div>
            </Card>
            <Card className="p-5 bg-[#101720] border-white/10 space-y-1">
              <div className="text-xs text-[#A5B0BB]">Available Cash</div>
              <div className="text-2xl font-extrabold font-mono text-[#31B89A]">
                ₹{virtualCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-[#A5B0BB]">Ready to practise with</div>
            </Card>
          </div>

          {showExpandedPortfolio && (
            <Card className="p-5 bg-[#101720] border-white/10 space-y-3">
              <div className="text-xs font-bold text-[#F3F1EB]">Your Practice Holdings ({positions.length})</div>
              {positions.length === 0 ? (
                <p className="text-xs text-[#A5B0BB]">No virtual stocks held yet. Try Paper Trading when ready.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {positions.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-[#090D12] border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{p.symbol}</div>
                        <div className="text-[#A5B0BB]">{p.quantity} shares • {p.sector}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-white">₹{p.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        <div className={p.unrealizedPnL >= 0 ? 'text-[#31B89A]' : 'text-[#F16D75]'}>
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

        {/* Your Progress */}
        <Card className="p-5 bg-[#101720] border-white/10 space-y-3">
          <div className="text-sm font-bold text-[#F3F1EB] flex items-center justify-between">
            <span>Your Progress</span>
            <button type="button" onClick={() => navigate('/my-progress')} className="text-xs text-[#C9A96E] hover:underline">
              View Full Progress →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-[#090D12] border border-white/10">
              <div className="text-xl font-bold font-mono text-[#31B89A]">{gamStats.skills}</div>
              <div className="text-[11px] text-[#A5B0BB]">Skills Completed</div>
            </div>
            <div className="p-3 rounded-xl bg-[#090D12] border-white/10">
              <div className="text-xl font-bold font-mono text-[#F5B942]">{gamStats.streak}d</div>
              <div className="text-[11px] text-[#A5B0BB]">Learning Streak</div>
            </div>
            <div className="p-3 rounded-xl bg-[#090D12] border border-white/10">
              <div className="text-xl font-bold font-mono text-[#F3F1EB]">{gamStats.contests}</div>
              <div className="text-[11px] text-[#A5B0BB]">Badges Earned</div>
            </div>
          </div>
        </Card>

        {/* F. Market at a Glance (Max 3 Simplified Indicators) */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#F3F1EB] uppercase tracking-wider">Market at a Glance</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {INDIAN_INDICES.slice(0, 3).map((idx) => (
              <Card key={idx.name} className="p-4 bg-[#101720] border-white/10 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F3F1EB]">{idx.name}</span>
                  <span className={`font-mono font-semibold ${idx.changePercent >= 0 ? 'text-[#31B89A]' : 'text-[#F16D75]'}`}>
                    {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent}%
                  </span>
                </div>
                <div className="text-lg font-mono font-bold text-[#F3F1EB]">{idx.value.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-[#A5B0BB]">
                  Tracks top Indian companies to show overall market mood.
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Explore MINDMARK (5 Clean Cards) */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#F3F1EB] uppercase tracking-wider">Explore MINDMARK</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { title: 'Learn', desc: 'Build your investing knowledge step by step.', route: '/academy', icon: BookOpen },
              { title: 'Practice', desc: 'Try investing decisions using virtual money.', route: '/simulator', icon: CandlestickChart },
              { title: 'AI Buddy', desc: 'Get finance concepts explained in simple language.', route: '/ai-buddy', icon: Bot },
              { title: 'Markets', desc: 'Explore stocks and understand market movements.', route: '/markets', icon: TrendingUp },
              { title: 'Behavioral Insights', desc: 'Discover patterns in your simulated decisions.', route: '/behavioral-insights', icon: BrainCircuit },
            ].map((m) => (
              <button
                key={m.title}
                type="button"
                onClick={() => navigate(m.route)}
                className="p-4 rounded-2xl bg-[#101720] border border-white/10 hover:border-[#31B89A]/40 text-left space-y-2 transition"
              >
                <m.icon size={18} className="text-[#31B89A]" />
                <div className="text-sm font-bold text-[#F3F1EB]">{m.title}</div>
                <p className="text-xs text-[#A5B0BB] leading-relaxed">{m.desc}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-8">
      {/* ========================================================================= */}
      {/* TOP HEADER: Personalized Greeting, Market Status, Profile Level           */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="primary" dot size="sm">
              NSE / BSE SESSION ACTIVE
            </Badge>
            <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
              IST 09:15 – 15:30 Regular Market Hours • Educational Sandbox
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            {timeGreeting}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary">
              Ready to make smarter decisions?
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            "Your progress is built by the decisions you make, not just the returns you earn."
          </p>
        </div>

        {/* Current Learning Level & Learning Path Badge */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          <div className="p-3 rounded-xl bg-surface border border-primary/25 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Compass size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono text-text-muted uppercase block">
                Learning Rank
              </span>
              <span className="font-mono font-bold text-xs text-text-primary block truncate max-w-[150px]">
                {assessment?.experienceLevel || 'Level 1: Market Explorer'}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/ai-buddy')}
            className="text-xs font-mono shadow-glow"
          >
            <Bot size={14} className="mr-1.5" />
            Ask AI Buddy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/behavioral-insights')}
            className="text-xs font-mono hidden sm:inline-flex"
          >
            Investor Fingerprint
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LEARNING PROGRESS SECTION                                              */}
      {/* ========================================================================= */}
      <Card variant="elevated" className="p-5 sm:p-6 space-y-4 border-secondary/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-secondary" />
            <h2 className="font-bold text-sm text-text-primary tracking-tight">
              Learning Mastery & Curriculum Progress
            </h2>
          </div>
          <span className="text-[11px] font-mono text-secondary font-semibold">
            Track 2 of 5 Active • 5 of 20 Lessons Completed (25%)
          </span>
        </div>

        {/* 4 Learning Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-surface border border-border/60">
            <span className="text-[10px] text-text-muted uppercase block">Financial Knowledge</span>
            <span className="text-lg font-bold text-primary text-tabular mt-0.5 block">
              {assessment?.knowledgeScore || 75}%
            </span>
            <span className="text-[10px] text-text-muted">Diagnostic accuracy</span>
          </div>

          <div className="p-3 rounded-xl bg-surface border border-border/60">
            <span className="text-[10px] text-text-muted uppercase block">Lessons Completed</span>
            <span className="text-lg font-bold text-secondary text-tabular mt-0.5 block">
              5 / 20
            </span>
            <span className="text-[10px] text-text-muted">15 remaining</span>
          </div>

          <div className="p-3 rounded-xl bg-surface border border-border/60">
            <span className="text-[10px] text-text-muted uppercase block">Active Streak</span>
            <span className="text-lg font-bold text-warning text-tabular mt-0.5 flex items-center gap-1">
              <Flame size={16} /> 3 Days
            </span>
            <span className="text-[10px] text-text-muted">Daily habit locked</span>
          </div>

          <div className="p-3 rounded-xl bg-surface border border-border/60">
            <span className="text-[10px] text-text-muted uppercase block">Current Rank</span>
            <span className="text-lg font-bold text-text-primary text-tabular mt-0.5 block truncate">
              {assessment?.assignedPath || 'BEGINNER'}
            </span>
            <span className="text-[10px] text-text-muted">Adaptive path</span>
          </div>
        </div>

        {/* Next Lesson Callout */}
        <div className="p-4 rounded-xl bg-surface border border-secondary/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-secondary/10 text-secondary flex-shrink-0 mt-0.5">
              <Zap size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-secondary font-bold">Up Next in Curriculum</span>
                <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                  <Clock size={11} /> 12 mins
                </span>
              </div>
              <h4 className="font-bold text-sm text-text-primary mt-0.5">
                Track 2: Demystifying Candlesticks & False Breakouts
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Learn to recognize fake breakout volume traps before placing orders.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/learn')}
            icon={<ArrowRight size={14} />}
            iconPosition="right"
            className="flex-shrink-0 w-full sm:w-auto"
          >
            Resume Lesson
          </Button>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. VIRTUAL PORTFOLIO SECTION (Clearly labeled Simulated / Virtual)         */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary tracking-tight">
              Virtual Paper Portfolio
            </h2>
            <Badge variant="warning" size="sm">SIMULATED CAPITAL</Badge>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Initial Ledger: ₹10,00,000.00
          </span>
        </div>

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Virtual Net Worth"
            value={`₹${totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subValue="Cash + Holdings"
            change={((totalPortfolioValue - 1000000) / 1000000) * 100}
            changeLabel="overall return"
            tooltip="Total simulated net worth combining liquid cash balance and market value of virtual shares."
            variant="elevated"
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
            subValue={`${((virtualCash / totalPortfolioValue) * 100).toFixed(1)}% liquid`}
            tooltip="Simulated unallocated INR available to buy fresh shares."
          />

          <StatCard
            label="Today's Virtual P&L"
            value={`${dayPnL >= 0 ? '+' : ''}₹${dayPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            change={(dayPnL / (totalPortfolioValue - dayPnL)) * 100}
            changeLabel="today"
            tooltip="Intraday simulated profit/loss across all held assets."
          />
        </div>

        {/* Portfolio Performance Chart vs NIFTY 50 Benchmark */}
        <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
                Simulated Equity Performance Curve
              </span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-base font-bold font-mono text-primary">
                  MINDMARK Portfolio (+{((totalPortfolioValue - 1000000) / 1000000 * 100).toFixed(2)}%)
                </span>
                <span className="text-xs font-mono text-text-muted">
                  vs NIFTY 50 (+4.20%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
              {(['1W', '1M', '3M', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setPortfolioTimeframe(tf)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    portfolioTimeframe === tf
                      ? 'bg-primary text-background font-bold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Performance Chart */}
          <div className="h-44 w-full bg-background/50 rounded-xl p-4 flex flex-col justify-between border border-border/40 relative overflow-hidden">
            <div className="flex justify-between text-[11px] font-mono text-text-muted">
              <span className="text-primary flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-primary" /> Your Virtual Portfolio
              </span>
              <span className="text-secondary flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-secondary stroke-dashed" /> NIFTY 50 Benchmark
              </span>
            </div>

            <svg className="w-full h-24 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 80">
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#31B89A" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#31B89A" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Benchmark NIFTY 50 line */}
              <path
                d="M0,60 C120,55 240,48 360,40 L500,32"
                fill="none"
                stroke="#C9A96E"
                strokeWidth="1.8"
                strokeDasharray="4,4"
              />
              {/* Portfolio Performance line */}
              <path
                d="M0,65 C100,50 200,58 320,30 L500,12"
                fill="none"
                stroke="#31B89A"
                strokeWidth="2.5"
              />
              <path
                d="M0,65 C100,50 200,58 320,30 L500,12 L500,80 L0,80 Z"
                fill="url(#dashGrad)"
              />
              <circle cx="500" cy="12" r="4" fill="#31B89A" />
            </svg>

            <div className="flex justify-between text-[10px] font-mono text-text-muted">
              <span>Nov 01</span>
              <span>Nov 10</span>
              <span>Nov 18</span>
              <span>Today (Nov 24)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. TODAY'S LEARNING MISSION & 4. AI BEHAVIORAL INSIGHT                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Learning Mission (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card variant="elevated" className="p-5 sm:p-6 h-full flex flex-col justify-between border-primary/25">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <span className="text-[10px] font-mono uppercase text-primary font-bold flex items-center gap-1.5">
                  <Target size={14} /> Today's Learning Mission
                </span>
                <Badge variant="primary" size="sm">Mission #04</Badge>
              </div>

              <h3 className="text-lg font-bold text-text-primary mt-3">
                The Concentration Risk Audit
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Learn why diversification matters. Check whether your current virtual holdings exceed 35% in any single industry or company.
              </p>

              {/* Mission Checkpoints */}
              <div className="mt-4 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 size={14} /> Review sector breakdown in portfolio analytics
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="w-3.5 h-3.5 rounded-full border border-border" /> Place 1 diversifying simulated trade with a pre-set stop loss
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 pt-3 border-t border-border/40">
                <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
                  <span>Mission Progress</span>
                  <span className="text-primary font-bold">1 of 2 Complete (50%)</span>
                </div>
                <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '50%' }} />
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/portfolio')}
              className="mt-6 w-full"
              icon={<ArrowRight size={14} />}
              iconPosition="right"
            >
              Audit Portfolio Concentration
            </Button>
          </Card>
        </div>

        {/* 4. AI Behavioral Insight (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card variant="elevated" className="p-5 sm:p-6 h-full flex flex-col justify-between border-warning/25">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <span className="text-[10px] font-mono uppercase text-warning font-bold flex items-center gap-1.5">
                  <BrainCircuit size={15} /> AI Behavioral Guardian
                </span>
                <span className="text-xs font-mono font-bold text-primary">
                  HEALTH SCORE: {behavioralScore.overallHealth}/100
                </span>
              </div>

              {hasUserActivity ? (
                <div className="mt-3 space-y-3">
                  <h3 className="text-lg font-bold text-text-primary">
                    {reliancePercent && parseFloat(reliancePercent) > 35
                      ? 'Concentration Warning in Energy Sector'
                      : 'High Stop-Loss Adherence Observed'}
                  </h3>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {reliancePercent && parseFloat(reliancePercent) > 35 ? (
                      <>
                        You currently have <strong className="text-warning">{reliancePercent}%</strong> of your virtual portfolio allocated to RELIANCE (Energy & Retail). When a single company exceeds 35%, company-specific shocks overpower market diversification.
                      </>
                    ) : (
                      <>
                        You have pre-set stop loss limits on 100% of your open holdings. You resisted the impulse to revenge-trade after cutting your loss on HDFC Bank.
                      </>
                    )}
                  </p>

                  <div className="p-3 rounded-xl bg-surface border border-warning/20 text-xs">
                    <span className="font-semibold text-warning font-mono flex items-center gap-1.5">
                      <Sparkles size={12} /> Actionable Habit Advice:
                    </span>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                      {reliancePercent && parseFloat(reliancePercent) > 35
                        ? 'Before adding more shares, deploy fresh cash into IT, FMCG, or Banking to keep individual assets below 30%.'
                        : 'Keep adhering to your pre-committed exit rules. Preserving emotional capital is your competitive advantage.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-text-muted">
                    Your behavioral insights will appear after you complete a few simulations.
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
              className="mt-6 w-full text-xs font-mono"
            >
              Full Behavioral Diagnostics →
            </Button>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MARKET SNAPSHOT (Educational Feed, Clearly Labeled)                    */}
      {/* ========================================================================= */}
      <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <h2 className="font-bold text-sm text-text-primary tracking-tight">
              Educational Market Snapshot
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/25">
            SIMULATED FEED • EDUCATIONAL PRICING (NOT LIVE BROKER STREAM)
          </span>
        </div>

        {/* Index Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {INDIAN_INDICES.map((idx) => {
            const isUp = idx.change >= 0;
            return (
              <div key={idx.name} className="p-3.5 rounded-xl bg-surface border border-border/60">
                <div className="flex justify-between items-center text-xs font-mono text-text-muted">
                  <span>{idx.name}</span>
                  <span className={`text-[10px] font-bold ${isUp ? 'text-primary' : 'text-danger'}`}>
                    {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-text-primary text-tabular mt-1">
                  {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tracked Stocks Grid */}
        <div className="pt-2">
          <span className="text-[11px] font-mono uppercase text-text-muted block mb-2">
            Selected Benchmark Equities (NSE)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {POPULAR_INDIAN_STOCKS.slice(0, 4).map((stk) => {
              const isUp = stk.change >= 0;
              return (
                <div
                  key={stk.symbol}
                  onClick={() => navigate('/simulator')}
                  className="p-3.5 rounded-xl bg-surface hover:bg-surface-elevated/70 border border-border/60 hover:border-primary/40 cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-xs text-text-primary group-hover:text-primary transition-colors">
                        {stk.symbol}
                      </span>
                      <span className="text-[10px] text-text-muted block truncate max-w-[130px]">
                        {stk.name}
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-text-primary text-tabular">
                        ₹{stk.price.toFixed(2)}
                      </div>
                      <div className={`text-[10px] font-semibold ${isUp ? 'text-primary' : 'text-danger'}`}>
                        {isUp ? '+' : ''}{stk.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 6. QUICK ACTIONS SECTION (4 Educational High-Priority Tiles)              */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h2 className="text-sm font-mono uppercase tracking-wider text-text-muted">
          Recommended Learning Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/simulator')}
            className="p-5 rounded-2xl bg-surface hover:bg-surface-elevated border border-border hover:border-primary/50 cursor-pointer transition-all group flex flex-col justify-between shadow-sm"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <CandlestickChart size={20} />
              </div>
              <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                Start Paper Trading
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Execute virtual trades on Dalal Street equities with realistic spreads and zero rupee risk.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-mono text-primary flex items-center justify-between">
              <span>Open Desk</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => navigate('/learn')}
            className="p-5 rounded-2xl bg-surface hover:bg-surface-elevated border border-border hover:border-secondary/50 cursor-pointer transition-all group flex flex-col justify-between shadow-sm"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold text-sm text-text-primary group-hover:text-secondary transition-colors">
                Continue Learning
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Resume structured curriculum tracks covering candlesticks, P/E ratios, and the F&O reality check.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-mono text-secondary flex items-center justify-between">
              <span>5 Tracks Available</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => navigate('/market-replay')}
            className="p-5 rounded-2xl bg-surface hover:bg-surface-elevated border border-border hover:border-warning/50 cursor-pointer transition-all group flex flex-col justify-between shadow-sm"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center group-hover:scale-105 transition-transform">
                <History size={20} />
              </div>
              <h3 className="font-bold text-sm text-text-primary group-hover:text-warning transition-colors">
                Replay a Market Event
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Step into the crisis time-machine: test your nerves during the March 2020 COVID crash.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-mono text-warning flex items-center justify-between">
              <span>Crash Simulator</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => navigate('/portfolio')}
            className="p-5 rounded-2xl bg-surface hover:bg-surface-elevated border border-border hover:border-primary/50 cursor-pointer transition-all group flex flex-col justify-between shadow-sm"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <PieIcon size={20} />
              </div>
              <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                Analyze My Portfolio
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Audit your sector allocation, benchmark alpha, and review your trading decisions log.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-mono text-primary flex items-center justify-between">
              <span>Full Analytics</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
