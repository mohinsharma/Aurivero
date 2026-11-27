import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { IstMarketClock } from '../components/markets/IstMarketClock';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  url: string;
  publishedAtUtc: string;
  publishedAtIst: string;
  isBookmarked?: boolean;
}

const CATEGORIES = [
  'All',
  'Indian Stock Market',
  'NIFTY & SENSEX',
  'Company Announcements',
  'Corporate Earnings',
  'Banking',
  'Economy',
  'RBI & Monetary Policy',
  'IPOs',
  'Cryptocurrency',
  'Forex',
  'Global Markets',
  'Commodities',
];

const SOURCES = ['All', 'Moneycontrol', 'Economic Times', 'LiveMint', 'Business Standard', 'RBI'];

export const FinancialNewsPage: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('All');
  const [source, setSource] = useState('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    const res = await api.financialNews.list({
      category,
      source,
      q: query || undefined,
      page,
      page_size: 18,
    });
    if (res.success && res.data) {
      setArticles(res.data.articles || []);
      setTotal(res.data.total || 0);
    }
    setLoading(false);
  }, [category, source, query, page]);

  useEffect(() => {
    const t = window.setTimeout(fetchNews, query ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [fetchNews, query]);

  const handleBookmark = async (art: NewsArticle) => {
    const res = await api.financialNews.toggleBookmark({
      article_id: art.id,
      title: art.title,
      url: art.url,
      source: art.source,
      category: art.category,
      published_at_ist: art.publishedAtIst,
    });
    if (res.success && res.data) {
      setArticles((prev) =>
        prev.map((a) => (a.id === art.id ? { ...a, isBookmarked: res.data.bookmarked } : a))
      );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/markets')}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Back to Markets
          </button>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <Newspaper size={22} className="text-primary" />
            Financial News (IST)
          </h1>
          <p className="text-xs text-text-secondary">
            Live RSS headlines & attribution from Moneycontrol, Economic Times, LiveMint, Business Standard, and RBI.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <IstMarketClock />
          <Button size="sm" variant="outline" icon={<RefreshCw size={14} />} onClick={fetchNews}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value); }}
              placeholder="Search headlines (Reliance, RBI, Nifty, IPO)..."
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {SOURCES.map((s) => (
              <button
                key={s}
                onClick={() => { setPage(1); setSource(s); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
                  source === s
                    ? 'bg-secondary/15 text-secondary border-secondary/30'
                    : 'bg-background text-text-muted border-border hover:text-text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setPage(1); setCategory(c); }}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-colors ${
                category === c
                  ? 'bg-primary text-background border-primary font-semibold'
                  : 'bg-background text-text-secondary border-border hover:text-text-primary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-xl bg-surface animate-pulse border border-border" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card className="p-10 text-center text-sm text-text-muted">
          No news articles matched your current filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((art) => (
            <Card key={art.id} className="flex flex-col justify-between gap-3 p-4 hover:border-primary/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/25 font-semibold">
                    {art.source}
                  </span>
                  <span className="text-text-muted truncate">{art.category}</span>
                </div>
                <a
                  href={art.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-bold text-sm text-text-primary hover:text-primary transition-colors leading-snug"
                >
                  {art.title}
                </a>
                {art.summary && (
                  <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
                    {art.summary}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] font-mono text-text-muted">
                <span>{art.publishedAtIst}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBookmark(art)}
                    title="Bookmark article"
                    className={`p-1 rounded hover:bg-surface-elevated ${
                      art.isBookmarked ? 'text-primary' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Bookmark size={14} fill={art.isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Read <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {total > 18 && (
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            Page {page} of {Math.ceil(total / 18)} ({total} articles)
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 18 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
