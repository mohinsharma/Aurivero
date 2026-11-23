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
  executeTrade: (params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    stopLoss?: number;
    targetPrice?: number;
    reasonTag: string;
  }) => { success: boolean; message: string };
  squareOffPosition: (positionId: string) => { success: boolean; message: string };
  resetPortfolio: () => void;
  saveAssessment: (assessment: UserAssessment) => void;
  totalPortfolioValue: number;
  totalInvested: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayPnL: number;
}

const DEFAULT_STARTING_CASH = 1000000; // ₹10,00,000 (10 Lakhs Virtual INR)

const INITIAL_POSITIONS: PortfolioPosition[] = [
  {
    id: 'pos-1',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    quantity: 50,
    averageBuyPrice: 2890.00,
    currentPrice: 2985.40,
    totalCost: 144500.00,
    currentValue: 149270.00,
    unrealizedPnL: 4770.00,
    unrealizedPnLPercent: 3.30,
    sector: 'Energy & Retail',
    purchaseDate: '2026-11-18',
    stopLoss: 2820.00,
    targetPrice: 3150.00,
    tradeReason: 'Long-term Retail & Telecom 5G monetization'
  },
  {
    id: 'pos-2',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    quantity: 30,
    averageBuyPrice: 4050.00,
    currentPrice: 4180.25,
    totalCost: 121500.00,
    currentValue: 125407.50,
    unrealizedPnL: 3907.50,
    unrealizedPnLPercent: 3.22,
    sector: 'Information Tech',
    purchaseDate: '2026-11-15',
    stopLoss: 3950.00,
    targetPrice: 4400.00,
    tradeReason: 'Defensive cash cow with 3% dividend yield'
  },
  {
    id: 'pos-3',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    quantity: 60,
    averageBuyPrice: 1675.00,
    currentPrice: 1642.80,
    totalCost: 100500.00,
    currentValue: 98568.00,
    unrealizedPnL: -1932.00,
    unrealizedPnLPercent: -1.92,
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
    quantity: 60,
    price: 1675.00,
    status: 'EXECUTED',
    timestamp: '2026-11-20 10:14 IST',
    totalValue: 100500.00,
    reasonTag: 'Value Buy at Support',
    stopLoss: 1610.00,
    targetPrice: 1800.00
  },
  {
    id: 'ord-102',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    type: 'BUY',
    orderType: 'MARKET',
    quantity: 50,
    price: 2890.00,
    status: 'EXECUTED',
    timestamp: '2026-11-18 11:30 IST',
    totalValue: 144500.00,
    reasonTag: 'Structural Breakout',
    stopLoss: 2820.00,
    targetPrice: 3150.00
  },
  {
    id: 'ord-103',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    type: 'BUY',
    orderType: 'MARKET',
    quantity: 30,
    price: 4050.00,
    status: 'EXECUTED',
    timestamp: '2026-11-15 14:02 IST',
    totalValue: 121500.00,
    reasonTag: 'Sector Rotation',
    stopLoss: 3950.00,
    targetPrice: 4400.00
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
    const saved = localStorage.getItem('bullseye_cash');
    return saved ? parseFloat(saved) : (DEFAULT_STARTING_CASH - 366500.00); // Remaining cash after mock initial buys
  });

  const [positions, setPositions] = useState<PortfolioPosition[]>(() => {
    const saved = localStorage.getItem('bullseye_positions');
    return saved ? JSON.parse(saved) : INITIAL_POSITIONS;
  });

  const [orderHistory, setOrderHistory] = useState<TradeOrder[]>(() => {
    const saved = localStorage.getItem('bullseye_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [stocks] = useState<StockQuote[]>(POPULAR_INDIAN_STOCKS);
  const [behavioralScore, setBehavioralScore] = useState<BehavioralScore>(INITIAL_BEHAVIORAL_SCORE);
  const [assessment, setAssessment] = useState<UserAssessment | null>(() => {
    const saved = localStorage.getItem('bullseye_assessment');
    return saved ? JSON.parse(saved) : {
      experienceLevel: 'Beginner',
      riskTolerance: 'Moderate',
      investmentHorizon: 'Medium (1-3 Years)',
      primaryGoal: 'Learn without losing real money',
      completedAt: '2026-11-24'
    };
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('bullseye_cash', virtualCash.toString());
    localStorage.setItem('bullseye_positions', JSON.stringify(positions));
    localStorage.setItem('bullseye_orders', JSON.stringify(orderHistory));
  }, [virtualCash, positions, orderHistory]);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  const totalInvested = positions.reduce((acc, pos) => acc + pos.totalCost, 0);
  const totalHoldingsValue = positions.reduce((acc, pos) => acc + (pos.quantity * pos.currentPrice), 0);
  const totalPortfolioValue = virtualCash + totalHoldingsValue;
  const unrealizedPnL = totalHoldingsValue - totalInvested;
  const unrealizedPnLPercent = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;
  const dayPnL = 6745.50; // Mock current session gain

  const executeTrade = ({
    symbol,
    type,
    quantity,
    orderType,
    limitPrice,
    stopLoss,
    targetPrice,
    reasonTag,
  }: {
    symbol: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    stopLoss?: number;
    targetPrice?: number;
    reasonTag: string;
  }) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return { success: false, message: 'Stock not found' };

    const executionPrice = orderType === 'LIMIT' && limitPrice ? limitPrice : stock.price;
    const tradeValue = executionPrice * quantity;

    if (type === 'BUY') {
      if (tradeValue > virtualCash) {
        return { success: false, message: `Insufficient virtual cash. Required: ₹${tradeValue.toLocaleString('en-IN')}, Available: ₹${virtualCash.toLocaleString('en-IN')}` };
      }

      setVirtualCash(prev => prev - tradeValue);

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
        return { success: false, message: `Cannot sell ${quantity} shares. You only own ${existing ? existing.quantity : 0} shares.` };
      }

      setVirtualCash(prev => prev + tradeValue);

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
      quantity,
      price: executionPrice,
      status: 'EXECUTED',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      totalValue: tradeValue,
      reasonTag,
      stopLoss,
      targetPrice
    };

    setOrderHistory(prev => [newOrder, ...prev]);

    return { success: true, message: `Successfully executed virtual ${type} of ${quantity} shares of ${symbol} at ₹${executionPrice.toFixed(2)}` };
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
