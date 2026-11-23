import React from 'react';
import {
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Zap,
  Target,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';

export const BehavioralInsightsPage: React.FC = () => {
  const { behavioralScore, orderHistory } = useSimulator();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-secondary font-semibold">
              Cognitive Bias Engine
            </span>
            <Badge variant="secondary" size="sm">Psychological Diagnostic</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Behavioral Insights & Emotional Control
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Over 85% of retail market losses stem from psychological traps: FOMO, revenge trading, loss aversion, and premature profit-taking. We mirror your behavior to train emotional discipline.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-elevated border border-primary/30 text-center font-mono">
          <span className="text-[10px] text-text-muted uppercase block">Discipline Index</span>
          <span className="text-3xl font-extrabold text-primary text-tabular">
            {behavioralScore.overallHealth}<span className="text-sm text-text-muted">/100</span>
          </span>
        </div>
      </div>

      {/* Behavioral Bias Meters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span>FOMO Score</span>
            <span className="text-primary font-bold">18% (Low)</span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '18%' }} />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Resistance to chasing stocks after large gap-up opening green candles.
          </p>
        </Card>

        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span>Revenge Trading Risk</span>
            <span className="text-primary font-bold">12% (Minimal)</span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '12%' }} />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Tendency to rapidly place larger trades immediately after hitting a stop-loss.
          </p>
        </Card>

        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span>Disposition Effect</span>
            <span className="text-warning font-bold">25% (Mild)</span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div className="bg-warning h-full rounded-full" style={{ width: '25%' }} />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Cutting profitable trades too early while holding losing trades indefinitely.
          </p>
        </Card>

        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span>Stop-Loss Execution</span>
            <span className="text-primary font-bold">86% (High)</span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '86%' }} />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            Discipline in establishing and honoring predetermined exit thresholds.
          </p>
        </Card>
      </div>

      {/* Observations & Drills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: AI Observations (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="elevated" className="p-5">
            <h3 className="font-bold text-sm text-text-primary pb-3 border-b border-border/60">
              Live Psychological Log & Trait Feedback
            </h3>

            <div className="mt-4 space-y-3">
              {behavioralScore.recentObservations.map((obs, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-surface border border-border/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
                      {obs.type === 'positive' && <CheckCircle2 size={14} className="text-primary" />}
                      {obs.type === 'warning' && <AlertTriangle size={14} className="text-warning" />}
                      {obs.title}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">{obs.timestamp}</span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {obs.description}
                  </p>

                  <div className="p-2 rounded-lg bg-background/60 border border-border/40 text-[11px] text-text-primary font-mono mt-1">
                    <span className="text-secondary font-semibold">Actionable Drill:</span> {obs.actionableTip}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Psychological Drills (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="elevated" className="p-5">
            <h3 className="font-bold text-sm text-text-primary pb-3 border-b border-border/60">
              Mental Conditioning Drills
            </h3>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface border border-primary/20">
                <span className="font-semibold text-primary block">Drill 1: The 10-Minute Cooldown Rule</span>
                <p className="text-text-muted text-[11px] mt-1 leading-relaxed">
                  Whenever a trade hits your stop loss, step away from the trading terminal for 10 minutes. Wash your hands or take deep breaths to reset cortisol levels.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-secondary/20">
                <span className="font-semibold text-secondary block">Drill 2: The Pre-Trade Checklist</span>
                <p className="text-text-muted text-[11px] mt-1 leading-relaxed">
                  Before confirming any order, verify: 1) What is my max downside? 2) Why am I buying today vs yesterday? 3) Is this setup from my strategy or a tip?
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-warning/20">
                <span className="font-semibold text-warning block">Drill 3: Accepting the Inevitability of Losses</span>
                <p className="text-text-muted text-[11px] mt-1 leading-relaxed">
                  Even the best hedge fund managers are wrong 40% of the time. A loss is merely the cost of doing business in financial markets, not a reflection of your self-worth.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
