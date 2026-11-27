import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface MentorTrainingLabProps {
  mode: 'SCENARIOS' | 'DAILY' | 'REPORT';
  learningLevelCode: string;
  learningLevelLabel: string;
  behavioralScore: number;
}

const MiniCandlestickSvg: React.FC<{
  visibleCandles: any[];
  hiddenCandles: any[];
  revealed: boolean;
  supportLevel?: number;
  resistanceLevel?: number;
}> = ({ visibleCandles, hiddenCandles, revealed, supportLevel, resistanceLevel }) => {
  const shown = revealed ? [...visibleCandles, ...hiddenCandles] : visibleCandles;
  if (!shown || shown.length === 0) return null;

  const width = 680;
  const height = 220;
  const pad = 18;
  const highs = shown.map((c) => c.high);
  const lows = shown.map((c) => c.low);
  const minP = Math.min(...lows, supportLevel ?? Infinity) * 0.995;
  const maxP = Math.max(...highs, resistanceLevel ?? -Infinity) * 1.005;
  const span = Math.max(0.01, maxP - minP);

  const toY = (price: number) => height - pad - ((price - minP) / span) * (height - 2 * pad);
  const stepX = (width - 2 * pad) / Math.max(1, visibleCandles.length + (revealed ? hiddenCandles.length : 12));
  const candleW = Math.max(3, Math.min(10, stepX * 0.65));

  const splitX = pad + visibleCandles.length * stepX;

  return (
    <div className="relative bg-background/70 border border-border rounded-xl p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
        {supportLevel !== undefined && (
          <line
            x1={pad}
            y1={toY(supportLevel)}
            x2={width - pad}
            y2={toY(supportLevel)}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        )}
        {resistanceLevel !== undefined && (
          <line
            x1={pad}
            y1={toY(resistanceLevel)}
            x2={width - pad}
            y2={toY(resistanceLevel)}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        )}

        {/* Hidden future boundary */}
        <line
          x1={splitX}
          y1={pad}
          x2={splitX}
          y2={height - pad}
          stroke="#6366f1"
          strokeDasharray="3 3"
          strokeWidth="1.5"
        />

        {!revealed && (
          <rect
            x={splitX}
            y={pad}
            width={Math.max(20, width - pad - splitX)}
            height={height - 2 * pad}
            fill="rgba(99, 102, 241, 0.08)"
          />
        )}

        {shown.map((c, idx) => {
          const cx = pad + idx * stepX + stepX / 2;
          const isGreen = c.close >= c.open;
          const color = isGreen ? '#10b981' : '#ef4444';
          const yTop = toY(Math.max(c.open, c.close));
          const yBot = toY(Math.min(c.open, c.close));
          return (
            <g key={c.time || idx}>
              <line x1={cx} y1={toY(c.high)} x2={cx} y2={toY(c.low)} stroke={color} strokeWidth="1.2" />
              <rect
                x={cx - candleW / 2}
                y={yTop}
                width={candleW}
                height={Math.max(2, yBot - yTop)}
                fill={color}
                rx="1"
              />
            </g>
          );
        })}
      </svg>

      {!revealed && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-surface/90 border border-secondary/40 text-xs font-mono text-secondary flex items-center gap-1.5">
          <EyeOff size={14} /> Next 15 Sessions Hidden
        </div>
      )}
    </div>
  );
};

export const MentorTrainingLab: React.FC<MentorTrainingLabProps> = ({
  mode,
  learningLevelCode,
  learningLevelLabel,
  behavioralScore,
}) => {
  // Historical Scenario State
  const [histSymbol, setHistSymbol] = useState<'RELIANCE' | 'TCS' | 'HDFCBANK' | 'NIFTY50' | 'BTCUSDT'>('RELIANCE');
  const [histScenario, setHistScenario] = useState<any>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [histObservation, setHistObservation] = useState('');
  const [histDecision, setHistDecision] = useState<'ENTER' | 'WAIT' | 'AVOID'>('WAIT');
  const [histRiskPct, setHistRiskPct] = useState(1.0);
  const [histRevealed, setHistRevealed] = useState(false);

  // Random AI Scenario State
  const [randScenario, setRandScenario] = useState<any>(null);
  const [randChoice, setRandChoice] = useState<string>('');
  const [randReasoning, setRandReasoning] = useState<string>('');
  const [randAttempt, setRandAttempt] = useState<number>(1);
  const [randEval, setRandEval] = useState<any>(null);

  // Daily Session & Weekly Report
  const [dailySession, setDailySession] = useState<any>(null);
  const [dailyStepIdx, setDailyStepIdx] = useState<number>(0);
  const [dailyAnswer, setDailyAnswer] = useState<string>('');
  const [dailySubmitted, setDailySubmitted] = useState<boolean>(false);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);

  const loadHistorical = useCallback(async (sym: typeof histSymbol) => {
    setHistLoading(true);
    setHistRevealed(false);
    setHistObservation('');
    const ac = sym === 'BTCUSDT' ? 'CRYPTO' : 'STOCK';
    const res = await api.aiBuddy.getHistoricalScenario(sym, ac);
    if (res.success) setHistScenario(res.data);
    setHistLoading(false);
  }, []);

  const loadRandom = useCallback(async () => {
    setRandChoice('');
    setRandReasoning('');
    setRandAttempt(1);
    setRandEval(null);
    const res = await api.aiBuddy.getRandomScenario(learningLevelCode);
    if (res.success) setRandScenario(res.data);
  }, [learningLevelCode]);

  useEffect(() => {
    if (mode === 'SCENARIOS') {
      if (!histScenario) loadHistorical(histSymbol);
      if (!randScenario) loadRandom();
    } else if (mode === 'DAILY' && !dailySession) {
      api.aiBuddy.getDailySession(learningLevelCode).then((r) => {
        if (r.success) setDailySession(r.data);
      });
    } else if (mode === 'REPORT') {
      api.aiBuddy.getWeeklyReport(behavioralScore).then((r) => {
        if (r.success) setWeeklyReport(r.data);
      });
    }
  }, [mode, histScenario, randScenario, dailySession, histSymbol, learningLevelCode, behavioralScore, loadHistorical, loadRandom]);

  const submitRandomEvaluation = async () => {
    if (!randScenario || !randChoice) return;
    const res = await api.aiBuddy.evaluateMentorStep({
      archetype: randScenario.archetype,
      selectedChoiceId: randChoice,
      userReasoning: randReasoning,
      attemptNumber: randAttempt,
    });
    if (res.success) {
      setRandEval(res.data);
      if (res.data.allowRevision) {
        setRandAttempt((a) => a + 1);
      }
    }
  };

  if (mode === 'SCENARIOS') {
    return (
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* A. Real Historical Market Scenario */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm">REAL HISTORICAL DATA</Badge>
                <span className="text-xs font-mono text-text-muted">Level: {learningLevelLabel}</span>
              </div>
              <h2 className="text-base font-bold text-text-primary mt-1">
                Historical Market Scenario (Hidden Future Movement)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={histSymbol}
                onChange={(e) => {
                  const s = e.target.value as typeof histSymbol;
                  setHistSymbol(s);
                  loadHistorical(s);
                }}
                className="px-2.5 py-1.5 rounded bg-background border border-border text-xs font-mono"
              >
                <option value="RELIANCE">RELIANCE (NSE)</option>
                <option value="TCS">TCS (NSE)</option>
                <option value="HDFCBANK">HDFCBANK (NSE)</option>
                <option value="NIFTY50">NIFTY 50</option>
                <option value="BTCUSDT">BTC/USDT</option>
              </select>
              <Button size="sm" variant="outline" onClick={() => loadHistorical(histSymbol)} icon={<RefreshCw size={13} />}>
                New Slice
              </Button>
            </div>
          </div>

          {histLoading ? (
            <div className="py-10 text-center text-xs text-text-muted">Loading real historical candles...</div>
          ) : histScenario?.available ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-text-muted">
                <span>Source: {histScenario.source}</span>
                <span>Exchange: {histScenario.exchange}</span>
                <span>Timeframe: {histScenario.timeframe}</span>
                <span>Support: {histScenario.supportLevel}</span>
                <span>Resistance: {histScenario.resistanceLevel}</span>
                <span>RSI(14): {histScenario.lastVisibleRsi ?? 'N/A'}</span>
                <span>{histScenario.isDelayed ? 'Delayed/Historical' : 'Live'}</span>
              </div>

              <MiniCandlestickSvg
                visibleCandles={histScenario.visibleCandles}
                hiddenCandles={histScenario.hiddenOutcomeCandles}
                revealed={histRevealed}
                supportLevel={histScenario.supportLevel}
                resistanceLevel={histScenario.resistanceLevel}
              />

              {!histRevealed ? (
                <div className="p-4 rounded-xl bg-background/70 border border-border space-y-3">
                  <div className="text-xs font-semibold text-text-primary">
                    Step 1–3: Observe & Justify Before Revealing Future Candles
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="md:col-span-2">
                      <label className="block text-text-muted mb-1">
                        What do you observe, and what invalidates your thesis?
                      </label>
                      <input
                        value={histObservation}
                        onChange={(e) => setHistObservation(e.target.value)}
                        placeholder="e.g., Price near resistance with RSI 64; invalidation below support..."
                        className="w-full px-3 py-2 rounded bg-surface border border-border"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-text-muted mb-1">Decision</label>
                        <select
                          value={histDecision}
                          onChange={(e) => setHistDecision(e.target.value as any)}
                          className="w-full px-2.5 py-2 rounded bg-surface border border-border font-mono"
                        >
                          <option value="WAIT">Wait</option>
                          <option value="ENTER">Enter</option>
                          <option value="AVOID">Avoid</option>
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="block text-text-muted mb-1">Risk %</label>
                        <input
                          type="number"
                          step="0.5"
                          value={histRiskPct}
                          onChange={(e) => setHistRiskPct(Number(e.target.value))}
                          className="w-full px-2 py-2 rounded bg-surface border border-border font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Eye size={14} />}
                    onClick={() => setHistRevealed(true)}
                  >
                    Submit Analysis & Reveal Historical Outcome
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-text-primary">
                    <span>Historical Debrief (Next 15 Sessions)</span>
                    <span className={histScenario.historicalDebrief.outcomeChangePct >= 0 ? 'text-primary' : 'text-danger'}>
                      Move: {histScenario.historicalDebrief.outcomeChangePct >= 0 ? '+' : ''}
                      {histScenario.historicalDebrief.outcomeChangePct}%
                    </span>
                  </div>
                  <p className="text-text-secondary">{histScenario.historicalDebrief.marketIndication}</p>
                  <p className="text-text-muted">
                    Max Favorable: +{histScenario.historicalDebrief.maxFavorableExcursionPct}% | Max Adverse:{' '}
                    {histScenario.historicalDebrief.maxAdverseExcursionPct}%
                  </p>
                  <p className="text-text-primary font-medium">{histScenario.historicalDebrief.disciplinedTakeaway}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-xs text-warning">{histScenario?.reason || 'Historical data unavailable.'}</div>
          )}
        </Card>

        {/* B. Random AI-Generated Socratic Scenario */}
        {randScenario && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="secondary" size="sm">AI-GENERATED SIMULATION</Badge>
                <h2 className="text-base font-bold text-text-primary mt-1">{randScenario.title}</h2>
                <div className="text-xs font-mono text-text-muted">
                  {randScenario.symbol} · Concept: {randScenario.concept}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={loadRandom} icon={<Sparkles size={13} />}>
                Fresh Scenario
              </Button>
            </div>

            <p className="text-sm text-text-secondary bg-background/60 p-3.5 rounded-lg border border-border">
              {randScenario.setup}
            </p>
            <p className="text-xs font-semibold text-text-primary">{randScenario.question}</p>

            <div className="space-y-2">
              {randScenario.choices.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setRandChoice(c.id)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                    randChoice === c.id
                      ? 'bg-primary/15 border-primary text-text-primary font-semibold'
                      : 'bg-background/60 border-border text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <input
              value={randReasoning}
              onChange={(e) => setRandReasoning(e.target.value)}
              placeholder="Justify your decision (what risk or confirmation matters most?)..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs"
            />

            <Button size="sm" variant="primary" onClick={submitRandomEvaluation} disabled={!randChoice}>
              {randEval?.allowRevision ? 'Revise & Resubmit' : 'Evaluate Reasoning'}
            </Button>

            {randEval && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  randEval.passed
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-warning/10 border-warning/40'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-text-primary">
                  <span className="flex items-center gap-1.5">
                    {randEval.passed ? <CheckCircle2 size={15} className="text-primary" /> : <HelpCircle size={15} className="text-warning" />}
                    {randEval.feedback}
                  </span>
                  <span className="font-mono">Process Score: {randEval.processScore}/100</span>
                </div>
                {randEval.socraticHint && (
                  <p className="text-warning font-medium">Hint: {randEval.socraticHint}</p>
                )}
                {randEval.conceptTakeaway && (
                  <p className="text-text-secondary">{randEval.conceptTakeaway}</p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  if (mode === 'DAILY' && dailySession) {
    const step = dailySession.steps[dailyStepIdx];
    return (
      <Card className="p-5 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="primary" size="sm">DAILY TRAINING SESSION · {dailySession.date}</Badge>
            <h2 className="text-base font-bold text-text-primary mt-1">
              Step {step.step} of {dailySession.steps.length}: {step.title}
            </h2>
          </div>
          <span className="text-xs font-mono text-text-muted">{learningLevelLabel}</span>
        </div>

        <p className="text-xs italic text-text-muted">"{dailySession.philosophy}"</p>

        {step.content && <p className="text-sm text-text-secondary bg-background p-3.5 rounded-lg border border-border">{step.content}</p>}
        {step.instruction && <p className="text-sm text-text-secondary bg-background p-3.5 rounded-lg border border-border">{step.instruction}</p>}
        {step.scenario && (
          <div className="p-3.5 rounded-lg bg-background border border-border space-y-2 text-xs">
            <div className="font-bold text-text-primary">{step.scenario.title}</div>
            <p className="text-text-secondary">{step.scenario.setup}</p>
          </div>
        )}
        {step.prompt && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-primary">{step.prompt}</p>
            {step.options && (
              <div className="space-y-2">
                {step.options.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setDailyAnswer(opt);
                      setDailySubmitted(true);
                    }}
                    className={`w-full text-left p-3 rounded-lg border text-xs ${
                      dailyAnswer === opt
                        ? opt === step.correctOption
                          ? 'bg-primary/15 border-primary text-primary font-semibold'
                          : 'bg-warning/15 border-warning text-warning'
                        : 'bg-background border-border text-text-secondary'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {dailySubmitted && step.correctOption && (
              <div className="text-xs text-text-secondary p-2.5 rounded bg-surface-elevated border border-border">
                Correct answer: <strong className="text-primary">{step.correctOption}</strong>
              </div>
            )}
            {step.keyReason && (
              <div className="text-xs text-text-secondary p-2.5 rounded bg-surface-elevated border border-border">
                Expected Shares: <strong className="text-primary">{step.expectedShares}</strong> — {step.keyReason}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button
            size="sm"
            variant="ghost"
            disabled={dailyStepIdx === 0}
            onClick={() => {
              setDailyStepIdx((i) => Math.max(0, i - 1));
              setDailyAnswer('');
              setDailySubmitted(false);
            }}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={dailyStepIdx >= dailySession.steps.length - 1}
            onClick={() => {
              setDailyStepIdx((i) => Math.min(dailySession.steps.length - 1, i + 1));
              setDailyAnswer('');
              setDailySubmitted(false);
            }}
          >
            Next Step
          </Button>
        </div>
      </Card>
    );
  }

  if (mode === 'REPORT' && weeklyReport) {
    return (
      <div className="space-y-4 overflow-y-auto">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Award size={18} className="text-primary" /> Weekly Process & Discipline Scorecard
            </h2>
            <Badge variant="secondary" size="sm">Process Over Profit</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(weeklyReport.scores).map(([k, v]: any) => (
              <div key={k} className="p-3.5 rounded-lg bg-background border border-border">
                <div className="text-[11px] text-text-muted uppercase">{k.replace(/([A-Z])/g, ' $1')}</div>
                <div className={`text-xl font-bold font-mono mt-1 ${v >= 75 ? 'text-primary' : 'text-warning'}`}>
                  {v}/100
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-lg bg-warning/10 border border-warning/30 text-xs space-y-1">
            <div className="font-bold text-warning">Primary Growth Area</div>
            <p className="text-text-secondary">{weeklyReport.biggestWeakness}</p>
            <p className="text-text-primary font-medium">Recommended Lesson: {weeklyReport.recommendedLesson}</p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted">Spaced Repetition Queue</div>
            {weeklyReport.spacedRepetitionQueue.map((item: any) => (
              <div key={item.concept} className="flex items-center justify-between p-2.5 rounded bg-background border border-border text-xs font-mono">
                <span className="text-text-primary">{item.concept}</span>
                <span className="text-text-muted">Due: {item.due} · Mastery {item.masteryPct}%</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-text-muted flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-primary" /> {weeklyReport.processNote}
          </p>
        </Card>
      </div>
    );
  }

  return <div className="py-8 text-center text-xs text-text-muted">Loading mentor module...</div>;
};
