import { StockQuote, MarketIndex, CourseModule, ReplayEvent, MarketNewsItem, ChallengeQuest } from '../types';

export const INDIAN_INDICES: MarketIndex[] = [
  { name: 'NIFTY 50', value: 24842.15, change: 148.60, changePercent: 0.60, status: 'Open' },
  { name: 'SENSEX', value: 81525.40, change: 485.20, changePercent: 0.60, status: 'Open' },
  { name: 'BANK NIFTY', value: 52140.80, change: -112.45, changePercent: -0.22, status: 'Open' },
  { name: 'INDIA VIX', value: 12.85, change: -0.42, changePercent: -3.16, status: 'Open' },
];

export const POPULAR_INDIAN_STOCKS: StockQuote[] = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    price: 2985.40,
    change: 32.10,
    changePercent: 1.09,
    previousClose: 2953.30,
    open: 2960.00,
    dayHigh: 2998.50,
    dayLow: 2955.00,
    volume: '5.2M',
    marketCap: '₹20.2L Cr',
    pe: 28.4,
    sector: 'Energy & Retail',
    sparkline: [2920, 2935, 2940, 2930, 2953, 2970, 2985.4],
    riskRating: 'Low',
    description: "India's largest conglomerate spanning petrochemicals, telecommunications (Jio), and organized retail.",
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    price: 4180.25,
    change: 48.75,
    changePercent: 1.18,
    previousClose: 4131.50,
    open: 4140.00,
    dayHigh: 4195.00,
    dayLow: 4135.00,
    volume: '2.1M',
    marketCap: '₹15.1L Cr',
    pe: 31.2,
    sector: 'Information Tech',
    sparkline: [4100, 4120, 4115, 4131, 4150, 4165, 4180.25],
    riskRating: 'Low',
    description: "Global IT services and consulting giant with steady operating cash flows and zero debt.",
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    price: 1642.80,
    change: -8.40,
    changePercent: -0.51,
    previousClose: 1651.20,
    open: 1655.00,
    dayHigh: 1658.90,
    dayLow: 1638.00,
    volume: '9.8M',
    marketCap: '₹12.5L Cr',
    pe: 18.6,
    sector: 'Banking & Financials',
    sparkline: [1660, 1655, 1658, 1651, 1648, 1640, 1642.8],
    riskRating: 'Low',
    description: "Largest private sector bank in India, known for pristine asset quality and massive retail branch network.",
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    exchange: 'NSE',
    price: 1872.10,
    change: 22.40,
    changePercent: 1.21,
    previousClose: 1849.70,
    open: 1855.00,
    dayHigh: 1880.00,
    dayLow: 1852.10,
    volume: '4.4M',
    marketCap: '₹7.8L Cr',
    pe: 29.1,
    sector: 'Information Tech',
    sparkline: [1830, 1840, 1835, 1849, 1860, 1868, 1872.1],
    riskRating: 'Moderate',
    description: "Pioneer in Indian software exports with strong cloud transformation and generative AI digital services.",
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    exchange: 'NSE',
    price: 978.50,
    change: 18.30,
    changePercent: 1.91,
    previousClose: 960.20,
    open: 965.00,
    dayHigh: 984.00,
    dayLow: 962.00,
    volume: '11.5M',
    marketCap: '₹3.6L Cr',
    pe: 16.8,
    sector: 'Automobile',
    sparkline: [940, 950, 955, 960, 968, 972, 978.5],
    riskRating: 'Moderate',
    description: "Automotive frontrunner leading India's EV transition alongside global luxury arm Jaguar Land Rover.",
  },
  {
    symbol: 'ITC',
    name: 'ITC Limited',
    exchange: 'NSE',
    price: 495.20,
    change: -1.80,
    changePercent: -0.36,
    previousClose: 497.00,
    open: 498.00,
    dayHigh: 499.50,
    dayLow: 493.80,
    volume: '7.3M',
    marketCap: '₹6.2L Cr',
    pe: 27.5,
    sector: 'FMCG & Consumer',
    sparkline: [498, 499, 497, 496, 497, 494, 495.2],
    riskRating: 'Low',
    description: "Diversified conglomerate with dominant cigarette market share, growing FMCG food, paperboards, and hotels.",
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    exchange: 'NSE',
    price: 1245.60,
    change: 14.80,
    changePercent: 1.20,
    previousClose: 1230.80,
    open: 1235.00,
    dayHigh: 1250.00,
    dayLow: 1232.00,
    volume: '8.1M',
    marketCap: '₹8.7L Cr',
    pe: 17.9,
    sector: 'Banking & Financials',
    sparkline: [1215, 1225, 1228, 1230, 1238, 1242, 1245.6],
    riskRating: 'Low',
    description: "High-return private lender leading in digital retail banking and corporate underwriting in India.",
  },
  {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd. (Eternal)',
    exchange: 'NSE',
    price: 262.30,
    change: 6.90,
    changePercent: 2.70,
    previousClose: 255.40,
    open: 257.00,
    dayHigh: 265.00,
    dayLow: 256.00,
    volume: '24.8M',
    marketCap: '₹2.3L Cr',
    pe: 112.4,
    sector: 'Internet & Tech',
    sparkline: [248, 250, 252, 255, 258, 260, 262.3],
    riskRating: 'High',
    description: "New-age hypergrowth internet platform powering food delivery and quick-commerce (Blinkit) across urban India.",
  }
];

export const COURSE_MODULES: CourseModule[] = [
  {
    id: 'track-1',
    trackId: 'foundations',
    trackTitle: 'Track 1: Indian Market Foundations',
    level: 'Beginner',
    duration: '45 mins',
    icon: 'Compass',
    description: 'Understand how NSE, BSE, SEBI, Demat, and the stock exchange engine really work behind the scenes.',
    progress: 100,
    keyTakeaway: 'You buy shares in real companies, not lottery tickets. The market is an auction mechanism governed by supply and demand.',
    lessons: [
      { id: 'l1', title: 'What is a Share? Owning a Piece of an Indian Enterprise', duration: '8 mins', completed: true, type: 'concept', description: 'From a local chai stall partnership to Reliance Industries on Dalal Street.' },
      { id: 'l2', title: 'NSE vs BSE & The Role of SEBI (Your Guardian)', duration: '10 mins', completed: true, type: 'concept', description: 'Why Indian market infrastructure is among the most transparent worldwide.' },
      { id: 'l3', title: 'The Lifecycle of a Trade: T+1 Settlement Explained', duration: '12 mins', completed: true, type: 'interactive', description: 'What happens between clicking "Buy" and shares settling into your CDSL/NSDL depository.' },
      { id: 'l4', title: 'Checkpoint: Dalal Street Essentials Quiz', duration: '15 mins', completed: true, type: 'quiz', description: 'Test your grasp before risking virtual capital in the simulator.' },
    ]
  },
  {
    id: 'track-2',
    trackId: 'reading-charts',
    trackTitle: 'Track 2: Demystifying Price Charts & Market Action',
    level: 'Beginner',
    duration: '60 mins',
    icon: 'TrendingUp',
    description: 'Learn how to read candlesticks, understand support/resistance, and spot fake breakouts without jargon.',
    progress: 60,
    keyTakeaway: 'Charts reflect human psychology, greed, and fear visualized in candles. Always trade what you see, not what you hope.',
    lessons: [
      { id: 'l5', title: 'The Anatomy of a Japanese Candlestick', duration: '12 mins', completed: true, type: 'concept', description: 'Open, High, Low, Close (OHLC), wicks, and body language of the market.' },
      { id: 'l6', title: 'Support & Resistance: The Floors & Ceilings of Price', duration: '15 mins', completed: true, type: 'concept', description: 'Where institutional buyers step in and where sellers take profit.' },
      { id: 'l7', title: 'Interactive Drill: Spot the Trap / Fake Breakout', duration: '18 mins', completed: false, type: 'interactive', description: 'Practice identifying false volume spikes in the simulator playground.' },
      { id: 'l8', title: 'Trends: Uptrends, Downtrends, and Sideways Chop', duration: '15 mins', completed: false, type: 'concept', description: 'Why fighting the primary trend is the fastest way beginners blow up.' },
    ]
  },
  {
    id: 'track-3',
    trackId: 'fundamental-analysis',
    trackTitle: 'Track 3: Fundamental Analysis & Valuations for Beginners',
    level: 'Intermediate',
    duration: '75 mins',
    icon: 'FileText',
    description: 'How to tell whether a stock is cheap or expensive: P/E ratio, ROCE, debt traps, and reading quarterly results.',
    progress: 25,
    keyTakeaway: 'Price is what you pay; value is what you get. A great company bought at an absurd valuation can still be a terrible investment.',
    lessons: [
      { id: 'l9', title: 'P/E Ratio Deconstructed: When is 25x Cheap and 15x a Trap?', duration: '15 mins', completed: true, type: 'concept', description: 'Understanding earnings quality vs growth expectations.' },
      { id: 'l10', title: 'Balance Sheet Health: Debt-to-Equity & Free Cash Flow', duration: '20 mins', completed: false, type: 'concept', description: 'Why companies with heavy debt collapse during interest rate hikes.' },
      { id: 'l11', title: 'Competitive Moats in the Indian Context', duration: '20 mins', completed: false, type: 'concept', description: 'Network effects (Zomato), brand loyalty (Titan), switching costs (TCS).' },
      { id: 'l12', title: 'Case Study: Spotting Fraudulent Accounting Red Flags', duration: '20 mins', completed: false, type: 'interactive', description: 'Lessons from past Indian corporate governance blowups.' },
    ]
  },
  {
    id: 'track-4',
    trackId: 'risk-management',
    trackTitle: 'Track 4: Capital Preservation & Risk Management',
    level: 'Beginner',
    duration: '50 mins',
    icon: 'Shield',
    description: 'The golden rules professional fund managers live by: position sizing, 1% rule, and non-negotiable stop losses.',
    progress: 10,
    keyTakeaway: 'Your first objective in the stock market is survival. Profits naturally follow when your downside is tightly capped.',
    lessons: [
      { id: 'l13', title: 'The 1% Rule: Never Risk More Than You Can Afford to Lose', duration: '10 mins', completed: true, type: 'concept', description: 'The math of mathematical ruin: why a 50% loss requires a 100% gain just to break even.' },
      { id: 'l14', title: 'Position Sizing Calculator: How Many Shares Should You Buy?', duration: '15 mins', completed: false, type: 'interactive', description: 'Calculate exact share counts based on stop-loss distance.' },
      { id: 'l15', title: 'Setting Logical Stop Losses (Not Arbitrary Percentages)', duration: '15 mins', completed: false, type: 'concept', description: 'Placing stops behind structural support, not in random noise.' },
      { id: 'l16', title: 'Portfolio Diversification Without Over-diworsification', duration: '10 mins', completed: false, type: 'concept', description: 'How holding 12-15 quality businesses across 4-5 sectors protects you.' },
    ]
  },
  {
    id: 'track-5',
    trackId: 'derivatives-warning',
    trackTitle: 'Track 5: F&O Reality Check (The Warning Track)',
    level: 'Advanced',
    duration: '40 mins',
    icon: 'AlertTriangle',
    description: 'SEBI study reveals 93% of individual retail traders lose money in F&O. Understand why before touching options.',
    progress: 0,
    keyTakeaway: 'Options are insurance contracts, not lottery tickets. Time decay (Theta) relentlessly eats option buyers alive.',
    lessons: [
      { id: 'l17', title: 'The SEBI Study Breakdown: Why 93 Out of 100 Retailers Bleed', duration: '10 mins', completed: false, type: 'concept', description: 'Average retail loss of ₹1.25 Lakhs per year in index options.' },
      { id: 'l18', title: 'Leverage: The Double-Edged Guillotine', duration: '10 mins', completed: false, type: 'concept', description: 'How borrowing 5x or 10x exposure wipes out entire life savings in 3 minutes.' },
      { id: 'l19', title: 'Theta Decay: Why the Clock is Ticking Against You', duration: '10 mins', completed: false, type: 'interactive', description: 'Watch simulated option premiums melt to ₹0.05 on expiry day.' },
      { id: 'l20', title: 'The Golden Pledge: Earning the Right to Trade Advanced Products', duration: '10 mins', completed: false, type: 'quiz', description: 'Simulate 100 equity trades profitably before ever unlocking derivatives.' },
    ]
  }
];

export const HISTORICAL_REPLAY_EVENTS: ReplayEvent[] = [
  {
    id: 'covid-crash-2020',
    title: 'March 2020: The COVID-19 Circuit Breaker Crash',
    subtitle: 'NIFTY plunges from 12,400 to 7,500 amidst nationwide lockdowns and extreme fear.',
    period: 'Feb 2020 — Nov 2020',
    severity: 'Extreme',
    dropPercentage: '-38.4%',
    recoveryDuration: '7 Months to all-time high',
    background: 'World Health Organization declares pandemic, FIIs pull record ₹65,000 Cr in a single month.',
    context: 'Trading was halted multiple times by lower circuit breakers on Dalal Street. The media declared the end of globalization.',
    totalSteps: 5,
    benchmark: 'NIFTY 50 Index',
    priceSeries: [
      { day: '15 Feb 2020', nifty: 12113, sensex: 41257, narrative: 'Markets trade calmly near all-time highs. Whispers of Wuhan virus are dismissed as temporary local disruption.' },
      { day: '06 Mar 2020', nifty: 10989, sensex: 37576, narrative: 'Cases emerge in Italy & India. Yes Bank moratorium shocks Indian financial sector. Volatility spikes.' },
      { day: '23 Mar 2020', nifty: 7610, sensex: 25981, narrative: 'Nationwide 21-day lockdown announced. NIFTY hits lower circuit in 45 minutes! Maximum panic selling.' },
      { day: '30 Apr 2020', nifty: 9859, sensex: 33717, narrative: 'Global central banks pump trillions in liquidity. Tech and pharma stocks lead unexpected sharp rebound.' },
      { day: '10 Nov 2020', nifty: 12631, sensex: 43277, narrative: 'Pfizer vaccine announcement. NIFTY crosses pre-COVID peak. Panic sellers who exited in March locked in massive permanent losses.' }
    ],
    keyLessons: [
      'Panic selling at peak fear locks in paper losses into permanent destruction of capital.',
      'Quality Indian businesses (TCS, Reliance, HDFC) survived and surged to fresh highs within months.',
      'Cash reserves during market crashes give you the superpower to buy world-class assets at a 40% discount.'
    ]
  },
  {
    id: 'election-day-2024',
    title: 'June 4, 2024: Lok Sabha Election Verdict Volatility',
    subtitle: 'NIFTY tumbles 1,379 points in a single session as exit polls diverge from real results.',
    period: '3 June 2024 — 7 June 2024',
    severity: 'High',
    dropPercentage: '-5.9% (Single Day)',
    recoveryDuration: '3 Trading Sessions',
    background: 'Exit polls predicted massive single-party supermajority; actual seats required coalition government.',
    context: 'PSU stocks, defence, and infrastructure shares crashed 15-20% in hours. INDIA VIX surged to 31 before collapsing back.',
    totalSteps: 4,
    benchmark: 'NIFTY 50 Index',
    priceSeries: [
      { day: '31 May 2024', nifty: 22530, sensex: 73961, narrative: 'Pre-exit poll quiet trading.' },
      { day: '03 Jun 2024', nifty: 23263, sensex: 76468, narrative: 'Exit poll euphoria: NIFTY surges 733 points in opening minutes (+3.25%). Retail investors chase PSU stocks at peak prices.' },
      { day: '04 Jun 2024', nifty: 21884, sensex: 72079, narrative: 'Election results day: NIFTY crashes 1,379 points (-5.9%). Over ₹31 Lakh Crore of market cap wiped out in hours.' },
      { day: '07 Jun 2024', nifty: 23290, sensex: 76693, narrative: 'Government formation confirmed. Index completely recovers its entire 1,400-point loss in just 72 hours!' }
    ],
    keyLessons: [
      'Never trade news events with high leverage; exit polls can be completely wrong.',
      'Chasing a +3% gap up on emotional euphoria leaves retail investors holding the bag.',
      'Political volatility is short-lived; economic fundamentals and earnings power dictate multi-year returns.'
    ]
  },
  {
    id: 'lehman-gfc-2008',
    title: '2008 Global Financial Crisis: The Great Deleveraging',
    subtitle: 'NIFTY falls over 60% over 14 months as global banking system freezes.',
    period: 'Jan 2008 — Mar 2009',
    severity: 'Extreme',
    dropPercentage: '-64.8%',
    recoveryDuration: '24 Months',
    background: 'Subprime mortgage collapse in US triggers bankruptcy of Lehman Brothers and freezes global credit.',
    context: 'Real estate, power, and infrastructure stocks with 10x debt leverage went bankrupt and never recovered.',
    totalSteps: 4,
    benchmark: 'SENSEX',
    priceSeries: [
      { day: '08 Jan 2008', nifty: 6287, sensex: 20873, narrative: 'Sensex crosses 21,000 for first time. Euphoria around power IPOs. Retail investors think markets only go up.' },
      { day: '21 Jan 2008', nifty: 5208, sensex: 17605, narrative: 'Black Monday on Dalal Street. First major margin call wave triggers lower circuits.' },
      { day: '15 Sep 2008', nifty: 4038, sensex: 13531, narrative: 'Lehman Brothers files for Chapter 11 bankruptcy. Global interbank lending halts.' },
      { day: '27 Oct 2008', nifty: 2524, sensex: 8509, narrative: 'Peak capitulation. Sensex falls to 8,500. Fear dominates Dalal Street. Valuations drop to single-digit P/E multiples.' }
    ],
    keyLessons: [
      'Companies with excessive debt do not survive prolonged recessions; quality balance sheets are mandatory.',
      'Bear markets are slow grinds that test patience, not just sudden single-day flash crashes.',
      'Long-term SIP investors who continued buying during 2008-2009 built generational wealth over the next decade.'
    ]
  }
];

export const MARKET_NEWS_ITEMS: MarketNewsItem[] = [
  {
    id: 'news-1',
    headline: 'RBI Monetary Policy: Repo Rate Kept Unchanged at 6.50% with Neutral Stance',
    source: 'Reserve Bank of India Bulletin',
    publishedAt: '2 hours ago',
    category: 'Policy',
    plainEnglishTranslation: 'The RBI decided neither to hike nor to cut the base interest rate banks borrow at. They are keeping their powder dry while ensuring inflation stays anchored near 4%.',
    whyItMattersToYou: 'Your home loan EMIs and fixed deposit rates will remain stable. Banking stocks like HDFC Bank and ICICI Bank preserve their net interest margins.',
    impactedSectors: [
      { name: 'Banking & NBFCs', impact: 'positive', rationale: 'Stable margin environment without immediate squeeze on lending spreads.' },
      { name: 'Real Estate & Housing', impact: 'neutral', rationale: 'Home loan interest rates stay steady without further affordability headwinds.' },
      { name: 'Auto Sector', impact: 'neutral', rationale: 'Vehicle financing rates remain at current levels.' }
    ],
    marketSentiment: 'Bullish'
  },
  {
    id: 'news-2',
    headline: 'Brent Crude Oil Steadies at $74/bbl as Middle East Supply Disruption Fears Recede',
    source: 'Commodities Watch',
    publishedAt: '4 hours ago',
    category: 'Global Signals',
    plainEnglishTranslation: 'Crude oil prices fell slightly. Since India imports over 85% of its crude oil needs, cheaper oil reduces import bills, curbs inflation, and strengthens the Indian Rupee.',
    whyItMattersToYou: 'Lower oil prices are a massive tailwind for the entire Indian economy. Paint manufacturers (Asian Paints), airlines (IndiGo), and tyre makers save substantially on raw material costs.',
    impactedSectors: [
      { name: 'Paints & Adhesives', impact: 'positive', rationale: 'Crude derivatives represent ~50% of input costs; gross margins expand.' },
      { name: 'Aviation', impact: 'positive', rationale: 'Aviation Turbine Fuel (ATF) expenses drop immediately.' },
      { name: 'Oil Exploration (ONGC)', impact: 'negative', rationale: 'Lower realization per barrel of extracted crude.' }
    ],
    marketSentiment: 'Bullish'
  },
  {
    id: 'news-3',
    headline: 'US Federal Reserve Signals Measured Pace of Rate Cuts Amid Resilient US Job Growth',
    source: 'Global Macro Times',
    publishedAt: '6 hours ago',
    category: 'Macro Economy',
    plainEnglishTranslation: 'The US central bank will reduce interest rates more slowly than Wall Street hoped because the American economy is still hiring strongly.',
    whyItMattersToYou: 'When US interest rates stay high, Foreign Institutional Investors (FIIs) might keep more money parked in US Treasury bonds instead of pouring capital into emerging markets like India.',
    impactedSectors: [
      { name: 'IT Services', impact: 'neutral', rationale: 'US client spending on tech modernization remains cautious until rate clarity emerges.' },
      { name: 'Emerging Market Inflows', impact: 'neutral', rationale: 'FII flow pace may be measured; domestic retail SIPs continue to counterbalance.' }
    ],
    marketSentiment: 'Neutral'
  }
];

export const CHALLENGE_QUESTS: ChallengeQuest[] = [
  {
    id: 'quest-1',
    title: 'The Disciplined Investor',
    category: 'Risk Management',
    rewardXP: 250,
    badgeName: 'Risk Guardian',
    progress: 3,
    maxProgress: 5,
    completed: false,
    description: 'Execute 5 simulated trades with a pre-configured stop-loss order.'
  },
  {
    id: 'quest-2',
    title: 'Sector Diversification Master',
    category: 'Execution',
    rewardXP: 300,
    badgeName: 'Balanced Portfolio',
    progress: 4,
    maxProgress: 4,
    completed: true,
    description: 'Hold stocks across at least 4 distinct economic sectors without exceeding 35% in any single industry.'
  },
  {
    id: 'quest-3',
    title: 'Survivor of March 2020',
    category: 'Mindset',
    rewardXP: 400,
    badgeName: 'Diamond Nerves',
    progress: 1,
    maxProgress: 1,
    completed: true,
    description: 'Complete the COVID-19 Historical Crash replay scenario without panic-selling at the bottom.'
  },
  {
    id: 'quest-4',
    title: 'Fundamental Sleuth',
    category: 'Analysis',
    rewardXP: 200,
    badgeName: 'Valuation Analyst',
    progress: 2,
    maxProgress: 4,
    completed: false,
    description: 'Complete the Fundamental Analysis course module and pass the P/E Ratio interactive checkpoint.'
  },
  {
    id: 'quest-5',
    title: 'FOMO Resistance Drill',
    category: 'Mindset',
    rewardXP: 350,
    badgeName: 'Stoic Mind',
    progress: 8,
    maxProgress: 10,
    completed: false,
    description: 'Refrain from placing market orders on stocks that have already gapped up more than +3% on the day.'
  }
];
