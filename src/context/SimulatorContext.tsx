import React, { createContext, useContext, useState, useEffect } from 'react';
import { PortfolioPosition, TradeOrder, BehavioralScore, UserAssessment, StockQuote } from '../types';
import { POPULAR_INDIAN_STOCKS } from '../data/mockData';

interface SimulatorContextType {
  virtualCash: number;
  startingCapital: number;
  positions: PortfolioPosition[];
  orderHistory: TradeOrder[];
  stocks: StockQuote[];
  behavioralScore: BehavioralScore;
  assessment: UserAssessment | null;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  executeTrade: (params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT';
    productType?: 'CNC' | 'MIS_LEVERAGED' | 'OPTIONS';
    leverageMultiplier?: number;
    limitPrice?: number;
    stopLoss?: number;
    targetPrice?: number;
    reasonTag: string;
    riskChecksTriggered?: string[];
  }) => { success: boolean; message: string; learningMoment?: string };
  squareOffPosition: (positionId: string) => { success: boolean; message: string; learningMoment?: string };
  resetPortfolio: () => void;
  saveAssessment: (assessment: UserAssessment) => void;
  totalPortfolioValue: number;
  totalInvested: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayPnL: number;
}

const DEFAULT_STARTING_CASH = 100000; // ₹1,00,000 (1 Lakh Virtual INR)

const INITIAL_POSITIONS: PortfolioPosition[] = [
  {
    id: 'pos-1',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    quantity: 10,
    averageBuyPrice: 2890.00,
    currentPrice: 2985.40,
    totalCost: 28900.00,
    currentValue: 29854.00,
    unrealizedPnL: 954.00,
    unrealizedPnLPercent: 3.30,
    sector: 'Energy & Retail',
    purchaseDate: '2026-11-18',
    stopLoss: 2820.00,
    targetPrice: 3150.00,
    tradeReason: 'Long-term Retail & Telecom 5G monetization'
  },
  {
    id: 'pos-2',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    quantity: 12,
    averageBuyPrice: 1650.00,
    currentPrice: 1642.80,
    totalCost: 19800.00,
    currentValue: 19713.60,
    unrealizedPnL: -86.40,
    unrealizedPnLPercent: -0.44,
    sector: 'Banking & Financials',
    purchaseDate: '2026-11-20',
    stopLoss: 1610.00,
    targetPrice: 1800.00,
    tradeReason: 'Post-merger valuation catchup'
  }
];

const INITIAL_ORDERS: TradeOrder[] = [
  {
    id: 'ord-101',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    type: 'BUY',
    orderType: 'MARKET',
    quantity: 12,
    price: 1650.00,
    status: 'EXECUTED',
    timestamp: '2026-11-20 10:14 IST',
    totalValue: 19800.00,
    charges: 9.90,
    reasonTag: 'Value Buy at Support',
    stopLoss: 1610.00,
    targetPrice: 1800.00,
    learningMoment: 'Your purchase increased your exposure to Banking & Financials.'
  },
  {
    id: 'ord-102',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    type: 'BUY',
    orderType: 'MARKET',
    quantity: 10,
    price: 2890.00,
    status: 'EXECUTED',
    timestamp: '2026-11-18 11:30 IST',
    totalValue: 28900.00,
    charges: 14.45,
    reasonTag: 'Structural Breakout',
    stopLoss: 2820.00,
    targetPrice: 3150.00,
    learningMoment: 'Your cash allocation is now lower. This reduces your flexibility for future simulated opportunities.'
  }
];

const INITIAL_BEHAVIORAL_SCORE: BehavioralScore = {
  fomoIndex: 18,
  panicSellingIndex: 12,
  lossAversionIndex: 25,
  disciplineScore: 86,
  overallHealth: 88,
  recentObservations: [
    {
      type: 'positive',
      title: 'Healthy Stop-Loss Adherence',
      description: 'You set clear stop-loss exits on 100% of your current open positions.',
      actionableTip: 'Keep maintaining strict downside limits to preserve emotional capital.',
      timestamp: 'Today, 11:30 AM'
    },
    {
      type: 'positive',
      title: 'Prudent Sector Diversification',
      description: 'Your capital is spread across Energy, IT, and Banking, with no sector exceeding 40%.',
      actionableTip: 'Consider exploring FMCG or Healthcare to further damp cyclical volatility.',
      timestamp: 'Yesterday, 03:15 PM'
    },
    {
      type: 'warning',
      title: 'Holding a Losing Position (HDFC Bank -1.9%)',
      description: 'Your stop-loss at ₹1,610 is intact, but observe whether you feel the urge to average down impulsively.',
      actionableTip: 'Never average down on a trade unless your original thesis explicitly accommodated multiple tranches.',
      timestamp: '2 days ago'
    }
  ]
};

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [virtualCash, setVirtualCash] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bullseye_cash');
      const parsed = saved ? parseFloat(saved) : NaN;
      return !isNaN(parsed) && parsed >= 0 ? parsed : 51300.00; // Remaining cash after mock initial buys (total ₹1,00,000)
    } catch {
      return 51300.00;
    }
  });

  const [positions, setPositions] = useState<PortfolioPosition[]>(() => {
    try {
      const saved = localStorage.getItem('bullseye_positions');
      return saved ? JSON.parse(saved) : INITIAL_POSITIONS;
    } catch {
      return INITIAL_POSITIONS;
    }
  });

  const [orderHistory, setOrderHistory] = useState<TradeOrder[]>(() => {
    try {
      const saved = localStorage.getItem('bullseye_orders');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [stocks] = useState<StockQuote[]>(POPULAR_INDIAN_STOCKS);
  const [behavioralScore, setBehavioralScore] = useState<BehavioralScore>(INITIAL_BEHAVIORAL_SCORE);
  const [assessment, setAssessment] = useState<UserAssessment | null>(() => {
    try {
      const saved = localStorage.getItem('bullseye_assessment');
      return saved ? JSON.parse(saved) : {
        experienceLevel: 'Level 1: Market Explorer',
        riskTolerance: 'Moderate',
        investmentHorizon: 'Medium (1-3 Years)',
        primaryGoal: 'Learn without losing real money',
        completedAt: '2026-11-24',
        knowledgeScore: 75,
        assignedPath: 'BEGINNER'
      };
    } catch {
      return null;
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('aurivero_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('aurivero_theme', theme);
    } catch {
      // Ignore storage write errors
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  useEffect(() => {
    try {
      localStorage.setItem('bullseye_cash', virtualCash.toString());
      localStorage.setItem('bullseye_positions', JSON.stringify(positions));
      localStorage.setItem('bullseye_orders', JSON.stringify(orderHistory));
    } catch (e) {
      console.warn('Could not persist simulator state:', e);
    }
  }, [virtualCash, positions, orderHistory]);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  const totalInvested = positions.reduce((acc, pos) => acc + (pos.totalCost || 0), 0);
  const totalHoldingsValue = positions.reduce((acc, pos) => acc + ((pos.quantity || 0) * (pos.currentPrice || 0)), 0);
  const totalPortfolioValue = virtualCash + totalHoldingsValue;
  const unrealizedPnL = totalHoldingsValue - totalInvested;
  const unrealizedPnLPercent = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;
  const dayPnL = 1245.50; // Mock current session gain

  const executeTrade = ({
    symbol,
    type,
    quantity,
    orderType,
    productType = 'CNC',
    leverageMultiplier = 1,
    limitPrice,
    stopLoss,
    targetPrice,
    reasonTag,
    riskChecksTriggered,
  }: {
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT';
    productType?: 'CNC' | 'MIS_LEVERAGED' | 'OPTIONS';
    leverageMultiplier?: number;
    limitPrice?: number;
    stopLoss?: number;
    targetPrice?: number;
    reasonTag: string;
    riskChecksTriggered?: string[];
  }) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return { success: false, message: 'Stock not found' };

    const executionPrice = orderType === 'LIMIT' && limitPrice ? limitPrice : stock.price;
    const grossTradeValue = executionPrice * quantity;
    // If educational leverage is applied (e.g. 5x), required margin is grossTradeValue / leverageMultiplier
    const marginRequired = productType === 'MIS_LEVERAGED' && leverageMultiplier > 1
      ? grossTradeValue / leverageMultiplier
      : grossTradeValue;

    const tradeValue = grossTradeValue;
    const simulatedCharges = Math.max(5, Math.round(tradeValue * 0.0005 * 100) / 100);

    let learningMoment = '';

    if (type === 'BUY') {
      const totalRequired = marginRequired + simulatedCharges;
      if (totalRequired > virtualCash) {
        return {
          success: false,
          message: `Insufficient virtual cash. Required: ₹${totalRequired.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, Available: ₹${virtualCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        };
      }

      setVirtualCash(prev => prev - totalRequired);

      // Determine Educational Learning Moment
      if (stock.changePercent > 1.5) {
        learningMoment = `Buying after a sharp price increase (${stock.symbol} +${stock.changePercent.toFixed(2)}%) can expose you to momentum risk. Consider what information supports your decision.`;
      } else if (!stopLoss) {
        learningMoment = `You placed a trade without defining a stop-loss boundary. Pre-determining your maximum acceptable loss protects you from emotional paralysis if the stock drops.`;
      } else if (tradeValue > virtualCash * 0.4) {
        learningMoment = `Your cash allocation is now significantly lower. This reduces your flexibility for future simulated opportunities.`;
      } else {
        learningMoment = `Your purchase increased your exposure to the ${stock.sector} sector. Ensure your overall virtual portfolio maintains multi-sector diversification.`;
      }

      // Add to or update positions
      setPositions(prev => {
        const existing = prev.find(p => p.symbol === symbol);
        if (existing) {
          const totalQty = existing.quantity + quantity;
          const newCost = existing.totalCost + tradeValue;
          const avgPrice = newCost / totalQty;
          return prev.map(p => p.symbol === symbol ? {
            ...p,
            quantity: totalQty,
            averageBuyPrice: avgPrice,
            totalCost: newCost,
            currentValue: totalQty * stock.price,
            unrealizedPnL: (totalQty * stock.price) - newCost,
            unrealizedPnLPercent: (((totalQty * stock.price) - newCost) / newCost) * 100,
            stopLoss: stopLoss || p.stopLoss,
            targetPrice: targetPrice || p.targetPrice,
            tradeReason: reasonTag
          } : p);
        } else {
          const newPos: PortfolioPosition = {
            id: `pos-${Date.now()}`,
            symbol: stock.symbol,
            name: stock.name,
            quantity,
            averageBuyPrice: executionPrice,
            currentPrice: stock.price,
            totalCost: tradeValue,
            currentValue: tradeValue,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
            sector: stock.sector,
            purchaseDate: new Date().toISOString().split('T')[0],
            stopLoss,
            targetPrice,
            tradeReason: reasonTag
          };
          return [...prev, newPos];
        }
      });

      // Update behavioral score if stop loss wasn't provided
      if (!stopLoss) {
        setBehavioralScore(prev => ({
          ...prev,
          disciplineScore: Math.max(40, prev.disciplineScore - 4),
          recentObservations: [
            {
              type: 'warning',
              title: `Unhedged Trade Placed (${symbol})`,
              description: 'You placed a BUY trade without defining a stop-loss safety boundary.',
              actionableTip: 'Always pre-commit your exit threshold before entering any position.',
              timestamp: 'Just now'
            },
            ...prev.recentObservations
          ]
        }));
      }

    } else {
      // SELL trade
      const existing = positions.find(p => p.symbol === symbol);
      if (!existing || existing.quantity < quantity) {
        return { success: false, message: `Cannot sell ${quantity} shares. You only own ${existing ? existing.quantity : 0} shares of ${symbol}.` };
      }

      setVirtualCash(prev => prev + (tradeValue - simulatedCharges));

      learningMoment = `Position trimmed/closed. Review your trading journal to evaluate whether this exit aligned with your strategy or was triggered by short-term emotional impulses.`;

      setPositions(prev => {
        if (existing.quantity === quantity) {
          return prev.filter(p => p.symbol !== symbol);
        } else {
          const remQty = existing.quantity - quantity;
          const newCost = remQty * existing.averageBuyPrice;
          return prev.map(p => p.symbol === symbol ? {
            ...p,
            quantity: remQty,
            totalCost: newCost,
            currentValue: remQty * stock.price,
            unrealizedPnL: (remQty * stock.price) - newCost,
            unrealizedPnLPercent: (((remQty * stock.price) - newCost) / newCost) * 100
          } : p);
        }
      });
    }

    // Append to order history
    const newOrder: TradeOrder = {
      id: `ord-${Date.now()}`,
      symbol,
      name: stock.name,
      type,
      orderType,
      productType,
      leverageMultiplier,
      quantity,
      price: executionPrice,
      status: 'EXECUTED',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      totalValue: tradeValue,
      charges: simulatedCharges,
      reasonTag,
      stopLoss,
      targetPrice,
      learningMoment,
      riskChecksTriggered
    };

    setOrderHistory(prev => [newOrder, ...prev]);

    return {
      success: true,
      message: `Successfully executed virtual ${type} of ${quantity} shares of ${symbol} at ₹${executionPrice.toFixed(2)} (Simulated fees: ₹${simulatedCharges.toFixed(2)})`,
      learningMoment
    };
  };

  const squareOffPosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return { success: false, message: 'Position not found' };

    return executeTrade({
      symbol: position.symbol,
      type: 'SELL',
      quantity: position.quantity,
      orderType: 'MARKET',
      reasonTag: 'Manual Position Square-Off'
    });
  };

  const resetPortfolio = () => {
    setVirtualCash(DEFAULT_STARTING_CASH);
    setPositions([]);
    setOrderHistory([]);
    setBehavioralScore(INITIAL_BEHAVIORAL_SCORE);
    localStorage.removeItem('bullseye_cash');
    localStorage.removeItem('bullseye_positions');
    localStorage.removeItem('bullseye_orders');
  };

  const saveAssessment = (newAssessment: UserAssessment) => {
    setAssessment(newAssessment);
    localStorage.setItem('bullseye_assessment', JSON.stringify(newAssessment));
  };

  return (
    <SimulatorContext.Provider
      value={{
        virtualCash,
        startingCapital: DEFAULT_STARTING_CASH,
        positions,
        orderHistory,
        stocks,
        behavioralScore,
        assessment,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        theme,
        setTheme,
        toggleTheme,
        executeTrade,
        squareOffPosition,
        resetPortfolio,
        saveAssessment,
        totalPortfolioValue,
        totalInvested,
        unrealizedPnL,
        unrealizedPnLPercent,
        dayPnL,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

export const useSimulator = () => {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within a SimulatorProvider');
  }
  return context;
};
