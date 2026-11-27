import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  BrainCircuit,
  Calendar,
  Compass,
  Flame,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { api } from '../services/api';
import { useSimulator } from '../context/SimulatorContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { MentorTrainingLab } from '../components/mentor/MentorTrainingLab';

type LearningTab = 'overview' | 'scenarios' | 'daily' | 'weekly';

const TABS: Array<{ id: LearningTab; label: string; icon: React.ComponentType<any> }> = [
  { id: 'overview', label: 'Learning', icon: BookOpen },
  { id: 'scenarios', label: 'Scenario Lab', icon: Compass },
  { id: 'daily', label: 'Daily Training', icon: Calendar },
  { id: 'weekly', label: 'Weekly Report', icon: Award },
];

export const LearningHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { assessment, behavioralScore } = useSimulator();

  const rawTab = (searchParams.get('tab') || 'overview').toLowerCase();
  const activeTab: LearningTab =
    rawTab === 'scenarios' || rawTab === 'daily' || rawTab === 'weekly' ? rawTab : 'overview';

  const [mentorLevel, setMentorLevel] = useState<{ code: string; label: string; description?: string }>({
    code: 'ABSOLUTE_BEGINNER',
    label: 'Absolute Beginner',
  });
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [gamSummary, setGamSummary] = useState<{ xp: number; streak: number; masteryPct: number }>({
    xp: 240,
    streak: 3,
    masteryPct: 68,
  });

  useEffect(() => {
    const score = behavioralScore?.overallHealth ?? 76;
    api.aiBuddy.getMentorProfile(assessment?.experienceLevel, score).then((res) => {
      if (res.success && res.data?.level) setMentorLevel(res.data.level);
    });
    api.aiBuddy.getWeeklyReport(score).then((res) => {
      if (res.success && res.data) setWeeklyReport(res.data);
    });
    api.gamification?.getProfile?.().then?.((res: any) => {
      if (res?.success && res?.data) {
        setGamSummary({
          xp: Number(res.data.xp ?? 240),
          streak: Number(res.data.streak ?? 3),
          masteryPct: Number(res.data.mastery_pct ?? 68),
        });
      }
    });
  }, [assessment?.experienceLevel, behavioralScore?.overallHealth]);

  const setTab = (tab: LearningTab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Shared Learning Header & Sub-Navigation */}
      <div className="p-5 sm:p-6 rounded-2xl liquid-glass-gold flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm">LEARNING SECTION</Badge>
            <span className="text-xs font-mono text-text-muted">Level: {mentorLevel.label}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            MINDMARK Financial Learning & Scenario Studio
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Structured practice across real historical scenarios, daily training workouts, and behavioral risk reviews.
          </p>
        </div>

        <nav aria-label="Learning sections" className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-primary text-background'
                    : 'bg-background border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Landing View */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-[11px] font-mono text-text-muted uppercase">Learning Level</div>
              <div className="text-lg font-bold text-primary mt-1">{mentorLevel.label}</div>
              <div className="text-[11px] text-text-secondary mt-0.5">Adaptive difficulty active</div>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] font-mono text-text-muted uppercase flex items-center gap-1">
                <Flame size={12} className="text-warning" /> Daily Streak
              </div>
              <div className="text-2xl font-bold font-mono text-warning mt-1">{gamSummary.streak} Days</div>
              <button type="button" onClick={() => setTab('daily')} className="text-[11px] text-primary hover:underline mt-0.5">
                Continue today's session →
              </button>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] font-mono text-text-muted uppercase flex items-center gap-1">
                <Trophy size={12} className="text-secondary" /> Total XP
              </div>
              <div className="text-2xl font-bold font-mono text-text-primary mt-1">{gamSummary.xp} XP</div>
              <button type="button" onClick={() => navigate('/my-progress')} className="text-[11px] text-secondary hover:underline mt-0.5">
                View full progress →
              </button>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] font-mono text-text-muted uppercase">Topic Mastery</div>
              <div className="text-2xl font-bold font-mono text-primary mt-1">{gamSummary.masteryPct}%</div>
              <button type="button" onClick={() => navigate('/learn')} className="text-[11px] text-text-muted hover:text-text-primary mt-0.5">
                Open Visual Diagrams →
              </button>
            </Card>
          </div>

          {/* Primary Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-5 flex flex-col justify-between space-y-4 border-primary/30">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Compass size={20} />
                </div>
                <h2 className="text-base font-bold text-text-primary">Scenario Lab</h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Practice with real historical NSE/Crypto charts (hidden future movement) and randomized Socratic traps.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setTab('scenarios')}>
                Launch Scenario Lab
              </Button>
            </Card>

            <Card className="p-5 flex flex-col justify-between space-y-4 border-secondary/30">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <h2 className="text-base font-bold text-text-primary">Today's Daily Training</h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Guided 6-step workout: 1-minute concept, historical chart check, 2 decision drills, and position sizing math.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTab('daily')}>
                Start Daily Training
              </Button>
            </Card>

            <Card className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center">
                  <Award size={20} />
                </div>
                <h2 className="text-base font-bold text-text-primary">Weekly Report & Spaced Repetition</h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Review your 4 process pillars, weak topics, and upcoming spaced-repetition exercises.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTab('weekly')}>
                Open Weekly Report
              </Button>
            </Card>
          </div>

          {/* Weekly Summary & Spaced Repetition Preview */}
          {weeklyReport && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <BrainCircuit size={16} className="text-primary" /> Weak Topics & Focus Area
                  </h3>
                  <button type="button" onClick={() => setTab('weekly')} className="text-xs font-mono text-primary hover:underline">
                    Full Report →
                  </button>
                </div>
                <p className="text-xs text-text-secondary">{weeklyReport.biggestWeakness}</p>
                <div className="text-xs font-mono text-warning">
                  Recommended: {weeklyReport.recommendedLesson}
                </div>
              </Card>

              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Sparkles size={16} className="text-secondary" /> Upcoming Spaced Repetition
                  </h3>
                  <button type="button" onClick={() => setTab('scenarios')} className="text-xs font-mono text-secondary hover:underline">
                    Practice Now →
                  </button>
                </div>
                <div className="space-y-2">
                  {(weeklyReport.spacedRepetitionQueue || []).map((q: any) => (
                    <div
                      key={q.concept}
                      onClick={() => setTab('scenarios')}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border hover:border-primary/40 cursor-pointer text-xs font-mono"
                    >
                      <span className="text-text-primary">{q.concept}</span>
                      <span className="text-text-muted">Due: {q.due} · {q.masteryPct}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scenarios' && (
        <MentorTrainingLab
          mode="SCENARIOS"
          learningLevelCode={mentorLevel.code}
          learningLevelLabel={mentorLevel.label}
          behavioralScore={behavioralScore?.overallHealth ?? 76}
        />
      )}

      {activeTab === 'daily' && (
        <MentorTrainingLab
          mode="DAILY"
          learningLevelCode={mentorLevel.code}
          learningLevelLabel={mentorLevel.label}
          behavioralScore={behavioralScore?.overallHealth ?? 76}
        />
      )}

      {activeTab === 'weekly' && (
        <MentorTrainingLab
          mode="REPORT"
          learningLevelCode={mentorLevel.code}
          learningLevelLabel={mentorLevel.label}
          behavioralScore={behavioralScore?.overallHealth ?? 76}
        />
      )}
    </div>
  );
};
