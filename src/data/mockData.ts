import { StockQuote, MarketIndex, CourseModule, ReplayEvent, MarketNewsItem, ChallengeQuest, AchievementBadge, LeaderboardEntry } from '../types';

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
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    exchange: 'NSE',
    price: 1560.40,
    change: 18.20,
    changePercent: 1.18,
    previousClose: 1542.20,
    open: 1548.00,
    dayHigh: 1572.00,
    dayLow: 1545.00,
    volume: '6.4M',
    marketCap: '₹8.9L Cr',
    pe: 58.2,
    sector: 'Telecommunications',
    sparkline: [1530, 1540, 1538, 1542, 1550, 1558, 1560.4],
    riskRating: 'Moderate',
    description: "Leading telecommunications provider with expanding 5G network coverage, rising ARPU, and strong enterprise cloud presence across India and Africa.",
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
    subtitle: 'NIFTY plunges from 12,200 to 7,500 amidst nationwide lockdowns before triggering an unprecedented V-shape recovery.',
    period: 'Feb 2020 — Nov 2020',
    scenarioType: 'CRASH',
    severity: 'Extreme',
    dropPercentage: '-38.4%',
    recoveryDuration: '7 Months to all-time high',
    background: 'World Health Organization declares global pandemic; FIIs pull record ₹65,000 Cr from Indian equities in a single month.',
    context: 'Trading was halted multiple times by 10% lower circuit breakers on Dalal Street. Media headlines declared the collapse of modern globalization.',
    totalSteps: 6,
    benchmark: 'NIFTY 50 Index',
    initialCash: 50000,
    initialUnits: 50000 / 12113,
    historicalDisclaimer: 'Historical closing price series sourced from verified National Stock Exchange (NSE India) NIFTY 50 benchmark data for 2020.',
    priceSeries: [
      { day: '15 Feb 2020', nifty: 12113, sensex: 41257, narrative: 'Markets trade calmly near all-time highs. Whispers of Wuhan virus are dismissed as temporary local disruption.' },
      { day: '06 Mar 2020', nifty: 10989, sensex: 37576, narrative: 'Cases emerge in Italy & India. Yes Bank moratorium shocks Indian financial sector. Volatility spikes.' },
      { day: '23 Mar 2020', nifty: 7610, sensex: 25981, narrative: 'Nationwide 21-day lockdown announced. NIFTY hits lower circuit in 45 minutes! Maximum panic selling.' },
      { day: '30 Apr 2020', nifty: 9859, sensex: 33717, narrative: 'Global central banks pump trillions in liquidity. Tech and pharma stocks lead unexpected sharp rebound.' },
      { day: '10 Jul 2020', nifty: 10768, sensex: 36594, narrative: 'Reliance raises ₹1.5L Cr from global investors; millions of new retail demat accounts open in India.' },
      { day: '10 Nov 2020', nifty: 12631, sensex: 43277, narrative: 'Pfizer vaccine announcement. NIFTY crosses pre-COVID peak. Panic sellers who exited in March locked in permanent losses.' }
    ],
    checkpoints: [
      {
        checkpointIndex: 0,
        date: '15 Feb 2020',
        nifty: 12113,
        sensex: 41257,
        headline: 'Dalal Street Trades Near Record Highs as Corporate Tax Cuts Fuel Optimism',
        newsSource: 'The Economic Times',
        marketSentiment: 'Optimism',
        narrative: 'The NIFTY 50 is hovering near 12,113. While reports of a viral respiratory outbreak in Wuhan, China circulate, consensus among top brokerage houses is that the impact on Indian domestic companies will be minimal.',
        whatHappenedNext: 'Within 3 weeks, global infection rates exploded. Italy locked down northern provinces, and the first confirmed community transmissions appeared in India.',
        historicalFact: 'Corporate earnings in Q3 FY20 were beginning to reflect benefits from the historic Sept 2019 corporate tax rate cut to 22%.'
      },
      {
        checkpointIndex: 1,
        date: '06 Mar 2020',
        nifty: 10989,
        sensex: 37576,
        headline: 'RBI Imposes 30-Day Moratorium on Yes Bank; FIIs Sell ₹11,000 Cr in a Week',
        newsSource: 'Mint Market Watch',
        marketSentiment: 'Fear',
        narrative: 'NIFTY has dropped 9.3% in three weeks. Financial sector stability is rocked as the Reserve Bank caps withdrawals at Yes Bank. Global supply chain bottlenecks begin shuttering automotive assembly lines in Chennai and Pune.',
        whatHappenedNext: 'The World Health Organization declared COVID-19 a worldwide pandemic on March 11. Global sovereign bond yields plummeted as investors rushed into US Dollar cash.',
        historicalFact: 'The VIX (volatility index) surged from 14.5 to 25.6 in two weeks, signaling institutional panic hedging.'
      },
      {
        checkpointIndex: 2,
        date: '23 Mar 2020',
        nifty: 7610,
        sensex: 25981,
        headline: 'Dalal Street Frozen in 45 Minutes: 10% Lower Circuit Halted as PM Modi Announces 21-Day National Lockdown',
        newsSource: 'Business Standard',
        marketSentiment: 'Extreme Fear',
        narrative: 'Unprecedented market capitulation. Trains, airlines, offices, and factories are completely shut down. The NIFTY 50 drops to 7,610—down 37.2% in just 5 weeks. Margin calls trigger automated liquidation of thousands of retail portfolios.',
        whatHappenedNext: 'Just four trading sessions later, the US Federal Reserve launched an open-ended quantitative easing program, and the Indian government announced emergency credit lines for MSMEs.',
        historicalFact: 'March 23, 2020 remains the most volatile single trading day on the National Stock Exchange since the 2008 Lehman collapse.'
      },
      {
        checkpointIndex: 3,
        date: '30 Apr 2020',
        nifty: 9859,
        sensex: 33717,
        headline: 'NIFTY Surges 30% from March Trough Driven by Massive Global Monetary Stimulus',
        newsSource: 'Reuters Financial',
        marketSentiment: 'Uncertainty',
        narrative: 'Despite ground-level economic paralysis, financial markets have staged a ferocious 30% rally from the 7,610 bottom. Sceptics warn this is a classic "dead cat bounce" and predict a retest of 6,000.',
        whatHappenedNext: 'The market defied pessimists. Major blue chips like TCS, Infosys, and Reliance announced blockbuster digital contracts and debt reduction milestones.',
        historicalFact: 'Central banks globally injected more than $9 Trillion in emergency liquidity between March and May 2020.'
      },
      {
        checkpointIndex: 4,
        date: '10 Jul 2020',
        nifty: 10768,
        sensex: 36594,
        headline: 'Reliance Industries Becomes Net Debt-Free; Retail Demat Registrations Break All-Time Records',
        newsSource: 'Bloomberg Quint',
        marketSentiment: 'Optimism',
        narrative: 'NIFTY has reclaimed 10,768. Over 2.5 million new retail investors entered the stock market during the lockdown, buying beaten-down blue-chip stocks through mobile apps.',
        whatHappenedNext: 'FIIs, who had dumped Indian equities in March, began pouring billions back into Dalal Street as the Indian Rupee stabilized.',
        historicalFact: 'Retail participation in the cash equity segment rose from 38% in 2019 to over 54% by mid-2020.'
      },
      {
        checkpointIndex: 5,
        date: '10 Nov 2020',
        nifty: 12631,
        sensex: 43277,
        headline: 'NIFTY Hits New All-Time High of 12,631 on Pfizer Vaccine Breakthrough & Unstoppable FII Inflows',
        newsSource: 'The Financial Express',
        marketSentiment: 'Euphoria',
        narrative: 'The NIFTY 50 has officially eclipsed its pre-pandemic high. An investor who panicked and moved 100% to cash on March 23 locked in a permanent -37% loss and missed a 66% rally.',
        whatHappenedNext: 'The bull market accelerated through 2021, eventually touching 18,600 by October 2021.',
        historicalFact: 'Foreign Institutional Investors invested a record ₹60,300 Crore into Indian stocks in November 2020 alone.'
      }
    ],
    keyLessons: [
      'Panic selling at peak fear permanently locks in paper drawdowns into irreversible capital loss.',
      'The stock market is a forward-looking discounting machine—it bottomed out months before the real economy recovered.',
      'Holding a cash reserve during calm markets provides psychological fortitude and capital to buy world-class businesses at steep discounts.'
    ]
  },
  {
    id: 'lehman-gfc-2008',
    title: '2008 Global Financial Crisis: The Great Deleveraging',
    subtitle: 'NIFTY crashes 60% over 10 months as Wall Street subprime debt implosion freezes global credit.',
    period: 'Jan 2008 — Jun 2009',
    scenarioType: 'CRISIS',
    severity: 'Extreme',
    dropPercentage: '-59.8%',
    recoveryDuration: '24 Months',
    background: 'Subprime mortgage derivatives fail in the United States, triggering the bankruptcy of 158-year-old Lehman Brothers and freezing global interbank lending.',
    context: 'Highly leveraged real estate, power, and infrastructure stocks with 10x debt plummeted 80-95%, wiping out a generation of speculative traders.',
    totalSteps: 6,
    benchmark: 'NIFTY 50 Index',
    initialCash: 50000,
    initialUnits: 50000 / 6287,
    historicalDisclaimer: 'Historical closing price series verified against official NSE India historical index database for the 2008-2009 Global Financial Crisis.',
    priceSeries: [
      { day: '08 Jan 2008', nifty: 6287, sensex: 20873, narrative: 'Sensex crosses 21,000 for first time. Euphoria around mega infrastructure IPOs. Retail investors believe stocks only go up.' },
      { day: '21 Jan 2008', nifty: 5208, sensex: 17605, narrative: 'Black Monday on Dalal Street. Massive margin calls trigger lower circuit; trading halted.' },
      { day: '15 Sep 2008', nifty: 4038, sensex: 13531, narrative: 'Lehman Brothers files for Chapter 11 bankruptcy. Global interbank lending halts.' },
      { day: '27 Oct 2008', nifty: 2524, sensex: 8509, narrative: 'Peak capitulation. Nifty crashes to 2,524 (-60%). Valuations drop to single-digit P/E multiples.' },
      { day: '18 May 2009', nifty: 4321, sensex: 14284, narrative: 'Circuit Day: Election stability triggers 20% upper circuit in 30 seconds; trading suspended for the day.' },
      { day: '04 Jun 2009', nifty: 4529, sensex: 15011, narrative: 'Global stimulus takes hold. The index finishes up 80% from the October 2008 bottom.' }
    ],
    checkpoints: [
      {
        checkpointIndex: 0,
        date: '08 Jan 2008',
        nifty: 6287,
        sensex: 20873,
        headline: 'Reliance Power IPO Draws Record ₹7.5 Lakh Crore Bids; Sensex Crosses 21,000',
        newsSource: 'The Economic Times',
        marketSentiment: 'Euphoria',
        narrative: 'Peak euphoria. The NIFTY 50 trades at an all-time high of 6,287, with price-to-earnings (P/E) exceeding 28x. Retail investors are borrowing funds against personal assets to apply for infrastructure IPOs.',
        whatHappenedNext: 'Within 10 days, French bank Societe Generale uncovered a rogue trading scandal, and global funds began aggressively unwinding risky emerging market carry trades.',
        historicalFact: 'Reliance Power IPO was subscribed 72 times within 60 seconds of opening on Dalal Street.'
      },
      {
        checkpointIndex: 1,
        date: '21 Jan 2008',
        nifty: 5208,
        sensex: 17605,
        headline: 'Black Monday: Trading Halted as Sensex Plunges 2,000 Points; Margin Calls Hit Retail Hard',
        newsSource: 'Mint',
        marketSentiment: 'Extreme Fear',
        narrative: 'NIFTY crashes 17.2% in two trading sessions. Brokers force-liquidate leveraged positions. New investors who entered in December 2007 see their portfolios cut in half in 48 hours.',
        whatHappenedNext: 'The US Federal Reserve made an unscheduled emergency 75 bps interest rate cut between meetings to arrest liquidity freezing.',
        historicalFact: 'Over ₹3.5 Lakh Crore of market wealth vanished during the single session of January 21, 2008.'
      },
      {
        checkpointIndex: 2,
        date: '15 Sep 2008',
        nifty: 4038,
        sensex: 13531,
        headline: 'Lehman Brothers Collapses in Largest Bankruptcy in History; Merrill Lynch Sold to BofA',
        newsSource: 'Wall Street Journal',
        marketSentiment: 'Extreme Fear',
        narrative: 'A 158-year-old Wall Street investment bank goes bust. Interbank credit markets freeze worldwide. Foreign institutional investors pull billions out of emerging markets to shore up domestic dollar balance sheets.',
        whatHappenedNext: 'AIG required an $85 Billion emergency bailout from the US government to avert immediate insolvency.',
        historicalFact: 'Lehman held more than $600 Billion in assets when it filed for Chapter 11 bankruptcy.'
      },
      {
        checkpointIndex: 3,
        date: '27 Oct 2008',
        nifty: 2524,
        sensex: 8509,
        headline: 'NIFTY Sinks to 2,524 — Down 60% from Peak; Dalal Street P/E Plunges to 11x',
        newsSource: 'Business Standard',
        marketSentiment: 'Extreme Fear',
        narrative: 'Complete despondency. Mutual fund redemptions surge as retail investors abandon equities permanently. Quality blue chips like Tata Steel, L&T, and ICICI Bank trade at 60-70% discounts to book value.',
        whatHappenedNext: 'Governments across the G20 coordinated interest rate reductions and massive fiscal infrastructure packages.',
        historicalFact: 'NIFTY 50 trailing P/E reached 11.2x on October 27, 2008—one of the cheapest valuation levels in modern Indian market history.'
      },
      {
        checkpointIndex: 4,
        date: '18 May 2009',
        nifty: 4321,
        sensex: 14284,
        headline: 'Election Miracle: UPA Mandate Triggers 20% Upper Circuit in 30 Seconds; Trading Suspended',
        newsSource: 'The Hindu BusinessLine',
        marketSentiment: 'Euphoria',
        narrative: 'Political stability and global liquidity spark the most explosive single-day gap up in Indian financial history. The market hits the upper circuit within seconds of the opening bell and stays frozen for the entire day.',
        whatHappenedNext: 'Investors who remained in cash waiting for "further drops to 1,800" were left completely on the sidelines as the index climbed another 20%.',
        historicalFact: 'Trading was halted for the day at 9:55 AM after hitting the mandatory 20% limit.'
      },
      {
        checkpointIndex: 5,
        date: '04 Jun 2009',
        nifty: 4529,
        sensex: 15011,
        headline: 'Dalal Street Rebounds 80% from Bear Market Bottom; Foreign Inflows Top $7 Billion in Q2',
        newsSource: 'Reuters India',
        marketSentiment: 'Optimism',
        narrative: 'The NIFTY 50 reaches 4,529. Investors who practiced disciplined rupee-cost averaging through the darkest months of 2008 turned an agonizing drawdown into extraordinary multi-year gains.',
        whatHappenedNext: 'India commenced a decade-long consumption and IT services expansion, compounding corporate earnings at double digits.',
        historicalFact: 'Between 2009 and 2017, the NIFTY 50 compounded from 2,524 to over 10,000.'
      }
    ],
    keyLessons: [
      'Debt-laden companies go bust during systemic credit crises; balance sheet strength is non-negotiable.',
      'Valuation matters: buying when NIFTY P/E is 11x yields exceptional long-term returns compared to buying at 28x.',
      'Bear market recoveries occur suddenly and furiously; waiting for "all clear" signals means missing the best gains.'
    ]
  },
  {
    id: 'post-covid-bullrun-2021',
    title: 'The Great Post-Pandemic Bull Run: 9,000 to 18,500',
    subtitle: 'Relentless retail participation, corporate digital transformation, and global liquidity fuel an 88% surge.',
    period: 'Jun 2020 — Oct 2021',
    scenarioType: 'RECOVERY',
    severity: 'High',
    dropPercentage: '+88.0% (Bull Surge)',
    recoveryDuration: '16 Consecutive Months',
    background: 'Zero interest rates across the developed world, coupled with unprecedented digital adoption in India, ignited an historic equity super-cycle.',
    context: 'Every dip was purchased aggressively by systematic retail investors; monthly mutual fund SIPs crossed ₹10,000 Crore for the first time.',
    totalSteps: 6,
    benchmark: 'NIFTY 50 Index',
    initialCash: 50000,
    initialUnits: 50000 / 9826,
    historicalDisclaimer: 'Historical prices and corporate earnings metrics validated against official NSE India index benchmarks for the 2020–2021 post-pandemic expansion.',
    priceSeries: [
      { day: '01 Jun 2020', nifty: 9826, sensex: 33303, narrative: 'India initiates "Unlock 1.0". Economic activity resumes cautiously.' },
      { day: '15 Oct 2020', nifty: 11972, sensex: 40707, narrative: 'Festive demand surprises analysts. IT sector reports record international deal wins.' },
      { day: '01 Feb 2021', nifty: 14281, sensex: 48600, narrative: 'FM Nirmala Sitharaman delivers landmark pro-growth Budget; NIFTY surges 5% in a day.' },
      { day: '22 Apr 2021', nifty: 14406, sensex: 48080, narrative: 'Second wave of COVID-19 strains medical infrastructure. Markets correct briefly but demonstrate resilience.' },
      { day: '01 Sep 2021', nifty: 17076, sensex: 57338, narrative: 'NIFTY crosses 17,000 milestone for the first time in history. Tech startup IPO boom unfolds.' },
      { day: '18 Oct 2021', nifty: 18477, sensex: 61765, narrative: 'NIFTY reaches cycle peak of 18,477. Valuations stretch as global crude oil and inflation worries emerge.' }
    ],
    checkpoints: [
      {
        checkpointIndex: 0,
        date: '01 Jun 2020',
        nifty: 9826,
        sensex: 33303,
        headline: 'India Begins Phase-1 of "Unlock"; Factories and Retail Outlets Reopen with Guidelines',
        newsSource: 'The Indian Express',
        marketSentiment: 'Uncertainty',
        narrative: 'The NIFTY 50 stands at 9,826. Many economists forecast a multi-year economic contraction. The dilemma for investors: deploy idle cash into the opening economy, or hold safety cash in anticipation of a second crash?',
        whatHappenedNext: 'Consumer demand rebounded far faster than predicted, especially in rural markets, automotive, and IT services.',
        historicalFact: 'Two-wheeler and tractor sales returned to pre-COVID levels within 90 days of unlock guidelines.'
      },
      {
        checkpointIndex: 1,
        date: '15 Oct 2020',
        nifty: 11972,
        sensex: 40707,
        headline: 'IT Giants TCS & Infosys Post Stellar Q2 Results; Massive Digital Transformation Deals Announced',
        newsSource: 'Mint',
        marketSentiment: 'Optimism',
        narrative: 'The index has reclaimed 11,972 (+21.8%). Global enterprises are spending heavily on cloud migration and cyber-security. Dalal Street is beginning to recognize that technology companies are generating record cash flows.',
        whatHappenedNext: 'Foreign funds began accelerating purchases of Indian large-cap financial and technology leaders.',
        historicalFact: 'TCS announced a ₹16,000 Crore share buyback in October 2020.'
      },
      {
        checkpointIndex: 2,
        date: '01 Feb 2021',
        nifty: 14281,
        sensex: 48600,
        headline: 'Historic Budget Day: Sensex Jumps 2,300 Points as FM Unveils ₹5.5L Cr Capex Without Higher Taxes',
        newsSource: 'CNBC-TV18',
        marketSentiment: 'Euphoria',
        narrative: 'NIFTY breaches 14,200. The government delivers a bold pro-capital investment Union Budget, establishing a Development Financial Institution and increasing health capex by 137%.',
        whatHappenedNext: 'Banking, infrastructure, and capital goods stocks rallied between 15% and 30% over the subsequent three weeks.',
        historicalFact: 'The February 1, 2021 Union Budget session was the best Budget Day gain for Indian indices in 24 years.'
      },
      {
        checkpointIndex: 3,
        date: '22 Apr 2021',
        nifty: 14406,
        sensex: 48080,
        headline: 'Second COVID Wave Surges in India; Localized Restrictions Imposed Across States',
        newsSource: 'NDTV Profit',
        marketSentiment: 'Fear',
        narrative: 'A tragic second wave overwhelms hospitals. The NIFTY wobbles between 14,200 and 14,500. Investors face intense emotional pressure: should they de-risk out of humanitarian fear or recognize that corporate earnings remain resilient?',
        whatHappenedNext: 'Unlike 2020, factories were not shut down nationwide. Supply chains stayed intact, and the market absorbed the shock with minor drawdowns.',
        historicalFact: 'Despite the devastating human crisis, corporate EBITDA margins expanded due to disciplined cost management.'
      },
      {
        checkpointIndex: 4,
        date: '01 Sep 2021',
        nifty: 17076,
        sensex: 57338,
        headline: 'Milestone Day: NIFTY 50 Breaches 17,000 Mark; Monthly Mutual Fund SIP Inflows Cross ₹10,000 Cr',
        newsSource: 'Economic Times',
        marketSentiment: 'Optimism',
        narrative: 'NIFTY surges past 17,000. Retail domestic investors have become the ultimate market stabilizing force, deploying over ₹10,000 Crore every single month via systematic investment plans (SIPs).',
        whatHappenedNext: 'Zomato, Paytm, Nykaa, and PolicyBazaar launched high-profile public offerings, driving speculative frenzy.',
        historicalFact: 'Indian active mutual fund folio counts crossed 100 million in September 2021.'
      },
      {
        checkpointIndex: 5,
        date: '18 Oct 2021',
        nifty: 18477,
        sensex: 61765,
        headline: 'All-Time Peak: NIFTY Touches 18,604; Analysts Warn of Stretched Valuations Above 24x Forward P/E',
        newsSource: 'Business Standard',
        marketSentiment: 'Euphoria',
        narrative: 'The NIFTY 50 hits 18,477—an 88% surge from June 2020. Global crude oil reaches $85/bbl, and the US Federal Reserve hints at upcoming interest rate hikes to fight stubborn inflation.',
        whatHappenedNext: 'Global markets entered an extended consolidation and correction phase through 2022 due to the Russia-Ukraine war and aggressive Fed rate increases.',
        historicalFact: 'The NIFTY 50 took nearly 14 months to decisively break above the October 2021 high.'
      }
    ],
    keyLessons: [
      'Remaining invested in high-quality equity assets during a recovery generates life-changing compounding returns.',
      'Timing tops and bottoms is nearly impossible; systematic investment plans (SIPs) capture bull runs without emotional stress.',
      'At peak euphoria, taking tactical profits or rebalancing to defensive asset classes protects hard-earned gains.'
    ]
  },
  {
    id: 'demonetization-trump-2016',
    title: '2016 Double Black Swan: Demonetization & Trump Shock',
    subtitle: 'NIFTY whipsaws through sudden domestic liquidity disruption and global geopolitical shocks.',
    period: 'Oct 2016 — May 2017',
    scenarioType: 'VOLATILITY',
    severity: 'High',
    dropPercentage: '-9.2% (Rapid Shock)',
    recoveryDuration: '5 Months',
    background: 'Prime Minister Narendra Modi announced the surprise invalidation of 86% of India’s circulating currency on the same night Donald Trump won the US Presidency.',
    context: 'Cash-dependent sectors like real estate, auto, and consumer staples collapsed 15-25% in days before formalization of the economy catalyzed a historic bull market.',
    totalSteps: 6,
    benchmark: 'NIFTY 50 Index',
    initialCash: 50000,
    initialUnits: 50000 / 8708,
    historicalDisclaimer: 'Historical prices and currency transition metrics validated from official Reserve Bank of India and NSE archives for the 2016-2017 demonetization period.',
    priceSeries: [
      { day: '24 Oct 2016', nifty: 8708, sensex: 28179, narrative: 'Pre-shock calm: Markets trade near 8,700 amidst festive sales season.' },
      { day: '09 Nov 2016', nifty: 8433, sensex: 27252, narrative: 'Double Shock Day: ₹500 & ₹1000 notes banned overnight; Trump wins US election.' },
      { day: '21 Nov 2016', nifty: 7929, sensex: 25765, narrative: 'Cash crunch peak: Queues outside banks; FIIs dump ₹15,000 Cr in 10 days.' },
      { day: '26 Dec 2016', nifty: 7908, sensex: 25807, narrative: 'Bottom of fear: Analysts slash FY17 GDP projections by 150 basis points.' },
      { day: '01 Feb 2017', nifty: 8716, sensex: 28141, narrative: 'Budget revival: Digital payments boom and capex spending revive sentiment.' },
      { day: '05 May 2017', nifty: 9377, sensex: 30188, narrative: 'New All-Time High: NIFTY breaches 9,300 as financialization of Indian savings gathers speed.' }
    ],
    checkpoints: [
      {
        checkpointIndex: 0,
        date: '24 Oct 2016',
        nifty: 8708,
        sensex: 28179,
        headline: 'Tata Sons Ousts Cyrus Mistry as Chairman; Festive Consumer Sales Show Sturdy Momentum',
        newsSource: 'The Economic Times',
        marketSentiment: 'Optimism',
        narrative: 'NIFTY is trading steady at 8,708. While corporate governance headlines surround the Tata Group, macroeconomic fundamentals appear calm with falling retail inflation and stable crude prices.',
        whatHappenedNext: 'Just two weeks later, two totally unexpected black swan events hit Dalal Street on the exact same evening.',
        historicalFact: 'Corporate earnings for Q2 FY17 were broadly in line with analyst projections prior to the November announcements.'
      },
      {
        checkpointIndex: 1,
        date: '09 Nov 2016',
        nifty: 8433,
        sensex: 27252,
        headline: 'Double Black Swan: PM Bans ₹500 & ₹1000 Notes at 8 PM; Donald Trump Wins US Presidential Election',
        newsSource: 'Mint Special Edition',
        marketSentiment: 'Extreme Fear',
        narrative: 'A morning of sheer chaos. 86% of the country’s circulating physical currency is voided overnight to combat black money. Simultaneously, Donald Trump’s victory causes US Treasury yields to spike and emerging market currencies to wobble.',
        whatHappenedNext: 'Real estate transactions came to a complete halt, and automotive dealerships reported an immediate 40% decline in footfalls.',
        historicalFact: 'NIFTY fell over 500 points in pre-open trade on November 9 before recovering slightly to close down 2.8%.'
      },
      {
        checkpointIndex: 2,
        date: '21 Nov 2016',
        nifty: 7929,
        sensex: 25765,
        headline: 'Nationwide Cash Crunch Deepens; FIIs Dump Record ₹15,000 Cr in Equities in 10 Days',
        newsSource: 'The Hindu',
        marketSentiment: 'Extreme Fear',
        narrative: 'NIFTY has tumbled to 7,929 (-8.9%). Long queues snaking outside bank branches dominate every newspaper front page. Foreign institutional investors sell relentlessly due to dollar strength and local uncertainty.',
        whatHappenedNext: 'Domestic institutional investors (DIIs), backed by steady retail SIP flows, began absorbing the massive FII sell-off.',
        historicalFact: 'DIIs bought ₹13,800 Crore of equities during November 2016, counteracting the foreign outflow.'
      },
      {
        checkpointIndex: 3,
        date: '26 Dec 2016',
        nifty: 7908,
        sensex: 25807,
        headline: 'Dalal Street Hits 7-Month Low as Global Rating Agencies Downgrade India FY17 GDP Growth',
        newsSource: 'Financial Chronicle',
        marketSentiment: 'Fear',
        narrative: 'Market pessimism reaches its zenith. Economists declare demonetization will trigger a prolonged recession. The NIFTY trades at 7,908—a 9.2% drop from October levels.',
        whatHappenedNext: 'December 26 marked the exact cyclical bottom. Bank deposits skyrocketed, forcing banks to slash lending rates and fueling a huge credit cycle.',
        historicalFact: 'Over ₹15.3 Lakh Crore in demonetized currency was deposited into Indian banks, creating historic excess banking liquidity.'
      },
      {
        checkpointIndex: 4,
        date: '01 Feb 2017',
        nifty: 8716,
        sensex: 28141,
        headline: 'Budget 2017: Arun Jaitley Cuts Personal Income Tax for Entry Bracket; Digital Economy Rebounds',
        newsSource: 'Business Standard',
        marketSentiment: 'Optimism',
        narrative: 'NIFTY rebounds all the way back to 8,716. UPI transactions have jumped 10x in three months. The formalization of the Indian economy is underway as unorganized sectors lose market share to organized listed leaders.',
        whatHappenedNext: 'Foreign investors reversed course and returned as aggressive net buyers into Indian equities.',
        historicalFact: 'UPI transaction volume grew from 3 million in Nov 2016 to over 30 million by March 2017.'
      },
      {
        checkpointIndex: 5,
        date: '05 May 2017',
        nifty: 9377,
        sensex: 30188,
        headline: 'NIFTY Crosses 9,300 for First Time in History; Dalal Street Gains 18.5% from Demonetization Lows',
        newsSource: 'Bloomberg News',
        marketSentiment: 'Euphoria',
        narrative: 'NIFTY hits 9,377—a new record high. Investors who panicking during the November 2016 cash crunch missed one of the most profitable structural bull transitions in emerging market history.',
        whatHappenedNext: 'The introduction of the Goods and Services Tax (GST) in July 2017 cemented the shift from informal to formal economy.',
        historicalFact: 'Bank savings deposits that flooded the system in late 2016 migrated into mutual funds, birthing India’s retail investing revolution.'
      }
    ],
    keyLessons: [
      'Structural disruptions create temporary panic, but high-quality businesses quickly adapt and gain market share from unorganized competitors.',
      'FII selling often creates once-in-a-decade entry points for disciplined long-term domestic investors.',
      'Liquid cash reserves allow you to capitalize on systemic headlines rather than being victimized by them.'
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
    newsCategory: 'RBI Policy',
    relevantStockOrSector: 'Banking, NBFCs, Real Estate (HDFC Bank, ICICI Bank, DLF)',
    marketSentiment: 'Bullish',
    whatHappened: 'The Reserve Bank of India’s Monetary Policy Committee voted to keep the policy repo rate unchanged at 6.50%. The central bank highlighted resilient domestic economic growth while keeping its policy stance focused on aligning inflation with its 4% target.',
    whyDidItHappen: 'Retail inflation showed signs of softening, but unpredictable weather conditions and vegetable prices continue to present upside risks. The RBI preferred keeping interest rates steady rather than rushing to cut.',
    whatDoesItMean: 'Home loan EMIs, vehicle loan rates, and fixed deposit interest rates will remain steady for consumers. Commercial banks can maintain healthy net interest margins without immediate pressure on deposit costs.',
    learnTheConcept: {
      conceptName: 'Repo Rate & Cost of Capital',
      definition: 'The Repo Rate is the benchmark interest rate at which the Reserve Bank of India lends short-term money to commercial banks. It directly anchors borrowing costs across the entire economy.',
      lessonRoute: '/learn',
      lessonTitle: 'Module 2: Macroeconomics, Central Banks & Market Liquidity',
      keyTakeaway: 'When repo rates are high, borrowing becomes expensive and economic overheating slows down; when rates fall, loans become cheaper, spurring business capex and consumer spending.'
    },
    understandTheRisk: 'An unchanged repo rate does not guarantee banking stocks will rally. If bond yields rise globally or loan growth slows down due to high borrowing costs, bank earnings can still disappoint investors.',
    knowledgeCheck: {
      question: 'When the RBI keeps the repo rate unchanged at 6.50%, what is the most direct short-term consequence for retail borrowers?',
      options: [
        'Existing floating-rate home loan EMIs generally remain at their current levels.',
        'Banks immediately slash savings account interest rates to zero.',
        'The stock market is guaranteed to experience a 10% crash.',
        'Gold prices automatically double overnight.'
      ],
      correctIndex: 0,
      explanation: 'Because floating-rate retail loans are pegged directly to the RBI External Benchmark Lending Rate (EBLR), keeping the repo rate steady keeps benchmark borrowing costs and monthly EMIs unchanged.'
    },
    plainEnglishTranslation: 'The RBI decided neither to hike nor to cut the base interest rate banks borrow at. They are keeping their powder dry while ensuring inflation stays anchored near 4%.',
    whyItMattersToYou: 'Your home loan EMIs and fixed deposit rates will remain stable. Banking stocks like HDFC Bank and ICICI Bank preserve their net interest margins.',
    impactedSectors: [
      { name: 'Banking & NBFCs', impact: 'positive', rationale: 'Stable margin environment without immediate squeeze on lending spreads.' },
      { name: 'Real Estate & Housing', impact: 'neutral', rationale: 'Home loan interest rates stay steady without further affordability headwinds.' },
      { name: 'Auto Sector', impact: 'neutral', rationale: 'Vehicle financing rates remain at current levels.' }
    ]
  },
  {
    id: 'news-2',
    headline: 'India CPI Inflation Cools to 4.85% in March as Food Prices Moderate',
    source: 'Ministry of Statistics & Programme Implementation / Mint',
    publishedAt: '4 hours ago',
    category: 'Macro Economy',
    newsCategory: 'Inflation & Rates',
    relevantStockOrSector: 'FMCG, Consumer Durables (Hindustan Unilever, ITC, Titan)',
    marketSentiment: 'Bullish',
    whatHappened: 'India’s annual retail inflation, measured by the Consumer Price Index (CPI), declined to a five-month low of 4.85% in March. Core inflation—which excludes volatile food and energy items—fell below 3.5%.',
    whyDidItHappen: 'A sustained winter harvest reduced the prices of pulses and key vegetables, while international edible oil prices remained subdued, relieving consumer grocery bills.',
    whatDoesItMean: 'When household inflation moderates, families have more disposable income left over for discretionary purchases like clothing, packaged snacks, electronics, and travel. It also opens room for the RBI to consider interest rate cuts later in the year.',
    learnTheConcept: {
      conceptName: 'Inflation & Real Purchasing Power',
      definition: 'Inflation is the rate at which the general level of prices for goods and services rises, eroding the purchasing power of money over time.',
      lessonRoute: '/learn',
      lessonTitle: 'Module 1: The Invisible Tax — How Inflation Compounds Against Savings',
      keyTakeaway: 'Stocks are one of the few asset classes that historically beat inflation over the long term because productive businesses can increase prices to protect profit margins.'
    },
    understandTheRisk: 'A drop in headline inflation does not mean corporate profits will automatically surge. If rural wage growth remains weak or unseasonal summer heat waves spike food costs again, consumer demand could quickly stagnate.',
    knowledgeCheck: {
      question: 'Why do fast-moving consumer goods (FMCG) companies like Hindustan Unilever benefit when retail inflation declines?',
      options: [
        'Consumers have greater purchasing power for everyday household items, and raw material packaging costs decrease.',
        'FMCG companies are legally prohibited from paying taxes during low inflation.',
        'Stock exchanges automatically double the share prices of consumer companies.',
        'Banks forgive all corporate debts when inflation reaches 4%.'
      ],
      correctIndex: 0,
      explanation: 'Lower inflation reduces input costs (like crude derivatives, palm oil, packaging) while leaving more purchasing power in consumers\' pockets, expanding sales volumes and profit margins.'
    },
    plainEnglishTranslation: 'Prices of everyday groceries and consumer goods rose at a slower speed in March, bringing headline inflation closer to the RBI’s comfort band.',
    whyItMattersToYou: 'Your grocery bills are stabilizing, and companies selling consumer goods see lower raw material costs.',
    impactedSectors: [
      { name: 'FMCG & Consumer Goods', impact: 'positive', rationale: 'Lower packaging and agricultural input costs lift gross margins.' },
      { name: 'Consumer Discretionary', impact: 'positive', rationale: 'Households have more spare savings for discretionary retail purchases.' }
    ]
  },
  {
    id: 'news-3',
    headline: 'TCS Q4 Net Profit Climbs 9% to ₹12,434 Cr on Record $13.2 Billion Deal Wins',
    source: 'The Economic Times',
    publishedAt: '5 hours ago',
    category: 'Earnings',
    newsCategory: 'Quarterly Results',
    relevantStockOrSector: 'Information Technology (TCS, Infosys, Wipro, HCLTech)',
    marketSentiment: 'Bullish',
    whatHappened: 'Tata Consultancy Services, India’s largest software exporter, posted a 9.1% year-on-year increase in quarterly net profit, accompanied by an operating margin expansion to 26% and an all-time record total contract value (TCV) of $13.2 Billion.',
    whyDidItHappen: 'Global banks, retailers, and airlines are outsourcing legacy IT infrastructure and consolidating enterprise cloud contracts into multi-year digital transformation partnerships.',
    whatDoesItMean: 'IT services represent a major portion of India’s benchmark indices (NIFTY 50 and SENSEX). Strong deal signings by the sector leader signal that enterprise technology spending is recovering despite global recession fears.',
    learnTheConcept: {
      conceptName: 'Operating Margin & Order Book (TCV)',
      definition: 'Operating Margin measures the percentage of profit a company produces from its core operations before interest and taxes. Order Book (TCV) shows the total dollar value of signed future contracts.',
      lessonRoute: '/learn',
      lessonTitle: 'Module 4: Reading Financial Statements — Balance Sheets and P&L for Beginners',
      keyTakeaway: 'Revenue growth alone can be misleading; investors look for expanding operating margins to confirm that a company can deliver profitable earnings growth.'
    },
    understandTheRisk: 'Signing a large total contract value ($13.2B) does not mean all revenue arrives immediately. If clients delay project rollouts or reduce discretionary consulting budgets later, realized revenue can fall below expectations.',
    knowledgeCheck: {
      question: 'What does a rising "Operating Margin" indicate about a company’s operational health?',
      options: [
        'The company is generating more operating profit per rupee of revenue, indicating strong pricing power and cost discipline.',
        'The company has taken on massive high-interest bank debt.',
        'The stock price is guaranteed to go up 20% by tomorrow.',
        'The company is planning to shut down its operations.'
      ],
      correctIndex: 0,
      explanation: 'Operating margin reflects the efficiency with which a business converts sales into profit after paying for salaries and operational costs, signaling operational strength.'
    },
    plainEnglishTranslation: 'TCS earned record profits and signed massive contracts with international clients, proving the resilience of the Indian software export sector.',
    whyItMattersToYou: 'IT index stocks represent nearly 14% of the NIFTY 50; strong earnings provide underlying support to equity mutual funds.',
    impactedSectors: [
      { name: 'IT Services & Software', impact: 'positive', rationale: 'Strong order pipeline provides revenue visibility for upcoming quarters.' }
    ]
  },
  {
    id: 'news-4',
    headline: 'Tata Motors Board Approves Demerger into Two Distinct Listed Entities for Commercial and Passenger Vehicles',
    source: 'Business Standard',
    publishedAt: '8 hours ago',
    category: 'Corporate Actions',
    newsCategory: 'Corporate Actions',
    relevantStockOrSector: 'Automotive (Tata Motors, Ashok Leyland, Mahindra & Mahindra)',
    marketSentiment: 'Bullish',
    whatHappened: 'The Board of Tata Motors approved a strategic demerger splitting the automobile conglomerate into two separate publicly traded companies: one focused on Commercial Vehicles (trucks and buses) and the other housing Passenger Vehicles, Electric Vehicles (EV), and Jaguar Land Rover (JLR).',
    whyDidItHappen: 'Commercial trucks and passenger passenger cars operate on totally different economic cycles, consumer behaviors, and capital requirements. Segregating them allows each management team to pursue independent growth strategies.',
    whatDoesItMean: 'Existing shareholders will receive shares in both independent listed companies without paying cash. Demergers often unlock value because specialized investors can choose which business model fits their risk appetite.',
    learnTheConcept: {
      conceptName: 'Corporate Demerger & Conglomerate Discount',
      definition: 'A demerger is the restructuring of a corporate conglomerate into two or more independent public companies. A conglomerate discount occurs when the market values a combined diversified company at less than the sum of its individual parts.',
      lessonRoute: '/learn',
      lessonTitle: 'Module 5: Corporate Actions — Dividends, Stock Splits, Rights Issues & Demergers',
      keyTakeaway: 'Demergers can remove the "conglomerate discount," allowing high-growth segments (like electric passenger vehicles) to command higher valuation multiples.'
    },
    understandTheRisk: 'A demerger does not eliminate business risks. If commercial truck demand falls due to a freight slowdown, or if Jaguar Land Rover faces supply chain issues abroad, the newly listed entity can still lose value.',
    knowledgeCheck: {
      question: 'What is a primary motivation for a large company to demerge its business into separate listed stocks?',
      options: [
        'To eliminate the conglomerate discount and allow each business to be valued based on its specific growth and profitability metrics.',
        'To prevent shareholders from receiving dividends forever.',
        'To hide financial losses from regulators and tax authorities.',
        'To reduce the total number of cars produced.'
      ],
      correctIndex: 0,
      explanation: 'Separating diverse businesses enables focused capital allocation, distinct management incentives, and market valuations that reflect the true worth of each operating segment.'
    },
    plainEnglishTranslation: 'Tata Motors is dividing into two separate stock market companies—one for trucks/buses and one for passenger cars/EVs/JLR—giving shareholders stock in both.',
    whyItMattersToYou: 'Investors holding Tata Motors shares will automatically receive shares in both companies, allowing cleaner evaluation of EV growth vs truck cycles.',
    impactedSectors: [
      { name: 'Automotive & EVs', impact: 'positive', rationale: 'Pure-play EV and luxury passenger business can attract dedicated global green investors.' }
    ]
  },
  {
    id: 'news-5',
    headline: 'NIFTY 50 Breaches 24,000 Milestone as India Market Cap Crosses $5 Trillion',
    source: 'CNBC-TV18',
    publishedAt: '12 hours ago',
    category: 'Stock Market',
    newsCategory: 'Stock Market',
    relevantStockOrSector: 'Broad Market (NIFTY 50, SENSEX, Midcap 150)',
    marketSentiment: 'Bullish',
    whatHappened: 'The benchmark NIFTY 50 index crossed the historic 24,000 level for the first time, propelled by continuous domestic retail SIP inflows and sustained political continuity following general elections.',
    whyDidItHappen: 'Domestic institutional investors (DIIs), supported by over ₹21,000 Crore in monthly SIP subscriptions from retail Indian citizens, absorbed foreign selling and drove valuations to fresh milestones.',
    whatDoesItMean: 'India has cemented its position as the fourth-largest equity market globally. However, the price-to-earnings (P/E) ratio has climbed above historical long-term averages, indicating that expectations for corporate earnings growth are very high.',
    learnTheConcept: {
      conceptName: 'Price-to-Earnings (P/E) Ratio & Valuation',
      definition: 'The Price-to-Earnings (P/E) ratio compares a company’s share price to its annual earnings per share. It tells investors how many rupees they are paying for every single rupee of company profit.',
      lessonRoute: '/learn',
      lessonTitle: 'Module 3: Stock Valuation & Fundamental Multiples for Beginners',
      keyTakeaway: 'A high P/E ratio means investors expect rapid future earnings growth; if that earnings growth fails to materialize, the stock is vulnerable to a sharp valuation contraction.'
    },
    understandTheRisk: 'Reaching milestone index levels often lures retail investors into speculative FOMO buying. When indices trade at stretched valuations, unexpected negative events can trigger sudden 5–10% corrections.',
    knowledgeCheck: {
      question: 'When an index trades at a significantly higher Price-to-Earnings (P/E) multiple than its 10-year historical average, what should a disciplined investor be cautious about?',
      options: [
        'Future earnings growth is already heavily priced in, leaving less margin of safety if companies miss profit estimates.',
        'High P/E means all stocks are legally required to double in price within 30 days.',
        'The stock exchange will automatically cancel all retail trading accounts.',
        'It indicates that company profits have dropped to zero.'
      ],
      correctIndex: 0,
      explanation: 'Elevated P/E ratios mean stocks are expensive relative to their current earnings. Any negative surprise in corporate profits can cause stock prices to tumble as valuations normalize.'
    },
    plainEnglishTranslation: 'Indian stock indices touched historic record highs, driven by millions of regular retail investors investing every month through mutual funds.',
    whyItMattersToYou: 'Your portfolio may look attractive today, but caution and disciplined asset allocation are critical to avoid chasing overpriced momentum stocks.',
    impactedSectors: [
      { name: 'Broad Market', impact: 'neutral', rationale: 'Valuations are rich; stock selection and earnings delivery become crucial.' }
    ]
  },
  {
    id: 'news-6',
    headline: 'Brent Crude Oil Falls to $72/bbl on Weak Global Manufacturing Demand',
    source: 'Reuters Commodities Desk',
    publishedAt: '14 hours ago',
    category: 'Global Signals',
    newsCategory: 'Global Signals',
    relevantStockOrSector: 'Oil Marketing, Paints, Aviation (Asian Paints, IndiGo, Bharat Petroleum)',
    marketSentiment: 'Bullish',
    whatHappened: 'Brent crude oil prices declined below $72 per barrel as economic data from major developed manufacturing economies indicated subdued industrial fuel consumption, outweighing Middle East geopolitical tensions.',
    whyDidItHappen: 'Global oil supply remained steady while demand projections in North America and East Asia were revised slightly downward by the International Energy Agency.',
    whatDoesItMean: 'India imports more than 85% of its crude oil requirements. A $10 drop in crude prices saves India approximately $10–12 Billion in foreign exchange annually, reducing import bills and stabilizing the Indian Rupee.',
    learnTheConcept: {
      conceptName: 'Current Account Deficit (CAD) & Input Cost Inflation',
      definition: 'The Current Account Deficit measures the gap between the value of goods and services a country imports versus what it exports. Cheaper crude dramatically narrows India’s trade deficit.',
      lessonRoute: '/learn',
      lessonTitle: 'Module 2: Macroeconomics — How Global Commodities Dictate Dalal Street',
      keyTakeaway: 'Crude oil is the single most critical global commodity for India; falling oil prices act as a direct tax cut for the Indian economy and corporate profit margins.'
    },
    understandTheRisk: 'Oil prices are notorious for sudden geopolitical volatility. A sudden supply disruption or production cut by OPEC+ can reverse crude oil prices back upward in hours, wiping out margin gains.',
    knowledgeCheck: {
      question: 'Why do paint manufacturing companies like Asian Paints benefit when crude oil prices decline significantly?',
      options: [
        'Petroleum derivatives comprise roughly 50% of the raw material cost required to manufacture paint products.',
        'Paint companies sell crude oil directly to retail petrol pumps.',
        'Customers are legally required to repaint their houses whenever oil prices fall.',
        'Falling oil prices cause bank interest rates to disappear.'
      ],
      correctIndex: 0,
      explanation: 'Solvents, resins, and packaging materials used in paint production are petroleum byproducts. Cheaper crude reduces production expenses, expanding gross operating margins.'
    },
    plainEnglishTranslation: 'International crude oil prices fell to $72, which is fantastic news for India’s economy and helps companies that manufacture paints, tyres, and airline flights.',
    whyItMattersToYou: 'Falling fuel and import costs ease domestic inflation, supporting the Indian Rupee and boosting consumer sector balance sheets.',
    impactedSectors: [
      { name: 'Paints & Coatings', impact: 'positive', rationale: 'Direct cost reduction in titanium dioxide and solvent raw materials.' },
      { name: 'Aviation', impact: 'positive', rationale: 'Aviation turbine fuel expenses decline directly.' },
      { name: 'Upstream Oil Producers (ONGC)', impact: 'negative', rationale: 'Lower realized crude price per barrel extracted.' }
    ]
  },
  {
    id: 'news-7',
    headline: 'India VIX Spikes 28% in a Week as Options Traders Hedge Ahead of Major Verdict',
    source: 'National Stock Exchange / Bloomberg',
    publishedAt: '18 hours ago',
    category: 'Stock Market',
    newsCategory: 'Stock Market',
    relevantStockOrSector: 'Derivatives, High-Beta Shares (PSU Banks, Infrastructure)',
    marketSentiment: 'Neutral',
    whatHappened: 'The INDIA VIX index—often called the stock market’s "fear gauge"—surged 28% over five sessions to reach 21.4, indicating that institutional investors are paying steep premiums for options contracts to protect their portfolios against sudden price swings.',
    whyDidItHappen: 'Upcoming political election results and Union Budget policy announcements created short-term uncertainty, prompting large fund managers to buy put options as insurance.',
    whatDoesItMean: 'A high VIX means market participants expect significant daily percentage swings. It does not mean the market is doomed to fall, but rather that price volatility and intraday wild whipsaws will be pronounced.',
    learnTheConcept: {
      conceptName: 'India VIX & Market Volatility',
      definition: 'The Volatility Index (VIX) measures the stock market’s expectation of 30-day forward volatility based on order prices in NIFTY options contracts. A higher VIX reflects elevated uncertainty.',
      lessonRoute: '/learn',
      lessonTitle: 'Module 6: Managing Volatility — How to Protect Capital During Wild Swings',
      keyTakeaway: 'Spikes in VIX often signal peak market anxiety. Historically, periods of extreme VIX spikes frequently coincided with prime buying opportunities for patient long-term investors.'
    },
    understandTheRisk: 'High volatility can easily trigger stop-loss orders in leveraged accounts. Trading aggressively during VIX spikes without strict risk limits is the fastest way beginners destroy capital.',
    knowledgeCheck: {
      question: 'What does a sharp surge in the INDIA VIX index primarily signify?',
      options: [
        'Market participants expect large price swings and are paying more for options insurance due to uncertainty.',
        'The Indian economy has officially entered a guaranteed five-year recession.',
        'Stock exchanges will reduce trading hours to 1 hour per day.',
        'All listed companies are required to halt quarterly dividend payments.'
      ],
      correctIndex: 0,
      explanation: 'VIX is derived from options pricing. When uncertainty rises, demand for insurance pushes up option premiums, causing the VIX to spike as expected price volatility increases.'
    },
    plainEnglishTranslation: 'The stock market\'s "fear gauge" surged, meaning traders expect roller-coaster price swings in the days ahead due to key upcoming political events.',
    whyItMattersToYou: 'Expect sharp day-to-day fluctuations in your portfolio. Avoid panic selling during sudden intraday drops.',
    impactedSectors: [
      { name: 'High-Beta Sectors', impact: 'neutral', rationale: 'Heightened sensitivity to short-term headlines and policy shifts.' }
    ]
  },
  {
    id: 'news-8',
    headline: 'Indian Rupee Depreciates to 83.55 Against US Dollar on Persistent Foreign Bond Yield Strength',
    source: 'Financial Express',
    publishedAt: '1 day ago',
    category: 'Global Signals',
    newsCategory: 'Global Signals',
    relevantStockOrSector: 'IT Exporters, Pharma, Importers (TCS, Sun Pharma, Electronics)',
    marketSentiment: 'Neutral',
    whatHappened: 'The Indian Rupee touched 83.55 per US dollar in interbank currency trade before active foreign exchange intervention by the Reserve Bank of India stabilized the currency near 83.48.',
    whyDidItHappen: 'Strong economic data in the United States pushed 10-year US Treasury bond yields above 4.40%, attracting global institutional capital back into US dollar-denominated assets.',
    whatDoesItMean: 'A weaker Rupee is a double-edged sword: it boosts the profit realizations of Indian export companies like IT and Pharmaceuticals that earn in US dollars, while making imported goods like petroleum, electronics, and overseas education more costly.',
    learnTheConcept: {
      conceptName: 'Currency Depreciation & Export Hedging',
      definition: 'Currency depreciation is the fall in the value of a nation’s currency relative to foreign currencies. When the USD/INR rises, one dollar buys more rupees.',
      lessonRoute: '/learn',
      lessonTitle: 'Module 2: Currency Dynamics — Exporters, Importers and Forex Reserves',
      keyTakeaway: 'Export-heavy sectors (IT and Pharma) benefit from a weaker rupee because their dollar billings translate into higher rupee revenues without extra operational effort.'
    },
    understandTheRisk: 'While a weaker rupee benefits IT and Pharma, prolonged currency depreciation can trigger imported inflation in energy and fertilizer, prompting central banks to keep interest rates elevated.',
    knowledgeCheck: {
      question: 'Why does a depreciation of the Indian Rupee against the US Dollar generally benefit Indian IT service companies like Infosys and TCS?',
      options: [
        'They bill global clients in US Dollars, so every dollar of revenue converts into more Indian Rupees on their balance sheets.',
        'They are exempted from paying employee salaries when the rupee falls.',
        'American companies are forced to double their software contracts by law.',
        'The Indian government pays IT companies a direct cash subsidy whenever the rupee drops.'
      ],
      correctIndex: 0,
      explanation: 'Indian IT firms generate 80-90% of their revenues in foreign currencies (primarily USD and Euro) while incurring the majority of their salary expenses in Rupees, boosting profitability when the dollar strengthens.'
    },
    plainEnglishTranslation: 'The US Dollar strengthened globally, causing the Indian Rupee to soften slightly. This helps Indian IT companies that earn in dollars, but raises costs for imported fuel.',
    whyItMattersToYou: 'If you invest in IT mutual funds, currency depreciation provides an earnings tailwind; for foreign travel or imported gadgets, expenses tick upward.',
    impactedSectors: [
      { name: 'IT & Software Exporters', impact: 'positive', rationale: 'Forex translation gains lift operating margins.' },
      { name: 'Pharmaceutical Exporters', impact: 'positive', rationale: 'US generic drug sales convert to higher rupee revenues.' },
      { name: 'Electronics & Mobile Importers', impact: 'negative', rationale: 'Higher component procurement costs in USD.' }
    ]
  }
];

export const CHALLENGE_QUESTS: ChallengeQuest[] = [
  // Daily Quests
  {
    id: 'quest-daily-1',
    title: 'Daily Macro Event Drill',
    category: 'Analysis',
    frequency: 'DAILY',
    rewardXP: 50,
    badgeName: 'Curious Mind',
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: false,
    description: 'Read 1 plain-English market event in the AI News Explainer and complete the knowledge check.',
    actionRoute: '/news-explainer',
    actionLabel: 'Open News Explainer'
  },
  {
    id: 'quest-daily-2',
    title: 'Pre-Trade Reality Inspection',
    category: 'Risk Management',
    frequency: 'DAILY',
    rewardXP: 60,
    badgeName: 'Risk Aware',
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: false,
    description: 'Inspect a proposed simulated trade with the Risk Reality Check to examine hypothetical drawdown scenarios.',
    actionRoute: '/simulator',
    actionLabel: 'Launch Simulator'
  },
  {
    id: 'quest-daily-3',
    title: 'Decision Thesis Log',
    category: 'Mindset',
    frequency: 'DAILY',
    rewardXP: 40,
    badgeName: 'Thoughtful Trader',
    progress: 0,
    maxProgress: 1,
    completed: false,
    claimed: false,
    description: 'Commit a structured reasoning tag to your trading journal before executing any virtual order.',
    actionRoute: '/simulator',
    actionLabel: 'Log Trade Thesis'
  },

  // Weekly Quests
  {
    id: 'quest-weekly-1',
    title: 'Sector Diversification Master',
    category: 'Execution',
    frequency: 'WEEKLY',
    rewardXP: 150,
    badgeName: 'Balanced Portfolio',
    progress: 4,
    maxProgress: 4,
    completed: true,
    claimed: true,
    description: 'Hold stocks across at least 4 distinct economic sectors without exceeding 35% in any single industry.',
    actionRoute: '/portfolio',
    actionLabel: 'Audit Portfolio'
  },
  {
    id: 'quest-weekly-2',
    title: 'Time Machine Crisis Survival',
    category: 'Mindset',
    frequency: 'WEEKLY',
    rewardXP: 200,
    badgeName: 'Crisis Veteran',
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: false,
    description: 'Complete 1 historical market replay scenario without liquidating into panic cash at the market trough.',
    actionRoute: '/market-replay',
    actionLabel: 'Replay Crisis'
  },
  {
    id: 'quest-weekly-3',
    title: 'Behavioral Bias Audit',
    category: 'Mindset',
    frequency: 'WEEKLY',
    rewardXP: 100,
    badgeName: 'Bias Hunter',
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: true,
    description: 'Examine your 5-pillar behavioral score and complete an educational practice drill on loss chasing or FOMO.',
    actionRoute: '/behavioral-insights',
    actionLabel: 'Review Radar'
  },

  // Special Milestones
  {
    id: 'quest-milestone-1',
    title: 'The Disciplined Investor',
    category: 'Risk Management',
    frequency: 'MILESTONE',
    rewardXP: 250,
    badgeName: 'Risk Guardian',
    progress: 3,
    maxProgress: 5,
    completed: false,
    claimed: false,
    description: 'Execute 5 simulated trades with a pre-configured stop-loss order.',
    actionRoute: '/simulator',
    actionLabel: 'Practice Stop-Loss'
  },
  {
    id: 'quest-milestone-2',
    title: 'Survivor of March 2020',
    category: 'Mindset',
    frequency: 'MILESTONE',
    rewardXP: 400,
    badgeName: 'Diamond Nerves',
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: false,
    description: 'Complete the COVID-19 Historical Crash replay scenario without panic-selling at the bottom.',
    actionRoute: '/market-replay',
    actionLabel: 'Time Machine'
  },
  {
    id: 'quest-milestone-3',
    title: 'Fundamental Sleuth',
    category: 'Analysis',
    frequency: 'MILESTONE',
    rewardXP: 200,
    badgeName: 'Valuation Analyst',
    progress: 2,
    maxProgress: 4,
    completed: false,
    claimed: false,
    description: 'Complete the Fundamental Analysis course module and pass the P/E Ratio interactive checkpoint.',
    actionRoute: '/learn',
    actionLabel: 'Start Module'
  },
  {
    id: 'quest-milestone-4',
    title: 'FOMO Resistance Drill',
    category: 'Mindset',
    frequency: 'MILESTONE',
    rewardXP: 350,
    badgeName: 'Stoic Mind',
    progress: 8,
    maxProgress: 10,
    completed: false,
    claimed: false,
    description: 'Refrain from placing market orders on stocks that have already gapped up more than +3% on the day.',
    actionRoute: '/simulator',
    actionLabel: 'Observe Discipline'
  }
];

export const ACHIEVEMENT_BADGES: AchievementBadge[] = [
  {
    id: 'badge-1',
    title: 'First Lesson',
    description: 'Completed your first structured educational module in the Learn Center.',
    category: 'Knowledge',
    unlocked: true,
    unlockedAt: '18 Nov 2026',
    requirement: 'Finish Module 1: Market Foundations',
    rarity: 'Common'
  },
  {
    id: 'badge-2',
    title: 'Risk Awareness',
    description: 'Ran a Pre-Trade Risk Reality Check to evaluate hypothetical drawdowns before committing virtual capital.',
    category: 'Risk',
    unlocked: true,
    unlockedAt: '20 Nov 2026',
    requirement: 'Perform 1 Pre-Trade Stress Test',
    rarity: 'Common'
  },
  {
    id: 'badge-3',
    title: 'Diversification Master',
    description: 'Constructed an equity portfolio spanning 4+ sectors with no single stock exceeding 35% weight.',
    category: 'Diversification',
    unlocked: true,
    unlockedAt: '22 Nov 2026',
    requirement: 'Hold 4 sectors with <35% max weight',
    rarity: 'Rare'
  },
  {
    id: 'badge-4',
    title: 'Market Historian',
    description: 'Experienced past Dalal Street crashes in blind mode and completed post-scenario debriefs.',
    category: 'History',
    unlocked: true,
    unlockedAt: '23 Nov 2026',
    requirement: 'Complete 2 Historical Replay Scenarios',
    rarity: 'Rare'
  },
  {
    id: 'badge-5',
    title: 'Disciplined Decision Maker',
    description: 'Maintained an objective Behavioral Discipline Score above 80 points across 10 simulated sessions.',
    category: 'Discipline',
    unlocked: false,
    requirement: 'Maintain 80+ Behavioral Discipline Score',
    rarity: 'Epic'
  },
  {
    id: 'badge-6',
    title: 'Simulation Graduate',
    description: 'Passed all curriculum assessments and executed 10 responsible paper trades with defined stop-losses.',
    category: 'Knowledge',
    unlocked: false,
    requirement: 'Complete 6 Course Modules + 10 Stop-Loss Trades',
    rarity: 'Legendary'
  },
  {
    id: 'badge-7',
    title: 'Bias Hunter',
    description: 'Audited simulated ledger and recognized a loss-chasing or FOMO habit before it caused drawdowns.',
    category: 'Discipline',
    unlocked: true,
    unlockedAt: '23 Nov 2026',
    requirement: 'Resolve 1 behavioral risk pattern',
    rarity: 'Rare'
  },
  {
    id: 'badge-8',
    title: 'Stoic Investor',
    description: 'Avoided buying during 5 momentum breakout traps and waited for valuation pullback entries.',
    category: 'Discipline',
    unlocked: false,
    requirement: 'Pass 5 FOMO resistance checkpoints',
    rarity: 'Epic'
  }
];

export const ETHICAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    id: 'user-1',
    name: 'Priya M.',
    city: 'Mumbai',
    levelName: 'Portfolio Builder',
    levelNumber: 4,
    xp: 1840,
    disciplineScore: 94,
    badgesCount: 7,
    streakDays: 14
  },
  {
    rank: 2,
    id: 'user-2',
    name: 'Rohan S.',
    city: 'Bengaluru',
    levelName: 'Portfolio Builder',
    levelNumber: 4,
    xp: 1710,
    disciplineScore: 91,
    badgesCount: 6,
    streakDays: 11
  },
  {
    rank: 3,
    id: 'user-3',
    name: 'You (MINDMARK Explorer)',
    city: 'New Delhi',
    levelName: 'Risk Navigator',
    levelNumber: 3,
    xp: 1150,
    disciplineScore: 86,
    badgesCount: 5,
    streakDays: 5,
    isCurrentUser: true
  },
  {
    rank: 4,
    id: 'user-4',
    name: 'Ananya V.',
    city: 'Pune',
    levelName: 'Risk Navigator',
    levelNumber: 3,
    xp: 1080,
    disciplineScore: 88,
    badgesCount: 4,
    streakDays: 8
  },
  {
    rank: 5,
    id: 'user-5',
    name: 'Karthik N.',
    city: 'Hyderabad',
    levelName: 'Financial Learner',
    levelNumber: 2,
    xp: 590,
    disciplineScore: 82,
    badgesCount: 3,
    streakDays: 4
  },
  {
    rank: 6,
    id: 'user-6',
    name: 'Deepak T.',
    city: 'Chennai',
    levelName: 'Financial Learner',
    levelNumber: 2,
    xp: 520,
    disciplineScore: 79,
    badgesCount: 3,
    streakDays: 3
  }
];
