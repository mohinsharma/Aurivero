import { NormalizedCandle } from '../types/markets';

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface BollingerPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateSMA(candles: NormalizedCandle[], period = 20): IndicatorPoint[] {
  if (period <= 0 || candles.length < period) return [];
  const result: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      result.push({
        time: candles[i].time,
        value: Number((sum / period).toFixed(6)),
      });
    }
  }
  return result;
}

export function calculateEMA(candles: NormalizedCandle[], period = 20): IndicatorPoint[] {
  if (period <= 0 || candles.length < period) return [];
  const k = 2 / (period + 1);
  const result: IndicatorPoint[] = [];

  let seed = 0;
  for (let i = 0; i < period; i++) {
    seed += candles[i].close;
  }
  let ema = seed / period;
  result.push({ time: candles[period - 1].time, value: Number(ema.toFixed(6)) });

  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result.push({ time: candles[i].time, value: Number(ema.toFixed(6)) });
  }
  return result;
}

export function calculateBollingerBands(
  candles: NormalizedCandle[],
  period = 20,
  stdDevMult = 2
): BollingerPoint[] {
  if (period <= 1 || candles.length < period) return [];
  const result: BollingerPoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((acc, c) => acc + c.close, 0) / period;
    const variance =
      slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    result.push({
      time: candles[i].time,
      upper: Number((mean + stdDevMult * sd).toFixed(6)),
      middle: Number(mean.toFixed(6)),
      lower: Number((mean - stdDevMult * sd).toFixed(6)),
    });
  }
  return result;
}

export function calculateRSI(candles: NormalizedCandle[], period = 14): IndicatorPoint[] {
  if (period <= 0 || candles.length <= period) return [];
  const result: IndicatorPoint[] = [];

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const pushRsi = (idx: number, g: number, l: number) => {
    const rs = l === 0 ? 100 : g / l;
    const rsi = l === 0 ? 100 : 100 - 100 / (1 + rs);
    result.push({ time: candles[idx].time, value: Number(rsi.toFixed(2)) });
  };

  pushRsi(period, avgGain, avgLoss);

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    pushRsi(i, avgGain, avgLoss);
  }
  return result;
}

export function calculateMACD(
  candles: NormalizedCandle[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MACDPoint[] {
  if (candles.length < slow + signalPeriod) return [];
  const fastEma = calculateEMA(candles, fast);
  const slowEma = calculateEMA(candles, slow);

  const fastByTime = new Map(fastEma.map((p) => [p.time, p.value]));
  const macdSeries: IndicatorPoint[] = [];
  for (const s of slowEma) {
    const f = fastByTime.get(s.time);
    if (f !== undefined) {
      macdSeries.push({ time: s.time, value: f - s.value });
    }
  }
  if (macdSeries.length < signalPeriod) return [];

  const k = 2 / (signalPeriod + 1);
  let sig =
    macdSeries.slice(0, signalPeriod).reduce((acc, p) => acc + p.value, 0) /
    signalPeriod;

  const result: MACDPoint[] = [
    {
      time: macdSeries[signalPeriod - 1].time,
      macd: Number(macdSeries[signalPeriod - 1].value.toFixed(6)),
      signal: Number(sig.toFixed(6)),
      histogram: Number((macdSeries[signalPeriod - 1].value - sig).toFixed(6)),
    },
  ];

  for (let i = signalPeriod; i < macdSeries.length; i++) {
    const m = macdSeries[i].value;
    sig = m * k + sig * (1 - k);
    result.push({
      time: macdSeries[i].time,
      macd: Number(m.toFixed(6)),
      signal: Number(sig.toFixed(6)),
      histogram: Number((m - sig).toFixed(6)),
    });
  }
  return result;
}

export function calculateVWAP(candles: NormalizedCandle[]): IndicatorPoint[] {
  if (candles.length === 0) return [];
  const result: IndicatorPoint[] = [];
  let cumPV = 0;
  let cumVol = 0;
  for (const c of candles) {
    const vol = c.volume > 0 ? c.volume : 0;
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * vol;
    cumVol += vol;
    if (cumVol > 0) {
      result.push({
        time: c.time,
        value: Number((cumPV / cumVol).toFixed(6)),
      });
    }
  }
  return result;
}
