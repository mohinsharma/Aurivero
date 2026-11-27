import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  Edit2,
  FolderPlus,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { Watchlist, WatchlistItem } from '../../types/markets';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { FreshnessBadge } from './FreshnessBadge';
import { formatInstrumentPrice } from './formatters';

interface WatchlistPanelProps {
  compact?: boolean;
  onSelectInstrument?: (assetClass: string, symbol: string) => void;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  compact = false,
  onSelectInstrument,
}) => {
  const navigate = useNavigate();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newListName, setNewListName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadWatchlists = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.watchlists.list(true);
    if (res.success && res.data?.watchlists) {
      const lists: Watchlist[] = res.data.watchlists;
      setWatchlists(lists);
      if (lists.length > 0 && (!activeId || !lists.some((w) => w.id === activeId))) {
        setActiveId(lists[0].id);
      }
    } else {
      setError(res.error?.detail || res.error?.message || 'Unable to load watchlists.');
    }
    setLoading(false);
  }, [activeId]);

  useEffect(() => {
    loadWatchlists();
  }, []);

  const activeWatchlist = watchlists.find((w) => w.id === activeId) || watchlists[0] || null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const res = await api.watchlists.create({ name: newListName.trim() });
    if (res.success && res.data?.watchlist) {
      const created: Watchlist = res.data.watchlist;
      setWatchlists((prev) => [...prev, created]);
      setActiveId(created.id);
      setNewListName('');
      setShowCreateForm(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const res = await api.watchlists.update(id, { name: renameValue.trim() });
    if (res.success) {
      setWatchlists((prev) =>
        prev.map((w) => (w.id === id ? { ...w, name: renameValue.trim() } : w))
      );
      setRenamingId(null);
    }
  };

  const handleDeleteWatchlist = async (id: string) => {
    const res = await api.watchlists.delete(id);
    if (res.success) {
      const remaining = watchlists.filter((w) => w.id !== id);
      setWatchlists(remaining);
      setActiveId(remaining[0]?.id || null);
    }
  };

  const handleRemoveItem = async (watchlistId: string, itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await api.watchlists.removeItem(watchlistId, itemId);
    if (res.success) {
      setWatchlists((prev) =>
        prev.map((w) =>
          w.id === watchlistId
            ? { ...w, items: w.items.filter((it) => it.id !== itemId) }
            : w
        )
      );
    }
  };

  const handleMoveItem = async (
    watchlist: Watchlist,
    index: number,
    direction: -1 | 1,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= watchlist.items.length) return;
    const updated = [...watchlist.items];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    setWatchlists((prev) =>
      prev.map((w) => (w.id === watchlist.id ? { ...w, items: updated } : w))
    );
    await api.watchlists.reorder(
      watchlist.id,
      updated.map((it) => it.id)
    );
  };

  const openInstrument = (item: WatchlistItem) => {
    if (onSelectInstrument) {
      onSelectInstrument(item.asset_class, item.symbol);
    } else {
      navigate(`/markets/${item.asset_class.toLowerCase()}/${encodeURIComponent(item.symbol)}`);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bookmark size={18} className="text-primary" />
          <h2 className="text-base font-bold text-text-primary">Watchlists</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          icon={<FolderPlus size={14} />}
          onClick={() => setShowCreateForm((v) => !v)}
        >
          New Watchlist
        </Button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g., NIFTY Swing Ideas, Crypto Majors..."
            maxLength={60}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
          />
          <Button type="submit" size="sm" icon={<Plus size={14} />}>
            Create
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowCreateForm(false)}
          >
            Cancel
          </Button>
        </form>
      )}

      {/* Watchlist Tabs */}
      {watchlists.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {watchlists.map((wl) => {
            const isActive = activeWatchlist?.id === wl.id;
            return (
              <div
                key={wl.id}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-background/60 text-text-secondary border-border hover:text-text-primary'
                }`}
                onClick={() => setActiveId(wl.id)}
              >
                {renamingId === wl.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(wl.id)}
                      className="w-28 bg-background border border-primary rounded px-1.5 py-0.5 text-xs text-text-primary"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(wl.id)}
                      className="text-primary hover:opacity-80"
                      aria-label="Save name"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      className="text-text-muted hover:text-text-primary"
                      aria-label="Cancel rename"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span>{wl.name}</span>
                    <span className="text-[10px] font-mono opacity-70">({wl.items.length})</span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 ml-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(wl.id);
                            setRenameValue(wl.name);
                          }}
                          title="Rename watchlist"
                          aria-label="Rename watchlist"
                          className="text-text-muted hover:text-text-primary"
                        >
                          <Edit2 size={11} />
                        </button>
                        {watchlists.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWatchlist(wl.id);
                            }}
                            title="Delete watchlist"
                            aria-label="Delete watchlist"
                            className="text-text-muted hover:text-danger"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 rounded-xl bg-surface-elevated/60 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 text-xs text-danger flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={loadWatchlists}>
            Retry
          </Button>
        </div>
      ) : !activeWatchlist || activeWatchlist.items.length === 0 ? (
        <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
          No instruments in this watchlist yet. Open any stock, crypto pair, or forex pair to add it.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {activeWatchlist.items.map((item, idx) => {
            const q = item.quote;
            const isUp = (q?.changePercent ?? 0) >= 0;
            return (
              <div
                key={item.id}
                onClick={() => openInstrument(item)}
                className="py-3 px-2 -mx-2 rounded-xl hover:bg-surface-elevated/70 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                      {q?.displaySymbol || item.symbol}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted border border-border">
                      {item.asset_class} • {item.exchange}
                    </span>
                    {!compact && q?.status && (
                      <FreshnessBadge status={q.status} source={q.source} compact />
                    )}
                  </div>
                  <div className="text-xs text-text-muted truncate mt-0.5">{item.name}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-text-primary text-tabular">
                      {formatInstrumentPrice(q?.price, item.asset_class, q?.currency)}
                    </div>
                    {q?.changePercent !== undefined && q?.changePercent !== null && (
                      <div
                        className={`text-[11px] inline-flex items-center gap-0.5 ${
                          isUp ? 'text-primary' : 'text-danger'
                        }`}
                      >
                        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {isUp ? '+' : ''}
                        {q.changePercent.toFixed(2)}%
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                    <button
                      onClick={(e) => handleMoveItem(activeWatchlist, idx, -1, e)}
                      disabled={idx === 0}
                      title="Move up"
                      aria-label="Move item up"
                      className="p-1 rounded hover:bg-background text-text-muted hover:text-text-primary disabled:opacity-25"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={(e) => handleMoveItem(activeWatchlist, idx, 1, e)}
                      disabled={idx === activeWatchlist.items.length - 1}
                      title="Move down"
                      aria-label="Move item down"
                      className="p-1 rounded hover:bg-background text-text-muted hover:text-text-primary disabled:opacity-25"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      onClick={(e) => handleRemoveItem(activeWatchlist.id, item.id, e)}
                      title="Remove from watchlist"
                      aria-label="Remove from watchlist"
                      className="p-1 rounded hover:bg-danger/15 text-text-muted hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
