import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Lock,
  TrendingUp,
  Copy,
  Check,
  ImagePlus
} from 'lucide-react';
import { api } from '../services/api';
import { useSimulator } from '../context/SimulatorContext';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { MentorTrainingLab } from '../components/mentor/MentorTrainingLab';
import { VoiceRecorder } from '../components/mentor/VoiceRecorder';
import { SpeechPlayback } from '../components/mentor/SpeechPlayback';
import { FinancialOCRModal } from '../components/mentor/FinancialOCRModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  category?: string;
  status?: string;
  suggestedFollowups?: string[];
  isError?: boolean;
  retryPrompt?: string;
  previewUrl?: string;
  sourcePrompt?: string;
}

const STARTER_PROMPTS = [
  "Explain SIPs like I'm a beginner",
  'How does the NIFTY 50 work?',
  'Teach me how to read candlestick charts',
  'What is portfolio diversification?',
  'Explain P/E ratio with an example',
  'How do I manage investment risk?',
  'What is the difference between stocks and mutual funds?',
];

export const AIBuddyPage: React.FC = () => {
  const { assessment, behavioralScore } = useSimulator();
  const [buddyTab, setBuddyTab] = useState<'CHAT' | 'SCENARIOS' | 'DAILY' | 'REPORT'>('CHAT');
  const [mentorLevel, setMentorLevel] = useState<{ code: string; label: string }>({
    code: 'ABSOLUTE_BEGINNER',
    label: 'Absolute Beginner',
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [allowPortfolioAccess, setAllowPortfolioAccess] = useState(true);
  const [buddyStatus, setBuddyStatus] = useState<{ is_live: boolean; model_name: string } | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.aiBuddy.getStatus().then((res) => {
      if (res.success && res.data) {
        setBuddyStatus(res.data);
      }
    });
    api.aiBuddy
      .getMentorProfile(assessment?.experienceLevel, behavioralScore?.overallHealth ?? 76)
      .then((res) => {
        if (res.success && res.data?.level) {
          setMentorLevel(res.data.level);
        }
      });
  }, [assessment?.experienceLevel, behavioralScore?.overallHealth]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const historyPayload = messages
      .filter((m) => !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    const res = await api.aiBuddy.chat({
      message: trimmed,
      history: historyPayload,
      context: {
        current_page: '/ai-buddy',
        learning_level: assessment?.experienceLevel || 'BEGINNER',
        allow_portfolio_access: allowPortfolioAccess,
      },
    });

    setIsLoading(false);

    if (res.success && res.data) {
      const data = res.data;
      const isErr = data.status === 'error' || data.status === 'provider_unavailable';
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        category: data.category,
        status: data.status,
        suggestedFollowups: data.suggested_followups || [],
        isError: isErr,
        retryPrompt: isErr ? trimmed : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } else {
      const errMsg = res.error?.detail || res.error?.message || 'Unable to reach Aurivero AI Buddy right now.';
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: typeof errMsg === 'string' ? errMsg : 'Request failed. Please try again.',
          isError: true,
          retryPrompt: trimmed,
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  const handleConfirmClear = () => {
    setMessages([]);
    setInput('');
    setIsClearModalOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8.5rem)] min-h-[540px] flex flex-col gap-4 pb-2 overflow-hidden">
      {/* Header */}
      <div className="rounded-2xl bg-surface border border-border/80 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/35 flex items-center justify-center text-primary shadow-glow">
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-text-primary tracking-tight">
                Aurivero AI Buddy
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] font-mono font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${buddyStatus?.is_live ? 'bg-primary animate-pulse' : 'bg-warning'}`} />
                {buddyStatus?.is_live ? 'FINANCE-ONLY AI' : 'CONNECTING'}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              AI Trading Mentor & Risk Intelligence Buddy • Level: <strong className="text-primary">{mentorLevel.label}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'CHAT', label: 'Mentor Chat' },
              { id: 'SCENARIOS', label: 'Scenario Lab' },
              { id: 'DAILY', label: 'Daily Training' },
              { id: 'REPORT', label: 'Weekly Report' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBuddyTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                buddyTab === tab.id
                  ? 'bg-primary text-background font-bold'
                  : 'bg-surface-elevated border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <label
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-[11px] font-mono text-text-secondary cursor-pointer"
            title="Allow AI Buddy to read your simulated portfolio & trade history when you ask about your performance"
          >
            <input
              type="checkbox"
              checked={allowPortfolioAccess}
              onChange={(e) => setAllowPortfolioAccess(e.target.checked)}
              className="accent-primary"
            />
            <Lock size={11} className="text-primary" />
            <span>Portfolio Context</span>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="font-mono text-xs"
          >
            <Plus size={14} className="mr-1" />
            New Chat
          </Button>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsClearModalOpen(true)}
              className="font-mono text-xs text-text-muted hover:text-danger"
              aria-label="Clear conversation"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {buddyTab !== 'CHAT' ? (
        <MentorTrainingLab
          mode={buddyTab}
          learningLevelCode={mentorLevel.code}
          learningLevelLabel={mentorLevel.label}
          behavioralScore={behavioralScore?.overallHealth ?? 76}
        />
      ) : (
        <>
          {/* Chat Viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl bg-surface/75 border border-border/80 p-4 sm:p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-6 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <TrendingUp size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-text-primary">
                Ask me anything about Indian markets, investing, or risk
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                I explain concepts like NIFTY 50, SIPs, P/E ratios, candlestick patterns, and portfolio risk in plain language using ₹ examples—without financial jargon or off-topic distractions.
              </p>
            </div>

            <div className="w-full space-y-2.5 text-left">
              <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Sparkles size={12} className="text-primary" />
                Suggested Finance Questions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="p-3 rounded-xl bg-surface-elevated/80 border border-border/80 hover:border-primary/45 hover:bg-surface-elevated text-left text-xs text-text-primary transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted pt-2">
              <ShieldCheck size={13} className="text-primary" />
              <span>Educational mentor only • Does not provide personalized buy/sell tips</span>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white font-medium rounded-br-sm'
                      : msg.isError
                      ? 'bg-danger/10 border border-danger/30 text-text-primary rounded-bl-sm'
                      : 'bg-surface-elevated border border-border/80 text-text-primary rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-border/40 text-[10px] font-mono">
                      <span className="text-primary font-bold flex items-center gap-1">
                        <Bot size={12} /> Aurivero AI Buddy
                      </span>
                      {msg.status === 'rejected_off_topic' && (
                        <span className="text-warning">Finance-Only Guardrail</span>
                      )}
                    </div>
                  )}

                  {msg.previewUrl && (
                    <img
                      src={msg.previewUrl}
                      alt="Uploaded financial attachment"
                      className="max-h-40 rounded-lg border border-border/50 mb-2 object-contain"
                    />
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                      <SpeechPlayback text={msg.content} />
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(msg.content);
                            setCopiedId(msg.id);
                            window.setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-border text-text-secondary hover:text-primary"
                          aria-label="Copy response"
                        >
                          {copiedId === msg.id ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                          {copiedId === msg.id ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const lastUser = [...messages]
                              .reverse()
                              .find((m) => m.role === 'user');
                            if (lastUser) sendMessage(lastUser.content);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-border text-text-secondary hover:text-primary"
                          aria-label="Regenerate response"
                        >
                          <RotateCcw size={11} /> Regenerate
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.isError && msg.retryPrompt && (
                    <button
                      onClick={() => sendMessage(msg.retryPrompt)}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-mono text-primary hover:bg-surface-elevated"
                    >
                      <RotateCcw size={11} />
                      Retry
                    </button>
                  )}

                  {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap gap-1.5">
                      {msg.suggestedFollowups.map((f) => (
                        <button
                          key={f}
                          onClick={() => sendMessage(f)}
                          className="px-2.5 py-1 rounded-lg bg-surface border border-primary/25 hover:border-primary/60 text-[11px] text-primary font-mono transition-colors text-left"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-surface-elevated border border-border/80 flex items-center gap-2 text-xs font-mono text-text-secondary">
                  <Bot size={14} className="text-primary animate-pulse" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="rounded-2xl bg-surface border border-border/80 p-3 space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <VoiceRecorder
            onTranscriptConfirmed={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
          />
          <button
            type="button"
            onClick={() => setIsOcrModalOpen(true)}
            aria-label="Upload financial image or document for OCR"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-border hover:border-primary/60 text-xs font-medium text-text-primary transition-colors min-h-[38px]"
          >
            <ImagePlus size={14} className="text-primary" />
            <span>Upload Chart / OCR</span>
          </button>
        </div>

        <div className="flex items-end gap-3">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about NIFTY 50, SIPs, RSI, P/E ratio, risk management, or upload a chart..."
            aria-label="Message Aurivero AI Buddy"
            className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none max-h-32"
          />
          <Button
            variant="primary"
            size="md"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="text-xs flex-shrink-0 min-h-[40px]"
          >
            <Send size={15} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </div>

      <FinancialOCRModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        learningLevel={mentorLevel.code}
        allowPortfolioAccess={allowPortfolioAccess}
        onAnalysisComplete={({ userPrompt, aiResponse, previewUrl }) => {
          const uMsg: ChatMessage = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: userPrompt,
            previewUrl,
          };
          const aMsg: ChatMessage = {
            id: `a-${Date.now() + 1}`,
            role: 'assistant',
            content: aiResponse.answer || 'Analysis complete.',
            status: aiResponse.status,
            suggestedFollowups: aiResponse.suggested_followups || [],
          };
          setMessages((prev) => [...prev, uMsg, aMsg]);
        }}
      />
        </>
      )}

      {/* Clear Conversation Confirmation Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear Conversation?"
        description="This will remove the current chat history from this session."
        maxWidth="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirmClear}>
            Clear Chat
          </Button>
        </div>
      </Modal>
    </div>
  );
};
