import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  PlusCircle,
  ThumbsUp,
  Bookmark,
  Flag,
  Pin,
  Lock,
  User,
  Shield,
  Clock,
  Sparkles,
  Send,
  CornerDownRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const CommunityForumsPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedMainCat, setSelectedMainCat] = useState<string>('All');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Thread Detail View
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [replyingToParentId, setReplyingToParentId] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'THREAD' | 'COMMENT'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>('Spam or Scam');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New Thread Form State
  const [newThread, setNewThread] = useState({
    category: 'Blockchain',
    subcategory: 'Smart contracts',
    title: '',
    content: '',
    tags: 'ethereum,solidity'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [selectedMainCat, selectedSubCat, searchQuery, sortBy]);

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
      search: searchQuery || undefined,
      sort_by: sortBy
    });
    if (res.success && res.data?.threads) {
      setThreads(res.data.threads);
    }
    setLoading(false);
  };

  const openThreadDetail = async (threadId: string) => {
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

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThread.title.trim() || !newThread.content.trim()) return;

    const res = await api.forums.createThread(newThread);
    if (res.success) {
      setIsCreateModalOpen(false);
      setNewThread({
        category: 'Blockchain',
        subcategory: 'Smart contracts',
        title: '',
        content: '',
        tags: 'ethereum,solidity'
      });
      setActionSuccessMsg('Your discussion thread has been published to the community!');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      fetchThreads();
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeThread) return;

    const res = await api.forums.addComment({
      thread_id: activeThread.id,
      parent_id: replyingToParentId || undefined,
      content: replyContent
    });

    if (res.success) {
      setReplyContent('');
      setReplyingToParentId(null);
      // Refresh thread
      openThreadDetail(activeThread.id);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportTarget) return;
    await api.forums.report({
      content_type: reportTarget.type,
      content_id: reportTarget.id,
      reason: reportReason,
      details: reportDetails
    });
    setIsReportModalOpen(false);
    setReportTarget(null);
    setReportDetails('');
    setActionSuccessMsg('Report received. Our moderation team will investigate.');
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-elevated to-surface border border-border/80 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-mono font-semibold mb-3">
              <MessageSquare size={13} className="text-secondary" />
              PEER-TO-PEER KNOWLEDGE NETWORK
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight font-mono">
              Community Forums: Blockchain, Crypto & Forex
            </h1>
            <p className="text-text-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">
              Debate protocol architectures, verify smart contract security, analyze currency pair order flow, and share disciplined trading rules.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
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

      {/* Main Layout: Taxonomy Filter Tabs or Active Thread Detail */}
      {!activeThread ? (
        <div className="space-y-6">
          {/* Main Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            {['All', 'Blockchain', 'Cryptocurrency', 'Forex'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedMainCat(cat);
                  setSelectedSubCat('All');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  selectedMainCat === cat
                    ? 'bg-secondary text-background shadow-md'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/50'
                }`}
              >
                {cat === 'All' ? '🌐 All Forums' : cat}
              </button>
            ))}
          </div>

          {/* Subcategory Pills (if a specific main category is selected) */}
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

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search discussion threads, questions, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-elevated/70 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-text-muted">Sort By:</span>
              {(['latest', 'popular', 'trending'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
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
              <h3 className="text-base font-bold text-text-primary">No discussions found</h3>
              <p className="text-text-muted text-xs mt-1">Be the first to start a conversation in this topic!</p>
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
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-muted mb-2">
                        {t.is_pinned && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-bold">
                            <Pin size={10} /> PINNED
                          </span>
                        )}
                        <span className="text-secondary font-semibold">{t.category}</span>
                        <span>›</span>
                        <span>{t.subcategory}</span>
                        <span>•</span>
                        <span className="text-text-secondary flex items-center gap-1">
                          <User size={11} /> {t.author_name}
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

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {t.tags_list?.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary border border-border/50 text-[10px] font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats & Actions Column */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 flex-shrink-0">
                      <button
                        onClick={(e) => handleUpvote(t.id, e)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
                          t.has_upvoted
                            ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                            : 'bg-surface-elevated text-text-muted hover:text-text-primary border-border'
                        }`}
                        title="Upvote"
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
        /* Single Thread Detail View with Comments & Threaded Replies */
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveThread(null)}
            className="font-mono text-xs text-text-muted hover:text-text-primary"
          >
            ← Back to Discussions List
          </Button>

          {/* Main Thread Card */}
          <Card className="p-6 sm:p-8 bg-surface-elevated border-border space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-text-muted">
                <span className="text-secondary font-bold">{activeThread.category}</span>
                <span>›</span>
                <span>{activeThread.subcategory}</span>
                <span>•</span>
                <span>Posted {new Date(activeThread.created_at).toLocaleString()}</span>
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
              <div className="flex items-center gap-3 mt-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-background text-xs font-mono">
                  {activeThread.author_name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <span>{activeThread.author_name}</span>
                    <span className="px-1.5 py-0.2 rounded bg-surface border border-border text-[10px] text-primary font-mono">
                      {activeThread.author_role || 'Contributor'}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                    <Award size={10} className="text-warning" />
                    Reputation: {activeThread.author_reputation || 120} pts
                  </div>
                </div>
              </div>

              {/* Thread Content */}
              <div className="mt-6 text-sm text-text-secondary leading-relaxed space-y-4 whitespace-pre-line">
                {activeThread.content}
              </div>

              {/* Tags */}
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

            {/* Interaction Bar */}
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
                <span>Upvote ({activeThread.upvotes_count})</span>
              </button>

              <span className="text-xs font-mono text-text-muted">
                {activeThread.comments_count || 0} Comments & Replies
              </span>
            </div>
          </Card>

          {/* Post Reply Input Box */}
          <Card className="p-5 bg-surface border-border">
            <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider mb-2">
              {replyingToParentId ? 'Replying to comment' : 'Join the conversation'}
            </h3>
            {replyingToParentId && (
              <div className="mb-2 text-xs font-mono text-secondary flex items-center justify-between">
                <span>Threaded reply active</span>
                <button
                  onClick={() => setReplyingToParentId(null)}
                  className="hover:underline text-[11px]"
                >
                  Cancel
                </button>
              </div>
            )}
            <form onSubmit={handlePostReply} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Share your perspective, code snippets, or analysis..."
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
                  Post Reply
                </Button>
              </div>
            </form>
          </Card>

          {/* Comments & Replies List */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono font-bold text-text-primary">
              Discussion Threads ({activeThread.comments?.length || 0})
            </h3>

            {activeThread.comments?.map((comment: any) => (
              <div key={comment.id} className="space-y-2">
                <Card className="p-4 bg-surface/90 border-border">
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
                    <button
                      onClick={async () => {
                        await api.forums.react({ comment_id: comment.id, reaction_type: 'UPVOTE' });
                        openThreadDetail(activeThread.id);
                      }}
                      className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
                    >
                      <ThumbsUp size={12} fill={comment.has_upvoted ? 'currentColor' : 'none'} />
                      <span>{comment.upvotes_count}</span>
                    </button>

                    <button
                      onClick={() => setReplyingToParentId(comment.id)}
                      className="flex items-center gap-1 text-secondary hover:underline"
                    >
                      <CornerDownRight size={12} />
                      <span>Reply</span>
                    </button>
                  </div>
                </Card>

                {/* Nested Threaded Replies */}
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

      {/* Start New Discussion Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Start New Discussion Thread"
        description="Share your insights, ask technical questions, or debate trading strategies."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateThread} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-muted mb-1">Category</label>
              <select
                value={newThread.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  setNewThread((prev) => ({
                    ...prev,
                    category: cat,
                    subcategory:
                      cat === 'Blockchain'
                        ? 'Smart contracts'
                        : cat === 'Cryptocurrency'
                        ? 'Bitcoin'
                        : 'Currency pairs'
                  }));
                }}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary/50"
              >
                <option value="Blockchain">Blockchain</option>
                <option value="Cryptocurrency">Cryptocurrency</option>
                <option value="Forex">Forex</option>
              </select>
            </div>

            <div>
              <label className="block text-text-muted mb-1">Topic Subcategory</label>
              <select
                value={newThread.subcategory}
                onChange={(e) => setNewThread((prev) => ({ ...prev, subcategory: e.target.value }))}
                className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary/50"
              >
                {newThread.category === 'Blockchain' && (
                  <>
                    <option value="Smart contracts">Smart contracts</option>
                    <option value="Layer 1 and Layer 2">Layer 1 and Layer 2</option>
                    <option value="Web3 development">Web3 development</option>
                    <option value="DeFi">DeFi</option>
                    <option value="Blockchain security">Blockchain security</option>
                  </>
                )}
                {newThread.category === 'Cryptocurrency' && (
                  <>
                    <option value="Bitcoin">Bitcoin</option>
                    <option value="Ethereum">Ethereum</option>
                    <option value="Altcoins">Altcoins</option>
                    <option value="Crypto market analysis">Crypto market analysis</option>
                    <option value="Wallets and exchanges">Wallets and exchanges</option>
                  </>
                )}
                {newThread.category === 'Forex' && (
                  <>
                    <option value="Currency pairs">Currency pairs</option>
                    <option value="Technical analysis">Technical analysis</option>
                    <option value="Fundamental analysis">Fundamental analysis</option>
                    <option value="Trading strategies">Trading strategies</option>
                    <option value="Risk management">Risk management</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-muted mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. How does EIP-4844 impact L2 validator sequencing?"
              value={newThread.title}
              onChange={(e) => setNewThread((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="block text-text-muted mb-1">Content / Analysis</label>
            <textarea
              required
              rows={5}
              placeholder="Provide background, thesis, references, or code snippets..."
              value={newThread.content}
              onChange={(e) => setNewThread((prev) => ({ ...prev, content: e.target.value }))}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="block text-text-muted mb-1">Tags (Comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. ethereum, scaling, layer2, gas"
              value={newThread.tags}
              onChange={(e) => setNewThread((prev) => ({ ...prev, tags: e.target.value }))}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Publish Thread (+15 Rep)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report Content to Moderation Team"
        description="Help maintain a disciplined, factual, and educational financial community."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-text-muted mb-1">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary"
            >
              <option value="Spam or Scam">Spam or Scam</option>
              <option value="Unsolicited Stock/Crypto Advisory or Tips">Unsolicited Financial Advisory or Tips</option>
              <option value="Harassment or Inappropriate Language">Harassment or Toxic Conduct</option>
              <option value="Misleading Technical Information">Misleading or Fabricated Information</option>
            </select>
          </div>

          <div>
            <label className="block text-text-muted mb-1">Additional Details (Optional)</label>
            <textarea
              rows={3}
              placeholder="Describe why this post violates community guidelines..."
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
