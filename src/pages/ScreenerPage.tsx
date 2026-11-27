import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, RotateCcw, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { DataFreshnessStatus } from '../types/markets';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { FreshnessBadge } from '../components/markets/FreshnessBadge';
import { IstMarketClock } from '../components/markets/IstMarketClock';
import { formatCompactNumber } from '../components/markets/formatters';

interface ScreenerRow {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  marketCapCr: number;
  price: number;
  change1D: number;
  volume: number;
  high52w?: number | null;
  low52w?: number | null;
  return1M?: number | null;
  return3M?: number | null;
  return6M?: number | null;
  return1Y?: number | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  roe?: number | null;
  roce?: number | null;
  dividendYield?: number | null;
  status: DataFreshnessStatus;
}

const SECTORS = [
  'ALL',
  'Banking',
  'IT',
  'Energy',
  'Automobile',
  'Healthcare',
  'FMCG',
  'Financial Services',
  'Metals',
  'Telecom',
];

export const ScreenerPage: React.FC = () => {
  const navigate = useNavigate();

  const [exchange, setExchange] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');
  const [sector, setSector] = useState<string>('ALL');
  const [minMcap, setMinMcap] = useState<string>('');
  const [maxMcap, setMaxMcap] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [min1MReturn, setMin1MReturn] = useState<string>('');
  const [min1YReturn, setMin1YReturn] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('marketCapCr');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState<number>(1);

  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [source, setSource] = useState<string>('');
  const [bharatstockConfigured, setBharatstockConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScreener = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.markets.getScreener({
      exchange,
      sector,
      min_mcap_cr: minMcap || undefined,
      max_mcap_cr: maxMcap || undefined,
      min_price: minPrice || undefined,
      max_price: maxPrice || undefined,
      min_1m_return: min1MReturn || undefined,
      min_1y_return: min1YReturn || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: 20,
    });
    if (res.success && res.data) {
      setRows(res.data.items || []);
      setTotal(res.data.total || 0);
      setSource(res.data.source || '');
      setBharatstockConfigured(Boolean(res.data.bharatstockConfigured));
    } else {
      setError(res.error?.message || 'Unable to run stock screener.');
    }
    setLoading(false);
  }, [exchange, sector, minMcap, maxMcap, minPrice, maxPrice, min1MReturn, min1YReturn, sortBy, sortDir, page]);

  useEffect(() => {
    fetchScreener();
  }, [fetchScreener]);

  const resetFilters = () => {
    setExchange('ALL');
    setSector('ALL');
    setMinMcap('');
    setMaxMcap('');
    setMinPrice('');
    setMaxPrice('');
    setMin1MReturn('');
    setMin1YReturn('');
    setSortBy('marketCapCr');
    setSortDir('desc');
    setPage(1);
  };

  const renderRet = (val?: number | null) => {
    if (val === null || val === undefined) return <span className="text-text-muted">N/A</span>;
    const isUp = val >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 font-mono font-semibold ${isUp ? 'text-primary' : 'text-danger'}`}>
        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {isUp ? '+' : ''}
        {val.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/markets')}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Back to Markets
          </button>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <SlidersHorizontal size={22} className="text-primary" />
            Indian Market Screener
          </h1>
          <p className="text-xs text-text-secondary">
            Filter NSE & BSE stocks by sector, market cap, price, volume, and historical returns ({source || 'Yahoo Finance'}).
            {!bharatstockConfigured && ' P/E, P/B, ROE & ROCE show N/A until BHARATSTOCK_API_KEY is configured.'}
          </p>
        </div>
        <IstMarketClock />
      </div>

      {/* Combined Filters Card */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5">
            <Filter size={14} className="text-primary" /> Screener Filters ({total} matching)
          </span>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={resetFilters}>
            Clear Filters
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-mono text-text-muted block mb-1">Exchange</label>
            <select
              value={exchange}
              onChange={(e) => { setPage(1); setExchange(e.target.value as any); }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-text-primary"
            >
              <option value="ALL">ALL</option>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-text-muted block mb-1">Sector</label>
            <select
              value={sector}
              onChange={(e) => { setPage(1); setSector(e.target.value); }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-text-primary"
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-text-muted block mb-1">Min MCap (₹ Cr)</label>
            <input
              type="number"
              value={minMcap}
              onChange={(e) => { setPage(1); setMinMcap(e.target.value); }}
              placeholder="e.g. 10000"
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-mono text-text-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-text-muted block mb-1">Min Price (₹)</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => { setPage(1); setMinPrice(e.target.value); }}
              placeholder="0"
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-mono text-text-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-text-muted block mb-1">Max Price (₹)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => { setPage(1); setMaxPrice(e.target.value); }}
              placeholder="Any"
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-mono text-text-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-text-muted block mb-1">Min 1M Ret %</label>
            <input
              type="number"
              value={min1MReturn}
              onChange={(e) => { setPage(1); setMin1MReturn(e.target.value); }}
              placeholder="e.g. 0"
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-mono text-text-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-text-muted block mb-1">Min 1Y Ret %</label>
            <input
              type="number"
              value={min1YReturn}
              onChange={(e) => { setPage(1); setMin1YReturn(e.target.value); }}
              placeholder="e.g. 10"
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 font-mono text-text-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-text-muted block mb-1">Sort By</label>
            <select
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(':');
                setSortBy(k);
                setSortDir(d as 'asc' | 'desc');
              }}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-text-primary"
            >
              <option value="marketCapCr:desc">MCap (High → Low)</option>
              <option value="marketCapCr:asc">MCap (Low → High)</option>
              <option value="change1D:desc">1D % (Gainers)</option>
              <option value="change1D:asc">1D % (Losers)</option>
              <option value="return1M:desc">1M Return (High)</option>
              <option value="return1Y:desc">1Y Return (High)</option>
              <option value="volume:desc">Volume (High)</option>
              <option value="price:desc">Price (High)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card className="p-0 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-xs text-danger">{error}</div>
        ) : loading ? (
          <div className="p-10 text-center text-xs font-mono text-text-muted">
            Running live screener across NSE/BSE constituents...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-xs text-text-muted">
            No stocks matched all selected conditions. Try relaxing one or more filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-elevated/60 text-[10px] font-mono uppercase text-text-muted">
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-3">Sector</th>
                  <th className="py-3 px-3 text-right">Price (₹)</th>
                  <th className="py-3 px-3 text-right">1D %</th>
                  <th className="py-3 px-3 text-right">1M %</th>
                  <th className="py-3 px-3 text-right">3M %</th>
                  <th className="py-3 px-3 text-right">1Y %</th>
                  <th className="py-3 px-3 text-right">MCap (Cr)</th>
                  <th className="py-3 px-3 text-right">Volume</th>
                  <th className="py-3 px-3 text-right">P/E</th>
                  <th className="py-3 px-3 text-right">ROE</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r) => (
                  <tr
                    key={r.symbol}
                    onClick={() => navigate(`/markets/stock/${encodeURIComponent(r.symbol)}`)}
                    className="hover:bg-surface-elevated/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-text-primary">{r.symbol}</div>
                      <div className="text-[11px] text-text-muted truncate max-w-[160px]">{r.name}</div>
                    </td>
                    <td className="py-3 px-3 text-text-secondary">
                      <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono">
                        {r.exchange}
                      </span>{' '}
                      {r.sector}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-text-primary">
                      ₹{r.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right">{renderRet(r.change1D)}</td>
                    <td className="py-3 px-3 text-right">{renderRet(r.return1M)}</td>
                    <td className="py-3 px-3 text-right">{renderRet(r.return3M)}</td>
                    <td className="py-3 px-3 text-right">{renderRet(r.return1Y)}</td>
                    <td className="py-3 px-3 text-right font-mono text-text-primary">
                      ₹{r.marketCapCr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-text-secondary">
                      {formatCompactNumber(r.volume)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-text-muted">
                      {r.peRatio !== null && r.peRatio !== undefined ? r.peRatio.toFixed(1) : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-text-muted">
                      {r.roe !== null && r.roe !== undefined ? `${r.roe.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <FreshnessBadge status={r.status} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            Showing page {page} of {Math.ceil(total / 20)} ({total} stocks)
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
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
