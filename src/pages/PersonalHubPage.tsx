import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  User,
  Award,
  Bell,
  Sparkles,
  Flame,
  MessageSquare,
  GraduationCap,
  Clock,
  Trash2,
  PlusCircle,
  TrendingUp,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const PersonalHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [hubData, setHubData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newTopic, setNewTopic] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchHub();
  }, []);

  const fetchHub = async () => {
    setLoading(true);
    const res = await api.personalization.getHub();
    if (res.success && res.data) {
      setHubData(res.data);
    }
    setLoading(false);
  };

  const handleRemoveWatchlist = async (symbol: string) => {
    await api.personalization.removeFromWatchlist(symbol);
    fetchHub();
  };

  const handleToggleFollow = async (topic: string) => {
    const res = await api.personalization.toggleFollowTopic(topic);
    if (res.success) {
      setActionSuccessMsg(res.data?.message || 'Preferences updated');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      fetchHub();
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs font-mono text-text-muted">Loading your personalized financial hub...</div>;
  }

  const profile = hubData?.profile || {};

  return (
    <div className="space-y-8 pb-12">
      {/* Profile & Reputation Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-elevated to-surface border border-border/80 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-extrabold text-background text-2xl font-mono shadow-glow">
              {profile.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-mono">{profile.full_name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 text-[10px] font-mono font-bold">
                  {profile.role || 'Member'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{profile.email}</p>
              <p className="text-xs text-text-secondary mt-1.5 max-w-xl">{profile.bio || 'Exploring crypto tokenomics and disciplined forex carry models.'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-l border-border/60 pl-6 text-xs font-mono">
            <div>
              <span className="text-text-muted">Community Reputation:</span>
              <div className="text-lg font-bold text-warning flex items-center gap-1">
                <Award size={15} /> {profile.reputation_points || 120} pts
              </div>
            </div>
            <div>
              <span className="text-text-muted">Learning Streak:</span>
              <div className="text-lg font-bold text-primary">
                🔥 {profile.learning_streak_days || 5} Days
              </div>
            </div>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Grid: Saved Articles & Saved Discussions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved News Articles */}
        <Card className="p-6 bg-surface border-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <h3 className="text-sm font-bold text-text-primary font-mono flex items-center gap-2">
              <Flame size={15} className="text-primary" />
              Saved Reading List ({hubData?.saved_articles?.length || 0})
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/hot-topics')} className="text-xs font-mono text-primary p-0">
              Explore News →
            </Button>
          </div>

          {hubData?.saved_articles?.length === 0 ? (
            <p className="text-xs text-text-muted py-4">No bookmarked articles yet. Click the bookmark icon on any news story.</p>
          ) : (
            <div className="space-y-3">
              {hubData?.saved_articles?.map((art: any) => (
                <div
                  key={art.id}
                  onClick={() => navigate('/hot-topics')}
                  className="p-3 rounded-xl bg-surface-elevated/70 border border-border/70 hover:border-primary/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1">
                    <span className="text-primary font-semibold">{art.category}</span>
                    <span>{art.read_time_minutes} min read</span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary line-clamp-1">{art.title}</h4>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Saved Forum Discussions */}
        <Card className="p-6 bg-surface border-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <h3 className="text-sm font-bold text-text-primary font-mono flex items-center gap-2">
              <MessageSquare size={15} className="text-secondary" />
              Saved Discussions ({hubData?.saved_threads?.length || 0})
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/forums')} className="text-xs font-mono text-secondary p-0">
              Community Forums →
            </Button>
          </div>

          {hubData?.saved_threads?.length === 0 ? (
            <p className="text-xs text-text-muted py-4">No saved discussions yet. Bookmark interesting threads in the forums.</p>
          ) : (
            <div className="space-y-3">
              {hubData?.saved_threads?.map((th: any) => (
                <div
                  key={th.id}
                  onClick={() => navigate('/forums')}
                  className="p-3 rounded-xl bg-surface-elevated/70 border border-border/70 hover:border-secondary/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1">
                    <span className="text-secondary font-semibold">{th.category}</span>
                    <span>By {th.author_name}</span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary line-clamp-1">{th.title}</h4>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Custom Watchlists & Price Alerts */}
      <Card className="p-6 bg-surface border-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <h3 className="text-sm font-bold text-text-primary font-mono flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" />
            Active Crypto & Forex Watchlists
          </h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/market-intelligence')} className="text-xs font-mono text-primary p-0">
            Market Intelligence Terminal →
          </Button>
        </div>

        {hubData?.watchlists?.length === 0 ? (
          <p className="text-xs text-text-muted py-4">Your watchlist is empty. Add cryptocurrencies or forex pairs from Market Intelligence.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {hubData?.watchlists?.map((item: any) => (
              <div key={item.id} className="p-4 rounded-xl bg-surface-elevated border border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-text-primary font-mono">{item.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface text-text-muted font-mono">{item.asset_type}</span>
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">{item.name}</div>
                  {item.target_price && (
                    <div className="text-[10px] font-mono text-secondary mt-1">Alert: ${item.target_price}</div>
                  )}
                </div>

                <button
                  onClick={() => handleRemoveWatchlist(item.symbol)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-surface transition-colors"
                  title="Remove from Watchlist"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Followed Topics Manager */}
      <Card className="p-6 bg-surface border-border space-y-4">
        <h3 className="text-sm font-bold text-text-primary font-mono flex items-center gap-2">
          <Tag size={15} className="text-secondary" />
          Followed Topics & Feed Preferences
        </h3>
        <p className="text-xs text-text-muted">
          Your followed topics personalize your news recommendations, academy courses, and forum updates.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {hubData?.followed_topics?.map((topic: string) => (
            <span
              key={topic}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-elevated border border-secondary/30 text-xs font-mono text-text-primary"
            >
              <span>#{topic}</span>
              <button
                onClick={() => handleToggleFollow(topic)}
                className="text-text-muted hover:text-danger ml-1"
                title="Unfollow"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
};
