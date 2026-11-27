import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Clock,
  RefreshCw,
  Eye,
  Compass,
  Award,
  FileCheck2,
  Info,
  Fingerprint,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

interface FingerprintDimension {
  dimension: string;
  question: string;
  has_sufficient_data: boolean;
  display_status: string;
  score: number | null;
  previous_score: number | null;
  trend: string;
  confidence: string;
  observations_used: number;
  min_observations_required: number;
  explanation: string;
  supporting_evidence: string[];
  improvement_suggestion: string;
  action_route: string;
}

interface PatternItem {
  pattern_key: string;
  pattern_name: string;
  detected: boolean;
  status: 'insufficient_evidence' | 'emerging_pattern' | 'moderate_evidence' | 'stronger_evidence';
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  confidence: number;
  evidence_count: number;
  observed_period: string;
  evidence_event_ids: string[];
  what_happened: string;
  why_it_matters: string;
  what_user_can_learn: string;
  recommended_challenge: string;
  limitations?: string;
}

const DEMO_FINGERPRINT = {
  tagline: 'Understand your decisions. Improve your discipline.',
  events_count: 8,
  measured_dimensions_count: 7,
  total_dimensions_count: 7,
  has_sufficient_overall_data: true,
  overall_score: 68.4,
  previous_overall_score: 64.9,
  strongest_dimension: { dimension: 'Loss Response', score: 79 },
  dimension_needing_improvement: { dimension: 'Emotional Control', score: 59 },
  dimensions: [
    { dimension: 'Risk Discipline', question: 'Position sizing & exposure?', has_sufficient_data: true, display_status: 'Measured', score: 62, previous_score: 58, trend: 'UP', confidence: 'HIGH', observations_used: 8, min_observations_required: 2, explanation: 'Max single-stock exposure reached 41% before trimming.', supporting_evidence: ['Max single-stock exposure: 41.0%'], improvement_suggestion: 'Complete a position-sizing challenge in the Paper Simulator.', action_route: '/simulator' },
    { dimension: 'Emotional Control', question: 'Response to losses & volatility?', has_sufficient_data: true, display_status: 'Measured', score: 59, previous_score: 65, trend: 'DOWN', confidence: 'HIGH', observations_used: 8, min_observations_required: 2, explanation: '2 rally entries without prior research detected.', supporting_evidence: ['FOMO pattern: Detected'], improvement_suggestion: 'Complete a simulated market-crash scenario in Historical Market Replay.', action_route: '/market-replay' },
    { dimension: 'Decision Consistency', question: 'Stated plan adherence?', has_sufficient_data: true, display_status: 'Measured', score: 71, previous_score: 70, trend: 'UP', confidence: 'HIGH', observations_used: 8, min_observations_required: 2, explanation: 'Measured pacing across 4 active days.', supporting_evidence: ['Decisions per active day: 2.0'], improvement_suggestion: 'Limit rapid reversals.', action_route: '/simulator' },
    { dimension: 'Research Quality', question: 'Review info before decisions?', has_sufficient_data: true, display_status: 'Measured', score: 66, previous_score: 60, trend: 'UP', confidence: 'HIGH', observations_used: 8, min_observations_required: 2, explanation: '63% of decisions logged prior research.', supporting_evidence: ['Research logged before 63% of decisions'], improvement_suggestion: 'Complete a company-analysis exercise.', action_route: '/markets/screener' },
    { dimension: 'Diversification Awareness', question: 'Stock & sector concentration?', has_sufficient_data: true, display_status: 'Measured', score: 74, previous_score: 74, trend: 'STABLE', confidence: 'HIGH', observations_used: 8, min_observations_required: 2, explanation: '3 sectors represented.', supporting_evidence: ['Max sector concentration: 38.0%'], improvement_suggestion: 'Rebuild across 3+ uncorrelated sectors.', action_route: '/portfolio' },
    { dimension: 'Strategy Adherence', question: 'Follows declared strategy?', has_sufficient_data: true, display_status: 'Measured', score: 68, previous_score: 72, trend: 'DOWN', confidence: 'HIGH', observations_used: 4, min_observations_required: 1, explanation: '1 exposure deviation from Pre-Decision Contract.', supporting_evidence: ['Pre-Decision Contracts signed: 4'], improvement_suggestion: 'Complete a Pre-Decision Contract challenge.', action_route: '/simulator' },
    { dimension: 'Loss Response', question: 'Behavior after losses?', has_sufficient_data: true, display_status: 'Measured', score: 79, previous_score: 75, trend: 'UP', confidence: 'HIGH', observations_used: 3, min_observations_required: 1, explanation: 'Consistent sizing after closed losses.', supporting_evidence: ['Closed/loss observations analyzed: 3'], improvement_suggestion: 'Practice the Recovery Trap rule.', action_route: '/academy' },
  ] as FingerprintDimension[],
  archetype: {
    has_sufficient_data: true,
    primary_archetype: 'The Consistency Builder',
    summary: 'DEMO DATA: Demonstrating steady pacing and upward progress across decision dimensions.',
    observed_characteristics: [
      'Research-oriented (63% of decisions backed by research)',
      'High-conviction / concentrated sizing explorer',
      'Consistent sizing after simulated losses',
    ],
    why_assigned: 'DEMO DATA preview only—never mixed into real user records.',
    evolves_note: 'Your archetype evolves dynamically as you practice.',
  },
  educational_disclaimer: 'DEMO DATA (Isolated Preview) — Educational indicators only, not psychological measurements.',
};

// Custom SVG Radar Chart supporting measured scores vs unavailable ("Not enough data yet") dimensions
const FingerprintRadarChart: React.FC<{ dimensions: FingerprintDimension[] }> = ({ dimensions }) => {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 96;
  const count = dimensions.length || 7;

  const getPoint = (idx: number, val: number) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    const r = (val / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      lx: cx + (radius + 26) * Math.cos(angle),
      ly: cy + (radius + 26) * Math.sin(angle),
    };
  };

  const rings = [25, 50, 75, 100];
  const polyPoints = dimensions
    .map((d, i) => {
      const pt = getPoint(i, d.has_sufficient_data && d.score !== null ? d.score : 0);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[320px] mx-auto overflow-visible"
      role="img"
      aria-label="Investor Decision Fingerprint 7-dimension radar chart"
    >
      {rings.map((ring) => {
        const pts = Array.from({ length: count }, (_, i) => {
          const p = getPoint(i, ring);
          return `${p.x},${p.y}`;
        }).join(' ');
        return <polygon key={ring} points={pts} fill="none" stroke="rgba(147,162,180,0.18)" strokeWidth="1" />;
      })}

      {dimensions.map((d, i) => {
        const p = getPoint(i, 100);
        const shortLabel = d.dimension.split(' ')[0];
        return (
          <g key={d.dimension}>
            <line
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={d.has_sufficient_data ? 'rgba(147,162,180,0.22)' : 'rgba(147,162,180,0.1)'}
              strokeDasharray={d.has_sufficient_data ? undefined : '3 3'}
              strokeWidth="1"
            />
            <text
              x={p.lx}
              y={p.ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`text-[9px] font-medium ${d.has_sufficient_data ? 'fill-text-secondary' : 'fill-text-muted opacity-60'}`}
            >
              {shortLabel}
            </text>
          </g>
        );
      })}

      {dimensions.some((d) => d.has_sufficient_data) && (
        <polygon
          points={polyPoints}
          fill="rgba(37, 99, 235, 0.16)"
          stroke="#2563EB"
          strokeWidth="2"
        />
      )}

      {dimensions.map((d, i) => {
        if (!d.has_sufficient_data || d.score === null) return null;
        const pt = getPoint(i, d.score);
        return <circle key={d.dimension} cx={pt.x} cy={pt.y} r="3.5" fill="#2563EB" />;
      })}
    </svg>
  );
};

export const BehavioralInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [fingerprint, setFingerprint] = useState<any | null>(null);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [declaredObserved, setDeclaredObserved] = useState<any | null>(null);
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [recommendations, setRecommendations] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'FINGERPRINT' | 'PATTERNS' | 'DECLARED' | 'TIMELINE' | 'RECOMMENDATIONS'>('FINGERPRINT');
  const [evidenceModalPattern, setEvidenceModalPattern] = useState<PatternItem | null>(null);

  const loadAll = async (period: '7d' | '30d' | '90d' | 'all' = historyPeriod) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Ensure JWT token exists for strict /api/fingerprint* endpoints
      if (!api.getToken()) {
        await api.auth.demoLogin();
      }
      const [fpRes, patRes, decRes, histRes, recRes] = await Promise.all([
        api.fingerprint.getProfile(),
        api.behavior.getPatterns(),
        api.fingerprint.getDeclaredObserved(),
        api.fingerprint.getHistory(period),
        api.fingerprint.getRecommendations(true),
      ]);

      if (fpRes.success && fpRes.data) setFingerprint(fpRes.data);
      else if (!fpRes.success) setErrorMsg(fpRes.error?.detail || fpRes.error?.message || 'Could not load Investor Decision Fingerprint.');

      if (patRes.success && patRes.data) setPatterns(patRes.data.patterns || []);
      if (decRes.success && decRes.data) setDeclaredObserved(decRes.data);
      if (histRes.success && histRes.data) setHistoryData(histRes.data);
      if (recRes.success && recRes.data) setRecommendations(recRes.data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error loading Behavioral Intelligence.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll('all');
  }, []);

  const handlePeriodChange = async (p: '7d' | '30d' | '90d' | 'all') => {
    setHistoryPeriod(p);
    const res = await api.fingerprint.getHistory(p);
    if (res.success && res.data) setHistoryData(res.data);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    await api.behavior.recalculate();
    await loadAll(historyPeriod);
    setRecalculating(false);
  };

  const activeFp = demoMode ? DEMO_FINGERPRINT : fingerprint;

  const getStatusBadge = (status: PatternItem['status']) => {
    switch (status) {
      case 'stronger_evidence':
        return { label: 'Stronger evidence', cls: 'bg-danger/10 text-danger border-danger/25' };
      case 'moderate_evidence':
        return { label: 'Moderate evidence', cls: 'bg-warning/10 text-warning border-warning/25' };
      case 'emerging_pattern':
        return { label: 'Emerging pattern', cls: 'bg-secondary/10 text-secondary border-secondary/25' };
      default:
        return { label: 'Insufficient evidence', cls: 'bg-surface-elevated border-border text-text-muted' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <Card className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <Fingerprint size={14} />
            Investor Decision Fingerprint
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Behavioral Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
            Understand your decisions. Improve your discipline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              demoMode
                ? 'bg-warning/15 border-warning/40 text-warning'
                : 'bg-surface-elevated border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {demoMode ? 'DEMO DATA Active (Isolated)' : 'Preview DEMO DATA'}
          </button>

          {!demoMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="text-xs"
            >
              <RefreshCw size={13} className={`mr-1.5 ${recalculating ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          )}
        </div>
      </Card>

      {demoMode && (
        <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/25 text-warning text-xs font-medium flex items-center gap-2">
          <Info size={15} className="flex-shrink-0" />
          <span>DEMO DATA PREVIEW — Isolated sample fingerprint. Real user profiles never display fabricated demo data.</span>
        </div>
      )}

      {errorMsg && !demoMode && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs font-medium flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><AlertCircle size={15} className="flex-shrink-0" /> {errorMsg}</span>
          <Button variant="outline" size="sm" onClick={() => loadAll(historyPeriod)}>Retry</Button>
        </div>
      )}

      {loading && !demoMode ? (
        <div className="p-12 text-center text-xs text-text-muted">
          Calculating your 7-dimension Investor Decision Fingerprint...
        </div>
      ) : activeFp ? (
        <>
          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            {[
              { id: 'FINGERPRINT', label: 'Decision Fingerprint & Archetype' },
              { id: 'PATTERNS', label: `Detected Patterns (${patterns.length})` },
              { id: 'DECLARED', label: 'Declared vs Observed' },
              { id: 'TIMELINE', label: 'Improvement Timeline' },
              { id: 'RECOMMENDATIONS', label: 'Action Recommendations' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === t.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: INVESTOR DECISION FINGERPRINT + ARCHETYPE */}
          {activeTab === 'FINGERPRINT' && (
            <div className="space-y-6">
              {/* Top Summary + Radar + Archetype */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Radar & Overall Score */}
                <Card className="p-6 flex flex-col items-center justify-between space-y-4">
                  <div className="text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Overall Fingerprint Score
                    </span>
                    {activeFp.has_sufficient_overall_data ? (
                      <div className="text-4xl font-bold tabular-nums text-primary mt-1">
                        {activeFp.overall_score}
                        <span className="text-sm text-text-muted font-normal">/100</span>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-warning mt-2">
                        Not enough data yet
                      </div>
                    )}
                    <p className="text-[11px] tabular-nums text-text-muted mt-1">
                      {activeFp.measured_dimensions_count} of {activeFp.total_dimensions_count} dimensions measured • {activeFp.events_count} events
                    </p>
                  </div>

                  <FingerprintRadarChart dimensions={activeFp.dimensions || []} />

                  <p className="text-[11px] text-text-muted text-center leading-relaxed border-t border-border pt-3">
                    {activeFp.educational_disclaimer}
                  </p>
                </Card>

                {/* Archetype + Strongest / Weakest Highlights */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Dynamic Investor Archetype */}
                  <Card className="p-6 bg-surface-elevated/50 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                        <BrainCircuit size={14} /> Dynamic Investor Archetype
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Evolves as your habits change
                      </span>
                    </div>

                    {activeFp.archetype?.has_sufficient_data ? (
                      <>
                        <h2 className="text-xl font-bold text-text-primary">
                          {activeFp.archetype.primary_archetype}
                        </h2>
                        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                          {activeFp.archetype.summary}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {activeFp.archetype.observed_characteristics?.map((ch: string, idx: number) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-medium text-primary">
                              • {ch}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-text-muted pt-1">
                          {activeFp.archetype.why_assigned}
                        </p>
                      </>
                    ) : (
                      <div className="py-2 space-y-2.5">
                        <div className="text-base font-bold text-warning">Not enough data yet</div>
                        <p className="text-xs text-text-muted">{activeFp.archetype?.why_assigned}</p>
                        <Button variant="primary" size="sm" onClick={() => navigate('/simulator')} className="text-xs">
                          Record Simulated Decisions →
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Strongest vs Needs Improvement */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="p-5 space-y-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-primary font-semibold">Strongest Dimension</span>
                      {activeFp.strongest_dimension ? (
                        <>
                          <div className="text-base font-bold text-text-primary">
                            {activeFp.strongest_dimension.dimension}
                          </div>
                          <div className="text-2xl font-bold tabular-nums text-primary">
                            {activeFp.strongest_dimension.score}/100
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-text-muted">Not enough data yet</div>
                      )}
                    </Card>

                    <Card className="p-5 space-y-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-warning font-semibold">Most Room to Improve</span>
                      {activeFp.dimension_needing_improvement ? (
                        <>
                          <div className="text-base font-bold text-text-primary">
                            {activeFp.dimension_needing_improvement.dimension}
                          </div>
                          <div className="text-2xl font-bold tabular-nums text-warning">
                            {activeFp.dimension_needing_improvement.score}/100
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-text-muted">Not enough data yet</div>
                      )}
                    </Card>
                  </div>
                </div>
              </div>

              {/* 7 Behavioral Dimension Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(activeFp.dimensions || []).map((d: FingerprintDimension) => (
                  <Card
                    key={d.dimension}
                    className={`p-5 space-y-3 border ${
                      d.has_sufficient_data
                        ? 'bg-surface border-border'
                        : 'bg-surface-elevated/40 border-border/70 border-dashed'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-text-primary">{d.dimension}</h3>
                        <span className="text-[11px] tabular-nums text-text-muted">
                          {d.observations_used} observation(s) • {d.confidence} conf.
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          d.has_sufficient_data
                            ? 'bg-primary/10 text-primary border-primary/25'
                            : 'bg-surface-elevated text-text-muted border-border'
                        }`}
                      >
                        {d.display_status}
                      </span>
                    </div>

                    {d.has_sufficient_data && d.score !== null ? (
                      <>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold tabular-nums text-primary">
                            {d.score}
                            <span className="text-xs text-text-muted font-normal">/100</span>
                          </span>
                          <span className={`text-[11px] font-medium tabular-nums flex items-center gap-1 ${
                            d.trend === 'UP' ? 'text-primary' : d.trend === 'DOWN' ? 'text-danger' : 'text-text-muted'
                          }`}>
                            {d.trend === 'UP' && <TrendingUp size={12} />}
                            {d.trend === 'DOWN' && <TrendingDown size={12} />}
                            Prev: {d.previous_score} ({d.trend})
                          </span>
                        </div>
                        <div className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-border/40">
                          <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${d.score}%` }} />
                        </div>
                      </>
                    ) : (
                      <div className="py-2 text-xs font-medium tabular-nums text-warning">
                        Not enough data yet ({d.observations_used}/{d.min_observations_required} required)
                      </div>
                    )}

                    <p className="text-[11px] text-text-secondary leading-snug">{d.explanation}</p>

                    {d.supporting_evidence?.length > 0 && (
                      <div className="text-[11px] text-text-muted space-y-0.5 pt-2 border-t border-border">
                        {d.supporting_evidence.map((ev, i) => (
                          <div key={i}>• {ev}</div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                      <span className="text-text-muted truncate pr-2">{d.improvement_suggestion}</span>
                      <button
                        onClick={() => navigate(d.action_route)}
                        className="text-primary font-semibold hover:underline flex-shrink-0"
                      >
                        Practice →
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DETECTED BEHAVIORAL PATTERNS */}
          {activeTab === 'PATTERNS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((pat) => {
                const st = getStatusBadge(pat.status);
                return (
                  <Card
                    key={pat.pattern_key}
                    className={`p-5 space-y-3 border ${
                      pat.detected ? 'bg-surface border-warning/40' : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">{pat.pattern_name}</h3>
                        <span className="text-[11px] tabular-nums text-text-muted">
                          Severity: {pat.severity} • Confidence: {pat.confidence}% • Evidence: {pat.evidence_count}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">{pat.what_happened}</p>

                    <div className="flex items-center justify-between pt-2.5 border-t border-border text-xs">
                      <span className="text-[11px] font-medium text-primary">{pat.recommended_challenge}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEvidenceModalPattern(pat)}
                        className="text-[11px]"
                      >
                        <Eye size={12} className="mr-1" /> View Evidence
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* TAB 3: DECLARED VS OBSERVED */}
          {activeTab === 'DECLARED' && (
            <div className="space-y-4">
              {(declaredObserved?.comparisons || []).map((item: any, idx: number) => (
                <Card key={idx} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-text-primary">{item.dimension}</h3>
                    <div className="flex items-center gap-2 text-[11px] tabular-nums">
                      <span className="text-text-muted">{item.evidence_count} observation(s)</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                        item.aligned
                          ? 'bg-primary/10 text-primary border-primary/25'
                          : 'bg-warning/10 text-warning border-warning/25'
                      }`}>
                        {item.difference}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-surface-elevated border border-border">
                      <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold block mb-1">Declared Preference</span>
                      <p className="text-text-secondary leading-relaxed">{item.declared}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-elevated border border-border">
                      <span className="text-[10px] uppercase tracking-wider text-primary font-semibold block mb-1">Observed Behavior</span>
                      <p className="text-text-secondary leading-relaxed">{item.observed}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Suggestion: {item.suggestion}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {/* TAB 4: IMPROVEMENT TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <Card className="p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Clock size={15} className="text-primary" />
                  Behavioral Improvement Timeline
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                  {([
                    { id: '7d', label: 'Last 7 days' },
                    { id: '30d', label: 'Last 30 days' },
                    { id: '90d', label: 'Last 90 days' },
                    { id: 'all', label: 'All time' },
                  ] as const).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePeriodChange(p.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        historyPeriod === p.id
                          ? 'bg-primary text-white font-semibold'
                          : 'bg-surface-elevated text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {(historyData?.timeline || []).length === 0 ? (
                <p className="text-xs text-text-muted py-4">
                  No stored behavioral snapshots or milestones in this timeframe yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {historyData.timeline.map((item: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-surface-elevated border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-text-primary">{item.title}</div>
                        <div className="text-[11px] text-text-secondary mt-0.5">{item.detail}</div>
                      </div>
                      <span className="text-[11px] tabular-nums text-text-muted flex-shrink-0">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 5: PERSONALIZED RECOMMENDATIONS */}
          {activeTab === 'RECOMMENDATIONS' && (
            <div className="space-y-6">
              {recommendations && (
                <Card className="p-6 bg-surface-elevated/60 border-primary/25 space-y-3">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Sparkles size={15} />
                    Fingerprint Summary ({recommendations.source === 'gemini' ? `Gemini (${recommendations.model})` : 'Deterministic Backend'})
                  </h3>
                  <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">
                    {recommendations.summary}
                  </p>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(recommendations?.recommendations || []).map((rec: any, idx: number) => (
                  <Card key={idx} className="p-5 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">{rec.dimension}</span>
                        {rec.score !== null && (
                          <span className="text-xs tabular-nums text-warning font-bold">{rec.score}/100</span>
                        )}
                      </div>
                      <p className="text-xs text-text-primary leading-relaxed">{rec.task}</p>
                      {rec.evidence?.length > 0 && (
                        <div className="text-[11px] text-text-muted">
                          Evidence: {rec.evidence.join(' • ')}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(rec.action_route || '/simulator')}
                      className="text-xs self-start"
                    >
                      Start Recommended Exercise <ArrowRight size={12} className="ml-1.5" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Evidence Detail Modal */}
      {evidenceModalPattern && (
        <Modal
          isOpen={!!evidenceModalPattern}
          onClose={() => setEvidenceModalPattern(null)}
          title={evidenceModalPattern.pattern_name}
          description={`Status: ${evidenceModalPattern.status} • Confidence: ${evidenceModalPattern.confidence}% • Period: ${evidenceModalPattern.observed_period}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-border space-y-1">
              <div className="font-bold text-text-primary">What Happened</div>
              <p className="text-text-secondary leading-relaxed">{evidenceModalPattern.what_happened}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-border space-y-1">
              <div className="font-bold text-warning">Why It Matters</div>
              <p className="text-text-secondary leading-relaxed">{evidenceModalPattern.why_it_matters}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 space-y-1">
              <div className="font-bold text-primary">Recommended Action: {evidenceModalPattern.recommended_challenge}</div>
              <p className="text-text-primary leading-relaxed">{evidenceModalPattern.what_user_can_learn}</p>
            </div>
            {evidenceModalPattern.evidence_event_ids?.length > 0 && (
              <div className="tabular-nums text-[11px] text-text-muted">
                Supporting Event IDs: {evidenceModalPattern.evidence_event_ids.join(', ')}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
