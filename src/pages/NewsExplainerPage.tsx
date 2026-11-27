import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ArrowRight,
  Filter,
  Sparkles,
  Search,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Building,
  RotateCcw,
  Compass,
  ShieldAlert,
  ChevronRight,
  Share2,
  Check
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { MARKET_NEWS_ITEMS } from '../data/mockData';
import { MarketNewsItem, NewsCategory } from '../types';

const CATEGORIES: NewsCategory[] = [
  'All',
  'Stock Market',
  'RBI Policy',
  'Inflation & Rates',
  'Quarterly Results',
  'Corporate Actions',
  'Global Signals'
];

export const NewsExplainerPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [newsList] = useState<MarketNewsItem[]>(MARKET_NEWS_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mindmark_news_bookmarks');
      return saved ? JSON.parse(saved) : ['news-1', 'news-3'];
    } catch {
      return ['news-1', 'news-3'];
    }
  });

  // Active Explainer Modal / View
  const [selectedNews, setSelectedNews] = useState<MarketNewsItem | null>(null);

  // Quiz state for the active modal
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mindmark_news_bookmarks', JSON.stringify(bookmarkedIds));
    } catch (e) {
      console.error('Failed to save bookmarks to localStorage', e);
    }
  }, [bookmarkedIds]);

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOpenExplainer = (item: MarketNewsItem) => {
    setSelectedNews(item);
    setSelectedQuizAnswer(null);
    setIsQuizSubmitted(false);
  };

  const handleCopySummary = (item: MarketNewsItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `📰 ${item.headline} (${item.source})\n\n💡 WHAT HAPPENED:\n${item.whatHappened}\n\n🔍 WHY IT HAPPENED:\n${item.whyDidItHappen}\n\n📊 WHAT IT MEANS:\n${item.whatDoesItMean}\n\n📚 CONCEPT: ${item.learnTheConcept.conceptName} — Explained on Aurivero`;
    navigator.clipboard?.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered news calculation
  const filteredNews = useMemo(() => {
    return newsList.filter(item => {
      // Category filter
      if (selectedCategory !== 'All' && item.newsCategory !== selectedCategory) {
        return false;
      }

      // Bookmark filter
      if (showBookmarksOnly && !bookmarkedIds.includes(item.id)) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesHeadline = item.headline.toLowerCase().includes(query);
        const matchesSector = item.relevantStockOrSector.toLowerCase().includes(query);
        const matchesConcept = item.learnTheConcept.conceptName.toLowerCase().includes(query);
        const matchesSource = item.source.toLowerCase().includes(query);
        return matchesHeadline || matchesSector || matchesConcept || matchesSource;
      }

      return true;
    });
  }, [newsList, selectedCategory, showBookmarksOnly, bookmarkedIds, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#2962FF] flex items-center gap-1.5">
              <Newspaper size={14} /> AI Market Event Explainer
            </span>
            <Badge variant="primary" size="sm">Jargon-Free Financial Literacy</Badge>
            <Badge variant="neutral" size="sm">Indian Market Intelligence</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#131722] mt-1">
            Plain-English Financial News & Concept Bridge
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Financial headlines are written for institutional traders, packed with terms like "Repo Rate", "Operating Margins", and "P/E Expansion". We deconstruct each event into plain English, link it to foundational investing principles, and test your comprehension.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showBookmarksOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowBookmarksOnly(prev => !prev)}
            icon={<Bookmark size={14} />}
          >
            Saved Articles ({bookmarkedIds.length})
          </Button>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-3.5">
        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headlines, stock tickers (TCS, HDFC, Asian Paints), economic concepts (Inflation, Repo, VIX)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#131722] placeholder:text-[#64748B] focus:outline-none focus:border-[#2962FF] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#131722] text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-[#2962FF] text-white border-[#2962FF] font-semibold'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#131722] border-[#E2E8F0]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed Summary HUD */}
      <div className="flex items-center justify-between text-xs text-[#64748B] px-1 tabular-nums">
        <span>
          Showing <strong className="text-[#131722]">{filteredNews.length}</strong> verified market events
          {selectedCategory !== 'All' && <span> in <strong className="text-[#2962FF]">{selectedCategory}</strong></span>}
          {showBookmarksOnly && <span className="text-amber-600"> (Bookmarks only)</span>}
        </span>
        <span className="text-xs">Click any article to open AI Concept Breakdown</span>
      </div>

      {/* News Feed Cards Grid */}
      {filteredNews.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Compass size={32} className="mx-auto text-[#64748B] opacity-60" />
          <h3 className="text-base font-bold text-[#131722]">No Matching Market Events Found</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Try adjusting your search keywords or switching category filters to explore other economic events.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setShowBookmarksOnly(false);
            }}
          >
            Reset All Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNews.map((item) => {
            const isBookmarked = bookmarkedIds.includes(item.id);
            const sentimentVariant = item.marketSentiment === 'Bullish' ? 'primary' : item.marketSentiment === 'Bearish' ? 'danger' : 'neutral';

            return (
              <Card
                key={item.id}
                className="p-6 hover:border-[#2962FF]/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                onClick={() => handleOpenExplainer(item)}
              >
                <div className="space-y-2.5">
                  {/* Top metadata */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                        <Building size={11} /> {item.source}
                      </span>
                      <span className="text-[#64748B]">•</span>
                      <span className="text-[11px] text-[#64748B] flex items-center gap-1 tabular-nums">
                        <Clock size={11} /> {item.publishedAt}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant={sentimentVariant} size="sm">
                        {item.marketSentiment}
                      </Badge>
                      <button
                        onClick={(e) => toggleBookmark(item.id, e)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isBookmarked
                            ? 'text-amber-600 bg-amber-50 border-amber-200'
                            : 'text-[#64748B] hover:text-[#131722] bg-[#F8FAFC] border-[#E2E8F0]'
                        }`}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark for later'}
                      >
                        {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-sm sm:text-base font-bold text-[#131722] group-hover:text-[#2962FF] transition-colors leading-snug">
                    {item.headline}
                  </h3>

                  {/* Plain English What Happened preview */}
                  <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                    {item.whatHappened}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                  {/* Affected Sector & Concept Pill */}
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className="text-[#64748B] truncate max-w-[220px]">
                      Target: <strong className="text-[#131722]">{item.relevantStockOrSector.split(',')[0]}</strong>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#2962FF]/10 text-[#2962FF] font-semibold flex items-center gap-1 text-[11px]">
                      <Sparkles size={11} /> {item.learnTheConcept.conceptName}
                    </span>
                  </div>

                  {/* Card bottom actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={(e) => handleCopySummary(item, e)}
                      className="text-xs text-[#64748B] hover:text-[#131722] flex items-center gap-1 transition-colors"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check size={12} className="text-[#089981]" /> Copied summary
                        </>
                      ) : (
                        <>
                          <Share2 size={12} /> Share
                        </>
                      )}
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#2962FF] group-hover:translate-x-0.5 transition-transform"
                      icon={<ArrowRight size={14} />}
                      iconPosition="right"
                    >
                      Deconstruct Event
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Explainer Modal View */}
      {selectedNews && (
        <Modal
          isOpen={!!selectedNews}
          onClose={() => setSelectedNews(null)}
          title={selectedNews.headline}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-[#131722]">
            {/* Metadata Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E2E8F0] text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#64748B]">{selectedNews.source} • {selectedNews.publishedAt}</span>
                <Badge variant={selectedNews.marketSentiment === 'Bullish' ? 'primary' : 'neutral'} size="sm">
                  {selectedNews.marketSentiment} Sentiment
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleBookmark(selectedNews.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex items-center gap-1 hover:border-[#2962FF]/40 transition-colors"
                >
                  {bookmarkedIds.includes(selectedNews.id) ? (
                    <>
                      <BookmarkCheck size={13} className="text-amber-600" /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark size={13} /> Save Article
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleCopySummary(selectedNews)}
                  className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex items-center gap-1 hover:border-[#2962FF]/40 transition-colors"
                >
                  {copiedId === selectedNews.id ? <Check size={13} className="text-[#089981]" /> : <Share2 size={13} />}
                  {copiedId === selectedNews.id ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Affected Stock & Sectors pill */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3 text-xs">
              <span className="text-[#64748B]">Directly Impacted Assets:</span>
              <span className="text-[#131722] font-semibold">{selectedNews.relevantStockOrSector}</span>
            </div>

            {/* AI Explainer 5-Point Core Structure */}
            <div className="space-y-4">
              {/* 1. WHAT HAPPENED? */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2962FF]">
                  <Sparkles size={14} /> 1. What Happened?
                </div>
                <p className="text-xs sm:text-sm text-[#131722] leading-relaxed">
                  {selectedNews.whatHappened}
                </p>
              </div>

              {/* 2. WHY DID IT HAPPEN? */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#131722]">
                  <Info size={14} className="text-[#2962FF]" /> 2. Why Did It Happen?
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  {selectedNews.whyDidItHappen}
                </p>
              </div>

              {/* 3. WHAT DOES IT MEAN? */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Layers size={14} /> 3. What Does It Mean For Investors?
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  {selectedNews.whatDoesItMean}
                </p>

                {/* Impacted Sectors Breakdown */}
                {selectedNews.impactedSectors && selectedNews.impactedSectors.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                    {selectedNews.impactedSectors.map((sec, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#131722]">{sec.name}</span>
                          <span className={`text-[10px] font-semibold ${
                            sec.impact === 'positive' ? 'text-[#089981]' : sec.impact === 'negative' ? 'text-[#F23645]' : 'text-[#64748B]'
                          }`}>
                            {sec.impact.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[#64748B] leading-snug text-[11px]">{sec.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. LEARN THE CONCEPT */}
              <div className="p-4 rounded-xl bg-[#2962FF]/[0.05] border border-[#2962FF]/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2962FF]">
                    <BookOpen size={14} /> 4. Learn The Core Concept: {selectedNews.learnTheConcept.conceptName}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedNews(null);
                      navigate(selectedNews.learnTheConcept.lessonRoute);
                    }}
                    icon={<ExternalLink size={12} />}
                    iconPosition="right"
                    className="text-xs"
                  >
                    Open Curriculum
                  </Button>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="text-[#131722] leading-relaxed">
                    <strong>Definition:</strong> {selectedNews.learnTheConcept.definition}
                  </p>
                  <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#64748B] leading-relaxed">
                    <strong className="text-[#2962FF] block mb-0.5">Key Investor Takeaway:</strong>
                    {selectedNews.learnTheConcept.keyTakeaway}
                  </div>
                </div>
              </div>

              {/* 5. UNDERSTAND THE RISK */}
              <div className="p-4 rounded-xl bg-[#F23645]/10 border border-[#F23645]/25 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F23645]">
                  <ShieldAlert size={14} /> 5. Understand The Risk & Uncertainty
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  {selectedNews.understandTheRisk}
                </p>
              </div>

              {/* 6. KNOWLEDGE CHECK QUIZ */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2962FF] flex items-center gap-1.5">
                    <HelpCircle size={14} /> 6. Comprehension Knowledge Check
                  </span>
                  <span className="text-[11px] text-[#64748B]">Instant Feedback</span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-[#131722] leading-snug">
                  {selectedNews.knowledgeCheck.question}
                </h4>

                <div className="space-y-2">
                  {selectedNews.knowledgeCheck.options.map((opt, idx) => {
                    const isSelected = selectedQuizAnswer === idx;
                    const isCorrect = idx === selectedNews.knowledgeCheck.correctIndex;
                    let styleClass = 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]';

                    if (isQuizSubmitted) {
                      if (isCorrect) {
                        styleClass = 'bg-[#089981]/10 border-[#089981] text-[#131722] font-semibold';
                      } else if (isSelected && !isCorrect) {
                        styleClass = 'bg-[#F23645]/10 border-[#F23645] text-[#131722]';
                      }
                    } else if (isSelected) {
                      styleClass = 'bg-[#2962FF]/10 border-[#2962FF] text-[#131722] font-medium';
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (!isQuizSubmitted) {
                            setSelectedQuizAnswer(idx);
                          }
                        }}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${styleClass}`}
                      >
                        <span className="text-[#64748B] shrink-0 font-bold">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span className="flex-1 leading-snug">{opt}</span>
                        {isQuizSubmitted && isCorrect && <CheckCircle2 size={15} className="text-[#089981] shrink-0" />}
                        {isQuizSubmitted && isSelected && !isCorrect && <XCircle size={15} className="text-[#F23645] shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {!isQuizSubmitted ? (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={selectedQuizAnswer === null}
                      onClick={() => setIsQuizSubmitted(true)}
                    >
                      Check My Answer
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs space-y-1 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 font-bold">
                      {selectedQuizAnswer === selectedNews.knowledgeCheck.correctIndex ? (
                        <span className="text-[#089981] flex items-center gap-1">
                          <CheckCircle2 size={14} /> Correct! Well understood.
                        </span>
                      ) : (
                        <span className="text-[#F23645] flex items-center gap-1">
                          <XCircle size={14} /> Not quite right.
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {selectedNews.knowledgeCheck.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B]">
                SEBI Pedagogical Notice: Educational analysis only; not investment advice.
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedNews(null)}
              >
                Close Explainer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
