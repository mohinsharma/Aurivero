import { NormalizedCandle } from '../types/markets';

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface TokenNode {
  type: 'NUM' | 'IDENT' | 'OP' | 'CMP' | 'LPAREN' | 'RPAREN' | 'COMMA';
  value: string;
}

const MAX_EXPR_LEN = 240;

export function tokenizeExpression(expr: string): TokenNode[] {
  if (expr.length > MAX_EXPR_LEN) {
    throw new Error(`Expression exceeds maximum length of ${MAX_EXPR_LEN} characters.`);
  }
  const tokens: TokenNode[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i++];
      }
      if (Number.isNaN(Number(num))) throw new Error(`Invalid number: ${num}`);
      tokens.push({ type: 'NUM', value: num });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        id += expr[i++];
      }
      tokens.push({ type: 'IDENT', value: id.toLowerCase() });
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }
    if (['+', '-', '*', '/'].includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }
    const two = expr.slice(i, i + 2);
    if (['>=', '<=', '=='].includes(two)) {
      tokens.push({ type: 'CMP', value: two });
      i += 2;
      continue;
    }
    if (ch === '>' || ch === '<') {
      tokens.push({ type: 'CMP', value: ch });
      i++;
      continue;
    }
    throw new Error(`Unsupported character '${ch}' in expression.`);
  }
  return tokens;
}

function smaSeries(arr: number[], period: number): number[] {
  const p = Math.max(1, Math.min(200, Math.round(period)));
  const out = new Array<number>(arr.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= p) sum -= arr[i - p];
    if (i >= p - 1) out[i] = sum / p;
  }
  return out;
}

function emaSeries(arr: number[], period: number): number[] {
  const p = Math.max(1, Math.min(200, Math.round(period)));
  const out = new Array<number>(arr.length).fill(NaN);
  if (arr.length < p) return out;
  const k = 2 / (p + 1);
  let sum = 0;
  for (let i = 0; i < p; i++) sum += arr[i];
  let ema = sum / p;
  out[p - 1] = ema;
  for (let i = p; i < arr.length; i++) {
    ema = arr[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

function wmaSeries(arr: number[], period: number): number[] {
  const p = Math.max(1, Math.min(200, Math.round(period)));
  const out = new Array<number>(arr.length).fill(NaN);
  const denom = (p * (p + 1)) / 2;
  for (let i = p - 1; i < arr.length; i++) {
    let weighted = 0;
    for (let j = 0; j < p; j++) {
      weighted += arr[i - p + 1 + j] * (j + 1);
    }
    out[i] = weighted / denom;
  }
  return out;
}

/**
 * Evaluates a validated custom indicator expression over historical candles
 * using a recursive-descent parser (no eval or arbitrary code execution).
 */
export function evaluateCustomIndicator(
  expression: string,
  candles: NormalizedCandle[]
): IndicatorPoint[] {
  if (!expression.trim() || candles.length === 0) return [];
  const tokens = tokenizeExpression(expression);
  let pos = 0;
  let depth = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const fields: Record<string, number[]> = {
    open: candles.map((c) => c.open),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    volume: candles.map((c) => c.volume),
    pct_change: candles.map((c, idx) =>
      idx === 0 || candles[idx - 1].close === 0
        ? 0
        : ((c.close - candles[idx - 1].close) / candles[idx - 1].close) * 100
    ),
  };

  const parseComparison = (): number[] => {
    let left = parseAddSub();
    while (peek()?.type === 'CMP') {
      const op = consume().value;
      const right = parseAddSub();
      left = left.map((lv, i) => {
        const rv = right[i];
        if (Number.isNaN(lv) || Number.isNaN(rv)) return NaN;
        if (op === '>') return lv > rv ? 1 : 0;
        if (op === '<') return lv < rv ? 1 : 0;
        if (op === '>=') return lv >= rv ? 1 : 0;
        if (op === '<=') return lv <= rv ? 1 : 0;
        return lv === rv ? 1 : 0;
      });
    }
    return left;
  };

  const parseAddSub = (): number[] => {
    let left = parseMulDiv();
    while (peek()?.type === 'OP' && (peek()!.value === '+' || peek()!.value === '-')) {
      const op = consume().value;
      const right = parseMulDiv();
      left = left.map((lv, i) => (op === '+' ? lv + right[i] : lv - right[i]));
    }
    return left;
  };

  const parseMulDiv = (): number[] => {
    let left = parsePrimary();
    while (peek()?.type === 'OP' && (peek()!.value === '*' || peek()!.value === '/')) {
      const op = consume().value;
      const right = parsePrimary();
      left = left.map((lv, i) => {
        if (op === '*') return lv * right[i];
        return right[i] === 0 ? NaN : lv / right[i];
      });
    }
    return left;
  };

  const parsePrimary = (): number[] => {
    depth++;
    if (depth > 32) throw new Error('Expression nesting too deep.');
    try {
      const tok = peek();
      if (!tok) throw new Error('Unexpected end of expression.');

      if (tok.type === 'OP' && tok.value === '-') {
        consume();
        return parsePrimary().map((v) => -v);
      }

      if (tok.type === 'NUM') {
        consume();
        const val = Number(tok.value);
        return new Array<number>(candles.length).fill(val);
      }

      if (tok.type === 'LPAREN') {
        consume();
        const inner = parseComparison();
        if (peek()?.type !== 'RPAREN') throw new Error('Expected closing parenthesis.');
        consume();
        return inner;
      }

      if (tok.type === 'IDENT') {
        consume();
        const name = tok.value;
        if (peek()?.type === 'LPAREN') {
          consume();
          const args: number[][] = [];
          if (peek()?.type !== 'RPAREN') {
            args.push(parseComparison());
            while (peek()?.type === 'COMMA') {
              consume();
              args.push(parseComparison());
            }
          }
          if (peek()?.type !== 'RPAREN') throw new Error(`Expected ')' after ${name} arguments.`);
          consume();

          if (name === 'sma' && args.length === 2) return smaSeries(args[0], args[1][args[1].length - 1]);
          if (name === 'ema' && args.length === 2) return emaSeries(args[0], args[1][args[1].length - 1]);
          if (name === 'wma' && args.length === 2) return wmaSeries(args[0], args[1][args[1].length - 1]);
          if (name === 'abs' && args.length === 1) return args[0].map((v) => Math.abs(v));
          if (name === 'min' && args.length === 2) return args[0].map((v, i) => Math.min(v, args[1][i]));
          if (name === 'max' && args.length === 2) return args[0].map((v, i) => Math.max(v, args[1][i]));
          if (name === 'if' && args.length === 3) {
            return args[0].map((cond, i) => (cond ? args[1][i] : args[2][i]));
          }
          throw new Error(`Unsupported function or arity: ${name}`);
        }

        if (fields[name]) return fields[name];
        throw new Error(`Unknown field '${name}'. Allowed: open, high, low, close, volume, pct_change.`);
      }

      throw new Error(`Unexpected token '${tok.value}'.`);
    } finally {
      depth--;
    }
  };

  const series = parseComparison();
  if (pos < tokens.length) {
    throw new Error(`Unexpected trailing token '${tokens[pos].value}'.`);
  }

  const points: IndicatorPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    const v = series[i];
    if (Number.isFinite(v)) {
      points.push({ time: candles[i].time, value: Number(v.toFixed(6)) });
    }
  }
  return points;
}
