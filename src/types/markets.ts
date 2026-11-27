export type DataFreshnessStatus =
  | 'LIVE'
  | 'DELAYED'
  | 'CACHED'
  | 'MARKET_CLOSED'
  | 'UNAVAILABLE';

export type AssetClass = 'STOCK' | 'CRYPTO' | 'FOREX';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export const SUPPORTED_TIMEFRAMES: Timeframe[] = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
];

export interface InstrumentMeta {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  sectorOrCategory?: string | null;
  isIndex?: boolean;
  providerSymbol: string;
  description?: string | null;
  extra?: Record<string, any>;
}

export interface NormalizedQuote {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  price?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  previousClose?: number | null;
  change?: number | null;
  changePercent?: number | null;
  volume?: number | null;
  marketCap?: number | null;
  high52w?: number | null;
  low52w?: number | null;
  bid?: number | null;
  ask?: number | null;
  pipMovement?: number | null;
  marketSession?: string | null;
  sparkline?: number[];
  extra?: Record<string, any>;

  // Data Freshness Contract
  source: string;
  retrievedAt: string;
  providerTimestamp?: string | null;
  status: DataFreshnessStatus;
  delaySeconds?: number | null;
  warning?: string | null;
}

export interface NormalizedCandle {
  time: number; // Unix seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleSeriesResponse {
  symbol: string;
  assetClass: AssetClass;
  timeframe: Timeframe;
  exchange: string;
  currency: string;
  candles: NormalizedCandle[];
  hasMore: boolean;
  oldestTimestamp?: number | null;

  // Data Freshness Contract
  source: string;
  retrievedAt: string;
  providerTimestamp?: string | null;
  status: DataFreshnessStatus;
  delaySeconds?: number | null;
  warning?: string | null;
}

export interface MarketOverviewData {
  indices: NormalizedQuote[];
  stocks: {
    topGainers: NormalizedQuote[];
    topLosers: NormalizedQuote[];
    mostActive: NormalizedQuote[];
    all: NormalizedQuote[];
  };
  crypto: {
    trending: NormalizedQuote[];
    all: NormalizedQuote[];
  };
  forex: {
    popular: NormalizedQuote[];
  };
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  asset_class: AssetClass;
  symbol: string;
  exchange: string;
  name: string;
  sort_order: number;
  target_price?: number | null;
  alert_enabled: number;
  notes?: string | null;
  created_at: string;
  quote?: NormalizedQuote | null;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  items: WatchlistItem[];
}

export interface ProviderHealth {
  provider: string;
  assetClass: AssetClass;
  healthy: boolean;
  latencyMs?: number | null;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastError?: string | null;
  supportsStreaming: boolean;
  checkedAt: string;
}
