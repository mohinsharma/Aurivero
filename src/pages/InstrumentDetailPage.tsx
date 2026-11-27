import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Check,
  Clock,
  Globe,
  Info,
  Newspaper,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import {
  AssetClass,
  DataFreshnessStatus,
  InstrumentMeta,
  NormalizedCandle,
  NormalizedQuote,
  Timeframe,
  Watchlist,
} from '../types/markets';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { FreshnessBadge } from '../components/markets/FreshnessBadge';
import { TechnicalChart } from '../components/markets/TechnicalChart';
import { formatCompactNumber, formatInstrumentPrice } from '../components/markets/formatters';

function normalizeAssetClassParam(raw?: string): AssetClass {
  const up = (raw || 'STOCK').toUpperCase();
  if (up === 'CRYPTO') return 'CRYPTO';
  if (up === 'FOREX') return 'FOREX';
  return 'STOCK';
}

export const InstrumentDetailPage: React.FC = () => {
  const { assetClass: rawClass, symbol: rawSymbol } = useParams<{
    assetClass: string;
    symbol: string;
  }>();
  const navigate = useNavigate();

  const assetClass = normalizeAssetClassParam(rawClass);
  const symbol = decodeURIComponent(rawSymbol || 'RELIANCE').toUpperCase();

  const [meta, setMeta] = useState<InstrumentMeta | null>(null);
  const [quote, setQuote] = useState<NormalizedQuote | null>(null);
  const [candles, setCandles] = useState<NormalizedCandle[]>([]);
  const [liveCandle, setLiveCandle] = useState<NormalizedCandle | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [candleStatus, setCandleStatus] = useState<DataFreshnessStatus>('DELAYED');
  const [candleSource, setCandleSource] = useState<string>('');
  const [candleDelay, setCandleDelay] = useState<number | null>(null);
  const [candleProviderTs, setCandleProviderTs] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [oldestTs, setOldestTs] = useState<number | null>(null);

  const [loadingQuote, setLoadingQuote] = useState(true);
  const [loadingCandles, setLoadingCandles] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Watchlist integration
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [showWatchlistMenu, setShowWatchlistMenu] = useState(false);
  const [watchlistFeedback, setWatchlistFeedback] = useState<string | null>(null);

  // Track active instrument key to prevent cross-instrument data leakage
  const activeKeyRef = useRef<string>(`${assetClass}:${symbol}:${timeframe}`);
  activeKeyRef.current = `${assetClass}:${symbol}:${timeframe}`;

  const loadQuote = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingQuote(true);
      const res = await api.markets.getQuote(assetClass, symbol, signal);
      if (signal?.aborted) return;
      if (res.success && res.data) {
        setMeta(res.data.metadata || null);
        setQuote(res.data.quote || null);
        if (res.data.quote?.warning) {
          setWarningMsg(res.data.quote.warning);
        }
      }
      setLoadingQuote(false);
    },
    [assetClass, symbol]
  );

  const loadCandles = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingCandles(true);
      setCandles([]);
      setLiveCandle(null);
      const reqKey = `${assetClass}:${symbol}:${timeframe}`;
      const res = await api.markets.getCandles(assetClass, symbol, { timeframe, limit: 200 }, signal);
      if (signal?.aborted || activeKeyRef.current !== reqKey) return;

      if (res.success && res.data) {
        setCandles(res.data.candles || []);
        setHasMore(Boolean(res.data.hasMore));
        setOldestTs(res.data.oldestTimestamp || null);
        setCandleStatus(res.data.status || 'UNAVAILABLE');
        setCandleSource(res.data.source || '');
        setCandleDelay(res.data.delaySeconds ?? null);
        setCandleProviderTs(res.data.providerTimestamp || null);
        if (res.data.warning) {
          setWarningMsg(res.data.warning);
        }
      }
      setLoadingCandles(false);
    },
    [assetClass, symbol, timeframe]
  );

  // Fetch quote & candles with AbortController on instrument/timeframe switch
  useEffect(() => {
    setWarningMsg(null);
    const controller = new AbortController();
    loadQuote(controller.signal);
    loadCandles(controller.signal);
    return () => controller.abort();
  }, [loadQuote, loadCandles]);

  // Fetch user's watchlists
  useEffect(() => {
    api.watchlists.list(false).then((res) => {
      if (res.success && res.data?.watchlists) {
        setWatchlists(res.data.watchlists);
      }
    });
  }, []);

  // WebSocket live stream with exponential backoff reconnect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;
    let backoffMs = 1000;
    let disposed = false;
    const expectedKey = `${assetClass}:${symbol}`;

    const connect = () => {
      if (disposed) return;
      const wsUrl = api.markets.getWsUrl(assetClass, symbol);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        backoffMs = 1000;
        pingTimer = window.setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      };

      ws.onmessage = (evt) => {
        if (disposed || !activeKeyRef.current.startsWith(expectedKey)) return;
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'TICK' && msg.candle) {
            setQuote((prev) =>
              prev
                ? {
                    ...prev,
                    price: msg.price,
                    status: msg.status,
                    source: msg.source,
                    providerTimestamp: msg.providerTimestamp,
                    retrievedAt: msg.retrievedAt,
                    delaySeconds: msg.delaySeconds,
                  }
                : prev
            );
            if (timeframe === '1m') {
              setLiveCandle(msg.candle);
            }
            setCandleStatus(msg.status);
          } else if (msg.type === 'QUOTE_UPDATE') {
            setQuote((prev) =>
              prev
                ? {
                    ...prev,
                    price: msg.price ?? prev.price,
                    change: msg.change ?? prev.change,
                    changePercent: msg.changePercent ?? prev.changePercent,
                    marketSession: msg.marketSession ?? prev.marketSession,
                    status: msg.status,
                    source: msg.source,
                    providerTimestamp: msg.providerTimestamp,
                    retrievedAt: msg.retrievedAt,
                    delaySeconds: msg.delaySeconds,
                  }
                : prev
            );
          } else if (msg.type === 'STATUS' && msg.warning) {
            setWarningMsg(msg.warning);
          }
        } catch {
          // Ignore malformed keepalive frames
        }
      };

      ws.onclose = () => {
        if (pingTimer) window.clearInterval(pingTimer);
        if (!disposed) {
          reconnectTimer = window.setTimeout(() => {
            backoffMs = Math.min(backoffMs * 2, 30000);
            connect();
          }, backoffMs);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (pingTimer) window.clearInterval(pingTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
    };
  }, [assetClass, symbol, timeframe]);

  const handleLoadMoreHistory = useCallback(async () => {
    if (!oldestTs || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const reqKey = `${assetClass}:${symbol}:${timeframe}`;
    const res = await api.markets.getCandles(assetClass, symbol, {
      timeframe,
      limit: 200,
      before: oldestTs,
    });
    if (activeKeyRef.current === reqKey && res.success && res.data) {
      const older: NormalizedCandle[] = res.data.candles || [];
      if (older.length > 0) {
        setCandles((prev) => {
          const seen = new Set(prev.map((c) => c.time));
          const merged = [...older.filter((c) => !seen.has(c.time)), ...prev];
          merged.sort((a, b) => a.time - b.time);
          return merged;
        });
        setOldestTs(res.data.oldestTimestamp || older[0].time);
        setHasMore(Boolean(res.data.hasMore));
      } else {
        setHasMore(false);
      }
    }
    setLoadingMore(false);
  }, [assetClass, symbol, timeframe, oldestTs, loadingMore, hasMore]);

  const handleToggleWatchlistItem = async (wl: Watchlist) => {
    const existing = wl.items.find(
      (it) => it.asset_class === assetClass && it.symbol === (quote?.symbol || symbol)
    );
    if (existing) {
      const res = await api.watchlists.removeItem(wl.id, existing.id);
      if (res.success) {
        setWatchlists((prev) =>
          prev.map((w) =>
            w.id === wl.id
              ? { ...w, items: w.items.filter((i) => i.id !== existing.id) }
              : w
          )
        );
        setWatchlistFeedback(`Removed from ${wl.name}`);
      }
    } else {
      const res = await api.watchlists.addItem(wl.id, {
        asset_class: assetClass,
        symbol: quote?.symbol || symbol,
        exchange: quote?.exchange || assetClass,
        name: quote?.name || meta?.name || symbol,
      });
      if (res.success && res.data?.item) {
        setWatchlists((prev) =>
          prev.map((w) =>
            w.id === wl.id ? { ...w, items: [...w.items, res.data.item] } : w
          )
        );
        setWatchlistFeedback(`Added to ${wl.name}`);
      }
    }
    setTimeout(() => setWatchlistFeedback(null), 2500);
  };

  const isUp = (quote?.changePercent ?? 0) >= 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(`/markets/${assetClass.toLowerCase()}`)}
          className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to {assetClass === 'STOCK' ? 'Stocks' : assetClass === 'CRYPTO' ? 'Crypto' : 'Forex'}</span>
        </button>

        <div className="flex items-center gap-2 relative">
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw size={14} />}
            onClick={() => {
              loadQuote();
              loadCandles();
            }}
          >
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<Bookmark size={14} />}
            onClick={() => setShowWatchlistMenu((v) => !v)}
          >
            Watchlist
          </Button>

          {showWatchlistMenu && (
            <div className="absolute right-0 top-10 w-64 rounded-xl border border-border bg-surface-elevated p-3 shadow-2xl z-30 space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                Save to Watchlist
              </div>
              {watchlists.map((wl) => {
                const inList = wl.items.some(
                  (it) => it.asset_class === assetClass && it.symbol === (quote?.symbol || symbol)
                );
                return (
                  <button
                    key={wl.id}
                    onClick={() => handleToggleWatchlistItem(wl)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-surface transition-colors text-left"
                  >
                    <span className="text-text-primary font-medium truncate">{wl.name}</span>
                    {inList ? (
                      <Check size={14} className="text-primary flex-shrink-0" />
                    ) : (
                      <Plus size={14} className="text-text-muted flex-shrink-0" />
                    )}
                  </button>
                );
              })}
              <Link
                to="/markets?tab=watchlists"
                className="block pt-1 border-t border-border text-[11px] text-primary hover:underline"
              >
                Manage all watchlists →
              </Link>
            </div>
          )}
        </div>
      </div>

      {watchlistFeedback && (
        <div className="px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-medium">
          {watchlistFeedback}
        </div>
      )}

      {warningMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs flex items-center gap-2">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* Instrument Header */}
      <Card variant="elevated" className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
              {quote?.exchange || meta?.exchange || assetClass}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary/10 border border-secondary/25 text-secondary">
              {assetClass}
            </span>
            {(meta?.sectorOrCategory || quote?.extra?.sector || quote?.extra?.category) && (
              <span className="text-xs text-text-muted">
                {meta?.sectorOrCategory || quote?.extra?.sector || quote?.extra?.category}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {quote?.name || meta?.name || symbol}
            </h1>
            <span className="font-mono text-sm text-text-muted">
              {quote?.displaySymbol || meta?.displaySymbol || symbol}
            </span>
          </div>
          {quote?.marketSession && (
            <div className="text-xs text-text-muted flex items-center gap-1.5">
              <Clock size={12} />
              <span>{quote.marketSession}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col md:items-end gap-2">
          {loadingQuote && !quote ? (
            <div className="h-10 w-40 rounded-lg bg-surface animate-pulse" />
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-text-primary text-tabular">
                  {formatInstrumentPrice(
                    quote?.price,
                    assetClass,
                    quote?.currency || 'USD',
                    quote?.extra?.decimals
                  )}
                </span>
                {quote?.changePercent !== null && quote?.changePercent !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-mono font-bold ${
                      isUp ? 'text-primary' : 'text-danger'
                    }`}
                  >
                    {isUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    {isUp ? '+' : ''}
                    {quote.change?.toFixed(assetClass === 'FOREX' ? 4 : 2)} ({isUp ? '+' : ''}
                    {quote.changePercent.toFixed(2)}%)
                  </span>
                )}
              </div>
              {quote && (
                <FreshnessBadge
                  status={quote.status}
                  source={quote.source}
                  delaySeconds={quote.delaySeconds}
                  providerTimestamp={quote.providerTimestamp}
                />
              )}
            </>
          )}
        </div>
      </Card>

      {/* Interactive Technical Chart */}
      <TechnicalChart
        symbol={quote?.displaySymbol || symbol}
        assetClass={assetClass}
        currency={quote?.currency || 'USD'}
        candles={candles}
        liveCandle={liveCandle}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        loading={loadingCandles}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMoreHistory={handleLoadMoreHistory}
        status={candleStatus}
        source={candleSource}
        delaySeconds={candleDelay}
        providerTimestamp={candleProviderTs}
      />

      {/* Market Statistics & About */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Globe size={16} className="text-primary" />
            Market Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-background/60 border border-border/60">
              <div className="text-[11px] text-text-muted">Open</div>
              <div className="font-mono font-bold text-sm text-text-primary mt-1">
                {formatInstrumentPrice(quote?.open, assetClass, quote?.currency)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/60">
              <div className="text-[11px] text-text-muted">Day High</div>
              <div className="font-mono font-bold text-sm text-primary mt-1">
                {formatInstrumentPrice(quote?.high, assetClass, quote?.currency)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/60">
              <div className="text-[11px] text-text-muted">Day Low</div>
              <div className="font-mono font-bold text-sm text-danger mt-1">
                {formatInstrumentPrice(quote?.low, assetClass, quote?.currency)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/60">
              <div className="text-[11px] text-text-muted">Prev Close</div>
              <div className="font-mono font-bold text-sm text-text-primary mt-1">
                {formatInstrumentPrice(quote?.previousClose, assetClass, quote?.currency)}
              </div>
            </div>

            {quote?.volume !== undefined && quote?.volume !== null && (
              <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                <div className="text-[11px] text-text-muted">Volume</div>
                <div className="font-mono font-bold text-sm text-text-primary mt-1">
                  {formatCompactNumber(quote.volume)}
                </div>
              </div>
            )}

            {quote?.marketCap !== undefined && quote?.marketCap !== null && (
              <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                <div className="text-[11px] text-text-muted">Market Cap</div>
                <div className="font-mono font-bold text-sm text-text-primary mt-1">
                  {formatCompactNumber(quote.marketCap, '$')}
                </div>
              </div>
            )}

            {quote?.high52w !== undefined && quote?.high52w !== null && (
              <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                <div className="text-[11px] text-text-muted">52W High / Low</div>
                <div className="font-mono font-semibold text-xs text-text-primary mt-1">
                  {formatInstrumentPrice(quote.high52w, assetClass, quote.currency)} /{' '}
                  {formatInstrumentPrice(quote.low52w, assetClass, quote.currency)}
                </div>
              </div>
            )}

            {assetClass === 'FOREX' && (
              <div className="p-3 rounded-xl bg-background/60 border border-border/60">
                <div className="text-[11px] text-text-muted">Pip Movement</div>
                <div className="font-mono font-bold text-sm text-text-primary mt-1">
                  {quote?.pipMovement !== undefined && quote?.pipMovement !== null
                    ? `${quote.pipMovement > 0 ? '+' : ''}${quote.pipMovement} pips`
                    : '—'}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Info size={16} className="text-secondary" />
            Instrument & Feed Details
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            {meta?.description ||
              quote?.extra?.description ||
              `${quote?.name || symbol} tracked via ${quote?.source || 'multi-asset market adapter'}.`}
          </p>
          <div className="space-y-1.5 text-[11px] font-mono text-text-muted pt-2 border-t border-border/60">
            <div>Source: {quote?.source || '—'}</div>
            <div>
              Retrieved:{' '}
              {quote?.retrievedAt ? new Date(quote.retrievedAt).toLocaleTimeString() : '—'}
            </div>
            {quote?.providerTimestamp && (
              <div>
                Provider Time: {new Date(quote.providerTimestamp).toLocaleString()}
              </div>
            )}
          </div>
          <div className="pt-2 flex flex-wrap gap-2">
            <Link to="/hot-topics">
              <Button size="sm" variant="outline" icon={<Newspaper size={13} />}>
                Market News
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
