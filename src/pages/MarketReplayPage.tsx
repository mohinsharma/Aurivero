import React, { useState } from 'react';
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
  Award
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { HISTORICAL_REPLAY_EVENTS } from '../data/mockData';
import { ReplayEvent } from '../types';

export const MarketReplayPage: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<ReplayEvent>(HISTORICAL_REPLAY_EVENTS[0]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [showOutcome, setShowOutcome] = useState<boolean>(false);

  const activeDay = selectedEvent.priceSeries[currentStep];

  const handleNextStep = () => {
    if (currentStep < selectedEvent.priceSeries.length - 1) {
      setCurrentStep(prev => prev + 1);
      setUserChoice(null);
      setShowOutcome(false);
    }
  };

  const handleResetReplay = () => {
    setCurrentStep(0);
    setUserChoice(null);
    setShowOutcome(false);
  };

  const handleSelectChoice = (choice: string) => {
    setUserChoice(choice);
    setShowOutcome(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-warning font-semibold">
              Dalal Street Time Machine
            </span>
            <Badge variant="warning" size="sm">Crisis Resilience Sandbox</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Historical Market Crash Replay
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Experience the panic, news chaos, and market drops of historic Dalal Street crises without losing real capital. Test whether you have the fortitude to resist panic selling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetReplay} icon={<RotateCcw size={14} />}>
            Reset Timeline
          </Button>
        </div>
      </div>

      {/* Scenario Picker Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {HISTORICAL_REPLAY_EVENTS.map((event) => {
          const isSelected = selectedEvent.id === event.id;
          return (
            <div
              key={event.id}
              onClick={() => {
                setSelectedEvent(event);
                handleResetReplay();
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface-elevated border-warning/50 shadow-glow'
                  : 'bg-surface border-border hover:border-text-secondary/40 hover:bg-surface-elevated/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-muted">{event.period}</span>
                  <Badge variant="danger" size="sm">{event.dropPercentage}</Badge>
                </div>
                <h3 className="font-bold text-xs text-text-primary mt-2">
                  {event.title}
                </h3>
                <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                  {event.subtitle}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-border/40 text-[10px] font-mono text-warning flex items-center justify-between">
                <span>Recovery: {event.recoveryDuration}</span>
                <ChevronRight size={13} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Time Machine Interactive Stage */}
      <Card variant="elevated" className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div>
            <span className="text-[10px] font-mono uppercase text-warning tracking-wider">
              Step {currentStep + 1} of {selectedEvent.priceSeries.length} • {activeDay.day}
            </span>
            <h2 className="text-lg font-bold text-text-primary mt-0.5">
              {selectedEvent.title}
            </h2>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <div>
              <span className="text-[10px] text-text-muted uppercase block">NIFTY 50 Level</span>
              <span className="text-xl font-bold text-text-primary text-tabular">
                {activeDay.nifty.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted uppercase block">SENSEX Level</span>
              <span className="text-xl font-bold text-text-primary text-tabular">
                {activeDay.sensex.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Visual Step Indicator */}
        <div className="w-full bg-background rounded-full h-2 overflow-hidden">
          <div
            className="bg-warning h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentStep + 1) / selectedEvent.priceSeries.length) * 100}%` }}
          />
        </div>

        {/* Narrative Box */}
        <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-warning">
            <AlertTriangle size={15} />
            <span>Market Situation on {activeDay.day}</span>
          </div>
          <p className="text-xs text-text-primary leading-relaxed font-sans">
            {activeDay.narrative}
          </p>
        </div>

        {/* Decision Simulation Prompt */}
        <div className="p-5 rounded-xl bg-surface-elevated border border-warning/30 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-text-primary">What would you do at this exact moment?</span>
            <span className="text-text-muted">Test your psychological bias</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'panic-sell', label: 'Panic Sell Everything', desc: 'Exit all equity holdings into cash to stop the emotional stress.' },
              { id: 'hold', label: 'Hold Ground Patiently', desc: 'Accept the paper drawdown, do not sell world-class businesses.' },
              { id: 'buy-dip', label: 'Opportunistically Buy the Dip', desc: 'Deploy reserve cash into blue-chip leaders trading at 35% discount.' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelectChoice(option.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  userChoice === option.id
                    ? 'bg-warning/15 border-warning text-text-primary'
                    : 'bg-surface border-border text-text-secondary hover:border-text-secondary/40'
                }`}
              >
                <div className="font-bold text-xs text-text-primary">{option.label}</div>
                <div className="text-[11px] text-text-muted mt-1 leading-snug">{option.desc}</div>
              </button>
            ))}
          </div>

          {/* Reality Feedback */}
          {showOutcome && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 text-xs text-text-primary space-y-1 animate-in fade-in duration-200">
              <span className="font-bold text-primary flex items-center gap-1.5 font-mono">
                <Sparkles size={14} /> Historical Dalal Street Reality:
              </span>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {userChoice === 'panic-sell' && 'Selling here locked in paper losses permanently. In reality, investors who panicked missed the fastest V-shaped recovery in Indian history.'}
                {userChoice === 'hold' && 'Disciplined choice! Holding through market drawdowns preserved your equity units, which later recovered to fresh all-time highs.'}
                {userChoice === 'buy-dip' && 'Superb courage! Accumulating fundamentally strong Indian enterprises during peak panic generated multi-bagger returns over the following 24 months.'}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="warning"
              size="md"
              disabled={currentStep >= selectedEvent.priceSeries.length - 1}
              onClick={handleNextStep}
              icon={<ArrowRight size={15} />}
              iconPosition="right"
            >
              {currentStep < selectedEvent.priceSeries.length - 1 ? 'Advance Timeline' : 'Replay Completed'}
            </Button>
          </div>
        </div>

        {/* Key Lessons from this Crisis */}
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
            Core Behavioral Takeaways
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {selectedEvent.keyLessons.map((lesson, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-surface border border-border/60 text-[11px] text-text-secondary leading-relaxed">
                <span className="font-mono text-primary font-bold mr-1">#{idx + 1}</span>
                {lesson}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
