import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Grid, Layers, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { api } from '../services/api';
import { DataFreshnessStatus } from '../types/markets';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { FreshnessBadge } from '../components/markets/FreshnessBadge';
import { IstMarketClock } from '../components/markets/IstMarketClock';

interface HeatmapStock {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  indices: string[];
  marketCapCr: number;
  price: number;
  change: number;
  changePercent: number;
  status: DataFreshnessStatus;
}

interface HeatmapResponse {
  universe: string;
  timeframe: string;
  marketSession: string;
  status: DataFreshnessStatus;
  source: string;
  retrievedAt: string;
  delaySeconds?: number | null;
  sectors: string[];
  items: HeatmapStock[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayoutTile<T> extends Rect {
  data: T;
}

/**
 * Simple recursive binary treemap layout (100x100 percentage space)
 * that partitions items proportionally by weight.
 */
function layoutTreemap<T>(
  items: { data: T; weight: number }[],
  rect: Rect
): LayoutTile<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ ...rect, data: items[0].data }];
  }

  const total = items.reduce((s, it) => s + Math.max(1, it.weight), 0);
  let acc = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    acc += Math.max(1, items[i].weight);
    splitIdx = i + 1;
    if (acc >= total * 0.45) break;
  }

  const leftItems = items.slice(0, splitIdx);
  const rightItems = items.slice(splitIdx);
  const leftWeight = leftItems.reduce((s, it) => s + Math.max(1, it.weight), 0);
  const ratio = leftWeight / total;

  if (rect.w >= rect.h) {
    const lw = rect.w * ratio;
    return [
      ...layoutTreemap(leftItems, { x: rect.x, y: rect.y, w: lw, h: rect.h }),
      ...layoutTreemap(rightItems, { x: rect.x + lw, y: rect.y, w: rect.w - lw, h: rect.h }),
    ];
  } else {
    const lh = rect.h * ratio;
    return [
      ...layoutTreemap(leftItems, { x: rect.x, y: rect.y, w: rect.w, h: lh }),
      ...layoutTreemap(rightItems, { x: rect.x, y: rect.y + lh, w: rect.w, h: rect.h - lh }),
    ];
  }
}

function getTileColor(pct: number): string {
  const abs = Math.min(Math.abs(pct), 5);
  const intensity = 0.25 + (abs / 5) * 0.6;
  if (pct > 0.05) {
    return `rgba(22, 163, 106, ${intensity.toFixed(2)})`;
  }
  if (pct < -0.05) {
    return `rgba(220, 53, 69, ${intensity.toFixed(2)})`;
  }
  return 'rgba(51, 65, 85, 0.55)';
}

export const HeatmapPage: React.FC = () => {
  const navigate = useNavigate();
  const [universe, setUniverse] = useState<'NIFTY50' | 'NIFTYNEXT50' | 'NIFTY100' | 'NIFTYBANK' | 'NSE' | 'BSE'>('NIFTY50');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y'>('1D');
  const [direction, setDirection] = useState<'ALL' | 'GAINERS' | 'LOSERS'>('ALL');
  const [sortBy, setSortBy] = useState<string>('HIGHEST_MCAP');
  const [sizeBy, setSizeBy] = useState<'MCAP' | 'EQUAL'>('MCAP');
  const [zoomedSector, setZoomedSector] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HeatmapStock | null>(null);

  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.markets.getHeatmap({
      universe,
      timeframe,
      sector: zoomedSector || undefined,
      direction: direction !== 'ALL' ? direction : undefined,
      sort_by: sortBy,
    });
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error?.message || 'Unable to load heatmap data.');
    }
    setLoading(false);
  }, [universe, timeframe, zoomedSector, direction, sortBy]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  const sectorGroups = useMemo(() => {
    if (!data?.items) return [];
    const map = new Map<string, HeatmapStock[]>();
    for (const item of data.items) {
      const list = map.get(item.sector) || [];
      list.push(item);
      map.set(item.sector, list);
    }
    return Array.from(map.entries())
      .map(([sector, items]) => ({
        sector,
        items,
        totalWeight: items.reduce(
          (s, it) => s + (sizeBy === 'MCAP' ? it.marketCapCr : 100),
          0
        ),
      }))
      .sort((a, b) => b.totalWeight - a.totalWeight);
  }, [data, sizeBy]);

  const sectorLayouts = useMemo(() => {
    return layoutTreemap(
      sectorGroups.map((g) => ({ data: g, weight: g.totalWeight })),
      { x: 0, y: 0, w: 100, h: 100 }
    );
  }, [sectorGroups]);

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/markets')}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Back to Markets
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <Grid size={22} className="text-primary" />
              Stocks Heatmap — Market at a Glance
            </h1>
            {data && (
              <FreshnessBadge
                status={data.status}
                source={data.source}
                delaySeconds={data.delaySeconds}
                compact
              />
            )}
          </div>
          <p className="text-xs text-text-secondary">
            {data?.marketSession || 'NSE / BSE'} • Size by {sizeBy === 'MCAP' ? 'Market Cap' : 'Equal Weight'} • Click any sector to zoom or stock to open its chart
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <IstMarketClock compact />
          <Button size="sm" variant="outline" icon={<RefreshCw size={14} />} onClick={fetchHeatmap}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Controls Bar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Universe */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['NIFTY50', 'NIFTYNEXT50', 'NIFTY100', 'NIFTYBANK', 'NSE', 'BSE'] as const).map((u) => (
            <button
              key={u}
              onClick={() => {
                setZoomedSector(null);
                setUniverse(u);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                universe === u
                  ? 'bg-primary text-background border-primary'
                  : 'bg-background/60 text-text-secondary border-border hover:text-text-primary'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Timeframe */}
        <div className="flex items-center gap-1 flex-wrap">
          {(['1D', '1W', '1M', '3M', '6M', '1Y'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                timeframe === tf
                  ? 'bg-secondary text-background'
                  : 'text-text-secondary hover:text-text-primary bg-background/50'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Direction & Sizing */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['ALL', 'GAINERS', 'LOSERS'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
                direction === d
                  ? 'bg-surface-elevated text-primary border-primary/40'
                  : 'bg-background/50 text-text-muted border-border'
              }`}
            >
              {d}
            </button>
          ))}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs font-mono border border-border bg-background/50 text-text-primary"
          >
            <option value="HIGHEST_MCAP">Sort: Highest MCap</option>
            <option value="TOP_GAINERS">Sort: Top Gainers</option>
            <option value="TOP_LOSERS">Sort: Top Losers</option>
            <option value="HIGHEST_VOLUME">Sort: Highest Volume</option>
            <option value="PCT_CHANGE">Sort: |% Change|</option>
            <option value="LOWEST_MCAP">Sort: Lowest MCap</option>
          </select>
          <button
            onClick={() => setSizeBy((s) => (s === 'MCAP' ? 'EQUAL' : 'MCAP'))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border border-border bg-background/50 text-text-secondary hover:text-text-primary"
          >
            <Layers size={12} />
            {sizeBy === 'MCAP' ? 'Size: MCap' : 'Size: Equal'}
          </button>
          <button
            onClick={() => {
              setUniverse('NIFTY50');
              setTimeframe('1D');
              setDirection('ALL');
              setSortBy('HIGHEST_MCAP');
              setZoomedSector(null);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-mono border border-border text-text-muted hover:text-text-primary"
          >
            Reset
          </button>
          {zoomedSector && (
            <Button
              size="sm"
              variant="outline"
              icon={<ZoomOut size={13} />}
              onClick={() => setZoomedSector(null)}
            >
              All Sectors ({zoomedSector})
            </Button>
          )}
        </div>
      </Card>

      {/* Hover Info Bar */}
      <div className="min-h-[38px] px-4 py-2 rounded-xl border border-border bg-surface/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {hovered ? (
          <>
            <div className="flex items-center gap-3">
              <span className="font-bold text-text-primary">{hovered.symbol}</span>
              <span className="text-text-secondary font-sans">{hovered.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px]">
                {hovered.sector} • {hovered.exchange}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-text-primary font-bold">₹{hovered.price.toLocaleString('en-IN')}</span>
              <span className={hovered.changePercent >= 0 ? 'text-primary font-bold' : 'text-danger font-bold'}>
                {hovered.changePercent >= 0 ? '+' : ''}
                {hovered.changePercent.toFixed(2)}% ({timeframe})
              </span>
              <span className="text-text-muted">
                MCap: ₹{hovered.marketCapCr.toLocaleString('en-IN')} Cr
              </span>
            </div>
          </>
        ) : (
          <span className="text-text-muted">
            Hover over any rectangle to inspect price, {timeframe} return, and market capitalization.
          </span>
        )}
      </div>

      {/* Treemap Canvas */}
      {error ? (
        <Card className="p-8 text-center text-sm text-danger">{error}</Card>
      ) : loading ? (
        <div className="h-[580px] rounded-2xl border border-border bg-surface animate-pulse flex items-center justify-center text-sm font-mono text-text-muted">
          Loading {universe} {timeframe} heatmap from market provider...
        </div>
      ) : sectorLayouts.length === 0 ? (
        <Card className="p-12 text-center text-sm text-text-muted">
          No stocks matched the current filter criteria.
        </Card>
      ) : (
        <div className="relative w-full h-[600px] rounded-2xl border border-border bg-background overflow-hidden">
          {sectorLayouts.map((secRect) => {
            const group = secRect.data;
            const tiles = layoutTreemap(
              group.items.map((it) => ({
                data: it,
                weight: sizeBy === 'MCAP' ? it.marketCapCr : 100,
              })),
              { x: 0, y: 0, w: 100, h: 100 }
            );
            return (
              <div
                key={group.sector}
                style={{
                  left: `${secRect.x}%`,
                  top: `${secRect.y}%`,
                  width: `${secRect.w}%`,
                  height: `${secRect.h}%`,
                }}
                className="absolute border border-[#0B1017] flex flex-col overflow-hidden"
              >
                <button
                  onClick={() =>
                    setZoomedSector((prev) => (prev === group.sector ? null : group.sector))
                  }
                  className="px-2 py-0.5 bg-surface-elevated/95 border-b border-[#0B1017] text-[10px] font-mono font-bold text-text-secondary hover:text-primary flex items-center justify-between truncate"
                  title={`Click to ${zoomedSector === group.sector ? 'zoom out' : `zoom into ${group.sector}`}`}
                >
                  <span className="truncate">{group.sector.toUpperCase()}</span>
                  <ZoomIn size={10} className="flex-shrink-0 opacity-70" />
                </button>
                <div className="relative flex-1">
                  {tiles.map((t) => {
                    const st = t.data;
                    const showFull = t.w > 18 && t.h > 18;
                    return (
                      <div
                        key={st.symbol}
                        onMouseEnter={() => setHovered(st)}
                        onClick={() =>
                          navigate(`/markets/stock/${encodeURIComponent(st.symbol)}`)
                        }
                        style={{
                          left: `${t.x}%`,
                          top: `${t.y}%`,
                          width: `${t.w}%`,
                          height: `${t.h}%`,
                          backgroundColor: getTileColor(st.changePercent),
                        }}
                        className="absolute border border-[#0B1017]/90 p-1.5 flex flex-col items-center justify-center text-center cursor-pointer hover:brightness-125 transition-all overflow-hidden select-none"
                      >
                        <span className="font-mono font-extrabold text-[11px] sm:text-xs text-text-primary leading-tight truncate max-w-full">
                          {st.symbol}
                        </span>
                        <span className="font-mono text-[10px] sm:text-[11px] font-bold text-text-primary/95">
                          {st.changePercent >= 0 ? '+' : ''}
                          {st.changePercent.toFixed(2)}%
                        </span>
                        {showFull && (
                          <span className="font-mono text-[9px] text-text-primary/80 truncate max-w-full">
                            ₹{st.price.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
