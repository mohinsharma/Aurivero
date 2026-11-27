import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Trophy,
  Award,
  GitBranch,
  CheckCircle2,
  Lock,
  Sparkles,
  Clock,
  History,
  ArrowRight,
  SkipForward,
  X,
  Calendar,
} from 'lucide-react';
import api from '../services/api';

export const MyProgressPage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'skill-tree' | 'badges' | 'rewards'>('overview');
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.gamification.getProfile(true);
      setProfile(res?.data ?? res);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  const handleCompleteMission = async (missionId: string) => {
    setBusyId(missionId);
    try {
      const res = await api.gamification.completeMission(missionId);
      const d = res?.data ?? res;
      if (d?.leveled_up) {
        showToast(`Level Up! You reached Level ${d.level_info?.current_level} (${d.level_info?.level_title})!`);
      } else if (d?.newly_unlocked_badges?.length) {
        showToast(`Unlocked badge: ${d.newly_unlocked_badges[0].name}! (+${d.xp_awarded} XP)`);
      } else {
        showToast(`Mission completed! +${d?.xp_awarded || 0} XP earned.`);
      }
      await loadProfile();
    } catch (e: any) {
      showToast(e?.message || 'Could not complete mission');
    } finally {
      setBusyId(null);
    }
  };

  const handleSkipOrDismiss = async (missionId: string, action: 'skip' | 'dismiss') => {
    setBusyId(missionId);
    try {
      if (action === 'skip') await api.gamification.skipMission(missionId);
      else await api.gamification.dismissMission(missionId);
      await loadProfile();
    } finally {
      setBusyId(null);
    }
  };

  const handleCompleteSkill = async (skillId: string) => {
    setBusyId(skillId);
    try {
      const res = await api.gamification.completeSkill(skillId);
      const d = res?.data ?? res;
      if (d?.leveled_up) {
        showToast(`Level Up! You reached Level ${d.level_info?.current_level}!`);
      } else if (d?.newly_unlocked_badges?.length) {
        showToast(`Skill completed & unlocked "${d.newly_unlocked_badges[0].name}"! (+${d.xp_awarded} XP)`);
      } else {
        showToast(`Skill "${d?.skill_name}" completed! +${d?.xp_awarded || 0} XP`);
      }
      await loadProfile();
    } catch (e: any) {
      showToast(e?.message || 'Complete prerequisites first');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !profile) {
    return <div className="p-8 text-sm text-slate-400">Loading My Progress...</div>;
  }

  const lvl = profile?.level_info || {};
  const streak = profile?.streak || {};
  const missions = profile?.missions || {};
  const skillTree = profile?.skill_tree || {};
  const badgesData = profile?.badges || {};
  const seasons = profile?.seasons || {};
  const activeSeason = (seasons.seasons || []).find((s: any) => s.status === 'ACTIVE');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Lightweight Achievement / Level-Up Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#45D6B5] text-[#0B1017] font-bold text-sm shadow-xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header & Level Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#141C25] via-[#101822] to-[#0B1017] border border-border p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#45D6B5]/15 text-[#45D6B5] text-xs font-semibold">
              <Trophy className="w-3.5 h-3.5" /> MY PROGRESS • REWARD BETTER DECISIONS
            </div>
            <h1 className="text-3xl font-extrabold text-text-primary">
              Level {lvl.current_level || 1}: {lvl.level_title || 'Beginner'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">{profile?.coach_summary}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-background/80 border border-border">
              <div className="text-[11px] text-slate-400">Total XP</div>
              <div className="text-2xl font-bold text-[#45D6B5]">{lvl.total_xp || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-background/80 border border-border">
              <div className="text-[11px] text-slate-400">Learning Streak</div>
              <div className="text-2xl font-bold text-amber-400 flex items-center gap-1">
                <Flame className="w-5 h-5" /> {streak.current_streak || 0}d
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-background/80 border border-border">
              <div className="text-[11px] text-slate-400">Badges</div>
              <div className="text-2xl font-bold text-text-primary">
                {badgesData.unlocked_count || 0}/{badgesData.total_count || 0}
              </div>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-slate-300">
            <span>Progress to Level {lvl.next_level} ({lvl.next_level_title})</span>
            <span>{lvl.progress_pct || 0}% • {lvl.xp_needed_for_next || 0} XP needed</span>
          </div>
          <div className="h-3 rounded-full bg-background overflow-hidden border border-border">
            <div
              className="h-full bg-gradient-to-r from-[#45D6B5] to-[#78A9FF] transition-all duration-500"
              style={{ width: `${lvl.progress_pct || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: 'overview', label: 'Missions, Streak & Season', icon: Calendar },
          { id: 'skill-tree', label: `Skill Tree (${skillTree.completed_count || 0}/${skillTree.total_skills || 0})`, icon: GitBranch },
          { id: 'badges', label: `Badges (${badgesData.unlocked_count || 0})`, icon: Award },
          { id: 'rewards', label: 'Reward History', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === t.id
                  ? 'bg-[#45D6B5] text-[#0B1017]'
                  : 'bg-surface text-slate-300 border border-border hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Recommended Next Skill + Streak + Season */}
          <div className="grid lg:grid-cols-3 gap-5">
            {skillTree.recommended_next_skill && (
              <div className="p-5 rounded-2xl bg-surface border border-[#45D6B5]/30 space-y-3">
                <div className="text-[11px] font-mono uppercase text-[#45D6B5]">Recommended Next Skill</div>
                <h3 className="text-base font-bold text-text-primary">{skillTree.recommended_next_skill.name}</h3>
                <p className="text-xs text-slate-300">{skillTree.recommended_next_skill.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <Link
                    to={skillTree.recommended_next_skill.route}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#78A9FF] hover:underline"
                  >
                    {skillTree.recommended_next_skill.activity_label} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => handleCompleteSkill(skillTree.recommended_next_skill.id)}
                    disabled={busyId === skillTree.recommended_next_skill.id}
                    className="px-3 py-1.5 rounded-lg bg-[#45D6B5] text-[#0B1017] text-xs font-bold"
                  >
                    +{skillTree.recommended_next_skill.xp_reward} XP
                  </button>
                </div>
              </div>
            )}

            {/* Learning Streak Calendar */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary uppercase">Weekly Learning Streak</span>
                <span className="text-xs font-mono text-amber-400">Best: {streak.longest_streak || 0}d</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {(streak.weekly_calendar || []).map((day: any) => (
                  <div
                    key={day.date}
                    className={`p-2 rounded-lg text-center border text-[10px] font-mono ${
                      day.completed
                        ? 'bg-[#45D6B5]/20 border-[#45D6B5]/50 text-[#45D6B5]'
                        : 'bg-background border-border text-slate-500'
                    }`}
                  >
                    <div>{day.date.slice(5)}</div>
                    <div className="mt-1">{day.completed ? '✓' : '·'}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Counts meaningful learning activities (UTC). No penalties for missed days or not trading.
              </p>
            </div>

            {/* Active Season */}
            {activeSeason && (
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
                <div className="text-[11px] font-mono uppercase text-[#78A9FF]">{activeSeason.duration} • ACTIVE SEASON</div>
                <h3 className="text-base font-bold text-text-primary">{activeSeason.name}</h3>
                <p className="text-xs text-slate-300">{activeSeason.theme}</p>
                <div className="text-xs font-mono text-[#45D6B5]">Season XP: {activeSeason.user_season_xp}</div>
                <p className="text-[11px] text-slate-400">{seasons.reset_policy}</p>
              </div>
            )}
          </div>

          {/* Daily & Weekly Missions */}
          <div className="grid lg:grid-cols-2 gap-6">
            {[
              { title: 'Daily Missions', items: missions.daily_missions || [] },
              { title: 'Weekly Missions', items: missions.weekly_missions || [] },
            ].map((group) => (
              <div key={group.title} className="space-y-3">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">{group.title}</h2>
                <div className="space-y-3">
                  {group.items.map((m: any) => (
                    <div key={m.id} className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-text-primary">{m.title}</span>
                            {m.is_personalized && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#45D6B5]/15 text-[#45D6B5] font-mono">
                                Personalized
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{m.description}</p>
                          {m.evidence_reason && <p className="text-[11px] text-[#78A9FF] mt-1">{m.evidence_reason}</p>}
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400 shrink-0">+{m.xp_reward} XP</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {m.difficulty} • {m.status}
                        </span>
                        {m.status === 'ACTIVE' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSkipOrDismiss(m.id, 'skip')}
                              className="p-1.5 rounded-lg bg-background text-slate-400 hover:text-text-primary"
                              title="Skip mission"
                            >
                              <SkipForward className="w-3.5 h-3.5" />
                            </button>
                            {m.is_personalized && (
                              <button
                                onClick={() => handleSkipOrDismiss(m.id, 'dismiss')}
                                className="p-1.5 rounded-lg bg-background text-slate-400 hover:text-text-primary"
                                title="Dismiss suggestion"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              disabled={busyId === m.id}
                              onClick={() => handleCompleteMission(m.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#45D6B5] text-[#0B1017] text-xs font-bold"
                            >
                              Complete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'skill-tree' && (
        <div className="grid md:grid-cols-2 gap-6">
          {(skillTree.branches || []).map((b: any) => (
            <div key={b.branch} className="p-5 rounded-2xl bg-surface border border-border space-y-4">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#45D6B5]" /> {b.branch}
              </h2>
              <div className="space-y-3">
                {b.skills.map((s: any) => (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl border ${
                      s.status === 'COMPLETED'
                        ? 'bg-[#45D6B5]/10 border-[#45D6B5]/40'
                        : s.status === 'UNLOCKED'
                        ? 'bg-background border-border'
                        : 'bg-background/50 border-border/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                          {s.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-[#45D6B5]" />}
                          {s.status === 'LOCKED' && <Lock className="w-4 h-4 text-slate-500" />}
                          {s.name}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{s.description}</p>
                        {s.prerequisites.length > 0 && s.status === 'LOCKED' && (
                          <div className="text-[11px] text-amber-400 mt-1">
                            Requires: {s.prerequisites.join(', ')}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-mono text-[#45D6B5] shrink-0">+{s.xp_reward} XP</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                      <Link to={s.route} className="text-xs text-[#78A9FF] hover:underline">
                        {s.activity_label} →
                      </Link>
                      {s.status === 'UNLOCKED' && (
                        <button
                          disabled={busyId === s.id}
                          onClick={() => handleCompleteSkill(s.id)}
                          className="px-3 py-1 rounded-lg bg-[#45D6B5] text-[#0B1017] text-xs font-bold"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(badgesData.badges || []).map((b: any) => (
            <div
              key={b.badge_id}
              className={`p-5 rounded-2xl border space-y-2 ${
                b.unlocked
                  ? 'bg-surface border-[#45D6B5]/40'
                  : 'bg-surface/50 border-border opacity-75'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#78A9FF]">{b.category}</span>
                <span className={b.unlocked ? 'text-[#45D6B5]' : 'text-slate-500'}>
                  {b.unlocked ? 'UNLOCKED' : 'LOCKED'} • {b.rarity}
                </span>
              </div>
              <div className="text-base font-bold text-text-primary">{b.name}</div>
              <p className="text-xs text-slate-300">{b.description}</p>
              <div className="text-[11px] text-amber-400 pt-1">
                {b.unlocked ? `Unlocked: ${b.date_unlocked?.slice(0, 10)}` : `How to unlock: ${b.unlock_condition}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-slate-400 uppercase font-mono">
              <tr>
                <th className="p-4">Reward</th>
                <th className="p-4">Activity</th>
                <th className="p-4">XP</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {(profile?.recent_rewards || []).map((r: any) => (
                <tr key={r.transaction_id}>
                  <td className="p-4 font-semibold">{r.reward_name}</td>
                  <td className="p-4 font-mono text-slate-400">{r.activity_type}</td>
                  <td className="p-4 font-mono text-[#45D6B5]">+{r.xp_amount} XP</td>
                  <td className="p-4 text-emerald-400">{r.status}</td>
                  <td className="p-4 text-right text-slate-400">{r.created_at?.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
              {(profile?.recent_rewards || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Complete a skill or mission to earn your first XP reward.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
