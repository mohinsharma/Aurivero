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

export interface IchimokuPoint {
  time: number;
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
}

export interface SupertrendPoint {
  time: number;
  value: number;
  direction: 1 | -1;
}

export function calculateSMA(candles: NormalizedCandle[], period = 20): IndicatorPoint[] {
  if (period <= 0 || candles.length < period) return [];
  const result: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      result.push({ time: candles[i].time, value: Number((sum / period).toFixed(6)) });
    }
  }
  return result;
}

export function calculateEMA(candles: NormalizedCandle[], period = 20): IndicatorPoint[] {
  if (period <= 0 || candles.length < period) return [];
  const k = 2 / (period + 1);
  const result: IndicatorPoint[] = [];
  let seed = 0;
  for (let i = 0; i < period; i++) seed += candles[i].close;
  let ema = seed / period;
  result.push({ time: candles[period - 1].time, value: Number(ema.toFixed(6)) });
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result.push({ time: candles[i].time, value: Number(ema.toFixed(6)) });
  }
  return result;
}

export function calculateWMA(candles: NormalizedCandle[], period = 20): IndicatorPoint[] {
  if (period <= 0 || candles.length < period) return [];
  const result: IndicatorPoint[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < candles.length; i++) {
    let weighted = 0;
    for (let j = 0; j < period; j++) {
      weighted += candles[i - period + 1 + j].close * (j + 1);
    }
    result.push({ time: candles[i].time, value: Number((weighted / denom).toFixed(6)) });
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
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
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
    if (f !== undefined) macdSeries.push({ time: s.time, value: f - s.value });
  }
  if (macdSeries.length < signalPeriod) return [];
  const k = 2 / (signalPeriod + 1);
  let sig = macdSeries.slice(0, signalPeriod).reduce((acc, p) => acc + p.value, 0) / signalPeriod;
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
      result.push({ time: c.time, value: Number((cumPV / cumVol).toFixed(6)) });
    }
  }
  return result;
}

export function calculateATR(candles: NormalizedCandle[], period = 14): IndicatorPoint[] {
  if (period <= 0 || candles.length <= period) return [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (trs.length < period) return [];
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result: IndicatorPoint[] = [{ time: candles[period].time, value: Number(atr.toFixed(6)) }];
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    result.push({ time: candles[i + 1].time, value: Number(atr.toFixed(6)) });
  }
  return result;
}

export function calculateStochasticRSI(
  candles: NormalizedCandle[],
  rsiPeriod = 14,
  stochPeriod = 14
): { time: number; k: number; d: number }[] {
  const rsi = calculateRSI(candles, rsiPeriod);
  if (rsi.length < stochPeriod) return [];
  const rawK: IndicatorPoint[] = [];
  for (let i = stochPeriod - 1; i < rsi.length; i++) {
    const slice = rsi.slice(i - stochPeriod + 1, i + 1).map((r) => r.value);
    const minR = Math.min(...slice);
    const maxR = Math.max(...slice);
    const kVal = maxR === minR ? 50 : ((rsi[i].value - minR) / (maxR - minR)) * 100;
    rawK.push({ time: rsi[i].time, value: Number(kVal.toFixed(2)) });
  }
  const out: { time: number; k: number; d: number }[] = [];
  for (let i = 2; i < rawK.length; i++) {
    const dVal = (rawK[i].value + rawK[i - 1].value + rawK[i - 2].value) / 3;
    out.push({ time: rawK[i].time, k: rawK[i].value, d: Number(dVal.toFixed(2)) });
  }
  return out;
}

export function calculateADX(candles: NormalizedCandle[], period = 14): IndicatorPoint[] {
  if (candles.length < period * 2 + 1) return [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      )
    );
  }
  let sTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let sPlus = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let sMinus = minusDM.slice(0, period).reduce((a, b) => a + b, 0);
  const dxList: { time: number; dx: number }[] = [];
  for (let i = period; i < trs.length; i++) {
    sTR = sTR - sTR / period + trs[i];
    sPlus = sPlus - sPlus / period + plusDM[i];
    sMinus = sMinus - sMinus / period + minusDM[i];
    const pdi = sTR === 0 ? 0 : (100 * sPlus) / sTR;
    const mdi = sTR === 0 ? 0 : (100 * sMinus) / sTR;
    const denom = pdi + mdi;
    const dx = denom === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / denom;
    dxList.push({ time: candles[i + 1].time, dx });
  }
  if (dxList.length < period) return [];
  let adx = dxList.slice(0, period).reduce((a, b) => a + b.dx, 0) / period;
  const result: IndicatorPoint[] = [{ time: dxList[period - 1].time, value: Number(adx.toFixed(2)) }];
  for (let i = period; i < dxList.length; i++) {
    adx = (adx * (period - 1) + dxList[i].dx) / period;
    result.push({ time: dxList[i].time, value: Number(adx.toFixed(2)) });
  }
  return result;
}

export function calculateOBV(candles: NormalizedCandle[]): IndicatorPoint[] {
  if (candles.length === 0) return [];
  let obv = 0;
  const result: IndicatorPoint[] = [{ time: candles[0].time, value: 0 }];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) obv += candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) obv -= candles[i].volume;
    result.push({ time: candles[i].time, value: Number(obv.toFixed(2)) });
  }
  return result;
}

export function calculateIchimoku(candles: NormalizedCandle[]): IchimokuPoint[] {
  if (candles.length < 52) return [];
  const midpoint = (endIdx: number, len: number) => {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = endIdx - len + 1; j <= endIdx; j++) {
      if (candles[j].high > hi) hi = candles[j].high;
      if (candles[j].low < lo) lo = candles[j].low;
    }
    return (hi + lo) / 2;
  };
  const out: IchimokuPoint[] = [];
  for (let i = 51; i < candles.length; i++) {
    const tenkan = midpoint(i, 9);
    const kijun = midpoint(i, 26);
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = midpoint(i, 52);
    out.push({
      time: candles[i].time,
      tenkan: Number(tenkan.toFixed(6)),
      kijun: Number(kijun.toFixed(6)),
      senkouA: Number(senkouA.toFixed(6)),
      senkouB: Number(senkouB.toFixed(6)),
    });
  }
  return out;
}

export function calculateSupertrend(
  candles: NormalizedCandle[],
  period = 10,
  multiplier = 3
): SupertrendPoint[] {
  const atrList = calculateATR(candles, period);
  if (atrList.length === 0) return [];
  const atrByTime = new Map(atrList.map((a) => [a.time, a.value]));
  const out: SupertrendPoint[] = [];
  let prevUpper = 0;
  let prevLower = 0;
  let prevDir: 1 | -1 = 1;
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const atr = atrByTime.get(c.time);
    if (atr === undefined) continue;
    const hl2 = (c.high + c.low) / 2;
    let upper = hl2 + multiplier * atr;
    let lower = hl2 - multiplier * atr;
    if (out.length > 0) {
      const prevClose = candles[i - 1].close;
      if (upper > prevUpper && prevClose <= prevUpper) upper = prevUpper;
      if (lower < prevLower && prevClose >= prevLower) lower = prevLower;
    }
    let dir: 1 | -1 = prevDir;
    if (c.close > upper) dir = 1;
    else if (c.close < lower) dir = -1;
    out.push({
      time: c.time,
      value: Number((dir === 1 ? lower : upper).toFixed(6)),
      direction: dir,
    });
    prevUpper = upper;
    prevLower = lower;
    prevDir = dir;
  }
  return out;
}

export function computeHeikinAshi(candles: NormalizedCandle[]): NormalizedCandle[] {
  if (candles.length === 0) return [];
  const ha: NormalizedCandle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (ha[i - 1].open + ha[i - 1].close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    ha.push({
      time: c.time,
      open: Number(haOpen.toFixed(6)),
      high: Number(haHigh.toFixed(6)),
      low: Number(haLow.toFixed(6)),
      close: Number(haClose.toFixed(6)),
      volume: c.volume,
    });
  }
  return ha;
}

export type IndicatorPresetName =
  | 'Trend Following'
  | 'Momentum'
  | 'Volatility'
  | 'Volume Analysis'
  | 'Beginner Technical Analysis';

export const INDICATOR_PRESETS: Record<
  IndicatorPresetName,
  { description: string; flags: Record<string, boolean> }
> = {
  'Trend Following': {
    description: 'EMA 20 + Supertrend + ADX',
    flags: { ema: true, sma: false, supertrend: true, adx: true, volume: true },
  },
  Momentum: {
    description: 'RSI 14 + MACD + Stochastic RSI',
    flags: { rsi: true, macd: true, stochRsi: true, volume: true },
  },
  Volatility: {
    description: 'Bollinger Bands + ATR 14',
    flags: { bollinger: true, atr: true, volume: true },
  },
  'Volume Analysis': {
    description: 'Volume + VWAP + OBV',
    flags: { volume: true, vwap: true, obv: true },
  },
  'Beginner Technical Analysis': {
    description: 'SMA 20 + Volume + RSI 14',
    flags: { sma: true, volume: true, rsi: true },
  },
};
