import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  ImagePlus,
  Lock,
  Minimize2,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useSimulator } from '../../context/SimulatorContext';
import { VoiceRecorder } from './VoiceRecorder';
import { SpeechPlayback } from './SpeechPlayback';
import { FinancialOCRModal } from './FinancialOCRModal';

interface BubbleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: string;
  suggestedFollowups?: string[];
  isError?: boolean;
  retryPrompt?: string;
  previewUrl?: string;
}

const STORAGE_KEY = 'mindmark_floating_buddy_msgs_v1';

export const FloatingAIBuddy: React.FC = () => {
  const location = useLocation();
  const { assessment, behavioralScore } = useSimulator();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<BubbleMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [allowPortfolioAccess, setAllowPortfolioAccess] = useState(true);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mentorLevel, setMentorLevel] = useState<{ code: string; label: string }>({
    code: 'ABSOLUTE_BEGINNER',
    label: 'Absolute Beginner',
  });

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24)));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    api.aiBuddy
      .getMentorProfile(assessment?.experienceLevel, behavioralScore?.overallHealth ?? 76)
      .then((res) => {
        if (res.success && res.data?.level) {
          setMentorLevel(res.data.level);
        }
      });
  }, [assessment?.experienceLevel, behavioralScore?.overallHealth]);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const sendMessage = async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || isLoading) return;

    const uMsg: BubbleMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const historyPayload = messages
      .filter((m) => !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, uMsg]);
    if (!textOverride) setInput('');
    setIsLoading(true);

    const res = await api.aiBuddy.chat({
      message: trimmed,
      history: historyPayload,
      context: {
        current_page: location.pathname,
        learning_level: mentorLevel.code,
        allow_portfolio_access: allowPortfolioAccess,
      },
    });

    setIsLoading(false);

    if (res.success && res.data) {
      const d = res.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: d.answer,
          status: d.status,
          suggestedFollowups: d.suggested_followups || [],
          isError: d.status === 'error' || d.status === 'provider_unavailable',
          retryPrompt: d.status === 'error' ? trimmed : undefined,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to reach MINDMARK AI Buddy right now. Please retry.',
          isError: true,
          retryPrompt: trimmed,
        },
      ]);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open MINDMARK AI Buddy"
        className="fixed bottom-20 lg:bottom-6 right-5 z-50 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-surface-elevated border border-primary/50 text-text-primary shadow-[0_0_24px_rgba(69,214,181,0.28)] hover:shadow-[0_0_32px_rgba(69,214,181,0.45)] hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
      >
        <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <Bot size={18} />
        </span>
        <span className="hidden sm:inline text-xs font-mono font-bold tracking-tight">
          MINDMARK AI
        </span>
        {messages.length > 0 && (
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <>
      <div
        role="dialog"
        aria-label="MINDMARK AI Buddy"
        className="fixed inset-x-2 bottom-2 top-14 sm:inset-auto sm:bottom-5 sm:right-5 z-50 sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:h-[620px] sm:max-h-[calc(100vh-3rem)] rounded-2xl bg-surface border border-primary/40 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-surface-elevated border-b border-border flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/35 flex items-center justify-center text-primary shrink-0">
              <Bot size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-text-primary truncate">MINDMARK AI Buddy</span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-mono font-bold shrink-0">
                  FINANCE-ONLY
                </span>
              </div>
              <div className="text-[10px] font-mono text-text-muted truncate">
                {mentorLevel.label} • {location.pathname}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setAllowPortfolioAccess((v) => !v)}
              title={allowPortfolioAccess ? 'Portfolio Context Enabled' : 'Portfolio Context Disabled'}
              aria-label="Toggle portfolio context"
              className={`p-1.5 rounded-lg border text-[10px] font-mono ${
                allowPortfolioAccess
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-background border-border text-text-muted'
              }`}
            >
              <Lock size={12} />
            </button>
            <button
              type="button"
              onClick={() => setMessages([])}
              title="New Chat"
              aria-label="Start new chat"
              className="p-1.5 rounded-lg bg-background border border-border text-text-secondary hover:text-primary"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Minimize"
              aria-label="Minimize AI Buddy"
              className="p-1.5 rounded-lg bg-background border border-border text-text-secondary hover:text-text-primary"
            >
              <Minimize2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Close"
              aria-label="Close AI Buddy"
              className="p-1.5 rounded-lg bg-background border border-border text-text-secondary hover:text-danger"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 bg-background/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-4 py-4">
              <Sparkles size={24} className="text-primary" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-primary">Your Floating Financial Mentor</p>
                <p className="text-[11px] text-text-muted max-w-xs">
                  Ask questions, speak with voice, or upload a chart/portfolio screenshot for OCR analysis.
                </p>
              </div>
              <div className="w-full space-y-1.5 text-left">
                {[
                  'Explain what NIFTY 50 is',
                  'How do I calculate position size?',
                  'Teach me RSI with an example',
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border hover:border-primary/50 text-[11px] text-text-primary text-left transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                <ShieldCheck size={12} className="text-primary" /> Educational only • Finance-only guardrails
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-background font-medium rounded-br-xs'
                      : msg.isError
                      ? 'bg-danger/10 border border-danger/30 text-text-primary rounded-bl-xs'
                      : 'bg-surface-elevated border border-border text-text-primary rounded-bl-xs'
                  }`}
                >
                  {msg.previewUrl && (
                    <img
                      src={msg.previewUrl}
                      alt="Uploaded attachment"
                      className="max-h-32 rounded border border-border/50 mb-1.5 object-contain"
                    />
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.isError && msg.retryPrompt && (
                    <button
                      type="button"
                      onClick={() => sendMessage(msg.retryPrompt)}
                      className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-primary"
                    >
                      <RotateCcw size={10} /> Retry
                    </button>
                  )}

                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="mt-2 pt-1.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-1.5">
                      <SpeechPlayback text={msg.content} />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.content);
                          setCopiedId(msg.id);
                          window.setTimeout(() => setCopiedId(null), 1500);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-text-secondary hover:text-primary"
                        aria-label="Copy response"
                      >
                        {copiedId === msg.id ? <Check size={10} className="text-primary" /> : <Copy size={10} />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}

                  {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-border/40 flex flex-wrap gap-1">
                      {msg.suggestedFollowups.slice(0, 2).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => sendMessage(f)}
                          className="px-2 py-0.5 rounded bg-surface border border-primary/30 text-[10px] font-mono text-primary text-left"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-3 py-2 rounded-xl bg-surface-elevated border border-border text-[11px] font-mono text-text-secondary flex items-center gap-1.5">
                <Bot size={13} className="text-primary animate-pulse" /> Thinking...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="p-2.5 bg-surface-elevated border-t border-border space-y-2 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <VoiceRecorder
              onTranscriptConfirmed={(txt) => setInput((prev) => (prev ? `${prev} ${txt}` : txt))}
            />
            <button
              type="button"
              onClick={() => setIsOcrOpen(true)}
              aria-label="Attach financial image for OCR"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-primary/50 text-[11px] font-mono text-text-primary"
            >
              <ImagePlus size={13} className="text-primary" /> OCR
            </button>
          </div>

          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask finance, markets, or risk..."
              aria-label="Message MINDMARK AI Buddy"
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none max-h-24"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="p-2.5 rounded-xl bg-primary text-background disabled:opacity-50 shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      <FinancialOCRModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        learningLevel={mentorLevel.code}
        allowPortfolioAccess={allowPortfolioAccess}
        onAnalysisComplete={({ userPrompt, aiResponse, previewUrl }) => {
          setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: 'user', content: userPrompt, previewUrl },
            {
              id: `a-${Date.now() + 1}`,
              role: 'assistant',
              content: aiResponse.answer || 'Analysis complete.',
              status: aiResponse.status,
              suggestedFollowups: aiResponse.suggested_followups || [],
            },
          ]);
        }}
      />
    </>
  );
};
