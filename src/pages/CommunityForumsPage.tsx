import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  PlusCircle,
  ThumbsUp,
  Bookmark,
  Flag,
  Pin,
  User,
  Send,
  CornerDownRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  EyeOff,
  Sparkles,
  CheckCircle,
  Globe
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

const POST_TEMPLATES: Record<string, { label: string; template: string }> = {
  QUESTION: {
    label: 'Question / Help',
    template:
      'What I am trying to understand:\n\nWhat I have already researched or tried:\n\nMy goal / time horizon:'
  },
  EXPERIENCE: {
    label: 'Experience / Story',
    template:
      'What happened:\n\nMy reasoning at the time:\n\nKey risk lesson for peers:'
  },
  SCAM_ALERT: {
    label: 'Scam / Fraud Alert',
    template:
      'Platform / Handle / Defanged URL (e.g. hxxps://):\n\nHow the scam operates:\n\nRed flags to watch out for:'
  },
  PRODUCT_REVIEW: {
    label: 'Product Review',
    template:
      'Platform / Product Name:\n\nHow long I have used it:\n\nPros:\n- \n\nCons:\n- '
  },
  EDUCATIONAL: {
    label: 'Educational Guide',
    template:
      'Core Concept Summary:\n\nStep-by-step Breakdown:\n\nCommon Misconceptions:'
  },
  DISCUSSION: {
    label: 'Open Discussion',
    template:
      'Thesis or Debate Topic:\n\nArguments For:\n\nArguments Against / Risks:'
  }
};

const STARTER_CATEGORIES = [
  'All',
  'Money Basics & Personal Finance',
  'Indian Equities & Mutual Funds',
  'Blockchain',
  'Cryptocurrency',
  'Forex',
  'Scam Alerts & Fraud Watch'
];

const ANON_ALLOWED_CATEGORIES = new Set([
  'Money Basics & Personal Finance',
  'Scam Alerts & Fraud Watch'
]);

export const CommunityForumsPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedMainCat, setSelectedMainCat] = useState<string>('All');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('All');
  const [selectedIntent, setSelectedIntent] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [unansweredOnly, setUnansweredOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Thread Detail View
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [replyingToParentId, setReplyingToParentId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'THREAD' | 'COMMENT'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>('Scam or Phishing Link');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Pre-flight Safety & Duplicate Check State
  const [precheckResult, setPrecheckResult] = useState<{
    safe: boolean;
    blockers: { code: string; message: string }[];
    warnings: { code: string; message: string }[];
    related_threads: any[];
  }>({ safe: true, blockers: [], warnings: [], related_threads: [] });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // New Thread Form State
  const [newThread, setNewThread] = useState({
    category: 'Money Basics & Personal Finance',
    subcategory: 'Emergency Funds & Insurance',
    post_type: 'QUESTION',
    region: 'India / INR',
    is_anonymous: false,
    related_course_id: '',
    disclosure_text: '',
    title: '',
    content: POST_TEMPLATES.QUESTION.template,
    tags: 'beginners,risk-management'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [selectedMainCat, selectedSubCat, selectedIntent, selectedRegion, unansweredOnly, searchQuery, sortBy]);

  // Live debounced pre-flight safety & duplicate check inside Composer
  useEffect(() => {
    if (!isCreateModalOpen) return;
    if (!newThread.title.trim() && !newThread.content.trim()) {
      setPrecheckResult({ safe: true, blockers: [], warnings: [], related_threads: [] });
      return;
    }
    const timer = setTimeout(async () => {
      const res = await api.forums.precheck({
        title: newThread.title,
        content: newThread.content,
        category: newThread.category
      });
      if (res.success && res.data) {
        setPrecheckResult(res.data);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [newThread.title, newThread.content, newThread.category, isCreateModalOpen]);

  const fetchCategories = async () => {
    const res = await api.forums.getCategories();
    if (res.success && res.data?.categories) {
      setCategories(res.data.categories);
    }
  };

  const fetchThreads = async () => {
    setLoading(true);
    const res = await api.forums.getThreads({
      category: selectedMainCat !== 'All' ? selectedMainCat : undefined,
      subcategory: selectedSubCat !== 'All' ? selectedSubCat : undefined,
      intent: selectedIntent !== 'All' ? selectedIntent : undefined,
      region: selectedRegion !== 'All' ? selectedRegion : undefined,
      unanswered: unansweredOnly || undefined,
      search: searchQuery || undefined,
      sort_by: sortBy
    });
    if (res.success && res.data?.threads) {
      setThreads(res.data.threads);
    }
    setLoading(false);
  };

  const openThreadDetail = async (threadId: string) => {
    setReplyError(null);
    const res = await api.forums.getThreadDetail(threadId);
    if (res.success && res.data) {
      setActiveThread(res.data);
    }
  };

  const handleUpvote = async (threadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              has_upvoted: !t.has_upvoted,
              upvotes_count: t.has_upvoted ? Math.max(0, t.upvotes_count - 1) : t.upvotes_count + 1
            }
          : t
      )
    );
    if (activeThread && activeThread.id === threadId) {
      setActiveThread((prev: any) => ({
        ...prev,
        has_upvoted: !prev.has_upvoted,
        upvotes_count: prev.has_upvoted ? Math.max(0, prev.upvotes_count - 1) : prev.upvotes_count + 1
      }));
    }
    await api.forums.react({ thread_id: threadId, reaction_type: 'UPVOTE' });
  };

  const handleBookmark = async (threadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, is_bookmarked: !t.is_bookmarked } : t))
    );
    if (activeThread && activeThread.id === threadId) {
      setActiveThread((prev: any) => ({ ...prev, is_bookmarked: !prev.is_bookmarked }));
    }
    await api.forums.toggleBookmark(threadId);
  };

  const handleAcceptAnswer = async (commentId: string) => {
    if (!activeThread) return;
    const res = await api.forums.acceptAnswer(activeThread.id, commentId);
    if (res.success) {
      setActionSuccessMsg(res.data?.message || 'Marked as Accepted Solution! +25 Reputation awarded.');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      openThreadDetail(activeThread.id);
      fetchThreads();
    }
  };

  const handleCategoryChangeInComposer = (catName: string) => {
    const matchedCat = categories.find((c) => c.name === catName);
    const firstSub = matchedCat?.subcategories?.[0]?.name || 'General';
    setNewThread((prev) => ({
      ...prev,
      category: catName,
      subcategory: firstSub,
      is_anonymous: ANON_ALLOWED_CATEGORIES.has(catName) ? prev.is_anonymous : false
    }));
  };

  const handlePostTypeChange = (postType: string) => {
    setNewThread((prev) => ({
      ...prev,
      post_type: postType,
      content: POST_TEMPLATES[postType]?.template || prev.content
    }));
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!newThread.title.trim() || !newThread.content.trim() || !precheckResult.safe) return;

    const res = await api.forums.createThread({
      ...newThread,
      related_course_id: newThread.related_course_id || undefined,
      disclosure_text: newThread.disclosure_text || undefined
    });

    if (res.success) {
      setIsCreateModalOpen(false);
      setNewThread({
        category: 'Money Basics & Personal Finance',
        subcategory: 'Emergency Funds & Insurance',
        post_type: 'QUESTION',
        region: 'India / INR',
        is_anonymous: false,
        related_course_id: '',
        disclosure_text: '',
        title: '',
        content: POST_TEMPLATES.QUESTION.template,
        tags: 'beginners,risk-management'
      });
      setActionSuccessMsg(res.data?.message || 'Your discussion thread has been published!');
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchThreads();
      fetchCategories();
    } else {
      const errMsg = res.error?.detail?.message || res.error?.message || 'Blocked by safety policy.';
      setSubmitError(errMsg);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setReplyError(null);
    if (!replyContent.trim() || !activeThread) return;

    const res = await api.forums.addComment({
      thread_id: activeThread.id,
      parent_id: replyingToParentId || undefined,
      content: replyContent
    });

    if (res.success) {
      setReplyContent('');
      setReplyingToParentId(null);
      openThreadDetail(activeThread.id);
    } else {
      setReplyError(res.error?.detail?.message || 'Reply blocked by safety guidelines.');
    }
  };

  const handleReportSubmit = async () => {
    if (!reportTarget) return;
    const res = await api.forums.report({
      content_type: reportTarget.type,
      content_id: reportTarget.id,
      reason: reportReason,
      details: reportDetails
    });
    setIsReportModalOpen(false);
    setReportTarget(null);
    setReportDetails('');
    setActionSuccessMsg(res.data?.message || 'Report received. Our Trust & Safety team has been notified.');
    setTimeout(() => setActionSuccessMsg(null), 4000);
    if (res.data?.quarantined) {
      setActiveThread(null);
      fetchThreads();
    }
  };

  const getIntentStyle = (intent: string) => {
    if (intent?.includes('Scam')) return 'bg-danger/15 text-danger border-danger/30';
    if (intent?.includes('Educational')) return 'bg-primary/15 text-primary border-primary/30';
    if (intent?.includes('Question')) return 'bg-secondary/15 text-secondary border-secondary/30';
    if (intent?.includes('Experience')) return 'bg-warning/15 text-warning border-warning/30';
    return 'bg-surface-elevated text-text-secondary border-border';
  };

  const getOriginStyle = (origin: string) => {
    if (origin === 'Official MINDMARK') return 'bg-secondary/20 text-secondary border-secondary/40';
    if (origin === 'Verified Experience') return 'bg-primary/20 text-primary border-primary/40';
    return 'bg-surface text-text-muted border-border/60';
  };

  const currentCatSubcategories =
    categories.find((c) => c.name === newThread.category)?.subcategories || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Safety-First Compact Banner */}
      <div className="px-4 py-2.5 rounded-xl bg-surface-elevated/80 border border-primary/25 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-text-secondary">
          <ShieldCheck size={15} className="text-primary flex-shrink-0" />
          <span>
            <strong className="text-text-primary">Trust & Safety Guardrail:</strong> Educational peer learning only—zero stock tips. Never share OTPs, bank account numbers, or seed phrases.
          </span>
        </div>
        <span className="text-[11px] text-primary font-semibold">MINDMARK Staff Never DM</span>
      </div>

      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-elevated to-surface border border-border/80 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-mono font-semibold mb-3">
              <MessageSquare size={13} className="text-secondary" />
              6 STARTER SPACES • PEER LEARNING NETWORK
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight font-mono">
              MINDMARK Community Forums
            </h1>
            <p className="text-text-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">
              Ask honest money questions, share disciplined experiences, spot scams early, and earn reputation by helping others learn.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSubmitError(null);
              setIsCreateModalOpen(true);
            }}
            className="font-mono text-xs shadow-glow flex-shrink-0"
          >
            <PlusCircle size={15} className="mr-2" />
            Start Discussion
          </Button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Layout */}
      {!activeThread ? (
        <div className="space-y-5">
          {/* 6 Starter Spaces Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/60 scrollbar-none">
            {STARTER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedMainCat(cat);
                  setSelectedSubCat('All');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                  selectedMainCat === cat
                    ? 'bg-secondary text-background shadow-md'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/50'
                }`}
              >
                {cat === 'All' ? 'All Spaces' : cat}
              </button>
            ))}
          </div>

          {/* Subcategory Pills */}
          {selectedMainCat !== 'All' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                <Filter size={12} /> Topics:
              </span>
              <button
                onClick={() => setSelectedSubCat('All')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  selectedSubCat === 'All'
                    ? 'bg-primary/15 text-primary border border-primary/30 font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                All Topics
              </button>
              {categories
                .find((c) => c.name === selectedMainCat)
                ?.subcategories.map((sub: any) => (
                  <button
                    key={sub.name}
                    onClick={() => setSelectedSubCat(sub.name)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      selectedSubCat === sub.name
                        ? 'bg-primary/15 text-primary border border-primary/30 font-bold'
                        : 'text-text-secondary hover:text-text-primary bg-surface/40'
                    }`}
                  >
                    <span>{sub.name}</span>
                    <span className="text-[10px] opacity-70">({sub.thread_count})</span>
                  </button>
                ))}
            </div>
          )}

          {/* Search, Intent, Region & Sort Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search threads, questions, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-elevated/70 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <select
                value={selectedIntent}
                onChange={(e) => setSelectedIntent(e.target.value)}
                aria-label="Filter by post intent"
                className="px-3 py-1.5 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none"
              >
                <option value="All">All Intents</option>
                <option value="Question / Help">Question / Help</option>
                <option value="Experience Sharing">Experience Sharing</option>
                <option value="Educational">Educational</option>
                <option value="Scam / Fraud Alert">Scam / Fraud Alert</option>
                <option value="Product Review">Product Review</option>
              </select>

              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                aria-label="Filter by region"
                className="px-3 py-1.5 bg-surface-elevated border border-border rounded-lg text-text-secondary focus:outline-none"
              >
                <option value="All">All Regions</option>
                <option value="India / INR">India / INR</option>
                <option value="Global">Global</option>
                <option value="Crypto-Native">Crypto-Native</option>
              </select>

              <button
                onClick={() => setUnansweredOnly(!unansweredOnly)}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  unansweredOnly
                    ? 'bg-warning/15 text-warning border-warning/40 font-bold'
                    : 'bg-surface-elevated text-text-muted border-border hover:text-text-primary'
                }`}
              >
                Unanswered Only
              </button>

              <div className="flex items-center gap-1 ml-1">
                {(['latest', 'popular', 'trending'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-2.5 py-1.5 rounded-lg capitalize transition-colors ${
                      sortBy === s
                        ? 'bg-surface-elevated text-text-primary border border-primary/40 font-bold'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Threads List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-surface/50 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface border border-border">
              <MessageSquare size={36} className="mx-auto text-text-muted mb-3" />
              <h3 className="text-base font-bold text-text-primary">No discussions match these filters</h3>
              <p className="text-text-muted text-xs mt-1">Clear filters or start a structured question to get peer help.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 font-mono text-xs"
              >
                Start Discussion
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map((t) => (
                <Card
                  key={t.id}
                  variant="interactive"
                  className="p-5 cursor-pointer border-border/70 hover:border-secondary/40 bg-surface/85 transition-all"
                  onClick={() => openThreadDetail(t.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Top Badges Row */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono mb-2">
                        {t.is_pinned && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-bold">
                            <Pin size={10} /> PINNED
                          </span>
                        )}
                        {t.intent_badge && (
                          <span className={`px-2 py-0.5 rounded border font-semibold ${getIntentStyle(t.intent_badge)}`}>
                            {t.intent_badge}
                          </span>
                        )}
                        {t.origin_label && (
                          <span className={`px-2 py-0.5 rounded border ${getOriginStyle(t.origin_label)}`}>
                            {t.origin_label}
                          </span>
                        )}
                        {t.region && (
                          <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border/60 text-text-muted flex items-center gap-1">
                            <Globe size={9} /> {t.region}
                          </span>
                        )}
                        {t.has_accepted_answer && (
                          <span className="px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 flex items-center gap-1 font-bold">
                            <CheckCircle size={10} /> Accepted Solution
                          </span>
                        )}
                      </div>

                      {/* Category & Author Meta */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-muted mb-1.5">
                        <span className="text-secondary font-semibold">{t.category}</span>
                        <span>›</span>
                        <span>{t.subcategory}</span>
                        <span>•</span>
                        <span className="text-text-secondary flex items-center gap-1">
                          {t.is_anonymous ? <EyeOff size={11} /> : <User size={11} />}
                          {t.author_name}
                        </span>
                        <span>•</span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>

                      <h3 className="text-base font-bold text-text-primary group-hover:text-secondary transition-colors leading-snug">
                        {t.title}
                      </h3>

                      <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed">
                        {t.content}
                      </p>

                      {/* Tags + Related Course */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {t.tags_list?.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary border border-border/50 text-[10px] font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                        {t.related_course_id && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/academy');
                            }}
                            className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/30 text-[10px] font-mono flex items-center gap-1 hover:bg-secondary/20"
                          >
                            <BookOpen size={10} /> Linked Academy Course
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats & Actions Column */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 flex-shrink-0">
                      <button
                        onClick={(e) => handleUpvote(t.id, e)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
                          t.has_upvoted
                            ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                            : 'bg-surface-elevated text-text-muted hover:text-text-primary border-border'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp size={13} fill={t.has_upvoted ? 'currentColor' : 'none'} />
                        <span>{t.upvotes_count}</span>
                      </button>

                      <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted px-2 py-1">
                        <MessageSquare size={13} />
                        <span>{t.replies_count}</span>
                      </div>

                      <button
                        onClick={(e) => handleBookmark(t.id, e)}
                        className={`p-1.5 rounded-lg border text-text-muted hover:text-text-primary transition-colors ${
                          t.is_bookmarked ? 'text-secondary border-secondary/40' : 'border-border/40'
                        }`}
                        title="Bookmark"
                      >
                        <Bookmark size={13} fill={t.is_bookmarked ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Single Thread Detail View */
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveThread(null)}
            className="font-mono text-xs text-text-muted hover:text-text-primary"
          >
            ← Back to Discussions List
          </Button>

          <Card className="p-6 sm:p-8 bg-surface-elevated border-border space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {activeThread.intent_badge && (
                  <span className={`px-2 py-0.5 rounded border font-semibold ${getIntentStyle(activeThread.intent_badge)}`}>
                    {activeThread.intent_badge}
                  </span>
                )}
                {activeThread.origin_label && (
                  <span className={`px-2 py-0.5 rounded border ${getOriginStyle(activeThread.origin_label)}`}>
                    {activeThread.origin_label}
                  </span>
                )}
                <span className="text-secondary font-bold">{activeThread.category}</span>
                <span>›</span>
                <span className="text-text-muted">{activeThread.subcategory}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBookmark(activeThread.id)}
                  className="text-xs font-mono"
                >
                  <Bookmark
                    size={13}
                    className="mr-1.5"
                    fill={activeThread.is_bookmarked ? 'currentColor' : 'none'}
                  />
                  {activeThread.is_bookmarked ? 'Saved' : 'Save'}
                </Button>
                <button
                  onClick={() => {
                    setReportTarget({ type: 'THREAD', id: activeThread.id });
                    setIsReportModalOpen(true);
                  }}
                  className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-surface transition-colors"
                  title="Report Content"
                >
                  <Flag size={14} />
                </button>
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-mono leading-tight">
                {activeThread.title}
              </h1>

              {/* Author badge */}
              <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-background text-xs font-mono">
                    {activeThread.is_anonymous ? '?' : activeThread.author_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <span>{activeThread.author_name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-surface border border-border text-[10px] text-primary font-mono">
                        {activeThread.author_role || 'Contributor'}
                      </span>
                    </div>
                    {!activeThread.is_anonymous && (
                      <div className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                        <Award size={10} className="text-warning" />
                        Helpful Reputation: {activeThread.author_reputation || 120} pts
                      </div>
                    )}
                  </div>
                </div>

                {activeThread.related_course_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/academy')}
                    className="text-xs font-mono text-secondary border-secondary/40"
                  >
                    <BookOpen size={13} className="mr-1.5" />
                    Open Related Academy Lesson
                  </Button>
                )}
              </div>

              {activeThread.disclosure_text && (
                <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs font-mono text-warning flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span><strong>Author Disclosure:</strong> {activeThread.disclosure_text}</span>
                </div>
              )}

              <div className="mt-6 text-sm text-text-secondary leading-relaxed space-y-4 whitespace-pre-line">
                {activeThread.content}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {activeThread.tags_list?.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-mono text-text-secondary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between">
              <button
                onClick={() => handleUpvote(activeThread.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono transition-colors ${
                  activeThread.has_upvoted
                    ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                    : 'bg-surface text-text-secondary hover:text-text-primary border-border'
                }`}
              >
                <ThumbsUp size={14} fill={activeThread.has_upvoted ? 'currentColor' : 'none'} />
                <span>Helpful ({activeThread.upvotes_count})</span>
              </button>

              <span className="text-[11px] font-mono text-text-muted">
                Educational discussion • Not personalized financial advice
              </span>
            </div>
          </Card>

          {/* Post Reply Input Box */}
          <Card className="p-5 bg-surface border-border">
            <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider mb-2">
              {replyingToParentId ? 'Replying to comment' : 'Share a helpful perspective'}
            </h3>
            {replyError && (
              <div className="mb-3 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono">
                {replyError}
              </div>
            )}
            <form onSubmit={handlePostReply} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Explain your reasoning clearly. No guaranteed return claims or referral links."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="w-full p-3 bg-surface-elevated border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-secondary/50 resize-y"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={!replyContent.trim()}
                  className="font-mono text-xs"
                >
                  <Send size={13} className="mr-1.5" />
                  Post Helpful Reply (+5 Rep)
                </Button>
              </div>
            </form>
          </Card>

          {/* Comments & Accepted Solution */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono font-bold text-text-primary">
              Community Replies ({activeThread.comments?.length || 0})
            </h3>

            {activeThread.comments?.map((comment: any) => (
              <div key={comment.id} className="space-y-2">
                <Card
                  className={`p-4 ${
                    comment.is_solution
                      ? 'bg-primary/5 border-primary/50 shadow-glow'
                      : 'bg-surface/90 border-border'
                  }`}
                >
                  {comment.is_solution && (
                    <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-[10px] font-mono font-bold">
                      <CheckCircle size={11} /> ACCEPTED SOLUTION
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">{comment.author_name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-surface-elevated text-[10px] text-text-secondary">
                        {comment.author_role || 'Member'}
                      </span>
                      <span>•</span>
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>

                    <button
                      onClick={() => {
                        setReportTarget({ type: 'COMMENT', id: comment.id });
                        setIsReportModalOpen(true);
                      }}
                      className="text-text-muted hover:text-danger"
                      title="Report"
                    >
                      <Flag size={12} />
                    </button>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                    {comment.content}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/30 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          await api.forums.react({ comment_id: comment.id, reaction_type: 'UPVOTE' });
                          openThreadDetail(activeThread.id);
                        }}
                        className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
                      >
                        <ThumbsUp size={12} fill={comment.has_upvoted ? 'currentColor' : 'none'} />
                        <span>Helpful ({comment.upvotes_count})</span>
                      </button>

                      {activeThread.is_owner && !comment.is_solution && (
                        <button
                          onClick={() => handleAcceptAnswer(comment.id)}
                          className="flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          <CheckCircle size={12} />
                          <span>Accept Solution (+25 Rep)</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setReplyingToParentId(comment.id)}
                      className="flex items-center gap-1 text-secondary hover:underline"
                    >
                      <CornerDownRight size={12} />
                      <span>Reply</span>
                    </button>
                  </div>
                </Card>

                {comment.replies?.map((reply: any) => (
                  <div key={reply.id} className="ml-8 border-l-2 border-secondary/30 pl-3">
                    <Card className="p-3 bg-surface-elevated/80 border-border/70 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-1">
                        <span className="font-bold text-text-primary">{reply.author_name}</span>
                        <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-text-secondary leading-relaxed">{reply.content}</p>
                    </Card>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgraded Start Discussion Modal with Templates, Duplicate Detection & Pre-Post Safety Check */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Start a Safe, High-Quality Discussion"
        description="Pick a structured template—our pre-flight scanner protects your privacy and prevents spam."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateThread} className="space-y-4 text-xs font-mono">
          {/* Post Type Template Pills */}
          <div>
            <label className="block text-text-muted mb-1.5">1. Choose Post Type (loads smart template)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(POST_TEMPLATES).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePostTypeChange(key)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    newThread.post_type === key
                      ? 'bg-primary/15 border-primary text-primary font-bold'
                      : 'bg-surface-elevated border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-text-muted mb-1">Category</label>
              <select
                value={newThread.category}
                onChange={(e) => handleCategoryChangeInComposer(e.target.value)}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              >
                {STARTER_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted mb-1">Topic Subcategory</label>
              <select
                value={newThread.subcategory}
                onChange={(e) => setNewThread((prev) => ({ ...prev, subcategory: e.target.value }))}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              >
                {currentCatSubcategories.length > 0 ? (
                  currentCatSubcategories.map((sub: any) => (
                    <option key={sub.name} value={sub.name}>{sub.name}</option>
                  ))
                ) : (
                  <option value="General">General</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-text-muted mb-1">Region Context</label>
              <select
                value={newThread.region}
                onChange={(e) => setNewThread((prev) => ({ ...prev, region: e.target.value }))}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              >
                <option value="India / INR">India / INR</option>
                <option value="Global">Global</option>
                <option value="Crypto-Native">Crypto-Native</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-muted mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. How do I size a stop-loss on USD/INR without getting wicked out?"
              value={newThread.title}
              onChange={(e) => setNewThread((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* Live Duplicate Question Suggestions */}
          {precheckResult.related_threads?.length > 0 && (
            <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/30 space-y-1.5">
              <div className="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                <Sparkles size={12} />
                Similar discussions already exist — did one answer your question?
              </div>
              {precheckResult.related_threads.map((rt) => (
                <div
                  key={rt.id}
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    openThreadDetail(rt.id);
                  }}
                  className="text-[11px] text-text-primary hover:text-secondary cursor-pointer flex items-center justify-between py-0.5"
                >
                  <span className="truncate pr-2">• {rt.title}</span>
                  <span className="text-[10px] text-primary flex-shrink-0">
                    {rt.has_accepted_answer ? '✓ Answered' : `${rt.replies_count} replies`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-text-muted mb-1">Structured Content</label>
            <textarea
              required
              rows={6}
              value={newThread.content}
              onChange={(e) => setNewThread((prev) => ({ ...prev, content: e.target.value }))}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted mb-1">Link Academy Course (Optional)</label>
              <select
                value={newThread.related_course_id}
                onChange={(e) => setNewThread((prev) => ({ ...prev, related_course_id: e.target.value }))}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              >
                <option value="">None</option>
                <option value="course-blockchain-101">Blockchain Architecture 101</option>
                <option value="course-crypto-101">Crypto Fundamentals & Tokenomics</option>
                <option value="course-forex-101">Forex Currency Mechanics 101</option>
              </select>
            </div>

            <div>
              <label className="block text-text-muted mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={newThread.tags}
                onChange={(e) => setNewThread((prev) => ({ ...prev, tags: e.target.value }))}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              />
            </div>
          </div>

          {/* Conflict Disclosure for Product Reviews */}
          {newThread.post_type === 'PRODUCT_REVIEW' && (
            <div>
              <label className="block text-text-muted mb-1">Conflict-of-Interest Disclosure (Required for reviews)</label>
              <input
                type="text"
                placeholder="e.g. Personal paid user for 1 year, no affiliation or referral relationship"
                value={newThread.disclosure_text}
                onChange={(e) => setNewThread((prev) => ({ ...prev, disclosure_text: e.target.value }))}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
              />
            </div>
          )}

          {/* Anonymous Posting Toggle (Sensitive Spaces Only) */}
          {ANON_ALLOWED_CATEGORIES.has(newThread.category) && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={newThread.is_anonymous}
                onChange={(e) => setNewThread((prev) => ({ ...prev, is_anonymous: e.target.checked }))}
                className="mt-0.5"
              />
              <div>
                <div className="text-text-primary font-bold flex items-center gap-1.5">
                  <EyeOff size={12} className="text-secondary" />
                  Post Anonymously (Sensitive Space Option)
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Your display name is hidden from peers (`Anonymous Member`), and you won't earn public reputation. Moderators retain account ownership for abuse prevention.
                </p>
              </div>
            </label>
          )}

          {/* Live Check-Before-Posting Safety Bar */}
          <div
            className={`p-3 rounded-xl border text-[11px] space-y-1 ${
              !precheckResult.safe
                ? 'bg-danger/10 border-danger/40 text-danger'
                : precheckResult.warnings?.length > 0
                ? 'bg-warning/10 border-warning/40 text-warning'
                : 'bg-primary/10 border-primary/30 text-primary'
            }`}
          >
            {!precheckResult.safe ? (
              <>
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Check Before Posting — Action Required:
                </div>
                {precheckResult.blockers.map((b, i) => (
                  <div key={i}>• {b.message}</div>
                ))}
              </>
            ) : precheckResult.warnings?.length > 0 ? (
              <>
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Helpful Tip:
                </div>
                {precheckResult.warnings.map((w, i) => (
                  <div key={i}>• {w.message}</div>
                ))}
              </>
            ) : (
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck size={14} /> Pre-flight safety check passed — no PII, guaranteed-return claims, or prohibited links detected.
              </div>
            )}
          </div>

          {submitError && (
            <div className="p-2.5 rounded-lg bg-danger/15 border border-danger text-danger text-xs">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!precheckResult.safe || !newThread.title.trim()}
            >
              {newThread.is_anonymous ? 'Publish Anonymously' : 'Publish Thread (+15 Rep)'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report Content to Trust & Safety"
        description="Posts receiving 3+ flags are automatically quarantined for moderator inspection."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-text-muted mb-1">Reason (sets severity)</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
            >
              <option value="Scam or Phishing Link">Scam or Phishing Link (Critical)</option>
              <option value="Staff or Support Impersonation">Staff or Support Impersonation (Critical)</option>
              <option value="Personal Financial Data / PII Leak">Personal Financial Data / PII Leak (High)</option>
              <option value="Unsolicited Stock/Crypto Advisory or Tips">Unsolicited Financial Tips / Guarantees (High)</option>
              <option value="Harassment or Toxic Conduct">Harassment or Toxic Conduct (High)</option>
              <option value="Spam or Referral Links">Spam or Referral Links (Medium)</option>
            </select>
          </div>

          <div>
            <label className="block text-text-muted mb-1">Additional Context (Optional)</label>
            <textarea
              rows={3}
              placeholder="Describe what triggered this report..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setIsReportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleReportSubmit}>
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
