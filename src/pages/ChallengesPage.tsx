import React from 'react';
import {
  Trophy,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Target,
  Shield,
  Star
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CHALLENGE_QUESTS } from '../data/mockData';

export const ChallengesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
              Mastery Milestones
            </span>
            <Badge variant="primary" size="sm">Level 2 Apprentice</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Challenges, Badges & Trader XP
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Earn experience points by mastering disciplined market habits: setting stop losses, diversifying sectors, and completing crash simulations.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-surface-elevated border border-primary/30 text-center font-mono">
            <span className="text-[10px] text-text-muted uppercase block">Total Experience</span>
            <span className="text-2xl font-bold text-primary">1,150 XP</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated border border-secondary/30 text-center font-mono">
            <span className="text-[10px] text-text-muted uppercase block">Badges Earned</span>
            <span className="text-2xl font-bold text-secondary">2 / 5</span>
          </div>
        </div>
      </div>

      {/* Quests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHALLENGE_QUESTS.map((quest) => {
          const percentage = (quest.progress / quest.maxProgress) * 100;

          return (
            <Card
              key={quest.id}
              variant="elevated"
              className={`p-5 space-y-3 ${quest.completed ? 'border-primary/40' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border">
                      {quest.category}
                    </span>
                    <span className="text-xs font-mono text-primary font-bold">
                      +{quest.rewardXP} XP
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-text-primary mt-1.5">
                    {quest.title}
                  </h3>
                </div>

                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  quest.completed
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-surface text-text-muted border border-border'
                }`}>
                  {quest.completed ? <CheckCircle2 size={18} /> : <Lock size={16} />}
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                {quest.description}
              </p>

              {/* Progress */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-[11px] font-mono text-text-muted">
                  <span>Progress</span>
                  <span className={quest.completed ? 'text-primary font-bold' : ''}>
                    {quest.progress} / {quest.maxProgress}
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      quest.completed ? 'bg-primary' : 'bg-secondary'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted text-[11px]">Badge: {quest.badgeName}</span>
                {quest.completed ? (
                  <Badge variant="primary" size="sm">Completed</Badge>
                ) : (
                  <span className="text-secondary text-[11px]">In Progress</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
