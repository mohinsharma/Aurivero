import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Target,
  Shield,
  Star,
  Flame,
  Calendar,
  Layers,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Compass,
  AlertTriangle,
  RotateCcw,
  Check,
  HelpCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CHALLENGE_QUESTS, ACHIEVEMENT_BADGES, ETHICAL_LEADERBOARD } from '../data/mockData';
import { ChallengeQuest, AchievementBadge, LeaderboardEntry } from '../types';

type PageTab = 'QUESTS' | 'LEADERBOARD' | 'BADGES' | 'STREAK';
type QuestFilter = 'ALL' | 'DAILY' | 'WEEKLY' | 'MILESTONE';

interface LevelTier {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  subtitle: string;
  unlockedFeatures: string[];
}

const LEVEL_TIERS: LevelTier[] = [
  {
    level: 1,
    name: 'Market Explorer',
    minXP: 0,
    maxXP: 250,
    subtitle: 'Understanding market mechanics & terminology',
    unlockedFeatures: ['Paper Trading Watchlist', 'Learn Center Module 1', 'Basic Market Orders']
  },
  {
    level: 2,
    name: 'Financial Learner',
    minXP: 251,
    maxXP: 650,
    subtitle: 'Connecting macro events & financial statements',
    unlockedFeatures: ['AI News Explainer', 'Stop-Loss Order System', 'Learn Center Modules 2 & 3']
  },
  {
    level: 3,
    name: 'Risk Navigator',
    minXP: 651,
    maxXP: 1200,
    subtitle: 'Asymmetric risk discipline & bias identification',
    unlockedFeatures: ['Pre-Trade Risk Reality Check', 'Behavioral Insights Radar', 'Crash Replay Engine']
  },
  {
    level: 4,
    name: 'Portfolio Builder',
    minXP: 1201,
    maxXP: 2000,
    subtitle: 'Asset allocation & multi-sector diversification',
    unlockedFeatures: ['Sector Overlap Audit', 'Rebalancing Sandbox', 'Educational F&O Risk Simulator']
  },
  {
    level: 5,
    name: 'Market Strategist',
    minXP: 2001,
    maxXP: 3000,
    subtitle: 'Long-term compounding & emotional mastery',
    unlockedFeatures: ['Master Macro Simulation', 'Advanced Valuation Drill', 'Mentor Community Badge']
  }
];

export const ChallengesPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<PageTab>('QUESTS');
  const [questFilter, setQuestFilter] = useState<QuestFilter>('ALL');
  const [leaderboardSort, setLeaderboardSort] = useState<'DISCIPLINE' | 'XP'>('DISCIPLINE');

  // Quests & XP State with localStorage persistence
  const [userXP, setUserXP] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mindmark_user_xp');
      return saved ? parseInt(saved, 10) : 1150;
    } catch {
      return 1150;
    }
  });

  const [questsList, setQuestsList] = useState<ChallengeQuest[]>(() => {
    try {
      const saved = localStorage.getItem('mindmark_quests_list');
      return saved ? JSON.parse(saved) : CHALLENGE_QUESTS;
    } catch {
      return CHALLENGE_QUESTS;
    }
  });

  const [claimedRewardMessage, setClaimedRewardMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mindmark_user_xp', userXP.toString());
      localStorage.setItem('mindmark_quests_list', JSON.stringify(questsList));
    } catch (e) {
      console.error('Failed to save quest state', e);
    }
  }, [userXP, questsList]);

  // Current Level Calculation
  const currentTier = useMemo<LevelTier>(() => {
    return LEVEL_TIERS.find(t => userXP >= t.minXP && userXP <= t.maxXP) || LEVEL_TIERS[LEVEL_TIERS.length - 1];
  }, [userXP]);

  const nextTier = useMemo<LevelTier | null>(() => {
    return LEVEL_TIERS.find(t => t.level === currentTier.level + 1) || null;
  }, [currentTier]);

  const tierProgressPercent = useMemo(() => {
    if (!nextTier) return 100;
    const range = nextTier.minXP - currentTier.minXP;
    const earned = userXP - currentTier.minXP;
    return Math.min(100, Math.max(0, Math.round((earned / range) * 100)));
  }, [currentTier, nextTier, userXP]);

  // Filtered Quests
  const filteredQuests = useMemo(() => {
    return questsList.filter(q => {
      if (questFilter === 'ALL') return true;
      return q.frequency === questFilter;
    });
  }, [questsList, questFilter]);

  // Handle Claiming Quest Reward
  const handleClaimReward = (questId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = questsList.find(q => q.id === questId);
    if (!target || !target.completed || target.claimed) return;

    setUserXP(prev => prev + target.rewardXP);
    setQuestsList(prev => prev.map(q => q.id === questId ? { ...q, claimed: true } : q));

    setClaimedRewardMessage(`Claimed +${target.rewardXP} XP from "${target.title}"!`);
    setTimeout(() => setClaimedRewardMessage(null), 3500);
  };

  // Sort Leaderboard
  const sortedLeaderboard = useMemo(() => {
    return [...ETHICAL_LEADERBOARD].sort((a, b) => {
      if (leaderboardSort === 'DISCIPLINE') {
        return b.disciplineScore - a.disciplineScore;
      }
      return b.xp - a.xp;
    });
  }, [leaderboardSort]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
              <Trophy size={14} className="text-primary" /> Educational Gamification
            </span>
            <Badge variant="primary" size="sm">Level {currentTier.level}: {currentTier.name}</Badge>
            <Badge variant="secondary" size="sm">Ethical Progression</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            Learning Challenges & Progression
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
            MINDMARK rewards financial understanding, diversification, risk management, and decision discipline. Progression is earned by mastering concepts—never by trade volume or speculative profit.
          </p>
        </div>

        {/* Top User XP & Streak Quick Pill */}
        <div className="flex items-center gap-3 font-mono">
          <div className="p-3.5 rounded-xl bg-surface-elevated border border-primary/30 text-center">
            <span className="text-[10px] text-text-muted uppercase block">Learning XP</span>
            <span className="text-xl font-bold text-primary">{userXP.toLocaleString('en-IN')} XP</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-elevated border border-warning/30 text-center">
            <span className="text-[10px] text-text-muted uppercase block flex items-center justify-center gap-1">
              <Flame size={12} className="text-warning" /> Study Streak
            </span>
            <span className="text-xl font-bold text-warning">5 Days</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-elevated border border-secondary/30 text-center hidden sm:block">
            <span className="text-[10px] text-text-muted uppercase block">Badges</span>
            <span className="text-xl font-bold text-secondary">5 / 8</span>
          </div>
        </div>
      </div>

      {/* Reward Claim Banner Toast */}
      {claimedRewardMessage && (
        <div className="p-3.5 rounded-xl bg-primary/15 border border-primary/40 text-xs text-primary font-mono font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="flex items-center gap-2">
            <Sparkles size={16} /> {claimedRewardMessage}
          </span>
          <button onClick={() => setClaimedRewardMessage(null)} className="text-text-muted hover:text-text-primary text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* LEVEL PROGRESSION ROADMAP CARD */}
      <Card variant="elevated" className="p-5 border-border/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-primary font-bold">
                Tier {currentTier.level} of 5: {currentTier.name}
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-xs text-text-secondary">{currentTier.subtitle}</span>
            </div>
          </div>
          <div className="text-xs font-mono text-text-muted">
            {nextTier ? (
              <span>Next Level: <strong className="text-text-primary">{nextTier.name}</strong> at {nextTier.minXP} XP ({nextTier.minXP - userXP} XP to go)</span>
            ) : (
              <span className="text-primary font-bold">Max Mastery Tier Reached!</span>
            )}
          </div>
        </div>

        {/* Level Progression Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-text-muted">
            <span>Level Progress</span>
            <span className="text-primary font-bold">{tierProgressPercent}%</span>
          </div>
          <div className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-border/40 flex">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full shadow-glow"
              style={{ width: `${tierProgressPercent}%` }}
            />
          </div>
        </div>

        {/* 5-Level Milestone Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          {LEVEL_TIERS.map(tier => {
            const isCompleted = userXP > tier.maxXP;
            const isCurrent = userXP >= tier.minXP && userXP <= tier.maxXP;

            return (
              <div
                key={tier.level}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isCurrent
                    ? 'bg-primary/10 border-primary text-text-primary shadow-glow'
                    : isCompleted
                    ? 'bg-surface border-primary/30 text-text-secondary'
                    : 'bg-surface/50 border-border/40 text-text-muted'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span>Lvl {tier.level}</span>
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="text-primary" />
                  ) : isCurrent ? (
                    <span className="text-primary font-bold">ACTIVE</span>
                  ) : (
                    <Lock size={12} className="text-text-muted" />
                  )}
                </div>
                <h4 className="text-xs font-bold truncate">{tier.name}</h4>
                <span className="text-[10px] font-mono block mt-0.5 opacity-80">{tier.minXP} XP</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'QUESTS' as PageTab, label: 'Challenges & Quests', icon: <Target size={14} />, badge: `${questsList.filter(q => q.completed && !q.claimed).length} Claimable` },
          { id: 'LEADERBOARD' as PageTab, label: 'Ethical Discipline Leaderboard', icon: <Trophy size={14} /> },
          { id: 'BADGES' as PageTab, label: 'Achievements Showcase', icon: <Award size={14} /> },
          { id: 'STREAK' as PageTab, label: 'Educational Streaks', icon: <Flame size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-background shadow-glow'
                : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-background text-primary' : 'bg-primary/20 text-primary'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHALLENGES & QUESTS                                                */}
      {/* ========================================================================= */}
      {activeTab === 'QUESTS' && (
        <div className="space-y-4">
          {/* Frequency Filters */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {(['ALL', 'DAILY', 'WEEKLY', 'MILESTONE'] as QuestFilter[]).map(filter => (
                <button
                  key={filter}
                  onClick={() => setQuestFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    questFilter === filter
                      ? 'bg-surface-elevated text-primary border border-primary/40 font-bold'
                      : 'bg-surface text-text-muted hover:text-text-primary border border-border/40'
                  }`}
                >
                  {filter === 'ALL' ? 'All Quests' : filter === 'DAILY' ? 'Daily Drills' : filter === 'WEEKLY' ? 'Weekly Habits' : 'Milestones'}
                </button>
              ))}
            </div>

            <span className="text-[11px] font-mono text-text-muted">
              Showing {filteredQuests.length} educational quests
            </span>
          </div>

          {/* Quests Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuests.map((quest) => {
              const progressPct = Math.min(100, Math.round((quest.progress / quest.maxProgress) * 100));
              const isClaimable = quest.completed && !quest.claimed;

              return (
                <Card
                  key={quest.id}
                  variant="elevated"
                  className={`p-5 flex flex-col justify-between space-y-4 border transition-all ${
                    isClaimable
                      ? 'border-primary/60 bg-surface-elevated shadow-glow'
                      : quest.claimed
                      ? 'border-border/60 bg-surface/80 opacity-90'
                      : 'border-border hover:border-text-secondary/40'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            quest.frequency === 'DAILY' ? 'warning' :
                            quest.frequency === 'WEEKLY' ? 'secondary' : 'primary'
                          }
                          size="sm"
                        >
                          {quest.frequency || 'QUEST'}
                        </Badge>
                        <span className="text-[10px] font-mono text-text-muted uppercase px-1.5 py-0.5 rounded bg-background border border-border/50">
                          {quest.category}
                        </span>
                      </div>

                      <span className="text-xs font-mono font-bold text-primary">
                        +{quest.rewardXP} XP
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-text-primary">
                        {quest.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/40">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-text-muted">
                        <span>Progress</span>
                        <span className={quest.completed ? 'text-primary font-bold' : ''}>
                          {quest.progress} / {quest.maxProgress} ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            quest.completed ? 'bg-primary' : 'bg-secondary'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Quest Action / Claim Button */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                        <Award size={12} className="text-secondary" /> Badge: {quest.badgeName}
                      </span>

                      {isClaimable ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => handleClaimReward(quest.id, e)}
                          icon={<Sparkles size={14} />}
                        >
                          Claim +{quest.rewardXP} XP
                        </Button>
                      ) : quest.claimed ? (
                        <span className="text-[11px] font-mono text-primary flex items-center gap-1 font-semibold">
                          <CheckCircle2 size={13} /> Reward Claimed
                        </span>
                      ) : quest.actionRoute ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(quest.actionRoute!)}
                          icon={<ArrowRight size={13} />}
                          iconPosition="right"
                        >
                          {quest.actionLabel || 'Go to Activity'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ETHICAL LEADERBOARD                                                */}
      {/* ========================================================================= */}
      {activeTab === 'LEADERBOARD' && (
        <div className="space-y-4">
          {/* Ethical Philosophy Callout */}
          <div className="p-4 rounded-xl bg-surface border-l-4 border-l-primary border-y border-r border-border space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary uppercase">
              <Shield size={14} /> Ethical Leaderboard Philosophy
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              MINDMARK strictly rejects ranking users by trading volume or virtual paper profit. Wall Street research proves that chasing returns triggers reckless gambling habits. Here, you are recognized for <strong>decision consistency, risk controls, loss-prevention discipline, and conceptual knowledge.</strong>
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-text-muted">Rank Leaderboard By:</span>
              <button
                onClick={() => setLeaderboardSort('DISCIPLINE')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  leaderboardSort === 'DISCIPLINE'
                    ? 'bg-primary text-background font-bold'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                Behavioral Discipline Score (0–100)
              </button>
              <button
                onClick={() => setLeaderboardSort('XP')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  leaderboardSort === 'XP'
                    ? 'bg-primary text-background font-bold'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                Total Learning XP
              </button>
            </div>

            <span className="text-[11px] font-mono text-text-muted">
              Privacy Protected: Individual trade tickets remain private.
            </span>
          </div>

          {/* Leaderboard Table */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border/80 text-[10px] text-text-muted uppercase text-left bg-background/50">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Mastery Level</th>
                    <th className="py-3 px-4">Discipline Score</th>
                    <th className="py-3 px-4">Learning XP</th>
                    <th className="py-3 px-4 text-center">Badges</th>
                    <th className="py-3 px-4 text-right">Study Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sortedLeaderboard.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`transition-colors ${
                        entry.isCurrentUser
                          ? 'bg-primary/10 border-l-4 border-l-primary font-semibold'
                          : 'hover:bg-surface-elevated/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold">
                        {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text-primary">{entry.name}</div>
                        <span className="text-[10px] text-text-muted">{entry.city}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-secondary font-semibold">{entry.levelName}</span>
                        <span className="text-[10px] text-text-muted block">Tier {entry.levelNumber}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-primary">{entry.disciplineScore}</span>
                          <span className="text-[10px] text-text-muted">/100</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-text-primary">
                        {entry.xp.toLocaleString('en-IN')} XP
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-background border border-border text-[11px]">
                          {entry.badgesCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-warning flex items-center justify-end gap-1">
                          <Flame size={13} /> {entry.streakDays}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACHIEVEMENTS & BADGES SHOWCASE                                     */}
      {/* ========================================================================= */}
      {activeTab === 'BADGES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted px-1">
            <span>
              Unlocked <strong className="text-primary">{ACHIEVEMENT_BADGES.filter(b => b.unlocked).length}</strong> of {ACHIEVEMENT_BADGES.length} milestone badges
            </span>
            <span>Earned through verified learning milestones</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ACHIEVEMENT_BADGES.map((badge) => {
              const rarityColorMap: Record<AchievementBadge['rarity'], string> = {
                Common: 'text-text-secondary border-border',
                Rare: 'text-secondary border-secondary/40',
                Epic: 'text-warning border-warning/40',
                Legendary: 'text-primary border-primary/50'
              };
              const rarityColor = rarityColorMap[badge.rarity];

              return (
                <Card
                  key={badge.id}
                  variant="elevated"
                  className={`p-5 flex flex-col justify-between space-y-3 transition-all ${
                    badge.unlocked
                      ? 'border-primary/40 bg-surface shadow-glow'
                      : 'border-border/40 bg-surface/50 opacity-70'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        badge.unlocked
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-background text-text-muted border border-border'
                      }`}>
                        {badge.unlocked ? <Award size={20} /> : <Lock size={18} />}
                      </div>

                      <div className="text-right">
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${rarityColor}`}>
                          {badge.rarity}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted block mt-1">
                          {badge.category}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-text-primary">
                        {badge.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 text-[10px] font-mono">
                    {badge.unlocked ? (
                      <span className="text-primary flex items-center gap-1 font-semibold">
                        <CheckCircle2 size={12} /> Unlocked on {badge.unlockedAt}
                      </span>
                    ) : (
                      <span className="text-text-muted">
                        Req: {badge.requirement}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EDUCATIONAL STREAK TRACKER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'STREAK' && (
        <div className="space-y-4">
          <Card variant="elevated" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-warning/20 border border-warning/40 flex items-center justify-center text-warning">
                  <Flame size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    5-Day Financial Curiosity Streak
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Streaks count consecutive days of curriculum reading, quiz completions, and risk checks.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border font-mono text-center">
                <span className="text-[10px] text-text-muted block uppercase">Streak Protection</span>
                <span className="text-xs font-bold text-primary flex items-center gap-1 justify-center mt-0.5">
                  <Shield size={12} /> 1 Freeze Active
                </span>
              </div>
            </div>

            {/* 7-Day Visual Calendar Tracker */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-text-muted font-semibold block">
                This Week's Activity
              </span>
              <div className="grid grid-cols-7 gap-2 text-center font-mono text-xs">
                {[
                  { day: 'Mon', completed: true, date: '18 Nov' },
                  { day: 'Tue', completed: true, date: '19 Nov' },
                  { day: 'Wed', completed: true, date: '20 Nov' },
                  { day: 'Thu', completed: true, date: '21 Nov' },
                  { day: 'Fri', completed: true, date: '22 Nov' },
                  { day: 'Sat', completed: false, date: '23 Nov' },
                  { day: 'Sun', completed: false, date: '24 Nov' }
                ].map((d, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-between gap-1.5 ${
                      d.completed
                        ? 'bg-warning/15 border-warning/50 text-warning'
                        : 'bg-surface border-border text-text-muted'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold">{d.day}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      d.completed ? 'bg-warning text-background' : 'bg-background text-text-muted'
                    }`}>
                      {d.completed ? <Check size={14} /> : <Clock size={12} />}
                    </div>
                    <span className="text-[9px]">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Rules & Pedagogical Note */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-xs">
              <span className="font-mono font-bold text-text-primary uppercase flex items-center gap-1.5">
                <Compass size={14} className="text-primary" /> How Educational Streaks Work on MINDMARK
              </span>
              <ul className="space-y-1.5 text-text-secondary leading-relaxed list-disc list-inside">
                <li>Completing 1 lesson in the Learn Center extends your streak.</li>
                <li>Answering an AI Market News Explainer quiz extends your streak.</li>
                <li>Executing a simulated trade does <strong>NOT</strong> extend your streak unless accompanied by a written trade thesis and a Pre-Trade Risk Check.</li>
                <li>If you miss a day, your 1 earned Streak Freeze automatically preserves your record.</li>
              </ul>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
