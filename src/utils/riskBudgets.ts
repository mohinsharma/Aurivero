export interface RiskBudgetConfig {
  maxPortfolioHeatPct: number;
  maxSectorExposurePct: number;
  maxPositionRiskPct: number;
  maxSinglePositionPct: number;
}

export const DEFAULT_RISK_BUDGETS: RiskBudgetConfig = {
  maxPortfolioHeatPct: 6.0,
  maxSectorExposurePct: 35.0,
  maxPositionRiskPct: 2.0,
  maxSinglePositionPct: 25.0,
};

const STORAGE_KEY = 'aurivero_risk_budgets_v1';

export function loadRiskBudgets(): RiskBudgetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RISK_BUDGETS;
    const parsed = JSON.parse(raw);
    return {
      maxPortfolioHeatPct: Number(parsed.maxPortfolioHeatPct) || DEFAULT_RISK_BUDGETS.maxPortfolioHeatPct,
      maxSectorExposurePct: Number(parsed.maxSectorExposurePct) || DEFAULT_RISK_BUDGETS.maxSectorExposurePct,
      maxPositionRiskPct: Number(parsed.maxPositionRiskPct) || DEFAULT_RISK_BUDGETS.maxPositionRiskPct,
      maxSinglePositionPct: Number(parsed.maxSinglePositionPct) || DEFAULT_RISK_BUDGETS.maxSinglePositionPct,
    };
  } catch {
    return DEFAULT_RISK_BUDGETS;
  }
}

export function saveRiskBudgets(config: RiskBudgetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}
