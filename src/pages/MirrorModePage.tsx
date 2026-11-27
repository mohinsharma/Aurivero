import React, { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  Clock,
  CheckCircle2,
  Award,
  ArrowRight,
  RotateCcw,
  SkipForward,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronLeft
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const MirrorModePage: React.FC = () => {
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CHALLENGES' | 'HISTORY'>('CHALLENGES');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Challenge Runner State
  const [activeChallenge, setActiveChallenge] = useState<any | null>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [step, setStep] = useState<'INTRO' | 'STAGE' | 'REFLECT' | 'RESULTS'>('INTRO');
  const [declaredStrategy, setDeclaredStrategy] = useState('Risk-controlled disciplined execution (max 25% single asset)');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(3);
  const [invalidationTrigger, setInvalidationTrigger] = useState<string>('');
  const [reviewedInfo, setReviewedInfo] = useState<string[]>([]);
  const [allocation, setAllocation] = useState<Record<string, number>>({
    TCS: 15,
    INFY: 15,
    HDFCBANK: 20,
    RELIANCE: 20,
    ITC: 15,
    SUNPHARMA: 15,
  });
  const [reflectionText, setReflectionText] = useState<string>('');
  const [completionResult, setCompletionResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMsg(null);
    if (!api.getToken()) {
      await api.auth.demoLogin();
    }
    const [dashRes, histRes] = await Promise.all([
      api.mirror.getChallenges(),
      api.mirror.getHistory(),
    ]);
    if (dashRes.success && dashRes.data) setDashboard(dashRes.data);
    else setErrorMsg(dashRes.error?.detail || dashRes.error?.message || 'Could not load Mirror Mode.');
    if (histRes.success && histRes.data) setHistory(histRes.data.results || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openChallengeIntro = async (challengeId: string) => {
    setErrorMsg(null);
    const res = await api.mirror.getChallengeDetail(challengeId);
    if (res.success && res.data) {
      setActiveChallenge(res.data);
      setActiveSession(null);
      setCompletionResult(null);
      setStep('INTRO');
      setReviewedInfo([]);
      setReasoning('');
      setInvalidationTrigger('');
      setReflectionText('');
      setConfidence(3);
    }
  };

  const handleStartSession = async (isPractice = false) => {
    if (!activeChallenge) return;
    setSubmitting(true);
    const res = await api.mirror.startChallenge({
      challenge_id: activeChallenge.id,
      is_practice: isPractice,
      declared_strategy: declaredStrategy,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      setActiveSession(res.data);
      const firstActions = res.data.stage?.permitted_actions || [];
      setSelectedAction(firstActions[0] || '');
      setReviewedInfo([]);
      setStep('STAGE');
    } else {
      setErrorMsg(res.error?.detail || 'Could not start challenge session.');
    }
  };

  const handleToggleInfoPanel = (panelId: string) => {
    setReviewedInfo((prev) => (prev.includes(panelId) ? prev : [...prev, panelId]));
  };

  const handleSubmitDecision = async () => {
    if (!activeChallenge || !activeSession || !selectedAction || !reasoning.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    const stageIdx = activeSession.current_stage;
    const isDiversificationSubmit = selectedAction === 'SUBMIT_ALLOCATION';

    const res = await api.mirror.submitDecision(activeChallenge.id, {
      session_id: activeSession.session_id,
      stage_index: stageIdx,
      client_decision_id: `mdec-${activeSession.session_id}-${stageIdx}`,
      action: selectedAction,
      allocation: isDiversificationSubmit ? allocation : undefined,
      reasoning,
      confidence_level: confidence,
      invalidation_trigger: invalidationTrigger || undefined,
      reviewed_info: reviewedInfo,
    });
    setSubmitting(false);

    if (res.success && res.data) {
      if (res.data.ready_to_complete) {
        setStep('REFLECT');
      } else {
        setActiveSession((prev: any) => ({
          ...prev,
          current_stage: res.data.next_stage_index,
          stage: res.data.next_stage,
          portfolio_state: res.data.portfolio_state,
        }));
        const nextActions = res.data.next_stage?.permitted_actions || [];
        setSelectedAction(nextActions[0] || '');
        setReasoning('');
        setInvalidationTrigger('');
        setReviewedInfo([]);
      }
    } else {
      setErrorMsg(res.error?.detail || 'Failed to record decision.');
    }
  };

  const handleCompleteChallenge = async () => {
    if (!activeChallenge || !activeSession) return;
    setSubmitting(true);
    setErrorMsg(null);
    const res = await api.mirror.completeChallenge(activeChallenge.id, {
      session_id: activeSession.session_id,
      reflection_text: reflectionText,
      use_ai: true,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      setCompletionResult(res.data);
      setStep('RESULTS');
      loadDashboard();
    } else {
      setErrorMsg(res.error?.detail || 'Could not complete challenge.');
    }
  };

  const handleSkipChallenge = async (challengeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.mirror.skipChallenge(challengeId);
    loadDashboard();
  };

  // =========================================================================
  // RENDER: FOCUSED 5-STEP CHALLENGE RUNNER
  // =========================================================================
  if (activeChallenge) {
    const currentStage = activeSession?.stage;
    const allocTotal = Object.values(allocation).reduce((acc, v) => acc + v, 0);

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveChallenge(null)}
            className="font-mono text-xs text-text-muted hover:text-text-primary"
          >
            <ChevronLeft size={14} className="mr-1" /> Back to Mirror Mode
          </Button>
          <span className="px-2.5 py-1 rounded-full bg-warning/10 border border-warning/30 text-warning text-[10px] font-mono font-bold">
            {activeChallenge.data_source_label}
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-mono flex items-center gap-2">
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}

        {/* STEP 1: INTRODUCTION */}
        {step === 'INTRO' && (
          <Card className="p-6 sm:p-8 bg-surface border-border space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold">
                  {activeChallenge.target_dimension}
                </span>
                <span className="text-text-muted">• {activeChallenge.difficulty}</span>
                <span className="text-text-muted">• ~{activeChallenge.estimated_minutes} min</span>
              </div>
              <h1 className="text-2xl font-extrabold text-text-primary font-mono">{activeChallenge.title}</h1>
              <p className="text-sm text-text-secondary leading-relaxed">{activeChallenge.intro_summary}</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-2 text-xs font-mono">
              <label className="block text-text-muted font-bold">Declare Your Strategy Plan for This Challenge:</label>
              <select
                value={declaredStrategy}
                onChange={(e) => setDeclaredStrategy(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-surface border border-border text-text-primary"
              >
                <option value="Risk-controlled disciplined execution (max 25% single asset)">
                  Risk-controlled disciplined execution (max 25% single asset)
                </option>
                <option value="Research-first: never enter without reviewing filings & valuation">
                  Research-first: never enter without reviewing filings & valuation
                </option>
                <option value="Long-term hold unless material fundamentals break">
                  Long-term hold unless material fundamentals break
                </option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="primary" size="md" onClick={() => handleStartSession(false)} disabled={submitting} className="font-mono text-xs">
                Begin Official Challenge <ArrowRight size={14} className="ml-1.5" />
              </Button>
              <Button variant="outline" size="md" onClick={() => handleStartSession(true)} disabled={submitting} className="font-mono text-xs">
                Practice Mode (No Official XP)
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2, 3, 4: MULTI-STAGE SCENARIO & USER DECISION */}
        {step === 'STAGE' && currentStage && (
          <div className="space-y-5">
            {/* Stage Progress & Portfolio Strip */}
            <Card className="p-4 bg-surface-elevated border-border flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold">
                  Stage {activeSession.current_stage + 1} of {activeSession.total_stages}
                </span>
                <span className={`flex items-center gap-1 font-bold ${
                  currentStage.market_move_pct >= 0 ? 'text-primary' : 'text-danger'
                }`}>
                  {currentStage.market_move_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  Move: {currentStage.market_move_pct > 0 ? '+' : ''}{currentStage.market_move_pct}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-text-secondary">
                <span>Virtual Portfolio: <strong className="text-text-primary">₹{Number(activeSession.portfolio_state?.portfolio_value || 100000).toLocaleString('en-IN')}</strong></span>
                <span>Cash: <strong className="text-primary">₹{Number(activeSession.portfolio_state?.cash || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </Card>

            {/* Scenario Headline & Info Panels */}
            <Card className="p-6 bg-surface border-border space-y-4">
              <h2 className="text-lg font-bold text-text-primary font-mono">{currentStage.headline}</h2>
              <p className="text-sm text-text-secondary leading-relaxed">{currentStage.summary}</p>

              {/* Clickable Research Info Panels */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-mono uppercase text-secondary font-bold flex items-center gap-1.5">
                  <BookOpen size={13} /> Available Information (Click to inspect before deciding)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(currentStage.info_panels || []).map((panel: any) => {
                    const isRead = reviewedInfo.includes(panel.id);
                    return (
                      <div
                        key={panel.id}
                        onClick={() => handleToggleInfoPanel(panel.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs ${
                          isRead
                            ? 'bg-primary/5 border-primary/40'
                            : 'bg-surface-elevated border-border hover:border-secondary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-text-primary mb-1">
                          <span>{panel.title}</span>
                          <span className={`text-[10px] ${isRead ? 'text-primary' : 'text-text-muted'}`}>
                            {isRead ? '✓ Reviewed' : 'Click to inspect'}
                          </span>
                        </div>
                        {isRead && <p className="text-text-secondary leading-relaxed">{panel.content}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* User Decision Form */}
            <Card className="p-6 bg-surface border-border space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-text-primary">Your Decision</h3>

              {/* Allocation sliders if Diversification Stage 1 */}
              {currentStage.assets && (
                <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Allocate Portfolio Weights (Total: {allocTotal}%)</span>
                    <span className={allocTotal > 100 ? 'text-danger font-bold' : 'text-primary font-bold'}>
                      Cash Reserve: {Math.max(0, 100 - allocTotal)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentStage.assets.map((a: any) => (
                      <div key={a.symbol} className="flex items-center justify-between gap-2">
                        <span className="text-text-primary w-28">{a.symbol} ({a.sector})</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={allocation[a.symbol] ?? 0}
                          onChange={(e) => setAllocation((prev) => ({ ...prev, [a.symbol]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                          className="w-20 p-1.5 rounded bg-surface border border-border text-text-primary text-right"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-text-muted mb-1.5">Permitted Action</label>
                <div className="flex flex-wrap gap-2">
                  {(currentStage.permitted_actions || []).map((act: string) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setSelectedAction(act)}
                      className={`px-3.5 py-2 rounded-xl border transition-all ${
                        selectedAction === act
                          ? 'bg-primary text-background border-primary font-bold'
                          : 'bg-surface-elevated text-text-secondary border-border hover:text-text-primary'
                      }`}
                    >
                      {act.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1">Short Explanation of Your Reasoning (Required)</label>
                <textarea
                  rows={3}
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Why are you taking this action based on the information available?"
                  className="w-full p-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary font-sans text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-muted mb-1">Confidence Level (1–5)</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setConfidence(lvl)}
                        className={`flex-1 py-2 rounded-lg border ${
                          confidence === lvl
                            ? 'bg-secondary text-background border-secondary font-bold'
                            : 'bg-surface-elevated border-border text-text-muted'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-text-muted mb-1">What information could change your decision?</label>
                  <input
                    type="text"
                    value={invalidationTrigger}
                    onChange={(e) => setInvalidationTrigger(e.target.value)}
                    placeholder="e.g. Earnings drop > 10% or guidance cut"
                    className="w-full p-2 rounded-xl bg-surface-elevated border border-border text-text-primary font-sans text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSubmitDecision}
                  disabled={submitting || !selectedAction || reasoning.trim().length < 3 || (selectedAction === 'SUBMIT_ALLOCATION' && allocTotal > 100)}
                  className="font-mono text-xs"
                >
                  {submitting ? 'Recording...' : 'Submit Stage Decision →'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 4b: FINAL REFLECTION */}
        {step === 'REFLECT' && (
          <Card className="p-6 sm:p-8 bg-surface border-border space-y-5">
            <h2 className="text-xl font-bold text-text-primary font-mono">Final Reflection (+20 Bonus XP)</h2>
            <p className="text-xs text-text-secondary">
              Before viewing your Decision Quality Score, briefly reflect on what you noticed about your risk management or mindset during this scenario.
            </p>
            <textarea
              rows={4}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="What went well, or what would you do differently next time?"
              className="w-full p-3 rounded-xl bg-surface-elevated border border-border text-text-primary text-xs"
            />
            <div className="flex justify-end">
              <Button variant="primary" size="md" onClick={handleCompleteChallenge} disabled={submitting} className="font-mono text-xs">
                {submitting ? 'Scoring...' : 'Complete & View DQS Results →'}
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 5: RESULTS */}
        {step === 'RESULTS' && completionResult && (
          <div className="space-y-6">
            <Card className="p-6 sm:p-8 bg-surface-elevated border-primary/35 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase text-primary font-bold">
                    Decision Quality Score ({completionResult.rubric_version})
                  </span>
                  <div className="text-4xl font-extrabold font-mono text-primary mt-1">
                    {completionResult.dqs_score}
                    <span className="text-base text-text-muted font-normal">/100</span>
                  </div>
                </div>

                {completionResult.xp_awarded > 0 && (
                  <div className="px-4 py-2 rounded-xl bg-primary/15 border border-primary/40 text-primary font-mono font-bold text-sm">
                    +{completionResult.xp_awarded} XP Awarded
                  </div>
                )}
              </div>

              <p className="text-xs sm:text-sm text-text-primary leading-relaxed bg-surface p-4 rounded-xl border border-border">
                {completionResult.feedback_summary}
              </p>

              {/* 5-Component Rubric Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs font-mono">
                {[
                  { label: 'Reasoning (30%)', val: completionResult.reasoning_score },
                  { label: 'Risk Mgmt (25%)', val: completionResult.risk_management_score },
                  { label: 'Evidence (20%)', val: completionResult.evidence_use_score },
                  { label: 'Plan (15%)', val: completionResult.plan_consistency_score },
                  { label: 'Reflection (10%)', val: completionResult.reflection_score },
                ].map((c) => (
                  <div key={c.label} className="p-3 rounded-xl bg-surface border border-border text-center">
                    <div className="text-[10px] text-text-muted">{c.label}</div>
                    <div className="text-lg font-bold text-text-primary mt-1">{c.val}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 bg-surface border-primary/30 space-y-2">
                <h3 className="text-xs font-mono font-bold text-primary uppercase">What Went Well</h3>
                {completionResult.strengths?.map((s: string, i: number) => (
                  <div key={i} className="text-xs text-text-secondary">• {s}</div>
                ))}
              </Card>
              <Card className="p-5 bg-surface border-warning/30 space-y-2">
                <h3 className="text-xs font-mono font-bold text-warning uppercase">Areas to Improve</h3>
                {completionResult.improvements?.map((s: string, i: number) => (
                  <div key={i} className="text-xs text-text-secondary">• {s}</div>
                ))}
              </Card>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="md" onClick={() => openChallengeIntro(activeChallenge.id)} className="font-mono text-xs">
                <RotateCcw size={13} className="mr-1.5" /> Practice Retry
              </Button>
              <Button variant="outline" size="md" onClick={() => setActiveChallenge(null)} className="font-mono text-xs">
                Back to Mirror Mode Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: MIRROR MODE MAIN DASHBOARD
  // =========================================================================
  const summary = dashboard?.progress_summary || {};

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-surface via-surface-elevated to-surface border border-border/80 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-mono font-semibold mb-3">
            <Target size={14} />
            MIRROR MODE • BEHAVIORAL TRAINING
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight font-mono">
            Mirror Mode
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1.5 max-w-2xl">
            Face your habits. Challenge your decisions. Improve your mindset.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-surface border border-border">
            <span className="text-[10px] text-text-muted block">Completed</span>
            <span className="text-lg font-bold text-primary">{summary.challenges_completed || 0}/6</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-border">
            <span className="text-[10px] text-text-muted block">Avg DQS</span>
            <span className="text-lg font-bold text-text-primary">{summary.average_dqs ?? '—'}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-border">
            <span className="text-[10px] text-text-muted block">Attempts</span>
            <span className="text-lg font-bold text-secondary">{summary.total_attempts || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-border">
            <span className="text-[10px] text-text-muted block">Mirror XP</span>
            <span className="text-lg font-bold text-warning">+{summary.total_mirror_xp || 0}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab('CHALLENGES')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'CHALLENGES'
              ? 'bg-primary text-background shadow-glow'
              : 'bg-surface-elevated text-text-secondary border border-border/50'
          }`}
        >
          Recommended & Available Challenges
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'HISTORY'
              ? 'bg-secondary text-background'
              : 'bg-surface-elevated text-text-secondary border border-border/50'
          }`}
        >
          Completed Results ({history.length})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-text-muted">Loading adaptive Mirror Mode challenges...</div>
      ) : activeTab === 'CHALLENGES' ? (
        <div className="space-y-8">
          {/* Personalized Recommendations */}
          <div className="space-y-3">
            <h2 className="text-sm font-mono font-bold text-text-primary flex items-center gap-2">
              <Sparkles size={15} className="text-primary" />
              {dashboard?.has_sufficient_personalization_data
                ? 'Personalized For Your Decision Habits'
                : 'Recommended Starter Challenges (General Practice)'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(dashboard?.personalized_recommendations || []).map((ch: any) => (
                <Card
                  key={ch.id}
                  variant="interactive"
                  onClick={() => openChallengeIntro(ch.id)}
                  className="p-5 bg-surface-elevated/80 border-primary/35 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        ch.is_personalized ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'
                      }`}>
                        {ch.recommendation_badge}
                      </span>
                      <span className="text-text-muted flex items-center gap-1">
                        <Clock size={11} /> {ch.estimated_minutes}m
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-text-primary font-mono">{ch.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{ch.why_recommended}</p>
                  </div>
                  <Button variant="primary" size="sm" className="w-full font-mono text-xs">
                    Start Challenge <ArrowRight size={13} className="ml-1.5" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* All 6 Challenges Grid */}
          <div className="space-y-3">
            <h2 className="text-sm font-mono font-bold text-text-primary">All Behavioral Scenarios (6)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(dashboard?.available_challenges || []).map((ch: any) => (
                <Card key={ch.id} className="p-5 bg-surface border-border flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span className="text-secondary font-bold">{ch.target_dimension}</span>
                      <span>{ch.difficulty} • {ch.estimated_minutes}m</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary font-mono">{ch.title}</h3>
                    <p className="text-xs text-text-muted leading-relaxed">{ch.intro_summary}</p>
                    <div className="text-[10px] font-mono text-warning/80">{ch.data_source_label}</div>
                    {ch.best_dqs !== null && (
                      <div className="text-xs font-mono text-primary font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Best DQS: {ch.best_dqs}/100 ({ch.completed_count} run)
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant={ch.completed_count > 0 ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => openChallengeIntro(ch.id)}
                      className="flex-1 font-mono text-xs"
                    >
                      {ch.completed_count > 0 ? 'Retry / Practice' : 'Start'}
                    </Button>
                    <button
                      onClick={(e) => handleSkipChallenge(ch.id, e)}
                      className="p-2 rounded-lg border border-border text-text-muted hover:text-text-primary text-xs"
                      title="Skip without penalty"
                    >
                      <SkipForward size={13} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Completed History Tab */
        <Card className="p-6 bg-surface border-border space-y-4">
          <h3 className="text-sm font-bold text-text-primary font-mono">Completed Mirror Mode Results</h3>
          {history.length === 0 ? (
            <p className="text-xs text-text-muted py-4">No completed challenges yet. Start your first scenario above.</p>
          ) : (
            <div className="space-y-3">
              {history.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-surface-elevated border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{r.challenge_title}</span>
                      <span className="px-2 py-0.2 rounded bg-surface border border-border text-[10px] text-text-muted">
                        {r.is_practice ? 'Practice' : 'Official'} • {r.rubric_version}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary font-sans mt-1">{r.feedback_summary}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-lg font-extrabold text-primary">{r.dqs_score}/100</span>
                    {r.xp_awarded > 0 && <span className="text-warning font-bold">+{r.xp_awarded} XP</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
