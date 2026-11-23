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
  quantity: number;
  price: number;
  status: 'EXECUTED' | 'PENDING' | 'CANCELLED';
  timestamp: string;
  totalValue: number;
  reasonTag: string;
  stopLoss?: number;
  targetPrice?: number;
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

export interface ReplayEvent {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  severity: 'Extreme' | 'High' | 'Moderate';
  dropPercentage: string;
  recoveryDuration: string;
  background: string;
  context: string;
  totalSteps: number;
  benchmark: string;
  priceSeries: { day: string; nifty: number; sensex: number; narrative: string }[];
  keyLessons: string[];
}

export interface MarketNewsItem {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  category: 'Macro Economy' | 'Earnings' | 'Policy' | 'Global Signals';
  plainEnglishTranslation: string;
  whyItMattersToYou: string;
  impactedSectors: { name: string; impact: 'positive' | 'negative' | 'neutral'; rationale: string }[];
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

export interface ChallengeQuest {
  id: string;
  title: string;
  category: 'Risk Management' | 'Analysis' | 'Mindset' | 'Execution';
  rewardXP: number;
  badgeName: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  description: string;
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
