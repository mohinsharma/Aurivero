import React from 'react';
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
  Zap
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import { INDIAN_INDICES, POPULAR_INDIAN_STOCKS, COURSE_MODULES, HISTORICAL_REPLAY_EVENTS, MARKET_NEWS_ITEMS } from '../data/mockData';

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
    squareOffPosition
  } = useSimulator();

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Educational Disclaimer */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-surface-elevated via-surface to-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
              Live Paper Trading Environment
            </span>
            <Badge variant="primary" dot size="sm">NSE/BSE Open</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Welcome back, Amay. Ready to train your market decisions?
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            "The stock market is a device for transferring money from the impatient to the patient." — Warren Buffett
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/simulator')}
            icon={<CandlestickChart size={15} />}
          >
            Open Simulator
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/learn')}
            icon={<BookOpen size={15} />}
          >
            Continue Learning
          </Button>
        </div>
      </div>

      {/* Top Level Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Virtual Net Worth"
          value={`₹${totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue="Starting: ₹10.0L"
          change={((totalPortfolioValue - 1000000) / 1000000) * 100}
          changeLabel="overall return"
          tooltip="Total value of uninvested paper cash + current market value of holdings."
          variant="elevated"
        />

        <StatCard
          label="Today's Simulated P&L"
          value={`${dayPnL >= 0 ? '+' : ''}₹${dayPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          change={(dayPnL / (totalPortfolioValue - dayPnL)) * 100}
          changeLabel="today"
          tooltip="Day's gain or loss across all active paper positions based on current market price."
        />

        <StatCard
          label="Available Virtual Cash"
          value={`₹${virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`${((virtualCash / totalPortfolioValue) * 100).toFixed(1)}% liquid`}
          tooltip="Unencumbered simulated INR available to execute new stock buys."
        />

        <StatCard
          label="Invested Capital"
          value={`₹${totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`${positions.length} active positions`}
          change={unrealizedPnLPercent}
          changeLabel="unrealized ROI"
          tooltip="Cost basis of stocks currently held in your virtual portfolio."
        />
      </div>

      {/* Indian Indices Quick Pulse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {INDIAN_INDICES.map((idx) => {
          const isUp = idx.change >= 0;
          return (
            <Card key={idx.name} variant="default" className="p-3.5">
              <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                <span>{idx.name}</span>
                <span className={`text-[10px] font-semibold ${isUp ? 'text-primary' : 'text-danger'}`}>
                  {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-text-primary mt-1 text-tabular">
                {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Two Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Paper Positions & Crash Replay Banner */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Positions Table */}
          <Card variant="elevated" className="p-5">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-primary" />
                <h3 className="font-bold text-sm text-text-primary tracking-tight">
                  Active Virtual Holdings ({positions.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/portfolio')}
                icon={<ArrowRight size={13} />}
                iconPosition="right"
              >
                Full Analytics
              </Button>
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-xs text-text-muted">You have no open stock positions right now.</p>
                <Button variant="primary" size="sm" onClick={() => navigate('/simulator')}>
                  Browse Stocks to Buy
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-[11px] font-mono text-text-muted">
                      <th className="py-2.5 px-2">Asset</th>
                      <th className="py-2.5 px-2 text-right">Qty</th>
                      <th className="py-2.5 px-2 text-right">Avg Cost</th>
                      <th className="py-2.5 px-2 text-right">LTP (₹)</th>
                      <th className="py-2.5 px-2 text-right">Stop Loss</th>
                      <th className="py-2.5 px-2 text-right">P&L</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {positions.map((pos) => {
                      const isProfit = pos.unrealizedPnL >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-surface-elevated/50 transition-colors">
                          <td className="py-3 px-2">
                            <div className="font-mono font-bold text-text-primary">{pos.symbol}</div>
                            <div className="text-[10px] text-text-muted">{pos.sector}</div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-tabular">{pos.quantity}</td>
                          <td className="py-3 px-2 text-right font-mono text-tabular">₹{pos.averageBuyPrice.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-mono text-tabular font-semibold">₹{pos.currentPrice.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-mono text-tabular text-warning">
                            {pos.stopLoss ? `₹${pos.stopLoss.toFixed(2)}` : 'None'}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-tabular">
                            <span className={isProfit ? 'text-primary font-semibold' : 'text-danger font-semibold'}>
                              {isProfit ? '+' : ''}₹{pos.unrealizedPnL.toFixed(2)}
                            </span>
                            <div className={`text-[10px] ${isProfit ? 'text-primary' : 'text-danger'}`}>
                              {isProfit ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%
                            </div>
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
            )}
          </Card>

          {/* Historical Crash Replay Teaser */}
          <Card variant="elevated" className="p-5 border-warning/20 bg-gradient-to-br from-surface-elevated to-surface">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-warning/10 text-warning flex-shrink-0">
                  <History size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-warning font-semibold">
                      Time Machine Simulator
                    </span>
                    <Badge variant="warning" size="sm">Crash Drill</Badge>
                  </div>
                  <h4 className="font-bold text-sm text-text-primary mt-0.5">
                    Can You Survive the COVID-19 March 2020 Crash?
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 max-w-xl">
                    NIFTY plummeted -38.4% in 30 days as nationwide lockdowns halted the economy. Test whether your emotions cause you to panic-sell at the absolute bottom or buy world-class assets at generational discounts.
                  </p>
                </div>
              </div>

              <Button
                variant="warning"
                size="sm"
                className="flex-shrink-0"
                onClick={() => navigate('/market-replay')}
                icon={<ArrowRight size={14} />}
                iconPosition="right"
              >
                Launch Replay
              </Button>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: AI Behavioral Score & Learning Progress */}
        <div className="space-y-6">
          {/* AI Behavioral Diagnostic Health Card */}
          <Card variant="elevated" className="p-5 border-secondary/20">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <BrainCircuit size={18} className="text-secondary" />
                <h3 className="font-bold text-sm text-text-primary tracking-tight">
                  Behavioral Discipline Score
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-primary">
                {behavioralScore.overallHealth}/100
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">FOMO Resistance:</span>
                  <span className="font-mono text-primary font-semibold">82% (Excellent)</span>
                </div>
                <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '82%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">Stop-Loss Adherence:</span>
                  <span className="font-mono text-primary font-semibold">100% (Strict)</span>
                </div>
                <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">Loss Aversion Bias:</span>
                  <span className="font-mono text-warning font-semibold">Low-to-Medium</span>
                </div>
                <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                  <div className="bg-warning h-full rounded-full" style={{ width: '35%' }} />
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-surface border border-border/60 text-xs">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Sparkles size={13} className="text-secondary" />
                AI Mindset Recommendation:
              </span>
              <p className="text-text-secondary mt-1 text-[11px] leading-relaxed">
                You haven't placed impulsive trades on stocks that gapped up more than +3% this week. Great patience.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => navigate('/behavioral-insights')}
            >
              Deep Behavioral Analysis
            </Button>
          </Card>

          {/* Continue Curriculum Card */}
          <Card variant="elevated" className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                <h3 className="font-bold text-sm text-text-primary tracking-tight">
                  Learning Journey
                </h3>
              </div>
              <span className="text-[10px] font-mono text-text-muted">Track 2 of 5</span>
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-text-primary">
                Track 2: Demystifying Price Charts & Market Action
              </h4>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Next lesson: Candlesticks & spotting fake breakout volume traps.
              </p>

              <div className="w-full bg-background rounded-full h-1.5 overflow-hidden mt-3">
                <div className="bg-secondary h-full rounded-full" style={{ width: '60%' }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-text-muted pt-1">
                <span>3 of 4 lessons completed</span>
                <span>60%</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-4"
              onClick={() => navigate('/learn')}
            >
              Resume Lesson
            </Button>
          </Card>
        </div>
      </div>

      {/* Compliance Disclaimer Banner */}
      <DisclaimerBanner />
    </div>
  );
};
