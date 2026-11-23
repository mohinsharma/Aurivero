export type IndianExchange = 'NSE' | 'BSE';

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: IndianExchange;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: string;
  marketCap: string;
  pe: number;
  sector: string;
  sparkline: number[];
  riskRating: 'Low' | 'Moderate' | 'High';
  description: string;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  sector: string;
  purchaseDate: string;
  stopLoss?: number;
  targetPrice?: number;
  tradeReason?: string;
}

export interface TradeOrder {
  id: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  productType?: 'CNC' | 'MIS_LEVERAGED' | 'OPTIONS';
  leverageMultiplier?: number;
  optionType?: 'CALL' | 'PUT';
  strikePrice?: number;
  quantity: number;
  price: number;
  status: 'EXECUTED' | 'PENDING' | 'CANCELLED';
  timestamp: string;
  totalValue: number;
  charges?: number;
  reasonTag: string;
  stopLoss?: number;
  targetPrice?: number;
  learningMoment?: string;
  riskChecksTriggered?: string[];
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  status: 'Open' | 'Closed';
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  type: 'concept' | 'interactive' | 'quiz';
  description: string;
}

export interface CourseModule {
  id: string;
  trackId: string;
  trackTitle: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  icon: string;
  description: string;
  progress: number;
  lessons: CourseLesson[];
  keyTakeaway: string;
}

export interface BehavioralScore {
  fomoIndex: number;          // 0-100 (lower is better)
  panicSellingIndex: number;  // 0-100 (lower is better)
  lossAversionIndex: number;  // 0-100 (balanced is best)
  disciplineScore: number;    // 0-100 (higher is better)
  overallHealth: number;      // 0-100
  recentObservations: {
    type: 'positive' | 'warning' | 'alert';
    title: string;
    description: string;
    actionableTip: string;
    timestamp: string;
  }[];
}

export interface ReplayCheckpoint {
  checkpointIndex: number;
  date: string;
  nifty: number;
  sensex: number;
  headline: string;
  newsSource: string;
  marketSentiment: 'Extreme Fear' | 'Fear' | 'Uncertainty' | 'Optimism' | 'Euphoria';
  narrative: string;
  whatHappenedNext: string;
  historicalFact: string;
}

export interface ReplayUserDecision {
  checkpointIndex: number;
  date: string;
  actionId: 'AGGRESSIVE_BUY' | 'MODERATE_BUY' | 'HOLD' | 'REDUCE_EXPOSURE' | 'PANIC_EXIT';
  actionLabel: string;
  reasoning: string;
  portfolioValueBefore: number;
  cashBefore: number;
  unitsBefore: number;
  portfolioValueAfter: number;
  cashAfter: number;
  unitsAfter: number;
  indexPriceAtDecision: number;
  nextIndexPrice?: number;
  periodPnlPercent?: number;
}

export interface ReplayEvent {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  scenarioType: 'CRASH' | 'CRISIS' | 'RECOVERY' | 'VOLATILITY';
  severity: 'Extreme' | 'High' | 'Moderate';
  dropPercentage: string;
  recoveryDuration: string;
  background: string;
  context: string;
  totalSteps: number;
  benchmark: string;
  initialCash: number;
  initialUnits: number;
  priceSeries: { day: string; nifty: number; sensex: number; narrative: string }[];
  checkpoints: ReplayCheckpoint[];
  keyLessons: string[];
  historicalDisclaimer: string;
}

export type NewsCategory =
  | 'All'
  | 'Stock Market'
  | 'RBI Policy'
  | 'Inflation & Rates'
  | 'Quarterly Results'
  | 'Corporate Actions'
  | 'Global Signals';

export interface MarketNewsItem {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  category: string;
  newsCategory: 'Stock Market' | 'RBI Policy' | 'Inflation & Rates' | 'Quarterly Results' | 'Corporate Actions' | 'Global Signals';
  relevantStockOrSector: string;
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  whatHappened: string;
  whyDidItHappen: string;
  whatDoesItMean: string;
  learnTheConcept: {
    conceptName: string;
    definition: string;
    lessonRoute: string;
    lessonTitle: string;
    keyTakeaway: string;
  };
  understandTheRisk: string;
  knowledgeCheck: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  plainEnglishTranslation?: string;
  whyItMattersToYou?: string;
  impactedSectors?: { name: string; impact: 'positive' | 'negative' | 'neutral'; rationale: string }[];
}

export interface ChallengeQuest {
  id: string;
  title: string;
  category: 'Risk Management' | 'Analysis' | 'Mindset' | 'Execution';
  frequency?: 'DAILY' | 'WEEKLY' | 'MILESTONE';
  rewardXP: number;
  badgeName: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  claimed?: boolean;
  description: string;
  actionRoute?: string;
  actionLabel?: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  category: 'Risk' | 'Knowledge' | 'Discipline' | 'History' | 'Diversification';
  unlocked: boolean;
  unlockedAt?: string;
  requirement: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  city: string;
  levelName: string;
  levelNumber: number;
  xp: number;
  disciplineScore: number;
  badgesCount: number;
  streakDays: number;
  isCurrentUser?: boolean;
}

export interface UserAssessment {
  experienceLevel: string;
  riskTolerance: string;
  investmentHorizon: string;
  primaryGoal: string;
  completedAt?: string;
  knowledgeScore?: number;
  totalQuestions?: number;
  riskAwarenessScore?: number;
  marketFamiliarityScore?: number;
  emotionalAwarenessScore?: number;
  diversificationScore?: number;
  assignedPath?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  recommendedModule?: string;
  estimatedTime?: string;
  firstChallenge?: string;
}
