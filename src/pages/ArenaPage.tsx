import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Trophy,
  Swords,
  Clock,
  ShieldCheck,
  Award,
  Users,
  GraduationCap,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Timer,
  Target,
} from 'lucide-react';
import api from '../services/api';
import { MirrorModePage } from './MirrorModePage';

function formatCountdown(targetIso: string, serverNowIso: string, elapsedLocalSec: number): string {
  const targetMs = new Date(targetIso).getTime();
  const baseNowMs = new Date(serverNowIso).getTime() + elapsedLocalSec * 1000;
  const diffSec = Math.max(0, Math.floor((targetMs - baseNowMs) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export const ArenaPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contests' | 'mirror' | 'practice' | 'leaderboards' | 'history'>(
    initialTab === 'mirror' ? 'mirror' : initialTab === 'practice' ? 'practice' : initialTab === 'leaderboards' ? 'leaderboards' : initialTab === 'contests' ? 'contests' : 'overview'
  );

  // Countdown tick synced to server_now
  const [elapsedTick, setElapsedTick] = useState(0);

  // Leaderboards
  const [lbScope, setLbScope] = useState<'global' | 'weekly' | 'monthly' | 'university' | 'friends'>('global');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [uniInput, setUniInput] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [socialMsg, setSocialMsg] = useState<string | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [postReview, setPostReview] = useState<any>(null);
  const [friendChallenges, setFriendChallenges] = useState<any[]>([]);
  const [uniTeams, setUniTeams] = useState<any[]>([]);
  const [publicOptIn, setPublicOptIn] = useState(true);
  const [shareUni, setShareUni] = useState(true);

  // Active Contest Runner
  const [selectedContest, setSelectedContest] = useState<any>(null);
  const [contestStartedAt, setContestStartedAt] = useState<string>('');
  const [contestElapsedSec, setContestElapsedSec] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [stageDecisions, setStageDecisions] = useState<any[]>([]);
  const [stageAction, setStageAction] = useState('');
  const [stageReasoning, setStageReasoning] = useState('');
  const [reviewedPanels, setReviewedPanels] = useState<string[]>([]);

  // Portfolio Architect state
  const [allocation, setAllocation] = useState<Record<string, number>>({
    TCS: 20,
    HDFCBANK: 20,
    SUNPHARMA: 15,
    ITC: 15,
    NIFTYBEES: 20,
    SMALLCAPX: 10,
  });

  // Bias Buster state
  const [selectedBias, setSelectedBias] = useState('');
  const [mitigationPlan, setMitigationPlan] = useState('');

  // Analyst Duel state
  const [duelArg, setDuelArg] = useState('');
  const [duelEv, setDuelEv] = useState('');
  const [duelRisks, setDuelRisks] = useState('');
  const [duelResult, setDuelResult] = useState<any>(null);

  // Submission result
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.arena.getDashboard();
      const d = res?.data ?? res;
      setDashboard(d);
      setElapsedTick(0);
      setUniInput(d?.user_stats?.university_name || '');
      setPublicOptIn(d?.user_stats?.public_leaderboard_opt_in ?? true);
      setShareUni(d?.user_stats?.share_university ?? true);
    } catch (e: any) {
      setError(e?.message || 'Failed to load MINDMARK Arena');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (scope: 'global' | 'weekly' | 'monthly' | 'university' | 'friends') => {
    try {
      const [res, uniRes, fcRes] = await Promise.all([
        api.arena.getLeaderboard(scope),
        api.arena.getUniversityLeague(),
        api.arena.listFriendChallenges(),
      ]);
      const d = res?.data ?? res;
      setLeaderboard(d?.entries || []);
      setUniTeams((uniRes?.data ?? uniRes)?.teams || []);
      setFriendChallenges(fcRes?.data ?? fcRes ?? []);
    } catch {
      setLeaderboard([]);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboards') {
      loadLeaderboard(lbScope);
    }
  }, [activeTab, lbScope]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedTick((t) => t + 1);
      if (selectedContest && !submitResult) {
        setContestElapsedSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [selectedContest, submitResult]);

  const openContest = async (contestId: string, practice = false) => {
    setError(null);
    setSubmitResult(null);
    setPostReview(null);
    setDuelResult(null);
    setIsPracticeMode(practice);
    setReflectionText('');
    try {
      const res = await api.arena.getContestDetail(contestId);
      const detail = res?.data ?? res;
      setSelectedContest(detail);
      setContestStartedAt(detail.server_now || new Date().toISOString());
      setContestElapsedSec(0);
      setStageIdx(0);
      setStageDecisions([]);
      setStageAction('');
      setStageReasoning('');
      setReviewedPanels([]);
      setSelectedBias('');
      setMitigationPlan('');
      setDuelArg('');
      setDuelEv('');
      setDuelRisks('');
      if (!practice && detail.existing_entry) {
        setSubmitResult(detail.existing_entry);
        try {
          const rev = await api.arena.getContestResults(contestId);
          setPostReview(rev?.data ?? rev);
        } catch {
          // ignore if unavailable
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to open contest');
    }
  };

  const togglePanel = (id: string) => {
    setReviewedPanels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleNextStageOrSubmit = async () => {
    if (!selectedContest) return;
    const ctype = selectedContest.contest_type;
    const stages = selectedContest.scenario?.stages || [];

    if (ctype === 'CRASH_SURVIVOR' || ctype === 'DECISION_PRESSURE') {
      if (!stageAction || stageReasoning.trim().length < 5) {
        setError('Please select an action and write a brief reasoning (at least 5 characters).');
        return;
      }
      const nextDecs = [
        ...stageDecisions,
        {
          stage_index: stageIdx,
          action: stageAction,
          reasoning: stageReasoning.trim(),
          reviewed_info: reviewedPanels,
          confidence_level: 4,
        },
      ];
      if (stageIdx + 1 < stages.length) {
        setStageDecisions(nextDecs);
        setStageIdx(stageIdx + 1);
        setStageAction('');
        setStageReasoning('');
        setReviewedPanels([]);
        setError(null);
        return;
      }
      await submitToBackend({
        started_at: contestStartedAt,
        duration_sec: contestElapsedSec,
        stage_decisions: nextDecs,
        use_ai: true,
      });
      return;
    }

    if (ctype === 'FOMO_TRAP') {
      if (!stageAction || stageReasoning.trim().length < 5) {
        setError('Choose your decision and explain your reasoning.');
        return;
      }
      await submitToBackend({
        started_at: contestStartedAt,
        duration_sec: contestElapsedSec,
        stage_decisions: [
          {
            stage_index: 0,
            action: stageAction,
            reasoning: stageReasoning.trim(),
            reviewed_info: reviewedPanels,
            confidence_level: 4,
          },
        ],
        use_ai: true,
      });
      return;
    }

    if (ctype === 'PORTFOLIO_ARCHITECT') {
      const total = Object.values(allocation).reduce((a, b) => a + Number(b || 0), 0);
      if (Math.abs(total - 100) > 1) {
        setError(`Portfolio weights must sum to 100% (currently ${total}%).`);
        return;
      }
      if (stageReasoning.trim().length < 5) {
        setError('Please explain your diversification and risk reasoning.');
        return;
      }
      await submitToBackend({
        started_at: contestStartedAt,
        duration_sec: contestElapsedSec,
        allocation,
        reasoning: stageReasoning.trim(),
        reviewed_info: reviewedPanels,
        use_ai: true,
      });
      return;
    }

    if (ctype === 'BIAS_BUSTER') {
      if (!selectedBias || mitigationPlan.trim().length < 5) {
        setError('Select the behavioral bias and propose a risk guardrail.');
        return;
      }
      await submitToBackend({
        started_at: contestStartedAt,
        duration_sec: contestElapsedSec,
        selected_bias: selectedBias,
        mitigation_plan: mitigationPlan.trim(),
        use_ai: true,
      });
      return;
    }

    if (ctype === 'ANALYST_DUEL') {
      if (duelArg.trim().length < 10 || duelEv.trim().length < 10 || duelRisks.trim().length < 10) {
        setError('Provide at least 10 characters each for your argument, evidence, and risks.');
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const duelRes = await api.arena.createDuel({
          contest_id: selectedContest.id,
          argument: duelArg.trim(),
          evidence: duelEv.trim(),
          risks: duelRisks.trim(),
          auto_match_benchmark: true,
          use_ai: true,
        });
        setDuelResult(duelRes?.data ?? duelRes);
        await submitToBackend({
          started_at: contestStartedAt,
          duration_sec: contestElapsedSec,
          argument: duelArg.trim(),
          evidence: duelEv.trim(),
          risks: duelRisks.trim(),
          use_ai: true,
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to submit Analyst Duel');
        setSubmitting(false);
      }
    }
  };

  const submitToBackend = async (payload: any) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.arena.submitContest(selectedContest.id, {
        ...payload,
        is_practice: isPracticeMode,
        reflection_text: reflectionText.trim(),
      });
      setSubmitResult(res?.data ?? res);
      if (!isPracticeMode) {
        try {
          const rev = await api.arena.getContestResults(selectedContest.id);
          setPostReview(rev?.data ?? rev);
        } catch {
          // ignore
        }
      }
      await loadDashboard();
    } catch (e: any) {
      setError(e?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !dashboard) {
    return <div className="p-8 text-sm text-text-muted">Loading MINDMARK Arena...</div>;
  }

  // Contest Runner View
  if (selectedContest) {
    const ctype = selectedContest.contest_type;
    const stages = selectedContest.scenario?.stages || [];
    const currentStage = stages[stageIdx];
    const panels = currentStage?.info_panels || selectedContest.scenario?.info_panels || [];

    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <button
          onClick={() => setSelectedContest(null)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-accent-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to MINDMARK Arena
        </button>

        <div className="rounded-2xl bg-[#141C25] border border-white/10 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#45D6B5]/15 text-[#45D6B5]">
                {ctype.replace('_', ' ')} • {selectedContest.difficulty}
              </span>
              <h1 className="text-2xl font-bold text-white mt-2">{selectedContest.title}</h1>
              <p className="text-xs text-slate-400 mt-1">{selectedContest.data_source_label}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0B1017] border border-white/10 text-xs font-mono text-slate-200">
              <Timer className="w-4 h-4 text-[#45D6B5]" />
              <span>Elapsed: {contestElapsedSec}s</span>
              {ctype === 'DECISION_PRESSURE' && (
                <span className="text-amber-400 ml-1">/ {selectedContest.time_window_sec}s window</span>
              )}
              <button
                onClick={async () => {
                  const next = !publicOptIn;
                  setPublicOptIn(next);
                  await api.arena.updateProfile({ public_leaderboard_opt_in: next });
                  loadLeaderboard(lbScope);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141C25] border border-white/10 text-xs text-slate-300"
              >
                Public Rank: {publicOptIn ? 'Visible' : 'Opted Out'}
              </button>
              <button
                onClick={async () => {
                  const next = !shareUni;
                  setShareUni(next);
                  await api.arena.updateProfile({ share_university: next });
                  loadLeaderboard(lbScope);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141C25] border border-white/10 text-xs text-slate-300"
              >
                Share Uni: {shareUni ? 'On' : 'Private'}
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-300">{selectedContest.description}</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {submitResult ? (
          <div className="rounded-2xl bg-[#141C25] border border-[#45D6B5]/30 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#45D6B5]" />
              <div>
                <h2 className="text-lg font-bold text-white">Official Arena Score Recorded</h2>
                <p className="text-xs text-slate-400">
                  Evaluated on decision quality, risk discipline, evidence, and consistency.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10">
                <div className="text-[11px] text-slate-400">Decision Score</div>
                <div className="text-2xl font-bold text-[#45D6B5]">{submitResult.total_score}/100</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10">
                <div className="text-[11px] text-slate-400">Reasoning</div>
                <div className="text-lg font-semibold text-white">{submitResult.reasoning_score}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10">
                <div className="text-[11px] text-slate-400">Risk Discipline</div>
                <div className="text-lg font-semibold text-white">{submitResult.risk_score}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10">
                <div className="text-[11px] text-slate-400">Evidence</div>
                <div className="text-lg font-semibold text-white">{submitResult.evidence_score}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10">
                <div className="text-[11px] text-slate-400">Rewards</div>
                <div className="text-sm font-semibold text-amber-400">
                  +{submitResult.arena_points_awarded} Pts • +{submitResult.xp_awarded} XP
                </div>
              </div>
            </div>

            {duelResult && (
              <div className="p-4 rounded-xl bg-[#0B1017] border border-white/10 space-y-2">
                <div className="text-xs font-semibold text-[#45D6B5] uppercase">Analyst Duel Comparison</div>
                <div className="text-sm text-slate-200">
                  Your Score: <span className="font-bold">{duelResult.challenger_score}</span> vs Benchmark Analyst:{' '}
                  <span className="font-bold">{duelResult.opponent_score}</span> —{' '}
                  <span className="text-amber-300 font-semibold">
                    {duelResult.winner_id === 'BENCHMARK_ANALYST' ? 'Benchmark Won' : 'You Won the Duel!'}
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#0B1017] border border-white/10 text-sm text-slate-200">
              <div className="text-xs font-semibold text-slate-400 mb-1">
                Coach Feedback ({submitResult.ai_source})
              </div>
              {submitResult.ai_feedback}
            </div>

            {postReview && (
              <div className="p-4 rounded-xl bg-[#0B1017] border border-white/10 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-[#45D6B5] uppercase">Post-Contest Performance Review</div>
                <div>
                  Rank: <span className="font-bold text-white">#{postReview.final_rank}</span> of {postReview.total_participants}
                  {postReview.contest_average_score != null && (
                    <span> • Contest Avg: <span className="font-bold text-white">{postReview.contest_average_score}/100</span></span>
                  )}
                </div>
                <div>Strongest Decision: <span className="text-white">{postReview.strongest_decision}</span></div>
                <div>Area to Improve: <span className="text-amber-300">{postReview.decision_needing_improvement}</span></div>
                <div>Recommended Practice: <span className="text-[#45D6B5]">{postReview.learning_recommendation}</span></div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-[#141C25] border border-white/10 p-6 space-y-5">
            {/* Multi-stage Crash Survivor / Decision Pressure */}
            {(ctype === 'CRASH_SURVIVOR' || ctype === 'DECISION_PRESSURE') && currentStage && (
              <div className="space-y-4">
                <div className="text-xs font-mono text-[#45D6B5]">
                  STAGE {stageIdx + 1} OF {stages.length}
                </div>
                <h2 className="text-lg font-bold text-white">{currentStage.headline}</h2>
                <p className="text-sm text-slate-300">{currentStage.summary}</p>
              </div>
            )}

            {/* FOMO Trap */}
            {ctype === 'FOMO_TRAP' && (
              <div className="p-4 rounded-xl bg-[#0B1017] border border-white/10">
                <div className="text-sm font-semibold text-white">
                  Simulated Asset: {selectedContest.scenario?.asset_symbol} (+{selectedContest.scenario?.recent_move_pct}%)
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect the valuation, filing, and liquidity panels below before deciding.
                </p>
              </div>
            )}

            {/* Evidence Panels */}
            {panels.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Evidence Panels (Click to mark reviewed)
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {panels.map((p: any) => {
                    const checked = reviewedPanels.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePanel(p.id)}
                        className={`text-left p-4 rounded-xl border transition ${
                          checked
                            ? 'bg-[#45D6B5]/10 border-[#45D6B5]/50'
                            : 'bg-[#0B1017] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">{p.title}</span>
                          <span className="text-[11px] font-mono text-[#45D6B5]">
                            {checked ? 'REVIEWED' : 'CLICK TO REVIEW'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-2">{p.content}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action selector for stage/FOMO contests */}
            {(ctype === 'CRASH_SURVIVOR' || ctype === 'DECISION_PRESSURE' || ctype === 'FOMO_TRAP') && (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase text-slate-400">Your Decision</div>
                <div className="flex flex-wrap gap-2">
                  {(currentStage?.permitted_actions || selectedContest.scenario?.permitted_actions || []).map((act: string) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setStageAction(act)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                        stageAction === act
                          ? 'bg-[#45D6B5] text-[#0B1017] border-[#45D6B5]'
                          : 'bg-[#0B1017] text-slate-200 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {act.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
                <textarea
                  value={stageReasoning}
                  onChange={(e) => setStageReasoning(e.target.value)}
                  rows={3}
                  placeholder="Explain your reasoning, risk check, and what evidence guided your decision..."
                  className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-[#45D6B5]"
                />
              </div>
            )}

            {/* Portfolio Architect */}
            {ctype === 'PORTFOLIO_ARCHITECT' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {(selectedContest.scenario?.assets || []).map((a: any) => (
                    <div key={a.symbol} className="p-3 rounded-xl bg-[#0B1017] border border-white/10 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">{a.symbol}</div>
                        <div className="text-xs text-slate-400">
                          {a.sector} • {a.volatility} Vol (β {a.beta})
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={allocation[a.symbol] ?? 0}
                          onChange={(e) =>
                            setAllocation({ ...allocation, [a.symbol]: Number(e.target.value) })
                          }
                          className="w-16 rounded-lg bg-[#141C25] border border-white/15 px-2 py-1 text-right text-sm text-white"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs font-mono text-slate-300">
                  Total Weight: {Object.values(allocation).reduce((a, b) => a + Number(b || 0), 0)}% (must equal 100%)
                </div>
                <textarea
                  value={stageReasoning}
                  onChange={(e) => setStageReasoning(e.target.value)}
                  rows={3}
                  placeholder="Explain your sector diversification, concentration cap, and risk balance..."
                  className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-3 text-sm text-white"
                />
              </div>
            )}

            {/* Bias Buster */}
            {ctype === 'BIAS_BUSTER' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#0B1017] border border-white/10 text-sm text-slate-200 italic">
                  "{selectedContest.scenario?.vignette}"
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(selectedContest.scenario?.bias_options || []).map((opt: string) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedBias(opt)}
                      className={`p-3 rounded-xl text-left text-xs font-semibold border ${
                        selectedBias === opt
                          ? 'bg-[#45D6B5]/20 border-[#45D6B5] text-white'
                          : 'bg-[#0B1017] border-white/10 text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <textarea
                  value={mitigationPlan}
                  onChange={(e) => setMitigationPlan(e.target.value)}
                  rows={3}
                  placeholder="How should the trader prevent this bias next time? (e.g., cooling-off rule, max position cap)"
                  className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-3 text-sm text-white"
                />
              </div>
            )}

            {/* Analyst Duel */}
            {ctype === 'ANALYST_DUEL' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#0B1017] border border-white/10 space-y-2">
                  <div className="text-sm font-bold text-white">{selectedContest.scenario?.case_title}</div>
                  <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                    {(selectedContest.scenario?.case_facts || []).map((f: string, idx: number) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
                <textarea
                  value={duelArg}
                  onChange={(e) => setDuelArg(e.target.value)}
                  rows={2}
                  placeholder="Your core investment thesis / argument..."
                  className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-3 text-sm text-white"
                />
                <textarea
                  value={duelEv}
                  onChange={(e) => setDuelEv(e.target.value)}
                  rows={2}
                  placeholder="Supporting evidence from the case facts..."
                  className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-3 text-sm text-white"
                />
                <textarea
                  value={duelRisks}
                  onChange={(e) => setDuelRisks(e.target.value)}
                  rows={2}
                  placeholder="Key downside risks and invalidation triggers..."
                  className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-3 text-sm text-white"
                />
              </div>
            )}

            {/* Post-contest reflection (+20 XP on official entries) */}
            {(!((ctype === 'CRASH_SURVIVOR' || ctype === 'DECISION_PRESSURE') && stageIdx + 1 < stages.length)) && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-400">
                  Post-Contest Reflection (Optional, +20 XP on official submission)
                </label>
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  rows={2}
                  placeholder="What did you learn about your decision discipline in this scenario?"
                  className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-3 text-sm text-white"
                />
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleNextStageOrSubmit}
              className="px-6 py-3 rounded-xl bg-[#45D6B5] text-[#0B1017] font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {submitting
                ? 'Evaluating Decision...'
                : (ctype === 'CRASH_SURVIVOR' || ctype === 'DECISION_PRESSURE') && stageIdx + 1 < stages.length
                ? 'Confirm Stage & Continue'
                : isPracticeMode
                ? 'Submit Practice Run'
                : 'Submit Official Entry'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const stats = dashboard?.user_stats || {};

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Hero Section */}
      <div className="rounded-3xl bg-gradient-to-br from-[#141C25] via-[#101822] to-[#0B1017] border border-white/10 p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#45D6B5]/15 text-[#45D6B5] text-xs font-semibold">
              <Swords className="w-3.5 h-3.5" /> MINDMARK ARENA • EDUCATIONAL COMPETITION
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {dashboard?.hero_headline || 'Your decisions. Your competition. Your rank.'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              {dashboard?.tagline || 'Think smarter. Decide better. Rise through the ranks.'} Compete on
              decision quality, risk discipline, and analytical rigor — never reckless virtual returns.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-[#0B1017]/80 border border-white/10">
              <div className="text-[11px] text-slate-400">Global Rank</div>
              <div className="text-2xl font-bold text-[#45D6B5]">#{stats.global_rank || 1}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0B1017]/80 border border-white/10">
              <div className="text-[11px] text-slate-400">Arena Points</div>
              <div className="text-2xl font-bold text-white">{stats.arena_points || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0B1017]/80 border border-white/10">
              <div className="text-[11px] text-slate-400">Current League</div>
              <div className="text-xl font-bold text-amber-400">{stats.league || 'Bronze'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0B1017]/80 border border-white/10">
              <div className="text-[11px] text-slate-400">Achievements</div>
              <div className="text-2xl font-bold text-white">{(stats.achievements || []).length}</div>
              <button
                onClick={async () => {
                  const next = !publicOptIn;
                  setPublicOptIn(next);
                  await api.arena.updateProfile({ public_leaderboard_opt_in: next });
                  loadLeaderboard(lbScope);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141C25] border border-white/10 text-xs text-slate-300"
              >
                Public Rank: {publicOptIn ? 'Visible' : 'Opted Out'}
              </button>
              <button
                onClick={async () => {
                  const next = !shareUni;
                  setShareUni(next);
                  await api.arena.updateProfile({ share_university: next });
                  loadLeaderboard(lbScope);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141C25] border border-white/10 text-xs text-slate-300"
              >
                Share Uni: {shareUni ? 'On' : 'Private'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'overview', label: 'Overview', icon: Sparkles },
          { id: 'contests', label: 'Contests', icon: Trophy },
          { id: 'mirror', label: 'Mirror Challenges', icon: Target },
          { id: 'practice', label: 'Practice', icon: ShieldCheck },
          { id: 'leaderboards', label: 'Leaderboards', icon: Users },
          { id: 'history', label: 'History', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchParams({ tab: tab.id });
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                active
                  ? 'bg-[#45D6B5] text-[#0B1017]'
                  : 'bg-[#141C25] text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {(activeTab === 'overview' || activeTab === 'contests') && (
        <div className="space-y-8">
          {/* Recommended Contests */}
          {dashboard?.recommended_contests?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="w-4 h-4 text-[#45D6B5]" /> Recommended for Your Skill & Decision Profile
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {dashboard.recommended_contests.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl bg-[#141C25] border border-[#45D6B5]/25 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#45D6B5]/15 text-[#45D6B5]">
                        {c.is_personalized ? 'Personalized Match' : 'Skill Match'}
                      </span>
                      <h3 className="text-base font-bold text-white">{c.title}</h3>
                      <p className="text-xs text-slate-300">{c.why_recommended}</p>
                    </div>
                    <button
                      onClick={() => openContest(c.id)}
                      className="w-full py-2.5 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold hover:opacity-90"
                    >
                      {c.user_submitted ? 'View Official Score' : 'Enter Contest'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Contests */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Active Contests ({dashboard?.active_contests?.length || 0})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(dashboard?.active_contests || []).map((c: any) => (
                <div key={c.id} className="p-5 rounded-2xl bg-[#141C25] border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{c.contest_type.replace('_', ' ')}</span>
                      <span className="text-[#45D6B5]">{c.difficulty}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{c.title}</h3>
                    <p className="text-xs text-slate-300">{c.description}</p>
                    <div className="text-[11px] text-slate-500 font-mono">{c.data_source_label}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openContest(c.id, false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-[#45D6B5] hover:text-[#0B1017] text-white text-xs font-bold transition"
                    >
                      {c.user_submitted ? 'View Submission' : 'Compete Now'}
                    </button>
                    <button
                      onClick={() => openContest(c.id, true)}
                      className="px-3 py-2.5 rounded-xl bg-[#0B1017] border border-white/10 hover:border-[#45D6B5]/50 text-slate-300 text-xs font-semibold transition"
                    >
                      Practice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming Contests with Real Server Countdown */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Upcoming Contests</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {(dashboard?.upcoming_contests || []).map((c: any) => (
                <div key={c.id} className="p-5 rounded-2xl bg-[#141C25] border border-white/10 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-amber-400">{c.league_scope} LEAGUE</div>
                    <h3 className="text-base font-bold text-white">{c.title}</h3>
                    <p className="text-xs text-slate-400">{c.description}</p>
                  </div>
                  <div className="shrink-0 text-right px-4 py-2 rounded-xl bg-[#0B1017] border border-white/10">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-[#45D6B5]" /> Starts In
                    </div>
                    <div className="text-sm font-mono font-bold text-[#45D6B5]">
                      {formatCountdown(c.starts_at, dashboard.server_now, elapsedTick)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Completed Contests */}
          {dashboard?.completed_contests?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Completed Benchmarks</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {dashboard.completed_contests.map((c: any) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-[#141C25]/70 border border-white/10">
                    <div className="text-xs font-mono text-slate-400">{c.data_source_label}</div>
                    <div className="text-sm font-bold text-white mt-1">{c.title}</div>
                    <p className="text-xs text-slate-400 mt-1">{c.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'mirror' && (
        <div className="rounded-2xl bg-[#0B1017]/60 border border-white/10 overflow-hidden">
          <MirrorModePage />
        </div>
      )}

      {activeTab === 'practice' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#141C25] border border-[#45D6B5]/25 text-xs text-slate-300">
            <span className="font-bold text-[#45D6B5]">Practice Arena:</span> Ungraded practice runs let you rehearse any contest scenario without affecting your official Arena rank or XP.
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(dashboard?.active_contests || []).map((c: any) => (
              <div key={c.id} className="p-5 rounded-2xl bg-[#141C25] border border-white/10 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-slate-400">{c.contest_type.replace('_', ' ')} • {c.difficulty}</div>
                  <h3 className="text-base font-bold text-white">{c.title}</h3>
                  <p className="text-xs text-slate-300">{c.description}</p>
                </div>
                <button
                  onClick={() => openContest(c.id, true)}
                  className="w-full py-2.5 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold hover:opacity-90"
                >
                  Start Ungraded Practice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboards' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'global', label: 'Global', icon: Globe },
                { id: 'weekly', label: 'Weekly', icon: Clock },
                { id: 'monthly', label: 'Monthly', icon: Trophy },
                { id: 'university', label: 'University League', icon: GraduationCap },
                { id: 'friends', label: 'Friends', icon: Users },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setLbScope(s.id as any)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
                      lbScope === s.id
                        ? 'bg-[#45D6B5] text-[#0B1017]'
                        : 'bg-[#141C25] text-slate-300 border border-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {s.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                value={uniInput}
                onChange={(e) => setUniInput(e.target.value)}
                placeholder="Your University"
                className="rounded-xl bg-[#141C25] border border-white/10 px-3 py-1.5 text-xs text-white"
              />
              <button
                onClick={async () => {
                  if (!uniInput.trim()) return;
                  await api.arena.setUniversity(uniInput.trim());
                  setSocialMsg(`University league updated to ${uniInput.trim()}`);
                  loadDashboard();
                  if (lbScope === 'university') loadLeaderboard('university');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
              >
                Save University
              </button>

              <input
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                placeholder="Friend's email"
                className="rounded-xl bg-[#141C25] border border-white/10 px-3 py-1.5 text-xs text-white"
              />
              <button
                onClick={async () => {
                  if (!friendEmail.trim()) return;
                  try {
                    const r = await api.arena.addFriend(friendEmail.trim());
                    setSocialMsg(`Added ${r?.data?.full_name || friendEmail} to Friends League!`);
                    setFriendEmail('');
                    if (lbScope === 'friends') loadLeaderboard('friends');
                  } catch (e: any) {
                    setSocialMsg(e?.message || 'Could not add friend');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold"
              >
                Add Friend
              </button>
              <button
                onClick={async () => {
                  const next = !publicOptIn;
                  setPublicOptIn(next);
                  await api.arena.updateProfile({ public_leaderboard_opt_in: next });
                  loadLeaderboard(lbScope);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141C25] border border-white/10 text-xs text-slate-300"
              >
                Public Rank: {publicOptIn ? 'Visible' : 'Opted Out'}
              </button>
              <button
                onClick={async () => {
                  const next = !shareUni;
                  setShareUni(next);
                  await api.arena.updateProfile({ share_university: next });
                  loadLeaderboard(lbScope);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141C25] border border-white/10 text-xs text-slate-300"
              >
                Share Uni: {shareUni ? 'On' : 'Private'}
              </button>
            </div>
          </div>

          {socialMsg && <div className="text-xs text-[#45D6B5]">{socialMsg}</div>}

          <div className="rounded-2xl bg-[#141C25] border border-white/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1017] text-slate-400 uppercase font-mono">
                <tr>
                  <th className="p-4">Rank</th>
                  <th className="p-4">Competitor</th>
                  <th className="p-4">University</th>
                  <th className="p-4">League</th>
                  <th className="p-4">Contests</th>
                  <th className="p-4 text-right">Arena Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {leaderboard.map((row) => (
                  <tr key={row.user_id} className={row.is_current_user ? 'bg-[#45D6B5]/10' : ''}>
                    <td className="p-4 font-mono font-bold text-[#45D6B5]">#{row.rank}</td>
                    <td className="p-4 font-semibold">
                      {row.full_name} {row.is_current_user && <span className="text-[10px] text-[#45D6B5]">(You)</span>}
                    </td>
                    <td className="p-4 text-slate-400">{row.university_name}</td>
                    <td className="p-4 text-amber-400 font-semibold">{row.league}</td>
                    <td className="p-4">{row.contests_completed}</td>
                    <td className="p-4 text-right font-mono font-bold">{row.arena_points}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No competitors in this leaderboard view yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Contest Participation History</h2>
            {(dashboard?.participation_history || []).length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#141C25] border border-white/10 text-sm text-slate-400">
                No contests completed yet. Enter an active contest to record your first official score.
              </div>
            ) : (
              dashboard.participation_history.map((h: any) => (
                <div key={h.entry_id} className="p-4 rounded-2xl bg-[#141C25] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white text-sm">{h.contest_title}</div>
                    <div className="text-sm font-mono font-bold text-[#45D6B5]">{h.total_score}/100</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    +{h.arena_points_awarded} Arena Points • +{h.xp_awarded} XP • {h.contest_type}
                  </div>
                  {h.ai_feedback && <p className="text-xs text-slate-300">{h.ai_feedback}</p>}
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Achievements</h2>
            <div className="p-5 rounded-2xl bg-[#141C25] border border-white/10 space-y-3">
              {(stats.achievements || []).length === 0 ? (
                <div className="text-xs text-slate-400">Complete contests to unlock Arena badges.</div>
              ) : (
                stats.achievements.map((badge: string) => (
                  <div key={badge} className="flex items-center gap-3 p-3 rounded-xl bg-[#0B1017] border border-white/10">
                    <ShieldCheck className="w-5 h-5 text-[#45D6B5]" />
                    <span className="text-sm font-semibold text-white">{badge}</span>
                  </div>
                ))
              )}
              <button
                onClick={async () => {
                  const next = !publicOptIn;
                  setPublicOptIn(next);
                  await api.arena.updateProfile({ public_leaderboard_opt_in: next });
                  loadLeaderboard(lbScope);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141C25] border border-white/10 text-xs text-slate-300"
              >
                Public Rank: {publicOptIn ? 'Visible' : 'Opted Out'}
              </button>
              <button
                onClick={async () => {
                  const next = !shareUni;
                  setShareUni(next);
                  await api.arena.updateProfile({ share_university: next });
                  loadLeaderboard(lbScope);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141C25] border border-white/10 text-xs text-slate-300"
              >
                Share Uni: {shareUni ? 'On' : 'Private'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
