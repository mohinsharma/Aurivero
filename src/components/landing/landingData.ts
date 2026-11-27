export type TickerKey = 'BTC/USD' | 'AAPL' | 'NIFTY 50';

export interface SignalRow {
  symbol: string;
  assetClass: string;
  side: 'LONG' | 'SHORT';
  entry: string;
  mark: string;
  pnl: string;
  positive: boolean;
  status: 'Filled' | 'Active' | 'Stop Triggered';
}

export interface TickerMockData {
  key: TickerKey;
  name: string;
  exchange: string;
  price: string;
  change: string;
  positive: boolean;
  dayHigh: string;
  dayLow: string;
  volume: string;
  disciplineScore: string;
  linePoints: string;
  areaPath: string;
  timeLabels: string[];
  signals: SignalRow[];
}

export const HERO_TICKERS: Record<TickerKey, TickerMockData> = {
  'BTC/USD': {
    key: 'BTC/USD',
    name: 'Bitcoin (INR Equivalent)',
    exchange: 'CRYPTO SPOT',
    price: '₹79,19,550.00',
    change: '+3.42%',
    positive: true,
    dayHigh: '₹79,90,080.00',
    dayLow: '₹76,30,600.00',
    volume: '₹3,510B',
    disciplineScore: '94 / 100',
    linePoints: '0,128 45,116 90,122 135,96 180,104 225,78 270,84 315,56 360,62 405,36 450,42 500,18',
    areaPath:
      'M0,128 L45,116 L90,122 L135,96 L180,104 L225,78 L270,84 L315,56 L360,62 L405,36 L450,42 L500,18 L500,160 L0,160 Z',
    timeLabels: ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'],
    signals: [
      {
        symbol: 'BTC/USD',
        assetClass: 'Crypto',
        side: 'LONG',
        entry: '₹76,79,280.00',
        mark: '₹79,19,550.00',
        pnl: '+₹2,40,270',
        positive: true,
        status: 'Active',
      },
      {
        symbol: 'ETH/USD',
        assetClass: 'Crypto',
        side: 'LONG',
        entry: '₹2,75,860.00',
        mark: '₹2,84,880.00',
        pnl: '+₹90,200',
        positive: true,
        status: 'Filled',
      },
      {
        symbol: 'SOL/USD',
        assetClass: 'Crypto',
        side: 'SHORT',
        entry: '₹18,345.00',
        mark: '₹18,576.00',
        pnl: '-₹23,100',
        positive: false,
        status: 'Stop Triggered',
      },
    ],
  },
  AAPL: {
    key: 'AAPL',
    name: 'Apple Inc. (INR Equivalent)',
    exchange: 'NASDAQ',
    price: '₹19,894.50',
    change: '+1.86%',
    positive: true,
    dayHigh: '₹20,000.40',
    dayLow: '₹19,525.80',
    volume: '52.4M',
    disciplineScore: '96 / 100',
    linePoints: '0,120 45,124 90,104 135,108 180,88 225,72 270,78 315,64 360,48 405,54 450,32 500,26',
    areaPath:
      'M0,120 L45,124 L90,104 L135,108 L180,88 L225,72 L270,78 L315,64 L360,48 L405,54 L450,32 L500,26 L500,160 L0,160 Z',
    timeLabels: ['09:30', '10:45', '12:00', '13:15', '14:30', '15:45'],
    signals: [
      {
        symbol: 'AAPL',
        assetClass: 'Equities',
        side: 'LONG',
        entry: '₹19,530.00',
        mark: '₹19,894.50',
        pnl: '+₹54,675',
        positive: true,
        status: 'Filled',
      },
      {
        symbol: 'NVDA',
        assetClass: 'Equities',
        side: 'LONG',
        entry: '₹11,667.60',
        mark: '₹11,953.20',
        pnl: '+₹85,680',
        positive: true,
        status: 'Active',
      },
      {
        symbol: 'TSLA',
        assetClass: 'Equities',
        side: 'SHORT',
        entry: '₹28,660.80',
        mark: '₹28,963.20',
        pnl: '-₹30,240',
        positive: false,
        status: 'Stop Triggered',
      },
    ],
  },
  'NIFTY 50': {
    key: 'NIFTY 50',
    name: 'NSE Nifty 50 Index',
    exchange: 'NSE INDIA',
    price: '24,618.25',
    change: '+1.14%',
    positive: true,
    dayHigh: '24,680.00',
    dayLow: '24,390.15',
    volume: '318.2M',
    disciplineScore: '92 / 100',
    linePoints: '0,132 45,118 90,110 135,114 180,94 225,86 270,70 315,76 360,58 405,46 450,38 500,24',
    areaPath:
      'M0,132 L45,118 L90,110 L135,114 L180,94 L225,86 L270,70 L315,76 L360,58 L405,46 L450,38 L500,24 L500,160 L0,160 Z',
    timeLabels: ['09:15', '10:30', '11:45', '13:00', '14:15', '15:30'],
    signals: [
      {
        symbol: 'NIFTY 50',
        assetClass: 'Index',
        side: 'LONG',
        entry: '24,340.00',
        mark: '24,618.25',
        pnl: '+₹13,912',
        positive: true,
        status: 'Active',
      },
      {
        symbol: 'RELIANCE',
        assetClass: 'Equities',
        side: 'LONG',
        entry: '₹1,284.00',
        mark: '₹1,306.50',
        pnl: '+₹4,500',
        positive: true,
        status: 'Filled',
      },
      {
        symbol: 'HDFCBANK',
        assetClass: 'Equities',
        side: 'SHORT',
        entry: '₹1,742.00',
        mark: '₹1,749.40',
        pnl: '-₹1,480',
        positive: false,
        status: 'Stop Triggered',
      },
    ],
  },
};

export interface PortfolioRangeData {
  total: string;
  delta: string;
  bars: number[];
  labels: string[];
  winRate: string;
  profitFactor: string;
}

export const PORTFOLIO_RANGES: Record<'7D' | '30D' | 'YTD', PortfolioRangeData> = {
  '7D': {
    total: '₹10,48,205.50',
    delta: '+4.82%',
    bars: [38, 52, 46, 68, 61, 84, 92],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    winRate: '64.2%',
    profitFactor: '2.18',
  },
  '30D': {
    total: '₹11,24,900.00',
    delta: '+12.49%',
    bars: [28, 40, 36, 55, 62, 74, 88],
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Now'],
    winRate: '68.5%',
    profitFactor: '2.42',
  },
  YTD: {
    total: '₹12,89,407.50',
    delta: '+28.94%',
    bars: [22, 34, 48, 44, 66, 79, 96],
    labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov', 'Now'],
    winRate: '71.0%',
    profitFactor: '2.65',
  },
};

export const ORDER_BOOK_ALERTS = [
  {
    pair: 'AAPL Breakout',
    type: 'Price Alert',
    level: '₹19,866.00',
    badge: 'Triggered',
    positive: true,
  },
  {
    pair: 'BTC/USD Bid Wall',
    type: 'Order Book',
    level: '₹78,91,800',
    badge: '14.2 BTC',
    positive: true,
  },
  {
    pair: 'TSLA Resistance',
    type: 'Risk Guard',
    level: '₹28,963.20',
    badge: 'Stop Active',
    positive: false,
  },
  {
    pair: 'EUR/USD Liquidity',
    type: 'Order Book',
    level: '1.0842',
    badge: 'Tight Spread',
    positive: true,
  },
];

export const GLOBAL_ASSET_PILLS = [
  { symbol: 'AAPL', category: 'Equities' },
  { symbol: 'NVDA', category: 'Equities' },
  { symbol: 'MSFT', category: 'Equities' },
  { symbol: 'RELIANCE', category: 'NSE' },
  { symbol: 'BTC/USD', category: 'Crypto' },
  { symbol: 'ETH/USD', category: 'Crypto' },
  { symbol: 'EUR/USD', category: 'Forex' },
  { symbol: 'USD/JPY', category: 'Forex' },
  { symbol: 'NIFTY 50', category: 'Index' },
  { symbol: 'S&P 500', category: 'Index' },
  { symbol: 'NASDAQ 100', category: 'Index' },
  { symbol: 'XAU/USD', category: 'Metals' },
];

export const COMPARISON_ITEMS = [
  {
    legacy: 'Cluttered charts buried under confusing order tickets',
    aurivero: 'Clean institutional terminal designed for rapid focus',
  },
  {
    legacy: 'Zero feedback on emotional tilt or revenge trading',
    aurivero: 'Built-in Smart Risk & Behavior Coach after every fill',
  },
  {
    legacy: 'Forces you to risk real capital just to test strategies',
    aurivero: 'Zero-risk paper trading powered by live market pricing',
  },
  {
    legacy: 'Manual spreadsheet math for position size & stop-losses',
    aurivero: 'Real-time position sizer with automatic max-loss guardrails',
  },
  {
    legacy: 'Siloed tools for equities, crypto, forex, and indices',
    aurivero: '55+ global assets unified inside one fast workspace',
  },
];

export const FOOTER_COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Live Terminal', to: '/simulator' },
      { label: 'Market Overview', to: '/markets' },
      { label: 'Portfolio Tracker', to: '/portfolio' },
      { label: 'Market Replay', to: '/market-replay' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { label: 'Behavior Coach', to: '/behavioral-insights' },
      { label: 'Position Calculator', to: '#simulator' },
      { label: 'Stock Screener', to: '/markets/screener' },
      { label: 'News Explainer', to: '/news-explainer' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Learning Academy', to: '/learn' },
      { label: 'Trading Challenges', to: '/challenges' },
      { label: 'Analytics Dashboard', to: '/dashboard' },
      { label: 'AI Trading Buddy', to: '/ai-buddy' },
    ],
  },
  {
    title: 'Access',
    links: [
      { label: 'Create Free Account', to: '/auth' },
      { label: 'Guided Onboarding', to: '/onboarding' },
      { label: 'Account Settings', to: '/settings' },
      { label: 'Pricing & Plans', to: '#pricing' },
    ],
  },
];
