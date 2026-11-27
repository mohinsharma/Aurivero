import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Newspaper, Flame, Users, Layers, MessageSquare, Sparkles } from 'lucide-react';
import { FinancialNewsPage } from './FinancialNewsPage';
import { HotTopicsPage } from './HotTopicsPage';
import { CommunityPage } from './CommunityPage';
import { CommunityForumsPage } from './CommunityForumsPage';
import api from '../services/api';

type NewsCommunityTab = 'overview' | 'news' | 'hot-topics' | 'community' | 'forums';
type OverviewFilter = 'All' | 'Markets' | 'Trending' | 'Discussions';

export const NewsCommunityPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = (searchParams.get('tab') as NewsCommunityTab) || 'overview';
  const normalizedTab: NewsCommunityTab =
    rawTab === ('all' as any)
      ? 'overview'
      : ['overview', 'news', 'hot-topics', 'community', 'forums'].includes(rawTab)
      ? rawTab
      : 'overview';

  const [activeTab, setActiveTab] = useState<NewsCommunityTab>(normalizedTab);
  const [overviewFilter, setOverviewFilter] = useState<OverviewFilter>('All');

  // Overview summary items
  const [overviewNews, setOverviewNews] = useState<any[]>([]);
  const [overviewTopics, setOverviewTopics] = useState<any[]>([]);
  const [overviewPosts, setOverviewPosts] = useState<any[]>([]);
  const [overviewThreads, setOverviewThreads] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'all') {
      setActiveTab('overview');
    } else if (t && ['overview', 'news', 'hot-topics', 'community', 'forums'].includes(t)) {
      setActiveTab(t as NewsCommunityTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== 'overview') return;
    let mounted = true;
    const loadAll = async () => {
      setLoadingOverview(true);
      try {
        const [newsRes, topicsRes, feedRes, threadsRes] = await Promise.allSettled([
          api.financialNews.list({ page: 1, page_size: 4 }),
          api.hotTopics.getArticles({}),
          api.social.getFeed(),
          api.forums.getThreads({ sort_by: 'newest', limit: 4 }),
        ]);
        if (!mounted) return;
        if (newsRes.status === 'fulfilled' && newsRes.value?.data?.articles) {
          setOverviewNews(newsRes.value.data.articles.slice(0, 4));
        }
        if (topicsRes.status === 'fulfilled' && topicsRes.value?.data?.articles) {
          setOverviewTopics(topicsRes.value.data.articles.slice(0, 4));
        }
        if (feedRes.status === 'fulfilled' && feedRes.value?.data?.posts) {
          setOverviewPosts(feedRes.value.data.posts.slice(0, 4));
        }
        if (threadsRes.status === 'fulfilled' && threadsRes.value?.data?.threads) {
          setOverviewThreads(threadsRes.value.data.threads.slice(0, 4));
        }
      } finally {
        if (mounted) setLoadingOverview(false);
      }
    };
    loadAll();
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const selectTab = (tab: NewsCommunityTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const showMarkets = overviewFilter === 'All' || overviewFilter === 'Markets';
  const showTrending = overviewFilter === 'All' || overviewFilter === 'Trending';
  const showDiscussions = overviewFilter === 'All' || overviewFilter === 'Discussions';

  return (
    <div className="min-h-screen bg-[#0B1017]">
      {/* Unified Header & Navigation Bar */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2 space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#141C25] via-[#101822] to-[#0B1017] border border-white/10 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#45D6B5]/15 text-[#45D6B5] text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" /> NEWS &amp; COMMUNITY HUB
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F8] mt-2">News &amp; Community</h1>
            <p className="text-xs sm:text-sm text-[#93A2B4] mt-1">
              Verified market news, trending topics, AI insights, social discussions, and structured Q&amp;A forums in one place.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'news', label: 'Financial News', icon: Newspaper },
            { id: 'hot-topics', label: 'Hot Topics', icon: Flame },
            { id: 'community', label: 'Community', icon: Users },
            { id: 'forums', label: 'Forums', icon: MessageSquare },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectTab(t.id as NewsCommunityTab)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  active
                    ? 'bg-[#45D6B5] text-[#0B1017]'
                    : 'bg-[#141C25] text-[#93A2B4] border border-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Feed */}
      {activeTab === 'overview' && (
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['All', 'Markets', 'Trending', 'Discussions'] as OverviewFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setOverviewFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                    overviewFilter === f
                      ? 'bg-[#78A9FF] text-[#0B1017] font-bold'
                      : 'bg-[#141C25] text-[#93A2B4] border border-white/10 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Financial News Card */}
            {showMarkets && (
              <div className="rounded-2xl bg-[#141C25] border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#F3F6F8] flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-[#45D6B5]" /> Verified Financial News
                  </h2>
                  <button onClick={() => selectTab('news')} className="text-xs text-[#45D6B5] hover:underline font-semibold">
                    All News →
                  </button>
                </div>
                {loadingOverview && overviewNews.length === 0 ? (
                  <div className="text-xs text-[#93A2B4]">Loading market headlines...</div>
                ) : overviewNews.length === 0 ? (
                  <div className="text-xs text-[#93A2B4]">No recent headlines available.</div>
                ) : (
                  <div className="space-y-3">
                    {overviewNews.map((a: any) => (
                      <div key={a.id} className="p-3 rounded-xl bg-[#0B1017] border border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-[#45D6B5]/15 text-[#45D6B5] font-bold">NEWS</span>
                          <span className="text-[#93A2B4]">{a.source} • {a.category}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#F3F6F8] line-clamp-2">{a.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hot Topics & AI Insights Card */}
            {showTrending && (
              <div className="rounded-2xl bg-[#141C25] border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#F3F6F8] flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#F5B942]" /> Hot Topics &amp; AI Insights
                  </h2>
                  <button onClick={() => selectTab('hot-topics')} className="text-xs text-[#45D6B5] hover:underline font-semibold">
                    Explore Topics →
                  </button>
                </div>
                {loadingOverview && overviewTopics.length === 0 ? (
                  <div className="text-xs text-[#93A2B4]">Loading trending topics...</div>
                ) : overviewTopics.length === 0 ? (
                  <div className="text-xs text-[#93A2B4]">No trending topics right now.</div>
                ) : (
                  <div className="space-y-3">
                    {overviewTopics.map((t: any) => (
                      <div key={t.id} className="p-3 rounded-xl bg-[#0B1017] border border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-[#F5B942]/15 text-[#F5B942] font-bold inline-flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> TRENDING / AI INSIGHT
                          </span>
                          <span className="text-[#93A2B4]">{t.category}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#F3F6F8] line-clamp-2">{t.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Community Social Posts */}
            {showDiscussions && (
              <div className="rounded-2xl bg-[#141C25] border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#F3F6F8] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#78A9FF]" /> Community Posts &amp; Debates
                  </h2>
                  <button onClick={() => selectTab('community')} className="text-xs text-[#45D6B5] hover:underline font-semibold">
                    Open Community →
                  </button>
                </div>
                {loadingOverview && overviewPosts.length === 0 ? (
                  <div className="text-xs text-[#93A2B4]">Loading community posts...</div>
                ) : overviewPosts.length === 0 ? (
                  <div className="text-xs text-[#93A2B4]">No community posts yet. Share an insight or join a Squad!</div>
                ) : (
                  <div className="space-y-3">
                    {overviewPosts.map((p: any) => (
                      <div key={p.id} className="p-3 rounded-xl bg-[#0B1017] border border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-[#78A9FF]/15 text-[#78A9FF] font-bold">COMMUNITY</span>
                          <span className="text-[#93A2B4]">@{p.username} • {p.post_type}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#F3F6F8] line-clamp-2">{p.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Structured Forums Threads */}
            {showDiscussions && (
              <div className="rounded-2xl bg-[#141C25] border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#F3F6F8] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#45D6B5]" /> Structured Forum Threads
                  </h2>
                  <button onClick={() => selectTab('forums')} className="text-xs text-[#45D6B5] hover:underline font-semibold">
                    Open Forums →
                  </button>
                </div>
                {loadingOverview && overviewThreads.length === 0 ? (
                  <div className="text-xs text-[#93A2B4]">Loading forum threads...</div>
                ) : overviewThreads.length === 0 ? (
                  <div className="text-xs text-[#93A2B4]">No forum threads yet.</div>
                ) : (
                  <div className="space-y-3">
                    {overviewThreads.map((th: any) => (
                      <div key={th.id} className="p-3 rounded-xl bg-[#0B1017] border border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-[#45D6B5]/15 text-[#45D6B5] font-bold">FORUM</span>
                          <span className="text-[#93A2B4]">{th.category} • {th.comment_count || 0} replies</span>
                        </div>
                        <div className="text-xs font-semibold text-[#F3F6F8] line-clamp-2">{th.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'news' && <FinancialNewsPage />}
      {activeTab === 'hot-topics' && <HotTopicsPage />}
      {activeTab === 'community' && <CommunityPage />}
      {activeTab === 'forums' && <CommunityForumsPage />}
    </div>
  );
};
