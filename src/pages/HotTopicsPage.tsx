import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Search,
  Bookmark,
  Share2,
  ExternalLink,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const HotTopicsPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, searchQuery]);

  const fetchCategories = async () => {
    const res = await api.hotTopics.getCategories();
    if (res.success && res.data?.categories) {
      setCategories(res.data.categories);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    const res = await api.hotTopics.getArticles({
      category: selectedCategory,
      search: searchQuery || undefined
    });
    if (res.success && res.data?.articles) {
      setArticles(res.data.articles);
    }
    setLoading(false);
  };

  const handleToggleBookmark = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI update
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId
          ? {
              ...a,
              is_bookmarked: !a.is_bookmarked,
              bookmarks_count: a.is_bookmarked ? Math.max(0, a.bookmarks_count - 1) : a.bookmarks_count + 1
            }
          : a
      )
    );
    if (selectedArticle && selectedArticle.id === articleId) {
      setSelectedArticle((prev: any) => ({
        ...prev,
        is_bookmarked: !prev.is_bookmarked,
        bookmarks_count: prev.is_bookmarked ? Math.max(0, prev.bookmarks_count - 1) : prev.bookmarks_count + 1
      }));
    }
    await api.hotTopics.toggleBookmark(articleId);
  };

  const handleShare = (article: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/hot-topics?article=${article.id}`);
      setCopiedId(article.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const breakingArticle = articles.find((a) => a.is_breaking) || articles[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-elevated to-surface border border-border/80 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold mb-3">
              <Flame size={13} className="text-primary animate-pulse" />
              HOT TOPICS & FINANCIAL INTELLIGENCE
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight font-mono">
              Blockchain, Crypto & Forex News Feed
            </h1>
            <p className="text-text-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">
              Real-time, verified institutional news streams across global decentralized protocols, currency reserves, and digital asset liquidity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/news-community?tab=forums')}
              className="font-mono text-xs"
            >
              <MessageSquare size={14} className="mr-1.5 text-secondary" />
              Community Forums
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/market-intelligence')}
              className="font-mono text-xs"
            >
              <TrendingUp size={14} className="mr-1.5" />
              Live Asset Prices
            </Button>
          </div>
        </div>
      </div>

      {/* Breaking News Ticker / Hero Feature */}
      {breakingArticle && (
        <Card
          variant="interactive"
          className="border-primary/30 bg-surface-elevated/70 cursor-pointer overflow-hidden p-0"
          onClick={() => setSelectedArticle(breakingArticle)}
        >
          <div className="flex flex-col lg:flex-row">
            {breakingArticle.image_url && (
              <div className="lg:w-2/5 h-48 lg:h-auto overflow-hidden relative">
                <img
                  src={breakingArticle.image_url}
                  alt={breakingArticle.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-danger text-white text-[10px] font-mono font-bold tracking-wider uppercase">
                  BREAKING STORY
                </div>
              </div>
            )}
            <div className="p-6 lg:p-8 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-text-muted mb-2">
                  <span className="text-primary font-semibold">{breakingArticle.category}</span>
                  <span>•</span>
                  <span>{breakingArticle.source}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {breakingArticle.read_time_minutes} min read
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary group-hover:text-primary transition-colors leading-snug">
                  {breakingArticle.title}
                </h2>
                <p className="text-text-secondary text-sm mt-3 line-clamp-2 leading-relaxed">
                  {breakingArticle.summary}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                      breakingArticle.sentiment === 'Bullish'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : breakingArticle.sentiment === 'Bearish'
                        ? 'bg-danger/10 text-danger border border-danger/20'
                        : 'bg-surface text-text-muted border border-border'
                    }`}
                  >
                    {breakingArticle.sentiment} Outlook
                  </span>
                  {breakingArticle.related_assets && (
                    <span className="text-[11px] font-mono text-text-muted">
                      Assets: <span className="text-text-primary">{breakingArticle.related_assets}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleToggleBookmark(breakingArticle.id, e)}
                    className={`p-2 rounded-lg border transition-colors ${
                      breakingArticle.is_bookmarked
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'text-text-muted hover:text-text-primary border-border/60 hover:bg-surface'
                    }`}
                    title="Bookmark Article"
                  >
                    <Bookmark size={16} fill={breakingArticle.is_bookmarked ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={(e) => handleShare(breakingArticle, e)}
                    className="p-2 rounded-lg border border-border/60 text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
                    title="Share Link"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search crypto, forex, DeFi, rollups, protocols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-elevated/70 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* View Toggle / Results Count */}
        <div className="text-xs font-mono text-text-muted flex items-center gap-2">
          <span>Showing <strong className="text-text-primary">{articles.length}</strong> verified articles</span>
          {copiedId && (
            <span className="text-primary flex items-center gap-1 font-sans">
              <CheckCircle2 size={12} /> Link copied!
            </span>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === cat.name
                ? 'bg-primary text-white font-bold shadow-glow'
                : 'bg-surface-elevated/70 text-text-secondary hover:text-text-primary border border-border/60 hover:border-border'
            }`}
          >
            <span>{cat.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === cat.name ? 'bg-white/20 text-white' : 'bg-background/50 text-text-muted'
              }`}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-surface/50 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-border">
          <AlertCircle size={36} className="mx-auto text-text-muted mb-3" />
          <h3 className="text-base font-bold text-text-primary">No articles match your search</h3>
          <p className="text-text-muted text-xs mt-1">Try selecting another category or clearing your search term.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="mt-4 font-mono text-xs"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((art) => (
            <Card
              key={art.id}
              variant="interactive"
              className="flex flex-col justify-between cursor-pointer border-border/70 hover:border-primary/40 bg-surface/80 group overflow-hidden p-0"
              onClick={() => setSelectedArticle(art)}
            >
              {art.image_url && (
                <div className="h-40 overflow-hidden relative">
                  <img
                    src={art.image_url}
                    alt={art.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleToggleBookmark(art.id, e)}
                      className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                        art.is_bookmarked
                          ? 'bg-primary text-white'
                          : 'bg-background/70 text-text-muted hover:text-text-primary'
                      }`}
                      title="Bookmark"
                    >
                      <Bookmark size={14} fill={art.is_bookmarked ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => handleShare(art, e)}
                      className="p-1.5 rounded-lg bg-background/70 text-text-muted hover:text-text-primary backdrop-blur-md transition-colors"
                      title="Share"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-2">
                    <span className="text-primary font-semibold">{art.category}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {art.read_time_minutes} min
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h3>
                  <p className="text-text-muted text-xs mt-2 line-clamp-2 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-muted truncate max-w-[130px]">{art.source}</span>
                  <div className="flex items-center gap-1 text-primary group-hover:translate-x-0.5 transition-transform">
                    <span>Read Analysis</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Full Article Reading & Pedagogical Context Modal */}
      {selectedArticle && (
        <Modal
          isOpen={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
          title={selectedArticle.title}
          description={`${selectedArticle.category} • Source: ${selectedArticle.source} • ${selectedArticle.read_time_minutes} min read`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {selectedArticle.image_url && (
              <div className="h-56 rounded-xl overflow-hidden relative">
                <img
                  src={selectedArticle.image_url}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Quick Metadata Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-elevated border border-border/70 text-xs font-mono">
              <div className="flex items-center gap-4">
                <span className="text-text-muted">
                  Sentiment:{' '}
                  <span
                    className={
                      selectedArticle.sentiment === 'Bullish'
                        ? 'text-primary font-bold'
                        : selectedArticle.sentiment === 'Bearish'
                        ? 'text-danger font-bold'
                        : 'text-text-primary'
                    }
                  >
                    {selectedArticle.sentiment}
                  </span>
                </span>
                {selectedArticle.related_assets && (
                  <span className="text-text-muted">
                    Tracked Assets: <strong className="text-text-primary">{selectedArticle.related_assets}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleToggleBookmark(selectedArticle.id, e)}
                  className="text-xs font-mono"
                >
                  <Bookmark
                    size={13}
                    className="mr-1.5"
                    fill={selectedArticle.is_bookmarked ? 'currentColor' : 'none'}
                  />
                  {selectedArticle.is_bookmarked ? 'Saved' : 'Bookmark'}
                </Button>
                <a
                  href={selectedArticle.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-surface font-mono transition-colors"
                >
                  <span>Original Source</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Article Content */}
            <div className="text-sm text-text-secondary leading-relaxed space-y-4 whitespace-pre-line">
              <p className="text-base font-semibold text-text-primary leading-normal">
                {selectedArticle.summary}
              </p>
              <p>{selectedArticle.content}</p>
            </div>

            {/* Pedagogical Interconnected Bridge (Cross-Platform Links) */}
            <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/25 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-secondary font-bold">
                <Sparkles size={14} />
                CONNECT THE DOTS — INTERCONNECTED LEARNING
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Connect this real-world event to practical market mechanics and community strategy:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => {
                    setSelectedArticle(null);
                    navigate(selectedArticle.related_course_id ? `/academy` : '/academy');
                  }}
                  className="p-3 rounded-lg bg-surface border border-border hover:border-secondary transition-colors cursor-pointer group flex items-start gap-2.5"
                >
                  <BookOpen size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-text-primary group-hover:text-secondary transition-colors">
                      Learn the Theory in Academy
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      Explore tokenomics & protocol mechanics.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setSelectedArticle(null);
                    navigate('/news-community?tab=forums');
                  }}
                  className="p-3 rounded-lg bg-surface border border-border hover:border-primary transition-colors cursor-pointer group flex items-start gap-2.5"
                >
                  <MessageSquare size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                      Join the Discussion in Forums
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      Debate with community traders & analysts.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
