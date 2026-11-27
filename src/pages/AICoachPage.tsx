import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  X,
  ClipboardCheck,
  BookOpen,
} from 'lucide-react';
import api from '../services/api';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  evidence?: string[];
  sources?: any[];
  suggested_actions?: any[];
  ai_source?: string;
}

export const AICoachPage: React.FC = () => {
  const [context, setContext] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Decision Review Panel
  const [showReview, setShowReview] = useState(false);
  const [revSymbol, setRevSymbol] = useState('RELIANCE');
  const [revAction, setRevAction] = useState('BUY');
  const [revReasoning, setRevReasoning] = useState('');
  const [revPosPct, setRevPosPct] = useState(12);
  const [revLimitPct, setRevLimitPct] = useState(20);
  const [revContext, setRevContext] = useState('');
  const [revResult, setRevResult] = useState<any>(null);

  const loadIntelligence = async () => {
    try {
      const [ctxRes, recRes] = await Promise.all([
        api.aiCoach.getContext(),
        api.aiCoach.getRecommendations(),
      ]);
      setContext(ctxRes?.data ?? ctxRes);
      setRecs(recRes?.data ?? recRes ?? []);
    } catch {
      // ignore initial error
    }
  };

  useEffect(() => {
    loadIntelligence();
  }, []);

  const sendMessage = async (textOverride?: string) => {
    const msg = (textOverride ?? input).trim();
    if (!msg || sending) return;
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    if (!textOverride) setInput('');
    setSending(true);
    try {
      const res = await api.aiCoach.chat({ message: msg, conversation_id: conversationId, use_ai: true });
      const d = res?.data ?? res;
      if (d?.conversation_id) setConversationId(d.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: d?.answer || 'Unable to generate response.',
          evidence: d?.evidence || [],
          sources: d?.sources || [],
          suggested_actions: d?.suggested_actions || [],
          ai_source: d?.ai_source,
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: e?.message || 'AI Coach is temporarily unavailable.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const clearConversation = async () => {
    if (conversationId) {
      try {
        await api.aiCoach.deleteConversation(conversationId);
      } catch {
        // ignore
      }
    }
    setConversationId(null);
    setMessages([]);
  };

  const uctx = context?.user_context || {};
  const strong = context?.strongest_dimension;
  const weak = context?.dimension_needing_improvement;
  const archetype = context?.archetype;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#141C25] via-[#101822] to-[#0B1017] border border-white/10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#45D6B5]/15 text-[#45D6B5] text-xs font-semibold">
            <Bot className="w-3.5 h-3.5" /> PERSONALIZED GEMINI AI COACH
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">MINDMARK AI Coach</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Your decisions. Your learning journey. Your AI coach.
          </p>
        </div>
        <button
          onClick={() => setShowReview(!showReview)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold hover:opacity-90 shrink-0"
        >
          <ClipboardCheck className="w-4 h-4" /> Ask AI to Review My Decision
        </button>
      </div>

      {/* Optional Decision Review Panel */}
      {showReview && (
        <div className="rounded-2xl bg-[#141C25] border border-[#45D6B5]/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase">Ask AI to Review My Decision (At-Decision-Time Evaluation)</h2>
            <button onClick={() => setShowReview(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <input value={revSymbol} onChange={(e) => setRevSymbol(e.target.value)} placeholder="Symbol" className="rounded-xl bg-[#0B1017] border border-white/10 p-2.5 text-xs text-white" />
            <select value={revAction} onChange={(e) => setRevAction(e.target.value)} className="rounded-xl bg-[#0B1017] border border-white/10 p-2.5 text-xs text-white">
              {['BUY', 'SELL', 'HOLD', 'REDUCE'].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="number" value={revPosPct} onChange={(e) => setRevPosPct(Number(e.target.value))} placeholder="Position %" className="rounded-xl bg-[#0B1017] border border-white/10 p-2.5 text-xs text-white" />
            <input type="number" value={revLimitPct} onChange={(e) => setRevLimitPct(Number(e.target.value))} placeholder="Risk Limit %" className="rounded-xl bg-[#0B1017] border border-white/10 p-2.5 text-xs text-white" />
          </div>
          <textarea value={revReasoning} onChange={(e) => setRevReasoning(e.target.value)} rows={2} placeholder="Your stated reasoning at decision time..." className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-2.5 text-xs text-white" />
          <input value={revContext} onChange={(e) => setRevContext(e.target.value)} placeholder="Market/fundamental info available at decision time (optional)..." className="w-full rounded-xl bg-[#0B1017] border border-white/10 p-2.5 text-xs text-white" />
          <button
            onClick={async () => {
              if (revReasoning.trim().length < 3) return;
              const r = await api.aiCoach.reviewDecision({
                symbol: revSymbol,
                action: revAction,
                stated_reasoning: revReasoning,
                position_size_pct: revPosPct,
                risk_limit_pct: revLimitPct,
                market_context_at_time: revContext,
                use_ai: true,
              });
              setRevResult(r?.data ?? r);
            }}
            className="px-5 py-2 rounded-xl bg-[#45D6B5] text-[#0B1017] text-xs font-bold"
          >
            Generate 6-Point Decision Review
          </button>

          {revResult && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs">
              {[
                ['What You Did Well', revResult.what_you_did_well],
                ['Risks Missed', revResult.risks_missed],
                ['Evidence Support', revResult.evidence_support],
                ['Plan Alignment', revResult.plan_alignment],
                ['What Could Change Your View', revResult.invalidation_info],
                ['Practical Lesson', revResult.practical_lesson],
              ].map(([title, body]) => (
                <div key={title} className="p-3 rounded-xl bg-[#0B1017] border border-white/10 space-y-1">
                  <div className="font-bold text-[#45D6B5]">{title}</div>
                  <p className="text-slate-300">{body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Split Layout: Chat + Personal Intelligence Panel */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-2 rounded-2xl bg-[#141C25] border border-white/10 flex flex-col min-h-[540px]">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Finance-Only Educational Coach</span>
            <button
              onClick={clearConversation}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[420px]">
            {messages.length === 0 ? (
              <div className="space-y-4 py-6">
                <p className="text-sm text-slate-300">
                  Ask about your Decision Fingerprint, Mirror Mode lessons, Arena progress, or Indian stock market fundamentals:
                </p>
                <div className="flex flex-wrap gap-2">
                  {(context?.suggested_questions || []).map((q: string) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left px-3 py-2 rounded-xl bg-[#0B1017] border border-white/10 hover:border-[#45D6B5]/50 text-xs text-slate-200 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-2 ${
                      m.role === 'user'
                        ? 'bg-[#45D6B5] text-[#0B1017] font-medium'
                        : 'bg-[#0B1017] border border-white/10 text-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    {m.evidence && m.evidence.length > 0 && (
                      <div className="pt-2 border-t border-white/10 text-[11px] text-[#78A9FF]">
                        Evidence: {m.evidence.join(' • ')}
                      </div>
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Sources: {m.sources.map((s) => `${s.source} (${s.data_type})`).join(', ')}
                      </div>
                    )}
                    {m.suggested_actions && m.suggested_actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {m.suggested_actions.map((a: any, idx: number) => (
                          <Link
                            key={idx}
                            to={a.route}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#45D6B5]/15 text-[#45D6B5] font-semibold"
                          >
                            {a.label} <ArrowRight className="w-3 h-3" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="text-xs font-mono text-[#45D6B5] animate-pulse">AI Coach is thinking...</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-4 border-t border-white/10 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your risk discipline, NIFTY 50, P/E ratio, or next lesson..."
              className="flex-1 rounded-xl bg-[#0B1017] border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#45D6B5]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#45D6B5] text-[#0B1017] font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>

        {/* Personal Intelligence Panel */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#141C25] border border-white/10 space-y-3">
            <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#45D6B5]" /> Personal Intelligence
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10">
                <div className="text-slate-400">Level & XP</div>
                <div className="font-bold text-white">Lv {uctx.level || 1} • {uctx.total_xp || 0} XP</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10">
                <div className="text-slate-400">Arena League</div>
                <div className="font-bold text-amber-400">{uctx.arena_league || 'Bronze'}</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10 text-xs space-y-1">
              <div className="text-slate-400">Investor Archetype</div>
              <div className="font-bold text-[#45D6B5]">
                {archetype?.name || 'Not enough data yet'}
              </div>
            </div>
            {strong && (
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10 text-xs">
                <div className="text-slate-400">Strongest Dimension</div>
                <div className="font-semibold text-white">{strong.name}: {strong.score}/100</div>
              </div>
            )}
            {weak && (
              <div className="p-3 rounded-xl bg-[#0B1017] border border-white/10 text-xs">
                <div className="text-slate-400">Needs Improvement</div>
                <div className="font-semibold text-amber-300">{weak.name}: {weak.score}/100</div>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-[#141C25] border border-white/10 space-y-3">
            <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#45D6B5]" /> Adaptive Recommendations
            </div>
            {recs.length === 0 ? (
              <div className="text-xs text-slate-400">All current recommendations completed or dismissed.</div>
            ) : (
              recs.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-[#0B1017] border border-white/10 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-white">{r.title}</span>
                    <button
                      onClick={async () => {
                        await api.aiCoach.dismissRecommendation(r.id);
                        loadIntelligence();
                      }}
                      className="text-slate-500 hover:text-white"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-slate-400">{r.reason}</p>
                  <Link to={r.route} className="inline-flex items-center gap-1 text-[#45D6B5] font-semibold hover:underline">
                    {r.action_label} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
