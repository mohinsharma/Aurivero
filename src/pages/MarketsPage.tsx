import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bookmark,
  Coins,
  Globe,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import {
  AssetClass,
  InstrumentMeta,
  MarketOverviewData,
  NormalizedQuote,
} from '../types/markets';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { FreshnessBadge } from '../components/markets/FreshnessBadge';
import { InstrumentSearchInput } from '../components/markets/InstrumentSearchInput';
import { IstMarketClock } from '../components/markets/IstMarketClock';
import { WatchlistPanel } from '../components/markets/WatchlistPanel';
import { formatCompactNumber, formatInstrumentPrice } from '../components/markets/formatters';

type MarketTab = 'overview' | 'stock' | 'crypto' | 'forex' | 'watchlists';

function parseTab(param?: string, queryTab?: string | null): MarketTab {
  const raw = (param || queryTab || 'overview').toLowerCase();
  if (raw === 'stocks' || raw === 'stock') return 'stock';
  if (raw === 'crypto') return 'crypto';
  if (raw === 'forex') return 'forex';
  if (raw === 'watchlists') return 'watchlists';
  return 'overview';
}

export const MarketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab: routeTab } = useParams<{ tab?: string }>();
  const [searchParams] = useSearchParams();
  const activeTab = parseTab(routeTab, searchParams.get('tab'));

  const [overview, setOverview] = useState<MarketOverviewData | null>(null);
  const [directoryItems, setDirectoryItems] = useState<NormalizedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab-specific filter
  const [dirSearch, setDirSearch] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');

  const switchTab = (next: MarketTab) => {
    setDirSearch('');
    if (next === 'overview') navigate('/markets');
    else if (next === 'stock') navigate('/markets/stocks');
    else navigate(`/markets/${next}`);
  };

  const openInstrument = (assetClass: AssetClass, symbol: string) => {
    navigate(`/markets/${assetClass.toLowerCase()}/${encodeURIComponent(symbol)}`);
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.markets.getOverview();
    if (res.success && res.data) {
      setOverview(res.data);
    } else {
      setError(res.error?.message || 'Unable to load market overview.');
    }
    setLoading(false);
  }, []);

  const loadDirectory = useCallback(
    async (ac: AssetClass, q?: string, exchange?: string) => {
      setLoading(true);
      setError(null);
      const res = await api.markets.listInstruments(ac, {
        q: q || undefined,
        exchange: ac === 'STOCK' && exchange !== 'ALL' ? exchange : undefined,
        limit: 30,
        with_quotes: true,
      });
      if (res.success && res.data?.items) {
        setDirectoryItems(res.data.items);
      } else {
        setError(res.error?.message || `Unable to load ${ac.toLowerCase()} directory.`);
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    } else if (activeTab === 'stock') {
      loadDirectory('STOCK', dirSearch, exchangeFilter);
    } else if (activeTab === 'crypto') {
      loadDirectory('CRYPTO', dirSearch);
    } else if (activeTab === 'forex') {
      loadDirectory('FOREX', dirSearch);
    } else {
      setLoading(false);
    }
  }, [activeTab, dirSearch, exchangeFilter, loadOverview, loadDirectory]);

  const renderQuoteCard = (q: NormalizedQuote) => {
    const isUp = (q.changePercent ?? 0) >= 0;
    return (
      <Card
        key={`${q.assetClass}-${q.symbol}`}
        variant="interactive"
        onClick={() => openInstrument(q.assetClass, q.symbol)}
        className="p-4 flex flex-col justify-between gap-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-text-primary truncate">
                {q.displaySymbol}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-text-muted">
                {q.exchange}
              </span>
            </div>
            <div className="text-xs text-text-secondary truncate mt-0.5">{q.name}</div>
          </div>
          <FreshnessBadge status={q.status} source={q.source} delaySeconds={q.delaySeconds} compact />
        </div>

        <div className="flex items-baseline justify-between gap-2 pt-1">
          <span className="text-lg font-extrabold font-mono text-text-primary text-tabular">
            {formatInstrumentPrice(q.price, q.assetClass, q.currency, q.extra?.decimals)}
          </span>
          {q.changePercent !== null && q.changePercent !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold ${
                isUp ? 'text-primary' : 'text-danger'
              }`}
            >
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isUp ? '+' : ''}
              {q.changePercent.toFixed(2)}%
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-2 border-t border-border/50">
          {q.assetClass === 'FOREX' ? (
            <>
              <span>Pip: {q.pipMovement !== null && q.pipMovement !== undefined ? `${q.pipMovement > 0 ? '+' : ''}${q.pipMovement}` : '—'}</span>
              <span className="truncate max-w-[140px]">{q.marketSession || 'FX'}</span>
            </>
          ) : (
            <>
              <span>Vol: {formatCompactNumber(q.volume)}</span>
              {q.marketCap ? (
                <span>MCap: {formatCompactNumber(q.marketCap, '$')}</span>
              ) : (
                <span className="truncate max-w-[140px]">{q.marketSession || q.exchange}</span>
              )}
            </>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Global Search */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-surface via-surface-elevated to-surface p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-mono font-semibold mb-2">
              <Activity size={13} />
              MULTI-ASSET MARKETS TERMINAL
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              Markets
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Indian equities (NSE/BSE), global cryptocurrencies, and forex pairs with transparent data freshness.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw size={14} />}
            onClick={() =>
              activeTab === 'overview'
                ? loadOverview()
                : activeTab !== 'watchlists' &&
                  loadDirectory(
                    activeTab === 'stock' ? 'STOCK' : activeTab === 'crypto' ? 'CRYPTO' : 'FOREX',
                    dirSearch,
                    exchangeFilter
                  )
            }
          >
            Refresh Quotes
          </Button>
        </div>

        {/* Shared Global Search Bar & IST Clock */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <InstrumentSearchInput
            className="w-full max-w-2xl"
            onSelect={(item) => openInstrument(item.assetClass, item.symbol)}
          />
          <IstMarketClock compact />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1" role="tablist">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'stock', label: 'Stocks (NSE/BSE)', icon: TrendingUp },
            { id: 'crypto', label: 'Crypto', icon: Coins },
            { id: 'forex', label: 'Forex', icon: Globe },
            { id: 'watchlists', label: 'Watchlists', icon: Bookmark },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => switchTab(t.id as MarketTab)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-glow'
                    : 'bg-background/60 text-text-secondary border-border hover:text-text-primary hover:bg-surface'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 text-xs text-danger flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle size={15} />
            {error}
          </span>
          <Button size="sm" variant="outline" onClick={loadOverview}>
            Retry
          </Button>
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {loading && !overview ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-surface animate-pulse border border-border" />
              ))}
            </div>
          ) : (
            overview && (
              <>
                {/* Indian Indices */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-text-primary">Indian Market Indices</h2>
                    <button
                      onClick={() => switchTab('stock')}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Explore all stocks →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {overview.indices.map((idx) => renderQuoteCard(idx))}
                  </div>
                </section>

                {/* Gainers & Losers */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                        <TrendingUp size={16} /> Top Gainers (NSE)
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {overview.stocks.topGainers.map((s) => (
                        <div
                          key={s.symbol}
                          onClick={() => openInstrument('STOCK', s.symbol)}
                          className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-surface-elevated/60 px-2 -mx-2 rounded-lg transition-colors"
                        >
                          <div>
                            <div className="font-mono font-bold text-xs text-text-primary">{s.displaySymbol}</div>
                            <div className="text-[11px] text-text-muted">{s.name}</div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-text-primary">
                              {formatInstrumentPrice(s.price, 'STOCK', 'INR')}
                            </div>
                            <div className="text-[11px] text-primary">
                              +{(s.changePercent ?? 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-danger flex items-center gap-1.5">
                        <TrendingDown size={16} /> Top Losers (NSE)
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {overview.stocks.topLosers.map((s) => (
                        <div
                          key={s.symbol}
                          onClick={() => openInstrument('STOCK', s.symbol)}
                          className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-surface-elevated/60 px-2 -mx-2 rounded-lg transition-colors"
                        >
                          <div>
                            <div className="font-mono font-bold text-xs text-text-primary">{s.displaySymbol}</div>
                            <div className="text-[11px] text-text-muted">{s.name}</div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-text-primary">
                              {formatInstrumentPrice(s.price, 'STOCK', 'INR')}
                            </div>
                            <div className={`text-[11px] ${(s.changePercent ?? 0) >= 0 ? 'text-primary' : 'text-danger'}`}>
                              {(s.changePercent ?? 0) >= 0 ? '+' : ''}
                              {(s.changePercent ?? 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>

                {/* Trending Crypto */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-text-primary">Trending Cryptocurrencies</h2>
                    <button
                      onClick={() => switchTab('crypto')}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      View all crypto →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {overview.crypto.trending.map((c) => renderQuoteCard(c))}
                  </div>
                </section>

                {/* Popular Forex + Watchlist Shortcut */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-text-primary">Popular Forex Pairs</h2>
                      <button
                        onClick={() => switchTab('forex')}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View all pairs →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {overview.forex.popular.map((fx) => renderQuoteCard(fx))}
                    </div>
                  </div>
                  <div>
                    <WatchlistPanel compact />
                  </div>
                </section>
              </>
            )
          )}
        </div>
      )}

      {/* TAB: DIRECTORY (STOCK / CRYPTO / FOREX) */}
      {(activeTab === 'stock' || activeTab === 'crypto' || activeTab === 'forex') && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder={`Filter ${activeTab}s by symbol or name...`}
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            {activeTab === 'stock' && (
              <div className="flex items-center gap-1.5">
                {(['ALL', 'NSE', 'BSE'] as const).map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setExchangeFilter(ex)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                      exchangeFilter === ex
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-surface text-text-secondary border-border hover:text-text-primary'
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-32 rounded-xl bg-surface animate-pulse border border-border" />
              ))}
            </div>
          ) : directoryItems.length === 0 ? (
            <Card className="py-12 text-center text-sm text-text-muted">
              No instruments matched "{dirSearch}".
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {directoryItems.map((item) => renderQuoteCard(item))}
            </div>
          )}
        </div>
      )}

      {/* TAB: WATCHLISTS */}
      {activeTab === 'watchlists' && <WatchlistPanel />}
    </div>
  );
};
