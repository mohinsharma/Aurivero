import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
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
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { INDIAN_INDICES, POPULAR_INDIAN_STOCKS } from '../data/mockData';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      {/* Top Banner Disclaimer */}
      <div className="bg-surface border-b border-border/80 px-4 py-2 text-center text-xs font-mono text-text-secondary flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span>SEBI-COMPLIANT EDUCATIONAL SIMULATOR • ₹10,00,000 VIRTUAL CAPITAL • ZERO REAL-MONEY RISK</span>
      </div>

      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <svg className="w-5 h-5 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <div>
            <span className="font-extrabold text-xl font-mono tracking-wider text-text-primary">
              BULLSEYE
            </span>
            <span className="block text-[10px] text-text-muted font-mono -mt-1">
              AI Market Simulator
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary font-medium">
          <a href="#features" className="hover:text-text-primary transition-colors">Why Simulator</a>
          <a href="#how-it-works" className="hover:text-text-primary transition-colors">Curriculum</a>
          <a href="#psychology" className="hover:text-text-primary transition-colors">Behavioral AI</a>
          <Link to="/news-explainer" className="hover:text-text-primary transition-colors">News Explainer</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/onboarding')} icon={<ArrowRight size={14} />} iconPosition="right">
            Start Free
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-primary/30 text-primary text-xs font-mono mb-6">
          <Sparkles size={13} />
          <span>India's Premier AI Stock Market Learning Simulator</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-text-primary max-w-4xl mx-auto leading-[1.1]">
          Learn the market.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary">
            Train your decisions.
          </span>{' '}
          Protect your future.
        </h1>

        <p className="mt-6 text-base sm:text-xl text-text-secondary max-w-2xl mx-auto font-normal leading-relaxed">
          Master the stock market without risking a single rupee. Practice with ₹10,00,000 in virtual capital, survive historic Dalal Street crashes, and identify your emotional biases before real money is on the line.
        </p>

        {/* CTA Group */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/simulator')}
            icon={<CandlestickChart size={18} />}
          >
            Launch Paper Simulator
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/onboarding')}
            icon={<BrainCircuit size={18} />}
          >
            Take 2-Min Knowledge Diagnostic
          </Button>
        </div>

        {/* Live Index Ticker Preview */}
        <div className="mt-14 max-w-3xl mx-auto p-3 rounded-2xl bg-surface/80 border border-border/80 backdrop-blur-md flex flex-wrap items-center justify-around gap-4 text-xs font-mono">
          {INDIAN_INDICES.map(idx => (
            <div key={idx.name} className="flex items-center gap-2">
              <span className="text-text-muted">{idx.name}</span>
              <span className="font-bold text-text-primary">{idx.value.toLocaleString('en-IN')}</span>
              <span className={`text-[11px] font-semibold ${idx.change >= 0 ? 'text-primary' : 'text-danger'}`}>
                {idx.change >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Simulator Interface Interactive Mock Preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-2xl border border-border/90 bg-surface/90 shadow-2xl overflow-hidden p-6 relative">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-danger/60" />
                <span className="w-3 h-3 rounded-full bg-warning/60" />
                <span className="w-3 h-3 rounded-full bg-primary/60" />
              </div>
              <span className="text-xs font-mono text-text-muted">BULLSEYE Interactive Paper Trading Desk • NSE Terminal</span>
            </div>
            <Badge variant="primary" dot size="sm">Virtual ₹10,00,000 Live</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-xl font-bold font-mono text-text-primary">RELIANCE INDUSTRIES</h3>
                  <p className="text-xs text-text-muted">NSE: RELIANCE • Energy & Telecom</p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-2xl font-bold text-text-primary text-tabular">₹2,985.40</div>
                  <div className="text-xs text-primary font-semibold">+₹32.10 (+1.09%) Today</div>
                </div>
              </div>

              {/* Simulated High-tech Candlestick / Area Chart visualization */}
              <div className="h-48 w-full bg-surface-elevated/70 rounded-xl p-4 flex flex-col justify-between border border-border/50 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>Intraday Range: ₹2,955.00 — ₹2,998.50</span>
                  <span className="text-secondary">AI Pattern: Ascending Triangle Breakout</span>
                </div>
                {/* SVG Chart Graphic */}
                <svg className="w-full h-28 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#45D6B5" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#45D6B5" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 Q100,65 180,75 T320,40 T420,30 T500,15"
                    fill="none"
                    stroke="#45D6B5"
                    strokeWidth="3"
                  />
                  <path
                    d="M0,80 Q100,65 180,75 T320,40 T420,30 T500,15 L500,100 L0,100 Z"
                    fill="url(#chartGradient)"
                  />
                  {/* Point Marker */}
                  <circle cx="500" cy="15" r="4" fill="#45D6B5" />
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-text-muted">
                  <span>09:15 AM</span>
                  <span>11:30 AM</span>
                  <span>01:15 PM</span>
                  <span>03:30 PM IST</span>
                </div>
              </div>

              {/* Behavioral Guardian Tip */}
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-secondary/20 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                  <BrainCircuit size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">AI Behavioral Coach Feedback</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                    Reliance is up +1.09% today. Notice your impulse to buy because it's green? Review if your stop loss at ₹2,920 provides at least a 1:2 Risk-Reward ratio before pulling the trigger.
                  </p>
                </div>
              </div>
            </div>

            {/* Simulated Order Execution Panel Preview */}
            <div className="bg-surface-elevated/80 border border-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <span className="font-mono font-bold text-xs text-text-primary uppercase">Order Preview</span>
                  <span className="text-[10px] font-mono text-text-muted">MARKET BUY</span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Simulated Quantity:</span>
                    <span className="font-mono font-bold text-text-primary">50 Shares</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Execution Price:</span>
                    <span className="font-mono font-bold text-text-primary">₹2,985.40</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Capital Required:</span>
                    <span className="font-mono font-bold text-primary font-mono">₹1,49,270.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Stop-Loss Safety:</span>
                    <span className="font-mono font-semibold text-danger">₹2,920.00 (-2.1%)</span>
                  </div>
                </div>

                <div className="mt-4 p-2.5 rounded-lg bg-background/60 border border-border/80 text-[11px] text-text-secondary">
                  <span className="font-semibold text-warning">Mandatory Habit:</span> Tag your trade thesis (e.g. Breakout, Long-term Moat, or Tip) to build emotional awareness.
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full mt-6"
                onClick={() => navigate('/simulator')}
              >
                Try In Live Simulator
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars Section */}
      <section id="features" className="py-20 bg-surface/50 border-t border-b border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-primary mb-2">Designed For India</h2>
            <h3 className="text-3xl font-bold text-text-primary tracking-tight">
              Why Inexperienced Investors Lose Money — And How BULLSEYE Fixes It
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="elevated" className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CandlestickChart size={24} />
              </div>
              <h4 className="text-lg font-bold text-text-primary">Zero-Risk Market Sandbox</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Trade real Indian equities (Reliance, TCS, HDFC Bank, Infosys) using ₹10 Lakhs of simulated capital. Experience real market spreads and price swings without risking your hard-earned salary.
              </p>
              <div className="text-xs font-mono text-primary flex items-center gap-1 pt-2">
                <span>Explore simulator</span>
                <ChevronRight size={14} />
              </div>
            </Card>

            <Card variant="elevated" className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <BrainCircuit size={24} />
              </div>
              <h4 className="text-lg font-bold text-text-primary">Behavioral Bias Mirror</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Most traders don't fail due to lack of intelligence; they fail because of FOMO, revenge trading after a loss, and holding losers forever. Our AI highlights these emotional patterns in your trading log.
              </p>
              <div className="text-xs font-mono text-secondary flex items-center gap-1 pt-2">
                <span>See psychology engine</span>
                <ChevronRight size={14} />
              </div>
            </Card>

            <Card variant="elevated" className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <History size={24} />
              </div>
              <h4 className="text-lg font-bold text-text-primary">Historical Crash Replays</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Step back in time to the COVID-19 March 2020 crash, the 2008 Lehman collapse, or the June 2024 Election result flash drop. Test if your nerves hold or if you panic-sell at the absolute bottom.
              </p>
              <div className="text-xs font-mono text-warning flex items-center gap-1 pt-2">
                <span>Try crash time-machine</span>
                <ChevronRight size={14} />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust & Educational Pledge */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border mx-auto flex items-center justify-center text-primary mb-6 shadow-glow">
          <Shield size={32} />
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-text-primary">
          Our Educational Pledge to Indian Beginners
        </h3>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">
          BULLSEYE will never provide personalized stock buy/sell tips, promise guaranteed returns, or partner with predatory loan apps. We believe true financial empowerment comes from understanding market mechanics, emotional self-mastery, and risk control.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs font-mono text-text-muted">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-primary" /> 100% Free Virtual Capital
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-primary" /> No Demat Account Required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-primary" /> No Banking Details Asked
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-primary" /> SEBI-Compliant Learning
          </span>
        </div>

        <div className="mt-10">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/dashboard')}
          >
            Enter Market Simulator
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-surface/40 py-10 text-xs text-text-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-text-primary">BULLSEYE</span>
            <span>• Financial Learning Simulator</span>
          </div>
          <p className="text-center text-[11px] max-w-lg">
            Disclaimer: Educational market simulator. Securities displayed are for illustrative learning purposes only and do not constitute recommendations or solicitation.
          </p>
          <div className="flex gap-4 font-mono text-[11px]">
            <Link to="/onboarding" className="hover:text-primary">Diagnostic</Link>
            <Link to="/learn" className="hover:text-primary">Curriculum</Link>
            <Link to="/settings" className="hover:text-primary">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
