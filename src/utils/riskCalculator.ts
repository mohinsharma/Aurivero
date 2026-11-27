import { AssetClass } from '../types/markets';

export type TradeDirection = 'LONG' | 'SHORT';

export interface PositionSizeInput {
  accountBalance: number;
  accountCurrency: 'INR' | 'USD';
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice?: number | null;
  direction: TradeDirection;
  assetClass: AssetClass;
  lotSize?: number;
  allowFractional?: boolean;
  leverage?: number;
  brokeragePercent?: number; // Optional estimated fee % per side
  slippagePercent?: number;  // Optional estimated slippage %
}

export interface PositionSizeResult {
  valid: boolean;
  error?: string;
  maxMonetaryRisk: number;
  riskPerUnit: number;
  recommendedQuantity: number;
  totalPositionValue: number;
  requiredMargin: number;
  stopLossDistance: number;
  stopLossPercent: number;
  targetDistance: number | null;
  targetPercent: number | null;
  potentialLoss: number;
  potentialProfit: number | null;
  riskRewardRatio: number | null;
  estimatedFees: number;
  estimatedSlippage: number;
  netPotentialLoss: number;
  netPotentialProfit: number | null;
  effectiveRiskRewardRatio: number | null;
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const empty: PositionSizeResult = {
    valid: false,
    maxMonetaryRisk: 0,
    riskPerUnit: 0,
    recommendedQuantity: 0,
    totalPositionValue: 0,
    requiredMargin: 0,
    stopLossDistance: 0,
    stopLossPercent: 0,
    targetDistance: null,
    targetPercent: null,
    potentialLoss: 0,
    potentialProfit: null,
    riskRewardRatio: null,
    estimatedFees: 0,
    estimatedSlippage: 0,
    netPotentialLoss: 0,
    netPotentialProfit: null,
    effectiveRiskRewardRatio: null,
  };

  const {
    accountBalance,
    riskPercent,
    entryPrice,
    stopLoss,
    targetPrice,
    direction,
    assetClass,
    lotSize = 1,
    allowFractional = assetClass === 'CRYPTO',
    leverage = 1,
    brokeragePercent = 0,
    slippagePercent = 0,
  } = input;

  if (!Number.isFinite(accountBalance) || accountBalance <= 0) {
    return { ...empty, error: 'Account balance must be greater than 0.' };
  }
  if (!Number.isFinite(riskPercent) || riskPercent <= 0 || riskPercent > 100) {
    return { ...empty, error: 'Risk percentage must be between 0.01% and 100%.' };
  }
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { ...empty, error: 'Entry price must be greater than 0.' };
  }
  if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
    return { ...empty, error: 'Stop-loss price must be greater than 0.' };
  }
  if (!Number.isFinite(lotSize) || lotSize <= 0) {
    return { ...empty, error: 'Lot size must be positive.' };
  }
  if (!Number.isFinite(leverage) || leverage < 1) {
    return { ...empty, error: 'Leverage must be at least 1x.' };
  }

  const riskPerUnit =
    direction === 'LONG' ? entryPrice - stopLoss : stopLoss - entryPrice;

  if (riskPerUnit <= 0) {
    return {
      ...empty,
      error:
        direction === 'LONG'
          ? 'For a LONG trade, Stop-Loss must be strictly below Entry Price.'
          : 'For a SHORT trade, Stop-Loss must be strictly above Entry Price.',
    };
  }

  let targetDistance: number | null = null;
  let targetPercent: number | null = null;
  if (targetPrice !== undefined && targetPrice !== null && Number.isFinite(targetPrice) && targetPrice > 0) {
    const rewardPerUnit =
      direction === 'LONG' ? targetPrice - entryPrice : entryPrice - targetPrice;
    if (rewardPerUnit <= 0) {
      return {
        ...empty,
        error:
          direction === 'LONG'
            ? 'For a LONG trade, Target Price must be above Entry Price.'
            : 'For a SHORT trade, Target Price must be below Entry Price.',
      };
    }
    targetDistance = Number(rewardPerUnit.toFixed(6));
    targetPercent = Number(((rewardPerUnit / entryPrice) * 100).toFixed(2));
  }

  const maxMonetaryRisk = accountBalance * (riskPercent / 100);
  const rawQuantity = maxMonetaryRisk / riskPerUnit;

  let recommendedQuantity: number;
  if (allowFractional) {
    recommendedQuantity = Math.floor(rawQuantity * 10000) / 10000;
  } else {
    const lots = Math.floor(rawQuantity / lotSize);
    recommendedQuantity = lots * lotSize;
  }

  if (recommendedQuantity <= 0) {
    return {
      ...empty,
      maxMonetaryRisk: Number(maxMonetaryRisk.toFixed(2)),
      riskPerUnit: Number(riskPerUnit.toFixed(6)),
      error: `Maximum risk (${maxMonetaryRisk.toFixed(2)}) is smaller than 1 unit/lot risk (${(riskPerUnit * lotSize).toFixed(2)}). Increase risk % or tighten stop-loss.`,
    };
  }

  const totalPositionValue = recommendedQuantity * entryPrice;
  const requiredMargin = totalPositionValue / leverage;
  const potentialLoss = recommendedQuantity * riskPerUnit;
  const potentialProfit =
    targetDistance !== null ? recommendedQuantity * targetDistance : null;
  const riskRewardRatio =
    potentialProfit !== null && potentialLoss > 0
      ? Number((potentialProfit / potentialLoss).toFixed(2))
      : null;

  const feeRate = Math.max(0, brokeragePercent) / 100;
  const slipRate = Math.max(0, slippagePercent) / 100;
  const estimatedFees = totalPositionValue * feeRate * 2; // Entry + Exit estimate
  const estimatedSlippage = totalPositionValue * slipRate;
  const netPotentialLoss = potentialLoss + estimatedFees + estimatedSlippage;
  const netPotentialProfit =
    potentialProfit !== null
      ? Math.max(0, potentialProfit - estimatedFees - estimatedSlippage)
      : null;
  const effectiveRiskRewardRatio =
    netPotentialProfit !== null && netPotentialLoss > 0
      ? Number((netPotentialProfit / netPotentialLoss).toFixed(2))
      : null;

  return {
    valid: true,
    maxMonetaryRisk: Number(maxMonetaryRisk.toFixed(2)),
    riskPerUnit: Number(riskPerUnit.toFixed(6)),
    recommendedQuantity,
    totalPositionValue: Number(totalPositionValue.toFixed(2)),
    requiredMargin: Number(requiredMargin.toFixed(2)),
    stopLossDistance: Number(riskPerUnit.toFixed(6)),
    stopLossPercent: Number(((riskPerUnit / entryPrice) * 100).toFixed(2)),
    targetDistance,
    targetPercent,
    potentialLoss: Number(potentialLoss.toFixed(2)),
    potentialProfit: potentialProfit !== null ? Number(potentialProfit.toFixed(2)) : null,
    riskRewardRatio,
    estimatedFees: Number(estimatedFees.toFixed(2)),
    estimatedSlippage: Number(estimatedSlippage.toFixed(2)),
    netPotentialLoss: Number(netPotentialLoss.toFixed(2)),
    netPotentialProfit: netPotentialProfit !== null ? Number(netPotentialProfit.toFixed(2)) : null,
    effectiveRiskRewardRatio,
  };
}

export interface PortfolioRiskPosition {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  sector: string;
  direction: TradeDirection;
  quantity: number;
  entryPrice: number;
  stopLoss: number;
}

export interface PortfolioRiskSummary {
  totalExposure: number;
  totalAllocatedCapital: number;
  availableCapital: number;
  totalPotentialDownside: number;
  combinedRiskPercent: number;
  positionRisks: {
    id: string;
    symbol: string;
    exposure: number;
    potentialLoss: number;
    riskPercentOfAccount: number;
    weightPercent: number;
  }[];
  sectorConcentration: { sector: string; exposure: number; weightPercent: number }[];
  assetClassConcentration: { assetClass: AssetClass; exposure: number; weightPercent: number }[];
  warnings: string[];
}

export function calculatePortfolioRisk(
  accountBalance: number,
  positions: PortfolioRiskPosition[]
): PortfolioRiskSummary {
  const safeBalance = Math.max(0, accountBalance);
  let totalExposure = 0;
  let totalPotentialDownside = 0;

  const sectorMap = new Map<string, number>();
  const classMap = new Map<AssetClass, number>();

  const posDetails = positions.map((p) => {
    const exposure = Math.max(0, p.quantity * p.entryPrice);
    const riskPerUnit =
      p.direction === 'LONG'
        ? Math.max(0, p.entryPrice - p.stopLoss)
        : Math.max(0, p.stopLoss - p.entryPrice);
    const potentialLoss = p.quantity * riskPerUnit;

    totalExposure += exposure;
    totalPotentialDownside += potentialLoss;
    sectorMap.set(p.sector || 'Other', (sectorMap.get(p.sector || 'Other') || 0) + exposure);
    classMap.set(p.assetClass, (classMap.get(p.assetClass) || 0) + exposure);

    return {
      id: p.id,
      symbol: p.symbol,
      exposure: Number(exposure.toFixed(2)),
      potentialLoss: Number(potentialLoss.toFixed(2)),
      riskPercentOfAccount: safeBalance > 0 ? Number(((potentialLoss / safeBalance) * 100).toFixed(2)) : 0,
      weightPercent: 0,
    };
  });

  posDetails.forEach((d) => {
    d.weightPercent = totalExposure > 0 ? Number(((d.exposure / totalExposure) * 100).toFixed(1)) : 0;
  });

  const sectorConcentration = Array.from(sectorMap.entries())
    .map(([sector, exposure]) => ({
      sector,
      exposure: Number(exposure.toFixed(2)),
      weightPercent: totalExposure > 0 ? Number(((exposure / totalExposure) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.exposure - a.exposure);

  const assetClassConcentration = Array.from(classMap.entries())
    .map(([assetClass, exposure]) => ({
      assetClass,
      exposure: Number(exposure.toFixed(2)),
      weightPercent: totalExposure > 0 ? Number(((exposure / totalExposure) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.exposure - a.exposure);

  const combinedRiskPercent =
    safeBalance > 0 ? Number(((totalPotentialDownside / safeBalance) * 100).toFixed(2)) : 0;
  const availableCapital = Number((safeBalance - totalExposure).toFixed(2));

  const warnings: string[] = [];
  if (combinedRiskPercent > 6) {
    warnings.push(`Combined stop-loss risk (${combinedRiskPercent}%) exceeds the 6% portfolio heat guideline.`);
  }
  if (totalExposure > safeBalance) {
    warnings.push('Total exposure exceeds account balance (leveraged allocation).');
  }
  if (sectorConcentration.length > 0 && sectorConcentration[0].weightPercent > 50) {
    warnings.push(
      `High sector concentration: ${sectorConcentration[0].sector} represents ${sectorConcentration[0].weightPercent}% of exposure.`
    );
  }
  if (positions.length > 1) {
    warnings.push(
      'Note: Holding multiple instruments does not eliminate systemic or correlated market drawdown risk.'
    );
  }

  return {
    totalExposure: Number(totalExposure.toFixed(2)),
    totalAllocatedCapital: Number(totalExposure.toFixed(2)),
    availableCapital,
    totalPotentialDownside: Number(totalPotentialDownside.toFixed(2)),
    combinedRiskPercent,
    positionRisks: posDetails,
    sectorConcentration,
    assetClassConcentration,
    warnings,
  };
}
