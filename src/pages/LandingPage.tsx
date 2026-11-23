import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  BrainCircuit,
  CandlestickChart,
  History,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  Lock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  PieChart as PieIcon,
  HelpCircle,
  Layers,
  Info,
  Clock,
  Flame,
  Award,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { INDIAN_INDICES, POPULAR_INDIAN_STOCKS } from '../data/mockData';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // State for interactive hero chart timeframe
  const [heroTimeframe, setHeroTimeframe] = useState<'1D' | '1W' | '1M'>('1D');

  // State for Section 2: Problem interactive tabs
  const [activeProblem, setActiveProblem] = useState<number>(0);

  // State for Section 3: How MINDMARK Works 4-step journey
  const [activeStep, setActiveStep] = useState<number>(1);

  // State for Section 5: Risk Education Position Sizing Calculator
  const [calcCapital, setCalcCapital] = useState<number>(100000); // ₹1,00,000
  const [calcRiskPercent, setCalcRiskPercent] = useState<number>(1.5); // 1.5%
  const [calcStopLossPercent, setCalcStopLossPercent] = useState<number>(3.0); // 3%

  const maxRiskRupees = (calcCapital * calcRiskPercent) / 100;
  const maxPositionSize = (maxRiskRupees / (calcStopLossPercent / 100));

  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-primary/20 selection:text-primary overflow-x-hidden font-sans">
      {/* Top Banner Disclaimer */}
      <div className="bg-surface border-b border-border/80 px-4 py-2 text-center text-xs font-mono text-text-secondary flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="truncate">
          MINDMARK EDUCATIONAL PLATFORM • STRICTLY SIMULATED CAPITAL • ZERO REAL-MONEY ADVISORY OR RISK
        </span>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
              <svg className="w-5 h-5 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl font-mono tracking-wider text-text-primary group-hover:text-primary transition-colors">
                  MINDMARK
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/25">
                  SIMULATOR
                </span>
              </div>
              <span className="text-[10px] text-text-muted font-mono -mt-1 hidden sm:block">
                Learn the market. Train your decisions.
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-mono uppercase tracking-wider text-text-secondary font-medium">
            <a href="#problems" className="hover:text-primary transition-colors">The Problem</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#features" className="hover:text-primary transition-colors">Core Features</a>
            <a href="#risk-education" className="hover:text-primary transition-colors">Risk Education</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auth')}
              className="text-xs font-mono"
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/simulator')}
              icon={<ArrowRight size={14} />}
              iconPosition="right"
              className="text-xs font-mono font-bold"
            >
              Start Your Simulation
            </Button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Cinematic, Asymmetric Grid with Live Preview Visual)       */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-20 md:pt-16 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[350px] bg-primary/10 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-secondary/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Cinematic Headline & Mission Statement (6 cols) */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-primary/30 text-primary text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>AI-Powered Financial Market Learning Simulator</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.12]">
              Your first market mistake <br />
              shouldn't{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#5eecd0] to-primary">
                cost you money.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl font-normal">
              Practice with real market movements. Build your investing knowledge. Discover your trading habits. All without risking a single rupee.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/simulator')}
                icon={<CandlestickChart size={18} />}
                className="font-bold text-sm"
              >
                Start Your Simulation
              </Button>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="font-mono text-xs w-full sm:w-auto"
                  icon={<Play size={14} />}
                >
                  Explore How It Works
                </Button>
              </a>
            </div>

            {/* Micro trust indicators */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-mono text-text-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-primary" /> ₹1,00,000 Demo Capital
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-primary" /> No Demat Needed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-primary" /> Indian Market Context
              </span>
            </div>
          </div>

          {/* Right Column: Floating Live-Looking Simulation Preview Visual (6 cols) */}
          <div className="lg:col-span-6 relative">
            {/* Outer Terminal Frame */}
            <div className="relative rounded-2xl bg-surface border border-border/80 shadow-2xl p-5 sm:p-6 backdrop-blur-xl">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-primary/70" />
                  </div>
                  <span className="text-[11px] font-mono text-text-muted ml-2">
                    MINDMARK LIVE DESK • NSE SIMULATOR
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/25">
                  SIMULATION DATA • DEMO ONLY
                </span>
              </div>

              {/* Virtual Balance & Today's Metric */}
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <span className="text-[11px] font-mono uppercase text-text-muted block">
                    Virtual Demo Balance
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-primary text-tabular mt-0.5">
                    ₹1,00,000.00
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[11px] text-text-muted block">Simulated Intraday P&L</span>
                  <span className="text-xs font-semibold text-primary flex items-center justify-end gap-1">
                    <TrendingUp size={13} /> +₹2,480.00 (+2.48%)
                  </span>
                </div>
              </div>

              {/* Market Ticker Strip inside the preview */}
              <div className="mt-4 p-2.5 rounded-xl bg-background/70 border border-border/60 flex items-center justify-between text-xs font-mono overflow-x-auto gap-3">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-text-muted">NIFTY 50:</span>
                  <span className="font-bold text-text-primary">24,842.15</span>
                  <span className="text-primary text-[10px]">+0.60%</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-text-muted">RELIANCE:</span>
                  <span className="font-bold text-text-primary">₹2,985.40</span>
                  <span className="text-primary text-[10px]">+1.09%</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-text-muted">TCS:</span>
                  <span className="font-bold text-text-primary">₹4,180.25</span>
                  <span className="text-primary text-[10px]">+1.18%</span>
                </div>
              </div>

              {/* Dynamic SVG Portfolio Chart with timeframes */}
              <div className="mt-4 p-4 rounded-xl bg-surface-elevated border border-border/50 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                  <span className="text-text-muted">Equity Growth Curve (Simulated)</span>
                  <div className="flex gap-1 bg-surface p-0.5 rounded border border-border">
                    {(['1D', '1W', '1M'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setHeroTimeframe(tf)}
                        className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                          heroTimeframe === tf
                            ? 'bg-primary text-background font-bold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animated Chart SVG */}
                <div className="h-28 w-full relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 90">
                    <defs>
                      <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#45D6B5" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#45D6B5" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,75 C70,60 120,70 180,45 C240,25 320,38 400,15"
                      fill="none"
                      stroke="#45D6B5"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M0,75 C70,60 120,70 180,45 C240,25 320,38 400,15 L400,90 L0,90 Z"
                      fill="url(#heroGradient)"
                    />
                    <circle cx="400" cy="15" r="4" fill="#45D6B5" className="animate-ping opacity-75" />
                    <circle cx="400" cy="15" r="3.5" fill="#45D6B5" />
                  </svg>
                </div>
              </div>

              {/* Simulated Trade Execution Card */}
              <div className="mt-3 p-3 rounded-xl bg-background/80 border border-primary/20 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-text-primary">BUY EXECUTED: TCS (15 Shares)</span>
                    <span className="block text-[10px] text-text-muted">₹4,180.25 • Total ₹62,703.75 • T+1 Settlement</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  FILLED
                </span>
              </div>

              {/* Risk Indicator & AI Behavioral Insight Bottom Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {/* Risk Indicator Card */}
                <div className="p-3 rounded-xl bg-surface-elevated border border-warning/20 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono text-warning">
                    <span className="flex items-center gap-1">
                      <Shield size={12} /> Risk Exposure
                    </span>
                    <span className="font-bold">18% (Controlled)</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden mt-1.5">
                    <div className="bg-warning h-full rounded-full" style={{ width: '18%' }} />
                  </div>
                  <span className="text-[10px] text-text-muted block mt-1">
                    Pre-set Stop Loss: -2.5% • Diversified in 4 sectors
                  </span>
                </div>

                {/* AI Behavioral Insight Card */}
                <div className="p-3 rounded-xl bg-surface-elevated border border-secondary/25 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-secondary font-semibold">
                    <Sparkles size={12} /> AI Behavioral Guardian
                  </div>
                  <p className="text-[10px] text-text-secondary mt-1 leading-snug">
                    "Pre-set stop loss configured before entering. Zero FOMO gap-chasing detected."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SECTION 2 — THE PROBLEM                                                */}
      {/* ========================================================================= */}
      <section id="problems" className="py-20 bg-surface/40 border-t border-b border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-warning font-semibold">
              The Real Cost of Inexperience
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mt-2">
              Most people enter the market. <br />
              <span className="text-text-secondary">Few understand what they're entering.</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-3 max-w-xl mx-auto leading-relaxed">
              Every day, thousands of new retail investors in India open Demat accounts, only to lose substantial capital in their first 90 days due to predictable emotional traps.
            </p>
          </div>

          {/* Interactive Problem Matrix Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Problem 1 */}
            <div
              onClick={() => setActiveProblem(0)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                activeProblem === 0
                  ? 'bg-surface-elevated border-warning/50 shadow-glow'
                  : 'bg-surface border-border hover:border-text-secondary/40'
              }`}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-mono font-bold text-lg">
                  01
                </div>
                <h3 className="text-lg font-bold text-text-primary">Following the crowd</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Buying something only because everyone else on social media, Telegram groups, or news channels is talking about it.
                </p>

                {/* Micro illustration panel */}
                <div className="p-3.5 rounded-xl bg-background/60 border border-border/50 text-[11px] font-mono space-y-2">
                  <div className="flex justify-between text-text-muted">
                    <span>Retail Sentiment Buzz:</span>
                    <span className="text-danger font-bold">98% Extreme Greed</span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                    <div className="bg-danger h-full rounded-full" style={{ width: '95%' }} />
                  </div>
                  <span className="text-text-muted block text-[10px]">
                    Result: Buying at peak euphoria right before institutional distribution and a 30% collapse.
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/40 text-[11px] font-mono text-warning flex items-center justify-between">
                <span>The FOMO Trap</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Problem 2 */}
            <div
              onClick={() => setActiveProblem(1)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                activeProblem === 1
                  ? 'bg-surface-elevated border-danger/50 shadow-glow'
                  : 'bg-surface border-border hover:border-text-secondary/40'
              }`}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center font-mono font-bold text-lg">
                  02
                </div>
                <h3 className="text-lg font-bold text-text-primary">Emotional decisions</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Panic selling during a market fall or buying out of sudden euphoria and excitement without an exit thesis.
                </p>

                {/* Micro illustration panel */}
                <div className="p-3.5 rounded-xl bg-background/60 border border-border/50 text-[11px] font-mono space-y-2">
                  <div className="flex justify-between text-text-muted">
                    <span>Cycle of Emotional Ruin:</span>
                    <span className="text-warning">Panic & Relief</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border/40 text-[10px] text-text-secondary leading-snug">
                    "It dropped 5%, I panicked and sold at the low. An hour later, the market rebounded +8%."
                  </div>
                  <span className="text-text-muted block text-[10px]">
                    Result: Locking in temporary paper swings into permanent capital destruction.
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/40 text-[11px] font-mono text-danger flex items-center justify-between">
                <span>The Fear-Greed Cycle</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Problem 3 */}
            <div
              onClick={() => setActiveProblem(2)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                activeProblem === 2
                  ? 'bg-surface-elevated border-secondary/50 shadow-glow'
                  : 'bg-surface border-border hover:border-text-secondary/40'
              }`}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-mono font-bold text-lg">
                  03
                </div>
                <h3 className="text-lg font-bold text-text-primary">Learning without practice</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Watching dozens of YouTube finance videos without actually understanding how real-time decisions affect money.
                </p>

                {/* Micro illustration panel */}
                <div className="p-3.5 rounded-xl bg-background/60 border border-border/50 text-[11px] font-mono space-y-2">
                  <div className="flex justify-between text-text-muted">
                    <span>Theory vs Experience:</span>
                    <span className="text-secondary font-bold">The Illusion of Skill</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border/40 text-[10px] text-text-secondary leading-snug">
                    Knowing what a P/E ratio is does not prevent you from freezing when your real money drops ₹15,000 in 10 minutes.
                  </div>
                  <span className="text-text-muted block text-[10px]">
                    Result: Overconfidence followed by complete paralysis during live volatility.
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/40 text-[11px] font-mono text-secondary flex items-center justify-between">
                <span>Passive Theory Trap</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION 3 — HOW MINDMARK WORKS (Interactive 4-Step Journey)            */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">
            The Learning Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mt-2">
            How MINDMARK Works
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-2">
            A structured 4-step loop designed to transform inexperienced beginners into disciplined, risk-aware market participants.
          </p>
        </div>

        {/* 4 Steps Interactive Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { step: 1, label: '01 — LEARN', desc: 'Understand concepts in simple language.' },
            { step: 2, label: '02 — PRACTICE', desc: 'Make virtual investments using simulated money.' },
            { step: 3, label: '03 — REFLECT', desc: 'AI analyzes your decisions and trading habits.' },
            { step: 4, label: '04 — IMPROVE', desc: 'Learn from mistakes & build better skills.' }
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setActiveStep(item.step)}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeStep === item.step
                  ? 'bg-surface-elevated border-primary/50 shadow-glow'
                  : 'bg-surface border-border hover:border-text-secondary/40 text-text-secondary'
              }`}
            >
              <span className={`font-mono font-bold text-xs block ${
                activeStep === item.step ? 'text-primary' : 'text-text-muted'
              }`}>
                {item.label}
              </span>
              <p className="text-[11px] text-text-secondary mt-1 font-sans leading-snug">
                {item.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Dynamic Interactive Stage for the Selected Step */}
        <Card variant="elevated" className="p-6 sm:p-8 border-primary/30">
          {activeStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="primary" size="sm">01 — LEARN</Badge>
                <h3 className="text-2xl font-bold text-text-primary">
                  Understand concepts in simple language without Wall Street jargon.
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Dalal Street shouldn't feel like an incomprehensible club. Our bite-sized lessons break down what happens between clicking "Buy" and shares settling into your CDSL/NSDL depository under India's T+1 settlement rules.
                </p>
                <div className="space-y-2 pt-2 text-xs font-mono text-text-primary">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-primary" /> What is an equity share? Owning a piece of an Indian enterprise
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-primary" /> P/E Ratio deconstructed: when 25x is cheap vs a value trap
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-primary" /> Why SEBI mandates strict disclosure standards
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={() => navigate('/learn')}>
                    Explore Course Tracks →
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-6 p-5 rounded-2xl bg-surface border border-border/80">
                <div className="text-xs font-mono text-text-muted pb-3 border-b border-border/50 flex justify-between">
                  <span>Interactive Concept Checkpoint</span>
                  <span className="text-primary">+50 XP</span>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <span className="font-bold text-text-primary block">
                    Q: If a company's stock price falls 20%, does it mean the underlying business is 20% worse?
                  </span>
                  <div className="p-3 rounded-lg bg-surface-elevated border border-primary/30 text-primary">
                    ✓ No. Stock prices fluctuate based on daily liquidity and emotion. The business value depends on earnings, debt, and cash flow.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="secondary" size="sm">02 — PRACTICE</Badge>
                <h3 className="text-2xl font-bold text-text-primary">
                  Make virtual investments using simulated money with real market movements.
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Every user starts with ₹1,00,000 in virtual capital. Place market and limit orders on leading NSE equities like Reliance, Tata Motors, TCS, and HDFC Bank. Experience realistic order books and bid-ask spreads.
                </p>
                <div className="space-y-2 pt-2 text-xs font-mono text-text-primary">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-secondary" /> ₹1,00,000 risk-free virtual balance
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-secondary" /> Practice pre-setting stop-loss orders on every trade
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-secondary" /> Calculate real-time Risk-to-Reward ratios
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="secondary" size="sm" onClick={() => navigate('/simulator')}>
                    Launch Simulator Desk →
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-6 p-5 rounded-2xl bg-surface border border-border/80 font-mono">
                <div className="flex justify-between text-xs pb-3 border-b border-border/50">
                  <span className="text-text-muted">Simulated Order Ticket</span>
                  <span className="text-primary font-bold">READY TO EXECUTE</span>
                </div>
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Stock:</span>
                    <span className="font-bold text-text-primary">RELIANCE (NSE)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Quantity:</span>
                    <span className="font-bold text-text-primary">25 Shares</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Estimated Cost:</span>
                    <span className="font-bold text-primary">₹74,635.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Risk Boundary:</span>
                    <span className="font-bold text-warning">Stop-Loss @ ₹2,920.00 (-2.1%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="warning" size="sm">03 — REFLECT</Badge>
                <h3 className="text-2xl font-bold text-text-primary">
                  AI analyzes your decisions and reveals your subconscious trading habits.
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Did you place an order right after reading a breaking headline? Did you panic and sell when a stock dipped 1.5%? Our AI behavioral engine tracks your emotional triggers and measures your FOMO resistance index.
                </p>
                <div className="space-y-2 pt-2 text-xs font-mono text-text-primary">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-warning" /> Automatic detection of revenge trading impulses
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-warning" /> Disposition Effect tracker (selling winners too early)
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-warning" /> Concentration risk warnings for single-stock bets
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="warning" size="sm" onClick={() => navigate('/behavioral-insights')}>
                    View Behavioral Engine →
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-6 p-5 rounded-2xl bg-surface border border-warning/20">
                <div className="text-xs font-mono text-warning pb-3 border-b border-border/50 flex items-center gap-1.5 font-bold">
                  <BrainCircuit size={15} /> Behavioral Diagnostic Log
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-surface-elevated border border-border/60">
                    <span className="font-bold text-text-primary block">Observed Habit: Overtrading during Lunch Hours</span>
                    <p className="text-text-muted text-[11px] mt-1">
                      You executed 4 hasty trades between 01:00 PM and 01:45 PM without waiting for technical setups.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <span className="font-bold block">Positive Discipline: Pre-committed Stop Losses</span>
                    <p className="text-[11px] mt-1">
                      100% of your open holdings have pre-defined exits. Your capital preservation score is 88/100.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="primary" size="sm">04 — IMPROVE</Badge>
                <h3 className="text-2xl font-bold text-text-primary">
                  Learn from your mistakes and build lifelong decision-making skills.
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  True confidence does not come from memorizing definitions; it comes from having experienced a 10% market correction, feeling the initial fear, adhering to your plan, and coming out disciplined.
                </p>
                <div className="space-y-2 pt-2 text-xs font-mono text-text-primary">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-primary" /> Measurable confidence scoring over 30 days
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-primary" /> Earn XP for disciplined risk-management habits
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-primary" /> Survive historical market crashes in the time-machine
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={() => navigate('/challenges')}>
                    Check Your Progress Milestones →
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-6 p-5 rounded-2xl bg-surface border border-primary/25 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-glow">
                  <Award size={28} />
                </div>
                <div>
                  <span className="font-mono text-xs text-primary uppercase font-bold">Trader Evolution</span>
                  <h4 className="text-lg font-bold text-text-primary mt-1">
                    From Impulsive Beginner to Disciplined Allocator
                  </h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                    "I used to check stock tips on WhatsApp. After MINDMARK, I only trade setups with defined risk and a 1:2 reward ratio."
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* ========================================================================= */}
      {/* 4. SECTION 4 — LARGE EDITORIAL FEATURE SHOWCASE                           */}
      {/* ========================================================================= */}
      <section id="features" className="py-24 bg-surface/30 border-t border-b border-border/70 space-y-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          {/* Feature 1: Practice in a market that moves */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">
                Feature 01 • Interactive Terminal
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                Practice in a market that moves.
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Static flashcards cannot teach you how to react when a stock spikes +4% on unexpected quarterly results or plummets on global crude oil spikes. Our paper-trading simulator uses realistic price movements and order types (Market, Limit, Stop-Loss) so you develop authentic market reflexes.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/simulator')} icon={<CandlestickChart size={14} />}>
                  Explore Paper Simulator
                </Button>
              </div>
            </div>
            <div className="lg:col-span-6 p-6 rounded-2xl bg-surface border border-border/80 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/50 text-xs font-mono">
                <span className="font-bold text-text-primary">TATA MOTORS (NSE: TATAMOTORS)</span>
                <span className="text-primary font-bold">₹978.50 (+1.91%)</span>
              </div>
              <div className="h-44 w-full bg-background rounded-xl p-3 flex flex-col justify-between border border-border/40 relative">
                <div className="flex justify-between text-[10px] font-mono text-text-muted">
                  <span>Day High: ₹984.00</span>
                  <span className="text-secondary">Intraday Volume: 11.5M</span>
                </div>
                <svg className="w-full h-24 overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 70">
                  <path d="M0,55 Q60,30 140,45 T240,20 T300,10" fill="none" stroke="#45D6B5" strokeWidth="2.5" />
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-text-muted">
                  <span>09:15 AM</span>
                  <span>15:30 PM IST</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated text-xs font-mono flex items-center justify-between">
                <span className="text-text-muted">Simulated Position: 40 Shares</span>
                <span className="text-primary font-bold">+₹732.00 (+1.91%)</span>
              </div>
            </div>
          </div>

          {/* Feature 2: Your habits reveal more than your returns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1 p-6 rounded-2xl bg-surface border border-secondary/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/50 text-xs font-mono">
                <span className="font-bold text-secondary flex items-center gap-1.5">
                  <BrainCircuit size={16} /> Behavioral Bias Diagnosis
                </span>
                <span className="text-primary font-bold">HEALTH: 86/100</span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-mono mb-1 text-text-muted">
                    <span>Overtrading Churn Risk:</span>
                    <span className="text-primary font-bold">Low (12%)</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-mono mb-1 text-text-muted">
                    <span>Panic Selling Reflex:</span>
                    <span className="text-primary font-bold">Disciplined (8%)</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '8%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-mono mb-1 text-text-muted">
                    <span>Loss-Chasing / Revenge Trading:</span>
                    <span className="text-primary font-bold">Protected (0%)</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface-elevated border border-border/50 text-[11px] text-text-secondary leading-relaxed">
                  <span className="text-secondary font-bold font-mono">AI Coach Feedback:</span> "You did not attempt to revenge-trade after cutting your loss on HDFC Bank. You adhered to your predetermined stop boundary."
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-secondary font-semibold">
                Feature 02 • Behavioral Diagnostics
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                Your habits reveal more than your returns.
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                In financial markets, a bad trader can make money temporarily due to sheer luck, and a disciplined trader can experience a temporary loss. MINDMARK evaluates the quality of your decision-making process — detecting overtrading, panic selling, poor diversification, and loss-chasing before you risk real money.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/behavioral-insights')} icon={<BrainCircuit size={14} />}>
                  Explore Psychology Engine
                </Button>
              </div>
            </div>
          </div>

          {/* Feature 3: Step into history */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-warning font-semibold">
                Feature 03 • Historical Time Machine
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                Step into history.
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Reading about the March 2020 COVID crash or the 2008 Lehman collapse in a textbook is easy. Living through it while your portfolio falls -38.4% and circuit breakers freeze trading is an entirely different emotional trial. Test yourself in real historical scenarios with actual historical price data.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/market-replay')} icon={<History size={14} />}>
                  Experience Crash Replays
                </Button>
              </div>
            </div>
            <div className="lg:col-span-6 p-6 rounded-2xl bg-surface border border-warning/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/50 text-xs font-mono">
                <span className="font-bold text-warning flex items-center gap-1.5">
                  <History size={15} /> Scenario: March 2020 COVID Crash
                </span>
                <span className="text-danger font-bold">-38.4% DROP</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                NIFTY hits lower circuit breakers. Nationwide 21-day lockdown announced. Media announces the end of globalization.
              </p>
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-warning/20 space-y-2 text-xs">
                <span className="font-bold text-text-primary font-mono block">Simulation Decision Prompt:</span>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                  <div className="p-2 rounded bg-surface border border-border text-danger">Panic Sell All</div>
                  <div className="p-2 rounded bg-surface border border-border text-text-muted">Hold Ground</div>
                  <div className="p-2 rounded bg-surface border border-primary text-primary font-bold">Buy The Dip</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-text-muted block text-right">
                Historical Reality: NIFTY surged to all-time highs within 7 months.
              </span>
            </div>
          </div>

          {/* Feature 4: Understand what moves markets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1 p-6 rounded-2xl bg-surface border border-primary/20 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/50 text-xs font-mono">
                <span className="font-bold text-text-primary">MACRO NEWS TRANSLATOR</span>
                <Badge variant="primary" size="sm">Plain English</Badge>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border/60 text-xs space-y-1.5">
                <span className="font-bold text-text-primary block">
                  Headline: "RBI Keeps Repo Rate Unchanged at 6.50% with Neutral Stance"
                </span>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  <span className="text-secondary font-semibold font-mono">Plain English:</span> The Reserve Bank of India did not change base lending rates. Your home loan EMI remains steady, and banks like HDFC preserve their profit margins.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-surface border border-border">
                  <span className="text-[10px] text-text-muted block">Banking Sector</span>
                  <span className="text-primary font-semibold">Positive (Margin Stability)</span>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <span className="text-[10px] text-text-muted block">Real Estate</span>
                  <span className="text-text-secondary font-semibold">Neutral (Steady EMIs)</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">
                Feature 04 • News & Cause-Effect
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                Understand what moves markets.
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Beginners often get confused by headlines mentioning "Bond Yields", "Fiscal Deficit", or "Quantitative Easing". MINDMARK explains live news in clear, plain English, mapping out the direct cause, sector impact, and market concepts behind every major economic event.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/news-explainer')} icon={<BookOpen size={14} />}>
                  Explore News Explainer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SECTION 5 — RISK EDUCATION                                             */}
      {/* ========================================================================= */}
      <section id="risk-education" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-danger font-semibold">
            Capital Preservation First
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mt-2">
            Before chasing returns, understand risk.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-2">
            The mathematics of financial losses are brutal and asymmetric. Survival on Dalal Street requires understanding downside limits before ever calculating upside profits.
          </p>
        </div>

        {/* 4 Risk Pillars Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Risk Viz 1: Loss vs Recovery Math (The Asymmetry of Ruin) */}
          <Card variant="elevated" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="font-bold text-sm text-text-primary">
                1. The Mathematical Asymmetry of Loss vs Recovery
              </h3>
              <Badge variant="danger" size="sm">Critical Concept</Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              When an asset drops 50%, it does not take a 50% gain to recover; it requires a <span className="text-danger font-bold">100% gain</span> just to get back to zero!
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border/40 text-text-muted text-[11px]">
                    <th className="py-2 px-2">Drawdown Loss</th>
                    <th className="py-2 px-2 text-right">Required Gain to Break Even</th>
                    <th className="py-2 px-2 text-right">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-tabular">
                  <tr>
                    <td className="py-2.5 px-2 text-danger font-semibold">-10%</td>
                    <td className="py-2.5 px-2 text-right text-text-primary">+11.1%</td>
                    <td className="py-2.5 px-2 text-right text-primary text-[11px]">Normal</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2 text-danger font-semibold">-20%</td>
                    <td className="py-2.5 px-2 text-right text-text-primary">+25.0%</td>
                    <td className="py-2.5 px-2 text-right text-primary text-[11px]">Moderate</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-2 text-danger font-semibold">-33%</td>
                    <td className="py-2.5 px-2 text-right text-warning">+50.0%</td>
                    <td className="py-2.5 px-2 text-right text-warning text-[11px]">Difficult</td>
                  </tr>
                  <tr className="bg-danger/5">
                    <td className="py-2.5 px-2 text-danger font-bold">-50%</td>
                    <td className="py-2.5 px-2 text-right text-danger font-bold">+100.0%</td>
                    <td className="py-2.5 px-2 text-right text-danger text-[11px] font-bold">Severe Ruin</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Risk Viz 2: Interactive Position Sizing & 1% Rule Simulator */}
          <Card variant="elevated" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="font-bold text-sm text-text-primary">
                2. Position Sizing & The 1% Risk Rule
              </h3>
              <Badge variant="primary" size="sm">Interactive Tool</Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Professional managers never risk more than 1-2% of their total portfolio on any single trade idea.
            </p>

            <div className="space-y-4 pt-1 text-xs">
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span className="text-text-muted">Virtual Capital:</span>
                  <span className="font-bold text-primary">₹{calcCapital.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="1000000"
                  step="25000"
                  value={calcCapital}
                  onChange={(e) => setCalcCapital(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span className="text-text-muted">Max Acceptable Risk per Trade:</span>
                  <span className="font-bold text-warning">{calcRiskPercent.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={calcRiskPercent}
                  onChange={(e) => setCalcRiskPercent(parseFloat(e.target.value))}
                  className="w-full accent-warning cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-surface border border-primary/25 grid grid-cols-2 gap-3 font-mono text-center">
                <div>
                  <span className="text-[10px] text-text-muted uppercase block">Max Permissible Loss</span>
                  <span className="text-base font-bold text-danger text-tabular mt-0.5 block">
                    ₹{maxRiskRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase block">Max Position Allocation</span>
                  <span className="text-base font-bold text-primary text-tabular mt-0.5 block">
                    ₹{maxPositionSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Educational Disclaimer Banner */}
        <div className="mt-10 p-4 rounded-xl bg-surface border border-warning/20 text-xs text-text-secondary flex items-start gap-3 leading-relaxed">
          <ShieldAlert size={20} className="text-warning flex-shrink-0 mt-0.5" />
          <span>
            <strong className="text-text-primary">Important Educational Notice:</strong> MINDMARK is an interactive training simulator designed to cultivate disciplined investing habits. We do not provide stock tips, investment advice, or real-money brokerage services. Simulated past performance does not guarantee future market returns.
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SECTION 6 — FINAL CTA                                                  */}
      {/* ========================================================================= */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-b from-surface/50 to-background border-t border-border/80">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-background flex items-center justify-center mx-auto shadow-glow">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold text-text-primary tracking-tight leading-[1.15]">
            Build experience. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Not expensive mistakes.
            </span>
          </h2>

          <p className="text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
            Take your first trade in a protected simulated environment. Experience the volatility of Dalal Street, train your decision-making habits, and protect your real financial future.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/simulator')}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
              className="font-bold text-sm px-8"
            >
              Begin Your Financial Learning Journey
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/onboarding')}
              className="font-mono text-xs"
            >
              Take 2-Min Knowledge Quiz
            </Button>
          </div>

          <div className="pt-6 flex flex-wrap justify-center gap-6 text-xs font-mono text-text-muted">
            <span>✓ 100% Free Virtual Paper Money</span>
            <span>✓ No Demat Credentials Asked</span>
            <span>✓ SEBI Compliance Oriented</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="border-t border-border/80 bg-surface/60 py-14 text-xs text-text-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background font-bold">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <span className="font-extrabold text-lg font-mono tracking-wider text-text-primary">
                  MINDMARK
                </span>
              </div>
              <p className="text-xs text-text-muted max-w-sm leading-relaxed">
                An AI-powered financial market learning and paper-trading simulator for beginners in India. Train your decisions, discover your biases, and protect your future without risking real money.
              </p>
              <div className="text-[11px] font-mono text-primary">
                Learn the market. Train your decisions. Protect your future.
              </div>
            </div>

            <div>
              <h4 className="font-mono font-bold text-text-primary uppercase text-xs mb-3">
                Learning
              </h4>
              <ul className="space-y-2 text-text-muted font-mono text-[11px]">
                <li><Link to="/learn" className="hover:text-primary transition-colors">Curriculum Tracks</Link></li>
                <li><Link to="/onboarding" className="hover:text-primary transition-colors">Skill Diagnostic</Link></li>
                <li><Link to="/news-explainer" className="hover:text-primary transition-colors">News Explainer</Link></li>
                <li><Link to="/challenges" className="hover:text-primary transition-colors">Challenges & XP</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-bold text-text-primary uppercase text-xs mb-3">
                Simulation
              </h4>
              <ul className="space-y-2 text-text-muted font-mono text-[11px]">
                <li><Link to="/simulator" className="hover:text-primary transition-colors">Paper Trading Desk</Link></li>
                <li><Link to="/portfolio" className="hover:text-primary transition-colors">Portfolio Analytics</Link></li>
                <li><Link to="/behavioral-insights" className="hover:text-primary transition-colors">Behavioral AI</Link></li>
                <li><Link to="/market-replay" className="hover:text-primary transition-colors">Crisis Time Machine</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-bold text-text-primary uppercase text-xs mb-3">
                Risk & Governance
              </h4>
              <ul className="space-y-2 text-text-muted font-mono text-[11px]">
                <li><a href="#risk-education" className="hover:text-primary transition-colors">Risk Education</a></li>
                <li><Link to="/settings" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/settings" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link to="/settings" className="hover:text-primary transition-colors">SEBI Compliance</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-text-muted">
            <p>
              © 2026 MINDMARK Simulator. Built for university financial education and research. All rights reserved.
            </p>
            <p className="max-w-md text-center md:text-right">
              Disclaimer: Educational simulation platform. Not a registered investment advisor under SEBI (Investment Advisers) Regulations. Securities displayed are for illustrative training purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
