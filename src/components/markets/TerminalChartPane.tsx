import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineSeries,
  PriceScaleMode,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import {
  Activity,
  BarChart2,
  CandlestickChart,
  Layers,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { getLightweightChartTheme } from './chartTheme';
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
  INDICATOR_PRESETS,
  IndicatorPresetName,
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateEMA,
  calculateIchimoku,
  calculateMACD,
  calculateOBV,
  calculateRSI,
  calculateSMA,
  calculateStochasticRSI,
  calculateSupertrend,
  calculateVWAP,
  calculateWMA,
  computeHeikinAshi,
} from '../../utils/indicators';
import { evaluateCustomIndicator } from '../../utils/customIndicatorParser';
import { ChartDrawingOverlay, DrawingToolType, SavedDrawing } from './ChartDrawingOverlay';
import { FreshnessBadge } from './FreshnessBadge';
import { InstrumentSearchInput } from './InstrumentSearchInput';
import { formatInstrumentPrice } from './formatters';

export type TerminalChartType =
  | 'CANDLE'
  | 'HOLLOW_CANDLE'
  | 'BAR'
  | 'HEIKIN_ASHI'
  | 'LINE'
  | 'AREA'
  | 'BASELINE';

export interface CustomIndicatorDef {
  id: string;
  name: string;
  expression: string;
  color: string;
  pane: 'OVERLAY' | 'SEPARATE';
}

export interface TerminalPaneConfig {
  assetClass: AssetClass;
  symbol: string;
  timeframe: Timeframe;
  range: HistoricalRange;
  chartType: TerminalChartType;
  logScale: boolean;
}

interface TerminalChartPaneProps {
  config: TerminalPaneConfig;
  onConfigChange: (next: TerminalPaneConfig) => void;
  activeTool: DrawingToolType;
  onToolComplete: () => void;
  customIndicators: CustomIndicatorDef[];
  activeCustomIds: string[];
  comparisonInstruments?: { assetClass: AssetClass; symbol: string; color: string }[];
  normalizedComparison?: boolean;
  height?: number;
  syncedRange?: { from: number; to: number } | null;
  onVisibleRangeChange?: (range: { from: number; to: number } | null) => void;
}

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '2h': 7200,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
  '1M': 2592000,
};

export const TerminalChartPane: React.FC<TerminalChartPaneProps> = ({
  config,
  onConfigChange,
  activeTool,
  onToolComplete,
  customIndicators,
  activeCustomIds,
  comparisonInstruments = [],
  normalizedComparison = false,
  height = 460,
  syncedRange,
  onVisibleRangeChange,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const subPaneRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const ct = getLightweightChartTheme(resolvedTheme);
    chartRef.current.applyOptions({
      layout: ct.layout,
      grid: ct.grid,
      rightPriceScale: { borderColor: ct.borderColor },
      timeScale: { borderColor: ct.borderColor },
    });
  }, [resolvedTheme]);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<any> | null>(null);

  const [candles, setCandles] = useState<NormalizedCandle[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [status, setStatus] = useState<DataFreshnessStatus>('DELAYED');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showIndMenu, setShowIndMenu] = useState(false);

  // Built-in indicators state
  const [indFlags, setIndFlags] = useState<Record<string, boolean>>({
    sma: true,
    ema: false,
    wma: false,
    vwap: false,
    bollinger: false,
    ichimoku: false,
    supertrend: false,
    rsi: false,
    macd: false,
    atr: false,
    stochRsi: false,
    adx: false,
    obv: false,
    volume: true,
  });

  // Drawings state
  const [drawings, setDrawings] = useState<SavedDrawing[]>([]);
  const [pendingPoints, setPendingPoints] = useState<{ time: number; price: number }[]>([]);
  const [renderTick, setRenderTick] = useState(0);
  const [chartDims, setChartDims] = useState({ width: 0, height });

  // Comparison series data
  const [comparisonSeries, setComparisonSeries] = useState<
    { symbol: string; color: string; candles: NormalizedCandle[] }[]
  >([]);

  const activeKeyRef = useRef('');
  activeKeyRef.current = `${config.assetClass}:${config.symbol}:${config.timeframe}:${config.range}`;

  // Fetch candles & quote
  useEffect(() => {
    const controller = new AbortController();
    const reqKey = `${config.assetClass}:${config.symbol}:${config.timeframe}:${config.range}`;
    setLoading(true);
    setCandles([]);

    Promise.all([
      api.markets.getQuote(config.assetClass, config.symbol, controller.signal),
      api.markets.getCandles(
        config.assetClass,
        config.symbol,
        { timeframe: config.timeframe, range: config.range, limit: 350 },
        controller.signal
      ),
    ]).then(([qRes, cRes]) => {
      if (controller.signal.aborted || activeKeyRef.current !== reqKey) return;
      if (qRes.success && qRes.data?.quote) {
        setLivePrice(qRes.data.quote.price ?? null);
      }
      if (cRes.success && cRes.data) {
        setCandles(cRes.data.candles || []);
        setStatus(cRes.data.status || 'UNAVAILABLE');
        setSource(cRes.data.source || '');
      }
      setLoading(false);
    });

    return () => controller.abort();
  }, [config.assetClass, config.symbol, config.timeframe, config.range]);

  // Fetch comparison instruments if enabled
  useEffect(() => {
    if (!normalizedComparison || comparisonInstruments.length === 0) {
      setComparisonSeries([]);
      return;
    }
    const controller = new AbortController();
    Promise.all(
      comparisonInstruments.map(async (ci) => {
        const res = await api.markets.getCandles(
          ci.assetClass,
          ci.symbol,
          { timeframe: config.timeframe, range: config.range, limit: 350 },
          controller.signal
        );
        return {
          symbol: ci.symbol,
          color: ci.color,
          candles: res.success && res.data?.candles ? (res.data.candles as NormalizedCandle[]) : [],
        };
      })
    ).then((list) => {
      if (!controller.signal.aborted) setComparisonSeries(list);
    });
    return () => controller.abort();
  }, [comparisonInstruments, normalizedComparison, config.timeframe, config.range]);

  // Load persisted drawings for user + instrument
  useEffect(() => {
    api.charts.listDrawings(config.assetClass, config.symbol).then((res) => {
      if (res.success && res.data?.drawings) {
        setDrawings(res.data.drawings);
      }
    });
  }, [config.assetClass, config.symbol]);

  // WebSocket live updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let disposed = false;
    let timer: number | null = null;
    let backoff = 1000;
    const expectedPrefix = `${config.assetClass}:${config.symbol}:`;

    const connect = () => {
      if (disposed) return;
      ws = new WebSocket(api.markets.getWsUrl(config.assetClass, config.symbol));
      ws.onopen = () => {
        backoff = 1000;
      };
      ws.onmessage = (evt) => {
        if (disposed || !activeKeyRef.current.startsWith(expectedPrefix)) return;
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'TICK' && msg.candle) {
            setLivePrice(msg.price);
            setStatus(msg.status);
            setSource(msg.source);
            const bucketSec = TIMEFRAME_SECONDS[config.timeframe] || 60;
            const bucketTime = Math.floor(msg.candle.time / bucketSec) * bucketSec;
            if (mainSeriesRef.current && !normalizedComparison) {
              setCandles((prev) => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                const nextCandle: NormalizedCandle =
                  last.time === bucketTime
                    ? {
                        time: bucketTime,
                        open: last.open,
                        high: Math.max(last.high, msg.price),
                        low: Math.min(last.low, msg.price),
                        close: msg.price,
                        volume: last.volume + (msg.candle.volume || 0) * 0.01,
                      }
                    : {
                        time: bucketTime,
                        open: msg.price,
                        high: msg.price,
                        low: msg.price,
                        close: msg.price,
                        volume: msg.candle.volume || 0,
                      };
                if (config.chartType === 'LINE' || config.chartType === 'AREA' || config.chartType === 'BASELINE') {
                  mainSeriesRef.current?.update({ time: bucketTime as UTCTimestamp, value: nextCandle.close });
                } else if (config.chartType !== 'HEIKIN_ASHI') {
                  mainSeriesRef.current?.update({
                    time: bucketTime as UTCTimestamp,
                    open: nextCandle.open,
                    high: nextCandle.high,
                    low: nextCandle.low,
                    close: nextCandle.close,
                  });
                }
                return last.time === bucketTime ? [...prev.slice(0, -1), nextCandle] : [...prev, nextCandle];
              });
            }
          } else if (msg.type === 'QUOTE_UPDATE' && msg.price) {
            setLivePrice(msg.price);
            setStatus(msg.status);
          }
        } catch {
          // Ignore keepalive frames
        }
      };
      ws.onclose = () => {
        if (!disposed) {
          if (config.assetClass === 'CRYPTO') setStatus('CONNECTION_LOST');
          timer = window.setTimeout(() => {
            backoff = Math.min(backoff * 2, 30000);
            connect();
          }, backoff);
        }
      };
    };
    connect();
    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
      ws?.close();
    };
  }, [config.assetClass, config.symbol, config.timeframe, config.chartType, normalizedComparison]);

  const displayCandles = useMemo(() => {
    if (config.chartType === 'HEIKIN_ASHI') return computeHeikinAshi(candles);
    return candles;
  }, [candles, config.chartType]);

  // Build main chart
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || displayCandles.length === 0) return;

    const ct = getLightweightChartTheme(resolvedTheme);
    const chart = createChart(el, {
      layout: {
        ...ct.layout,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
      },
      grid: ct.grid,
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: ct.borderColor,
        mode: config.logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
        autoScale: true,
      },
      timeScale: {
        borderColor: '#223142',
        timeVisible: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h'].includes(config.timeframe),
      },
      width: el.clientWidth,
      height,
    });
    chartRef.current = chart;
    setChartDims({ width: el.clientWidth, height });

    let mainSeries: ISeriesApi<any>;

    if (normalizedComparison) {
      const base = displayCandles[0].close || 1;
      mainSeries = chart.addSeries(LineSeries, {
        color: '#45D6B5',
        lineWidth: 2,
        title: `${config.symbol} (%)`,
      });
      mainSeries.setData(
        displayCandles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: Number((((c.close - base) / base) * 100).toFixed(2)),
        }))
      );
      for (const comp of comparisonSeries) {
        if (comp.candles.length === 0) continue;
        const cBase = comp.candles[0].close || 1;
        const cs = chart.addSeries(LineSeries, {
          color: comp.color,
          lineWidth: 2,
          title: `${comp.symbol} (%)`,
        });
        cs.setData(
          comp.candles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: Number((((c.close - cBase) / cBase) * 100).toFixed(2)),
          }))
        );
      }
    } else if (config.chartType === 'HOLLOW_CANDLE') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: 'transparent',
        downColor: '#F16D75',
        borderUpColor: '#45D6B5',
        borderDownColor: '#F16D75',
        wickUpColor: '#45D6B5',
        wickDownColor: '#F16D75',
      });
      mainSeries.setData(
        displayCandles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else if (config.chartType === 'BAR') {
      mainSeries = chart.addSeries(BarSeries, {
        upColor: '#45D6B5',
        downColor: '#F16D75',
      });
      mainSeries.setData(
        displayCandles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else if (config.chartType === 'LINE') {
      mainSeries = chart.addSeries(LineSeries, { color: '#78A9FF', lineWidth: 2 });
      mainSeries.setData(displayCandles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
    } else if (config.chartType === 'AREA') {
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#45D6B5',
        topColor: 'rgba(69, 214, 181, 0.28)',
        bottomColor: 'rgba(69, 214, 181, 0.02)',
      });
      mainSeries.setData(displayCandles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
    } else if (config.chartType === 'BASELINE') {
      const baseVal = displayCandles[0].close;
      mainSeries = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: baseVal },
        topLineColor: '#45D6B5',
        bottomLineColor: '#F16D75',
      });
      mainSeries.setData(displayCandles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
    } else {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#45D6B5',
        downColor: '#F16D75',
        borderVisible: false,
        wickUpColor: '#45D6B5',
        wickDownColor: '#F16D75',
      });
      mainSeries.setData(
        displayCandles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    }
    mainSeriesRef.current = mainSeries;

    if (!normalizedComparison) {
      if (indFlags.volume) {
        const vs = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' });
        vs.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        vs.setData(
          displayCandles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(69, 214, 181, 0.3)' : 'rgba(241, 109, 117, 0.3)',
          }))
        );
        volSeriesRef.current = vs;
      }
      if (indFlags.sma) {
        const s = chart.addSeries(LineSeries, { color: '#F5B942', lineWidth: 1, title: 'SMA 20' });
        s.setData(calculateSMA(candles, 20).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      }
      if (indFlags.ema) {
        const s = chart.addSeries(LineSeries, { color: '#78A9FF', lineWidth: 1, title: 'EMA 20' });
        s.setData(calculateEMA(candles, 20).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      }
      if (indFlags.wma) {
        const s = chart.addSeries(LineSeries, { color: '#38BDF8', lineWidth: 1, title: 'WMA 20' });
        s.setData(calculateWMA(candles, 20).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      }
      if (indFlags.vwap) {
        const s = chart.addSeries(LineSeries, { color: '#C084FC', lineWidth: 1, title: 'VWAP' });
        s.setData(calculateVWAP(candles).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      }
      if (indFlags.bollinger) {
        const bb = calculateBollingerBands(candles, 20, 2);
        const u = chart.addSeries(LineSeries, { color: 'rgba(120,169,255,0.65)', lineWidth: 1, lineStyle: 2 });
        const l = chart.addSeries(LineSeries, { color: 'rgba(120,169,255,0.65)', lineWidth: 1, lineStyle: 2 });
        u.setData(bb.map((p) => ({ time: p.time as UTCTimestamp, value: p.upper })));
        l.setData(bb.map((p) => ({ time: p.time as UTCTimestamp, value: p.lower })));
      }
      if (indFlags.ichimoku) {
        const ich = calculateIchimoku(candles);
        const t = chart.addSeries(LineSeries, { color: '#22D3EE', lineWidth: 1, title: 'Tenkan' });
        const k = chart.addSeries(LineSeries, { color: '#F97316', lineWidth: 1, title: 'Kijun' });
        t.setData(ich.map((p) => ({ time: p.time as UTCTimestamp, value: p.tenkan })));
        k.setData(ich.map((p) => ({ time: p.time as UTCTimestamp, value: p.kijun })));
      }
      if (indFlags.supertrend) {
        const st = calculateSupertrend(candles, 10, 3);
        const s = chart.addSeries(LineSeries, { color: '#10B981', lineWidth: 2, title: 'Supertrend' });
        s.setData(st.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      }
      // Custom Overlay Indicators
      for (const ci of customIndicators) {
        if (!activeCustomIds.includes(ci.id) || ci.pane !== 'OVERLAY') continue;
        try {
          const pts = evaluateCustomIndicator(ci.expression, candles);
          const s = chart.addSeries(LineSeries, { color: ci.color || '#F5B942', lineWidth: 2, title: ci.name });
          s.setData(pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        } catch {
          // Invalid custom expression safely ignored
        }
      }
    }

    chart.timeScale().fitContent();
    chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      setRenderTick((t) => t + 1);
      if (onVisibleRangeChange && r) {
        onVisibleRangeChange({ from: r.from, to: r.to });
      }
    });

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
        setChartDims({ width: entry.contentRect.width, height });
        setRenderTick((t) => t + 1);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
    };
  }, [
    displayCandles,
    candles,
    config.chartType,
    config.logScale,
    config.timeframe,
    config.symbol,
    indFlags,
    customIndicators,
    activeCustomIds,
    comparisonSeries,
    normalizedComparison,
    height,
  ]);

  // Apply synced visible range from peer chart
  useEffect(() => {
    if (syncedRange && chartRef.current) {
      try {
        chartRef.current.timeScale().setVisibleLogicalRange(syncedRange);
      } catch {
        // Ignore if range out of bounds
      }
    }
  }, [syncedRange]);

  // Oscillator Sub-pane (RSI / MACD / ATR / StochRSI / ADX / OBV / Custom Separate)
  const activeOscillator = useMemo(() => {
    if (indFlags.rsi) return 'RSI';
    if (indFlags.macd) return 'MACD';
    if (indFlags.atr) return 'ATR';
    if (indFlags.stochRsi) return 'STOCH_RSI';
    if (indFlags.adx) return 'ADX';
    if (indFlags.obv) return 'OBV';
    const customSep = customIndicators.find((ci) => activeCustomIds.includes(ci.id) && ci.pane === 'SEPARATE');
    return customSep ? `CUSTOM:${customSep.id}` : null;
  }, [indFlags, customIndicators, activeCustomIds]);

  useEffect(() => {
    const el = subPaneRef.current;
    if (!el || !activeOscillator || candles.length === 0) return;

    const sub = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B1017' },
        textColor: '#93A2B4',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
      },
      grid: { vertLines: { color: 'rgba(34,49,66,0.3)' }, horzLines: { color: 'rgba(34,49,66,0.3)' } },
      rightPriceScale: { borderColor: '#223142' },
      timeScale: { borderColor: '#223142' },
      width: el.clientWidth,
      height: 120,
    });

    if (activeOscillator === 'RSI') {
      const s = sub.addSeries(LineSeries, { color: '#F5B942', lineWidth: 2, title: 'RSI (14)' });
      s.setData(calculateRSI(candles, 14).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    } else if (activeOscillator === 'MACD') {
      const macd = calculateMACD(candles);
      const h = sub.addSeries(HistogramSeries);
      h.setData(macd.map((p) => ({ time: p.time as UTCTimestamp, value: p.histogram, color: p.histogram >= 0 ? 'rgba(69,214,181,0.5)' : 'rgba(241,109,117,0.5)' })));
      const m = sub.addSeries(LineSeries, { color: '#78A9FF', lineWidth: 1 });
      const sg = sub.addSeries(LineSeries, { color: '#F5B942', lineWidth: 1 });
      m.setData(macd.map((p) => ({ time: p.time as UTCTimestamp, value: p.macd })));
      sg.setData(macd.map((p) => ({ time: p.time as UTCTimestamp, value: p.signal })));
    } else if (activeOscillator === 'ATR') {
      const s = sub.addSeries(LineSeries, { color: '#FB7185', lineWidth: 2, title: 'ATR (14)' });
      s.setData(calculateATR(candles, 14).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    } else if (activeOscillator === 'STOCH_RSI') {
      const st = calculateStochasticRSI(candles);
      const k = sub.addSeries(LineSeries, { color: '#45D6B5', lineWidth: 1, title: '%K' });
      const d = sub.addSeries(LineSeries, { color: '#F5B942', lineWidth: 1, title: '%D' });
      k.setData(st.map((p) => ({ time: p.time as UTCTimestamp, value: p.k })));
      d.setData(st.map((p) => ({ time: p.time as UTCTimestamp, value: p.d })));
    } else if (activeOscillator === 'ADX') {
      const s = sub.addSeries(LineSeries, { color: '#38BDF8', lineWidth: 2, title: 'ADX (14)' });
      s.setData(calculateADX(candles, 14).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    } else if (activeOscillator === 'OBV') {
      const s = sub.addSeries(LineSeries, { color: '#A78BFA', lineWidth: 2, title: 'OBV' });
      s.setData(calculateOBV(candles).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    } else if (activeOscillator.startsWith('CUSTOM:')) {
      const cid = activeOscillator.replace('CUSTOM:', '');
      const ci = customIndicators.find((c) => c.id === cid);
      if (ci) {
        try {
          const pts = evaluateCustomIndicator(ci.expression, candles);
          const s = sub.addSeries(LineSeries, { color: ci.color || '#F5B942', lineWidth: 2, title: ci.name });
          s.setData(pts.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        } catch {
          // Ignore invalid expression
        }
      }
    }

    sub.timeScale().fitContent();
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) sub.applyOptions({ width: e.contentRect.width });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      sub.remove();
    };
  }, [activeOscillator, candles, customIndicators]);

  // Handle click on chart to place drawings
  const handleChartClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool === 'NONE' || !chartRef.current || !mainSeriesRef.current || !wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const time = chartRef.current.timeScale().coordinateToTime(x);
      const price = mainSeriesRef.current.coordinateToPrice(y);
      if (time === null || price === null) return;

      const pt = { time: Number(time), price: Number(price.toFixed(4)) };
      const singleClickTools: DrawingToolType[] = ['HORIZONTAL', 'VERTICAL', 'PRICE_LABEL'];

      if (singleClickTools.includes(activeTool)) {
        const res = await api.charts.createDrawing({
          asset_class: config.assetClass,
          symbol: config.symbol,
          tool_type: activeTool,
          points: [pt],
        });
        if (res.success && res.data?.drawing) {
          setDrawings((prev) => [...prev, res.data.drawing]);
        }
        setPendingPoints([]);
        onToolComplete();
        return;
      }

      if (pendingPoints.length === 0) {
        setPendingPoints([pt]);
      } else {
        const pts = [pendingPoints[0], pt];
        const res = await api.charts.createDrawing({
          asset_class: config.assetClass,
          symbol: config.symbol,
          tool_type: activeTool,
          points: pts,
        });
        if (res.success && res.data?.drawing) {
          setDrawings((prev) => [...prev, res.data.drawing]);
        }
        setPendingPoints([]);
        onToolComplete();
      }
    },
    [activeTool, pendingPoints, config.assetClass, config.symbol, onToolComplete]
  );

  const handleDeleteDrawing = async (id: string) => {
    const res = await api.charts.deleteDrawing(id);
    if (res.success) setDrawings((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden flex flex-col">
      {/* Pane Header */}
      <div className="px-3 py-2 border-b border-border/80 bg-surface-elevated/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="px-2.5 py-1 rounded-lg bg-background border border-border hover:border-primary/50 text-xs font-mono font-bold text-text-primary flex items-center gap-2"
          >
            <span>{config.symbol}</span>
            <span className="text-[10px] text-text-muted">{config.assetClass}</span>
          </button>

          {livePrice !== null && (
            <span className="font-mono font-bold text-xs text-primary">
              {formatInstrumentPrice(livePrice, config.assetClass)}
            </span>
          )}
          <FreshnessBadge status={status} source={source} compact />

          {searchOpen && (
            <div className="absolute left-0 top-9 w-80 rounded-xl border border-border bg-surface-elevated p-2 shadow-2xl z-40">
              <InstrumentSearchInput
                placeholder="Search symbol (RELIANCE, BTC, EURUSD)..."
                onSelect={(r) => {
                  onConfigChange({ ...config, assetClass: r.assetClass, symbol: r.symbol });
                  setSearchOpen(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Unified Chart Controls: Interval + Range + Chart Type + Scale + Indicators */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            aria-label="Candle interval"
            value={config.timeframe}
            onChange={(e) => onConfigChange({ ...config, timeframe: e.target.value as Timeframe })}
            className="bg-background border border-border rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-text-primary"
          >
            {SUPPORTED_TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>

          <select
            aria-label="Historical range"
            value={config.range}
            onChange={(e) => onConfigChange({ ...config, range: e.target.value as HistoricalRange })}
            className="bg-background border border-border rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-primary"
          >
            {SUPPORTED_RANGES.map((r) => (
              <option key={r} value={r}>
                Range: {r}
              </option>
            ))}
          </select>
          <select
            value={config.chartType}
            onChange={(e) => onConfigChange({ ...config, chartType: e.target.value as TerminalChartType })}
            className="bg-background border border-border rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary"
          >
            <option value="CANDLE">Candlestick</option>
            <option value="HOLLOW_CANDLE">Hollow Candle</option>
            <option value="HEIKIN_ASHI">Heikin-Ashi</option>
            <option value="BAR">OHLC Bar</option>
            <option value="LINE">Line</option>
            <option value="AREA">Area</option>
            <option value="BASELINE">Baseline</option>
          </select>

          <button
            onClick={() => onConfigChange({ ...config, logScale: !config.logScale })}
            className={`px-2 py-1 rounded-lg text-[11px] font-mono border ${
              config.logScale ? 'bg-primary/15 text-primary border-primary/30' : 'bg-background text-text-muted border-border'
            }`}
          >
            LOG
          </button>

          <div className="relative">
            <button
              onClick={() => setShowIndMenu((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background text-[11px] text-text-secondary hover:text-text-primary"
            >
              <SlidersHorizontal size={12} /> Indicators
            </button>
            {showIndMenu && (
              <div className="absolute right-0 top-8 w-72 rounded-xl border border-border bg-surface-elevated p-3 shadow-2xl z-40 space-y-2 text-xs max-h-96 overflow-y-auto">
                <div className="text-[10px] font-mono uppercase text-text-muted">Presets</div>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(INDICATOR_PRESETS) as IndicatorPresetName[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setIndFlags({ volume: true, ...INDICATOR_PRESETS[p].flags })}
                      className="px-2 py-0.5 rounded bg-background border border-border text-[10px] hover:border-primary/50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-mono uppercase text-text-muted pt-1">Built-In</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.keys(indFlags).map((k) => (
                    <label key={k} className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={indFlags[k]}
                        onChange={(e) => setIndFlags((prev) => ({ ...prev, [k]: e.target.checked }))}
                      />
                      <span className="uppercase font-mono">{k}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {drawings.length > 0 && (
            <button
              onClick={() => handleDeleteDrawing(drawings[drawings.length - 1].id)}
              className="px-2 py-1 rounded-lg border border-border text-[11px] font-mono text-danger hover:bg-danger/10 inline-flex items-center gap-1"
              title="Undo last drawing"
            >
              <Trash2 size={11} /> Undo ({drawings.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Chart + Drawing SVG Overlay */}
      <div
        className={`relative bg-[#0B1017] ${activeTool !== 'NONE' ? 'cursor-crosshair' : ''}`}
        onClick={handleChartClick}
      >
        {loading && candles.length === 0 ? (
          <div style={{ height }} className="flex items-center justify-center text-xs font-mono text-text-muted">
            Loading {config.symbol} ({config.timeframe})...
          </div>
        ) : (
          <div ref={wrapRef} className="w-full" style={{ height }} />
        )}
        <ChartDrawingOverlay
          chart={chartRef.current}
          series={mainSeriesRef.current}
          drawings={drawings}
          pendingPoints={pendingPoints}
          activeTool={activeTool}
          width={chartDims.width}
          height={chartDims.height}
          renderTick={renderTick}
        />
      </div>

      {/* Oscillator Sub-pane */}
      {activeOscillator && (
        <div className="border-t border-border/60 bg-[#0B1017]">
          <div className="px-3 py-0.5 text-[10px] font-mono text-secondary">{activeOscillator}</div>
          <div ref={subPaneRef} className="w-full" />
        </div>
      )}

      {/* Clean Attribution Footer (No competing range buttons below the chart axis) */}
      <div className="px-3 py-1.5 border-t border-border/60 bg-surface-elevated/40 flex items-center justify-between text-[10px] text-text-muted font-mono">
        <span>
          {config.timeframe} interval • {config.range} range
        </span>
        <span>TradingView Lightweight Charts™</span>
      </div>
    </div>
  );
};
