import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineSeries,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import {
  Activity,
  BarChart2,
  CandlestickChart,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import {
  AssetClass,
  DataFreshnessStatus,
  HistoricalRange,
  NormalizedCandle,
  SUPPORTED_RANGES,
  SUPPORTED_TIMEFRAMES,
  Timeframe,
} from '../../types/markets';
import {
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  calculateVWAP,
} from '../../utils/indicators';
import { FreshnessBadge } from './FreshnessBadge';

export type ChartMode = 'CANDLE' | 'LINE' | 'AREA';

export interface IndicatorConfig {
  sma: { enabled: boolean; period: number };
  ema: { enabled: boolean; period: number };
  vwap: { enabled: boolean };
  bollinger: { enabled: boolean; period: number; stdDev: number };
  rsi: { enabled: boolean; period: number };
  macd: { enabled: boolean };
  volume: { enabled: boolean };
}

interface TechnicalChartProps {
  symbol: string;
  assetClass: AssetClass;
  currency: string;
  candles: NormalizedCandle[];
  liveCandle?: NormalizedCandle | null;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  selectedRange?: HistoricalRange;
  onRangeChange?: (range: HistoricalRange) => void;
  rangeReturnPercent?: number | null;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMoreHistory?: () => void;
  status: DataFreshnessStatus;
  source?: string;
  delaySeconds?: number | null;
  providerTimestamp?: string | null;
}

const DEFAULT_INDICATORS: IndicatorConfig = {
  sma: { enabled: true, period: 20 },
  ema: { enabled: false, period: 50 },
  vwap: { enabled: false },
  bollinger: { enabled: false, period: 20, stdDev: 2 },
  rsi: { enabled: false, period: 14 },
  macd: { enabled: false },
  volume: { enabled: true },
};

export const TechnicalChart: React.FC<TechnicalChartProps> = ({
  symbol,
  assetClass,
  currency,
  candles,
  liveCandle,
  timeframe,
  onTimeframeChange,
  selectedRange = '1Y',
  onRangeChange,
  rangeReturnPercent,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMoreHistory,
  status,
  source,
  delaySeconds,
  providerTimestamp,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainChartWrapRef = useRef<HTMLDivElement>(null);
  const rsiWrapRef = useRef<HTMLDivElement>(null);
  const macdWrapRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<any> | null>(null);

  const [chartMode, setChartMode] = useState<ChartMode>('CANDLE');
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredCandle, setHoveredCandle] = useState<NormalizedCandle | null>(null);

  const loadMoreTriggeredRef = useRef(false);
  useEffect(() => {
    loadMoreTriggeredRef.current = false;
  }, [candles.length, symbol, timeframe]);

  // Compute indicators from real historical candles
  const smaData = useMemo(
    () => (indicators.sma.enabled ? calculateSMA(candles, indicators.sma.period) : []),
    [candles, indicators.sma]
  );
  const emaData = useMemo(
    () => (indicators.ema.enabled ? calculateEMA(candles, indicators.ema.period) : []),
    [candles, indicators.ema]
  );
  const vwapData = useMemo(
    () => (indicators.vwap.enabled ? calculateVWAP(candles) : []),
    [candles, indicators.vwap.enabled]
  );
  const bbData = useMemo(
    () =>
      indicators.bollinger.enabled
        ? calculateBollingerBands(candles, indicators.bollinger.period, indicators.bollinger.stdDev)
        : [],
    [candles, indicators.bollinger]
  );
  const rsiData = useMemo(
    () => (indicators.rsi.enabled ? calculateRSI(candles, indicators.rsi.period) : []),
    [candles, indicators.rsi]
  );
  const macdData = useMemo(
    () => (indicators.macd.enabled ? calculateMACD(candles) : []),
    [candles, indicators.macd.enabled]
  );

  // Build & update Main Chart
  useEffect(() => {
    const el = mainChartWrapRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B1017' },
        textColor: '#93A2B4',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(34, 49, 66, 0.45)' },
        horzLines: { color: 'rgba(34, 49, 66, 0.45)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#5F7085', labelBackgroundColor: '#1A2531' },
        horzLine: { color: '#5F7085', labelBackgroundColor: '#1A2531' },
      },
      rightPriceScale: {
        borderColor: '#223142',
        scaleMargins: { top: 0.1, bottom: indicators.volume.enabled ? 0.25 : 0.1 },
      },
      localization:
        assetClass === 'STOCK'
          ? {
              timeFormatter: (time: number) =>
                new Intl.DateTimeFormat('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: '2-digit',
                  month: 'short',
                  hour: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h'].includes(timeframe)
                    ? '2-digit'
                    : undefined,
                  minute: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h'].includes(timeframe)
                    ? '2-digit'
                    : undefined,
                  hour12: false,
                }).format(new Date(time * 1000)),
            }
          : undefined,
      timeScale: {
        borderColor: '#223142',
        timeVisible: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h'].includes(timeframe),
        secondsVisible: false,
      },
      width: el.clientWidth,
      height: isFullscreen ? Math.max(420, window.innerHeight - 280) : 420,
    });

    mainChartRef.current = chart;

    let mainSeries: ISeriesApi<any>;
    if (chartMode === 'CANDLE') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#45D6B5',
        downColor: '#F16D75',
        borderVisible: false,
        wickUpColor: '#45D6B5',
        wickDownColor: '#F16D75',
      });
      mainSeries.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else if (chartMode === 'AREA') {
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#45D6B5',
        topColor: 'rgba(69, 214, 181, 0.28)',
        bottomColor: 'rgba(69, 214, 181, 0.02)',
        lineWidth: 2,
      });
      mainSeries.setData(
        candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
      );
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#78A9FF',
        lineWidth: 2,
      });
      mainSeries.setData(
        candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
      );
    }
    mainSeriesRef.current = mainSeries;

    if (indicators.volume.enabled) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
      });
      volSeries.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(69, 214, 181, 0.35)' : 'rgba(241, 109, 117, 0.35)',
        }))
      );
      volSeriesRef.current = volSeries;
    } else {
      volSeriesRef.current = null;
    }

    if (indicators.sma.enabled && smaData.length > 0) {
      const s = chart.addSeries(LineSeries, {
        color: '#F5B942',
        lineWidth: 1,
        title: `SMA ${indicators.sma.period}`,
      });
      s.setData(smaData.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    }

    if (indicators.ema.enabled && emaData.length > 0) {
      const s = chart.addSeries(LineSeries, {
        color: '#78A9FF',
        lineWidth: 1,
        title: `EMA ${indicators.ema.period}`,
      });
      s.setData(emaData.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    }

    if (indicators.vwap.enabled && vwapData.length > 0) {
      const v = chart.addSeries(LineSeries, {
        color: '#C084FC',
        lineWidth: 1,
        title: 'VWAP',
      });
      v.setData(vwapData.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    }

    if (indicators.bollinger.enabled && bbData.length > 0) {
      const upper = chart.addSeries(LineSeries, {
        color: 'rgba(120, 169, 255, 0.65)',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Upper',
      });
      const lower = chart.addSeries(LineSeries, {
        color: 'rgba(120, 169, 255, 0.65)',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Lower',
      });
      upper.setData(bbData.map((p) => ({ time: p.time as UTCTimestamp, value: p.upper })));
      lower.setData(bbData.map((p) => ({ time: p.time as UTCTimestamp, value: p.lower })));
    }

    // Crosshair OHLCV readout
    const candleMap = new Map(candles.map((c) => [c.time, c]));
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHoveredCandle(null);
        return;
      }
      const c = candleMap.get(Number(param.time));
      if (c) setHoveredCandle(c);
    });

    // Historical pagination on scroll left
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (
        range &&
        range.from < 5 &&
        hasMore &&
        !loadingMore &&
        !loadMoreTriggeredRef.current &&
        onLoadMoreHistory
      ) {
        loadMoreTriggeredRef.current = true;
        onLoadMoreHistory();
      }
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      mainChartRef.current = null;
      mainSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  }, [candles, chartMode, indicators, smaData, emaData, vwapData, bbData, timeframe, isFullscreen, hasMore, loadingMore, onLoadMoreHistory]);

  // Incremental live candle update without recreating chart
  useEffect(() => {
    if (!liveCandle || !mainSeriesRef.current) return;
    if (chartMode === 'CANDLE') {
      mainSeriesRef.current.update({
        time: liveCandle.time as UTCTimestamp,
        open: liveCandle.open,
        high: liveCandle.high,
        low: liveCandle.low,
        close: liveCandle.close,
      });
    } else {
      mainSeriesRef.current.update({
        time: liveCandle.time as UTCTimestamp,
        value: liveCandle.close,
      });
    }
    if (volSeriesRef.current) {
      volSeriesRef.current.update({
        time: liveCandle.time as UTCTimestamp,
        value: liveCandle.volume,
        color:
          liveCandle.close >= liveCandle.open
            ? 'rgba(69, 214, 181, 0.35)'
            : 'rgba(241, 109, 117, 0.35)',
      });
    }
  }, [liveCandle, chartMode]);

  // RSI Sub-pane
  useEffect(() => {
    const el = rsiWrapRef.current;
    if (!el || !indicators.rsi.enabled || rsiData.length === 0) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B1017' },
        textColor: '#93A2B4',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(34, 49, 66, 0.35)' },
        horzLines: { color: 'rgba(34, 49, 66, 0.35)' },
      },
      rightPriceScale: { borderColor: '#223142' },
      timeScale: { borderColor: '#223142', visible: !indicators.macd.enabled },
      width: el.clientWidth,
      height: 120,
    });

    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#F5B942',
      lineWidth: 2,
      title: `RSI (${indicators.rsi.period})`,
    });
    rsiSeries.setData(rsiData.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) chart.applyOptions({ width: entry.contentRect.width });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [rsiData, indicators.rsi, indicators.macd.enabled]);

  // MACD Sub-pane
  useEffect(() => {
    const el = macdWrapRef.current;
    if (!el || !indicators.macd.enabled || macdData.length === 0) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B1017' },
        textColor: '#93A2B4',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(34, 49, 66, 0.35)' },
        horzLines: { color: 'rgba(34, 49, 66, 0.35)' },
      },
      rightPriceScale: { borderColor: '#223142' },
      timeScale: { borderColor: '#223142' },
      width: el.clientWidth,
      height: 130,
    });

    const hist = chart.addSeries(HistogramSeries, { title: 'MACD Hist' });
    hist.setData(
      macdData.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.histogram,
        color: p.histogram >= 0 ? 'rgba(69, 214, 181, 0.55)' : 'rgba(241, 109, 117, 0.55)',
      }))
    );
    const macdLine = chart.addSeries(LineSeries, { color: '#78A9FF', lineWidth: 1, title: 'MACD' });
    macdLine.setData(macdData.map((p) => ({ time: p.time as UTCTimestamp, value: p.macd })));
    const sigLine = chart.addSeries(LineSeries, { color: '#F5B942', lineWidth: 1, title: 'Signal' });
    sigLine.setData(macdData.map((p) => ({ time: p.time as UTCTimestamp, value: p.signal })));
    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) chart.applyOptions({ width: entry.contentRect.width });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [macdData, indicators.macd.enabled]);

  const activeCandle = hoveredCandle || liveCandle || candles[candles.length - 1] || null;

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-border bg-surface overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
      }`}
    >
      {/* Unified Single Chart Toolbar (Interval + Range + Type + Indicators + Status) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 border-b border-border/80 bg-surface-elevated/60">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Candle Interval Selector */}
          <label className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
            <span>Interval</span>
            <select
              aria-label="Candle interval"
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
              className="bg-background border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SUPPORTED_TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </label>

          {/* Historical Range Selector */}
          {onRangeChange && (
            <div
              className="flex items-center gap-0.5 bg-background/60 border border-border rounded-lg p-0.5 overflow-x-auto max-w-full"
              role="group"
              aria-label="Historical range"
            >
              {SUPPORTED_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRangeChange(r)}
                  aria-pressed={selectedRange === r}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors whitespace-nowrap ${
                    selectedRange === r
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chart Types, Indicators, Status & Fullscreen */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-border bg-background/60 p-0.5">
            <button
              onClick={() => setChartMode('CANDLE')}
              title="Candlestick"
              aria-label="Candlestick chart"
              className={`p-1.5 rounded-md transition-colors ${
                chartMode === 'CANDLE' ? 'bg-surface-elevated text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <CandlestickChart size={15} />
            </button>
            <button
              onClick={() => setChartMode('LINE')}
              title="Line"
              aria-label="Line chart"
              className={`p-1.5 rounded-md transition-colors ${
                chartMode === 'LINE' ? 'bg-surface-elevated text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <TrendingUp size={15} />
            </button>
            <button
              onClick={() => setChartMode('AREA')}
              title="Area"
              aria-label="Area chart"
              className={`p-1.5 rounded-md transition-colors ${
                chartMode === 'AREA' ? 'bg-surface-elevated text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Activity size={15} />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background/60 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
            >
              <SlidersHorizontal size={13} />
              <span>Indicators</span>
            </button>

            {showIndicatorMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface-elevated p-3 shadow-2xl z-30 space-y-2.5 text-xs">
                <div className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  Overlays & Oscillators
                </div>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-text-primary">SMA ({indicators.sma.period})</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={2}
                      max={200}
                      value={indicators.sma.period}
                      onChange={(e) =>
                        setIndicators((prev) => ({
                          ...prev,
                          sma: { ...prev.sma, period: Math.max(2, Number(e.target.value) || 20) },
                        }))
                      }
                      className="w-12 px-1.5 py-0.5 rounded bg-background border border-border text-right font-mono"
                    />
                    <input
                      type="checkbox"
                      checked={indicators.sma.enabled}
                      onChange={(e) =>
                        setIndicators((prev) => ({
                          ...prev,
                          sma: { ...prev.sma, enabled: e.target.checked },
                        }))
                      }
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-text-primary">EMA ({indicators.ema.period})</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={2}
                      max={200}
                      value={indicators.ema.period}
                      onChange={(e) =>
                        setIndicators((prev) => ({
                          ...prev,
                          ema: { ...prev.ema, period: Math.max(2, Number(e.target.value) || 50) },
                        }))
                      }
                      className="w-12 px-1.5 py-0.5 rounded bg-background border border-border text-right font-mono"
                    />
                    <input
                      type="checkbox"
                      checked={indicators.ema.enabled}
                      onChange={(e) =>
                        setIndicators((prev) => ({
                          ...prev,
                          ema: { ...prev.ema, enabled: e.target.checked },
                        }))
                      }
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-text-primary">VWAP</span>
                  <input
                    type="checkbox"
                    checked={indicators.vwap.enabled}
                    onChange={(e) =>
                      setIndicators((prev) => ({
                        ...prev,
                        vwap: { enabled: e.target.checked },
                      }))
                    }
                  />
                </label>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-text-primary">Bollinger Bands (20, 2)</span>
                  <input
                    type="checkbox"
                    checked={indicators.bollinger.enabled}
                    onChange={(e) =>
                      setIndicators((prev) => ({
                        ...prev,
                        bollinger: { ...prev.bollinger, enabled: e.target.checked },
                      }))
                    }
                  />
                </label>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-text-primary">RSI ({indicators.rsi.period})</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={indicators.rsi.period}
                      onChange={(e) =>
                        setIndicators((prev) => ({
                          ...prev,
                          rsi: { ...prev.rsi, period: Math.max(2, Number(e.target.value) || 14) },
                        }))
                      }
                      className="w-12 px-1.5 py-0.5 rounded bg-background border border-border text-right font-mono"
                    />
                    <input
                      type="checkbox"
                      checked={indicators.rsi.enabled}
                      onChange={(e) =>
                        setIndicators((prev) => ({
                          ...prev,
                          rsi: { ...prev.rsi, enabled: e.target.checked },
                        }))
                      }
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-text-primary">MACD (12, 26, 9)</span>
                  <input
                    type="checkbox"
                    checked={indicators.macd.enabled}
                    onChange={(e) =>
                      setIndicators((prev) => ({
                        ...prev,
                        macd: { enabled: e.target.checked },
                      }))
                    }
                  />
                </label>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-text-primary flex items-center gap-1">
                    <BarChart2 size={12} /> Volume
                  </span>
                  <input
                    type="checkbox"
                    checked={indicators.volume.enabled}
                    onChange={(e) =>
                      setIndicators((prev) => ({
                        ...prev,
                        volume: { enabled: e.target.checked },
                      }))
                    }
                  />
                </label>
              </div>
            )}
          </div>

          <FreshnessBadge
            status={status}
            source={source}
            delaySeconds={delaySeconds}
            providerTimestamp={providerTimestamp}
            compact
          />

          <button
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg border border-border bg-background/60 text-text-secondary hover:text-text-primary transition-colors"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* OHLCV Crosshair Legend */}
      <div className="px-4 py-2 bg-[#0B1017] border-b border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 text-text-secondary">
          <span className="font-bold text-text-primary">
            {symbol} • {timeframe.toUpperCase()} ({currency})
          </span>
          {activeCandle ? (
            <>
              <span>O <strong className="text-text-primary">{activeCandle.open}</strong></span>
              <span>H <strong className="text-primary">{activeCandle.high}</strong></span>
              <span>L <strong className="text-danger">{activeCandle.low}</strong></span>
              <span>C <strong className="text-text-primary">{activeCandle.close}</strong></span>
              <span>Vol <strong className="text-text-secondary">{activeCandle.volume.toLocaleString()}</strong></span>
            </>
          ) : (
            <span className="text-text-muted">No candle data available</span>
          )}
        </div>
        {loadingMore && <span className="text-[11px] text-secondary">Loading earlier history...</span>}
      </div>

      {/* Chart Canvas Area */}
      <div className="relative bg-[#0B1017]">
        {loading && candles.length === 0 ? (
          <div className="h-[420px] flex items-center justify-center text-sm text-text-muted font-mono">
            Loading {symbol} {timeframe.toUpperCase()} historical candles...
          </div>
        ) : candles.length === 0 ? (
          <div className="h-[420px] flex flex-col items-center justify-center text-sm text-text-muted gap-2 px-4 text-center">
            <p className="font-semibold text-text-secondary">Historical candles unavailable</p>
            <p className="text-xs max-w-md">
              The upstream provider did not return OHLCV data for {symbol} on {timeframe.toUpperCase()}.
            </p>
          </div>
        ) : (
          <div ref={mainChartWrapRef} className="w-full" />
        )}
      </div>

      {/* RSI Sub-pane */}
      {indicators.rsi.enabled && rsiData.length > 0 && (
        <div className="border-t border-border/60 bg-[#0B1017]">
          <div className="px-4 py-1 text-[10px] font-mono text-warning">
            RSI ({indicators.rsi.period}) — Latest: {rsiData[rsiData.length - 1]?.value}
          </div>
          <div ref={rsiWrapRef} className="w-full" />
        </div>
      )}

      {/* MACD Sub-pane */}
      {indicators.macd.enabled && macdData.length > 0 && (
        <div className="border-t border-border/60 bg-[#0B1017]">
          <div className="px-4 py-1 text-[10px] font-mono text-secondary">
            MACD (12, 26, 9) — Signal: {macdData[macdData.length - 1]?.signal}
          </div>
          <div ref={macdWrapRef} className="w-full" />
        </div>
      )}

      {/* Clean Footer: Screen-Reader Summary + Range Return + Attribution (No duplicate time-axis controls) */}
      <p className="sr-only">
        {symbol} {timeframe} chart over {selectedRange} range with {candles.length} candles.
        {activeCandle ? ` Latest close ${activeCandle.close}, high ${activeCandle.high}, low ${activeCandle.low}.` : ''}
      </p>
      <div className="px-4 py-2 border-t border-border/60 bg-surface-elevated/40 flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-muted">
        <div className="flex items-center gap-3 font-mono">
          <span>
            {timeframe} interval • {selectedRange} range
          </span>
          {rangeReturnPercent !== undefined && rangeReturnPercent !== null && (
            <span className={`font-bold ${rangeReturnPercent >= 0 ? 'text-primary' : 'text-danger'}`}>
              {rangeReturnPercent >= 0 ? '▲ +' : '▼ '}
              {rangeReturnPercent.toFixed(2)}%
            </span>
          )}
        </div>
        <a
          href="https://www.tradingview.com/lightweight-charts/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-text-secondary transition-colors underline underline-offset-2"
        >
          Powered by TradingView Lightweight Charts™
        </a>
      </div>
    </div>
  );
};
