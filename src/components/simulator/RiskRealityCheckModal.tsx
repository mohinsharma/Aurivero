import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Percent,
  CheckCircle2,
  Sliders,
  BookOpen,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { loadRiskBudgets } from '../../utils/riskBudgets';

export interface ProposedTradeData {
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  productType: 'CNC' | 'MIS_LEVERAGED' | 'OPTIONS';
  leverageMultiplier: number;
  quantity: number;
  price: number;
  totalValue: number;
  marginRequired: number;
  charges: number;
  stopLoss?: number;
  targetPrice?: number;
  sector: string;
}

export interface PortfolioRiskMetrics {
  totalPortfolioValue: number;
  virtualCash: number;
  existingStockValue: number;
  existingSectorValue: number;
  isAfterLosingTrade: boolean;
}

interface RiskRealityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTrade: () => void;
  onAdjustSize: (recommendedQty: number) => void;
  trade: ProposedTradeData;
  portfolio: PortfolioRiskMetrics;
}

export const RiskRealityCheckModal: React.FC<RiskRealityCheckModalProps> = ({
  isOpen,
  onClose,
  onConfirmTrade,
  onAdjustSize,
  trade,
  portfolio,
}) => {
  const navigate = useNavigate();

  // Core risk calculations
  const totalPortfolio = Math.max(portfolio.totalPortfolioValue, 10000);
  const positionRatio = (trade.totalValue / totalPortfolio) * 100;
  
  const postTradeStockValue = portfolio.existingStockValue + (trade.type === 'BUY' ? trade.totalValue : -trade.totalValue);
  const stockConcentrationPercent = Math.max(0, (postTradeStockValue / totalPortfolio) * 100);

  const postTradeSectorValue = portfolio.existingSectorValue + (trade.type === 'BUY' ? trade.totalValue : -trade.totalValue);
  const sectorConcentrationPercent = Math.max(0, (postTradeSectorValue / totalPortfolio) * 100);

  const remainingCash = portfolio.virtualCash - (trade.type === 'BUY' ? (trade.marginRequired + trade.charges) : 0);
  const remainingCashPercent = Math.max(0, (remainingCash / totalPortfolio) * 100);

  // Active triggers
  const isLargePosition = positionRatio > 25;
  const isExtremePosition = positionRatio > 45;
  const isStockConcentrated = stockConcentrationPercent > 35;
  const isSectorConcentrated = sectorConcentrationPercent > 45;
  const isLowCash = trade.type === 'BUY' && remainingCashPercent < 15;
  const isLossChasing = portfolio.isAfterLosingTrade && positionRatio > 20;
  const isLeveraged = trade.productType === 'MIS_LEVERAGED' && trade.leverageMultiplier > 1;
  const isOptions = trade.productType === 'OPTIONS';

  // User-configured Risk Lab Budgets (non-blocking advisory)
  const riskBudgets = useMemo(() => loadRiskBudgets(), [isOpen]);
  const tradeStopRiskPct =
    trade.stopLoss && trade.stopLoss > 0
      ? (Math.abs(trade.price - trade.stopLoss) * trade.quantity * 100) / totalPortfolio
      : null;
  const budgetBreaches = useMemo(() => {
    const list: string[] = [];
    if (trade.type === 'BUY' && positionRatio > riskBudgets.maxSinglePositionPct) {
      list.push(
        `Order size (${positionRatio.toFixed(1)}%) exceeds your Risk Lab Single-Position Budget (${riskBudgets.maxSinglePositionPct}%).`
      );
    }
    if (trade.type === 'BUY' && sectorConcentrationPercent > riskBudgets.maxSectorExposurePct) {
      list.push(
        `${trade.sector} sector exposure (${sectorConcentrationPercent.toFixed(1)}%) exceeds your Risk Lab Sector Budget (${riskBudgets.maxSectorExposurePct}%).`
      );
    }
    if (tradeStopRiskPct !== null && tradeStopRiskPct > riskBudgets.maxPositionRiskPct) {
      list.push(
        `Stop-loss risk (${tradeStopRiskPct.toFixed(2)}% of equity) exceeds your Risk Lab Position Risk Budget (${riskBudgets.maxPositionRiskPct}%).`
      );
    }
    return list;
  }, [trade.type, trade.sector, positionRatio, sectorConcentrationPercent, tradeStopRiskPct, riskBudgets]);

  // Overall Risk Severity Rating
  const riskScore = useMemo(() => {
    let score = 1;
    if (isLargePosition) score += 2;
    if (isExtremePosition) score += 2;
    if (isStockConcentrated) score += 2;
    if (isSectorConcentrated) score += 1;
    if (isLowCash) score += 2;
    if (isLossChasing) score += 2;
    if (isLeveraged) score += 3;
    if (isOptions) score += 3;
    return Math.min(score, 10);
  }, [isLargePosition, isExtremePosition, isStockConcentrated, isSectorConcentrated, isLowCash, isLossChasing, isLeveraged, isOptions]);

  const severityLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' =
    riskScore >= 7 ? 'CRITICAL' : riskScore >= 5 ? 'HIGH' : riskScore >= 3 ? 'MODERATE' : 'LOW';

  const warningTier: 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL' =
    isExtremePosition || (isLeveraged && trade.leverageMultiplier >= 5) || (isLossChasing && isLargePosition)
      ? 'CRITICAL'
      : severityLevel === 'HIGH' || severityLevel === 'CRITICAL' || budgetBreaches.length > 0
      ? 'RED'
      : severityLevel === 'MODERATE'
      ? 'YELLOW'
      : 'GREEN';

  // Recommended safer quantity (5% - 8% of portfolio)
  const recommendedQty = Math.max(1, Math.floor((totalPortfolio * 0.08) / trade.price));

  // Scenario Table Analysis
  const scenarios = useMemo(() => {
    const moves = [
      { label: '+10% Rally', pct: 0.10, isGain: true },
      { label: '-10% Drop', pct: -0.10, isGain: false },
      { label: '-20% Correction', pct: -0.20, isGain: false },
      { label: '-30% Crash', pct: -0.30, isGain: false },
    ];

    return moves.map(m => {
      // If leveraged (e.g. 5x), percentage move applies to the entire exposure value relative to margin deposited
      const effectivePct = isLeveraged ? m.pct * trade.leverageMultiplier : m.pct;
      const nominalPnL = trade.totalValue * m.pct;
      
      // If loss exceeds margin in leverage, max loss is capped at total margin deposited (liquidation)
      let pnlAmount = nominalPnL;
      if (isLeveraged && pnlAmount < -trade.marginRequired) {
        pnlAmount = -trade.marginRequired;
      }
      if (isOptions && m.pct < 0) {
        // Option buyer loses 100% of premium
        pnlAmount = -trade.marginRequired;
      }

      const portfolioImpactPercent = (pnlAmount / totalPortfolio) * 100;

      return {
        ...m,
        pnlAmount,
        portfolioImpactPercent,
        effectiveReturnOnMargin: (pnlAmount / trade.marginRequired) * 100,
        isLiquidated: isLeveraged && pnlAmount <= -trade.marginRequired
      };
    });
  }, [trade, totalPortfolio, isLeveraged, isOptions]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pre-Trade Risk Reality Check"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-[#131722]">
        {/* Severity Banner */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          severityLevel === 'CRITICAL'
            ? 'bg-[#F23645]/10 border-[#F23645]/25 text-[#F23645]'
            : severityLevel === 'HIGH'
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-[#2962FF]/10 border-[#2962FF]/25 text-[#2962FF]'
        }`}>
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={20} className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs tracking-wide">
                  Risk Reality Assessment: {warningTier} ({severityLevel})
                </span>
                <Badge variant={severityLevel === 'CRITICAL' ? 'danger' : severityLevel === 'HIGH' ? 'warning' : 'primary'} size="sm">
                  Risk Score: {riskScore}/10
                </Badge>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Before confirming this simulated order, evaluate how it reshapes your capital resilience.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 hidden sm:block">
            <span className="text-[11px] text-[#64748B] block">Position Sizing</span>
            <span className="text-sm font-bold text-[#131722] tabular-nums">
              {positionRatio.toFixed(1)}% of Net Worth
            </span>
          </div>
        </div>

        {/* 1. YOUR DECISION SUMMARY */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] text-xs">
            <span className="text-[#64748B] font-semibold">1. Proposed Virtual Decision</span>
            <Badge variant={trade.type === 'BUY' ? 'primary' : 'danger'} size="sm">
              {trade.type} {trade.quantity} Shares
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-[#64748B] block">Ticker Asset</span>
              <span className="font-bold text-[#131722] text-sm">{trade.symbol}</span>
              <span className="text-[11px] text-[#64748B] block">{trade.sector}</span>
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block">Execution Price</span>
              <span className="font-bold text-[#131722] text-sm tabular-nums">₹{trade.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-[11px] text-[#64748B] block">{trade.orderType} order</span>
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block">Gross Exposure</span>
              <span className="font-bold text-[#131722] text-sm tabular-nums">₹{Math.round(trade.totalValue).toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-[#64748B] block tabular-nums">{positionRatio.toFixed(1)}% portfolio</span>
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block">Margin Required</span>
              <span className="font-bold text-[#2962FF] text-sm tabular-nums">₹{Math.round(trade.marginRequired).toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-[#64748B] block">
                {isLeveraged ? `${trade.leverageMultiplier}x Intraday Leverage` : isOptions ? 'Option Premium' : '1x Delivery (CNC)'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. EXPOSURE & PORTFOLIO ALLOCATION GAUGE */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B] font-semibold flex items-center gap-1.5">
              <Percent size={13} className="text-[#2962FF]" /> 2. Exposure & Concentration Audit
            </span>
            <span className="text-[#64748B] tabular-nums">
              Single-Stock Weight: <strong className={stockConcentrationPercent > 35 ? 'text-amber-600 font-bold' : 'text-[#131722]'}>{stockConcentrationPercent.toFixed(1)}%</strong>
            </span>
          </div>

          {/* Visual Exposure Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-white rounded-full h-2.5 overflow-hidden border border-[#E2E8F0] flex">
              <div
                className={`h-full transition-all duration-300 ${
                  positionRatio > 40 ? 'bg-[#F23645]' : positionRatio > 25 ? 'bg-amber-500' : 'bg-[#2962FF]'
                }`}
                style={{ width: `${Math.min(positionRatio, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#64748B]">
              <span>0% (Safe Sizing)</span>
              <span>15% (Prudent Limit)</span>
              <span>25% (High Risk)</span>
              <span>50%+ (Danger Zone)</span>
            </div>
          </div>

          {/* Before vs After Cash Reserve */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0] text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block">Available Cash Before</span>
              <span className="font-bold text-[#131722] tabular-nums">₹{Math.round(portfolio.virtualCash).toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block">Remaining Cash After Trade</span>
              <span className={`font-bold tabular-nums ${remainingCashPercent < 15 ? 'text-[#F23645]' : 'text-[#089981]'}`}>
                ₹{Math.round(remainingCash).toLocaleString('en-IN')} ({remainingCashPercent.toFixed(0)}% dry powder)
              </span>
            </div>
          </div>

          {/* Single Stock Concentration Callout */}
          {isStockConcentrated && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-[#64748B] flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#131722]">Concentration Alert:</strong> One stock ({trade.symbol}) will represent <strong className="text-amber-700 tabular-nums">{stockConcentrationPercent.toFixed(1)}%</strong> of your entire portfolio. If it falls sharply, your overall net worth will take a severe hit with no other assets to cushion the fall.
              </span>
            </div>
          )}

          {/* Risk Lab Budget Advisories */}
          {budgetBreaches.length > 0 && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-xs text-text-secondary space-y-1">
              <div className="font-semibold text-danger flex items-center gap-1.5">
                <ShieldAlert size={14} /> Risk Lab Budget Advisory (Non-Blocking)
              </div>
              {budgetBreaches.map((b, i) => (
                <div key={i} className="text-[11px] leading-relaxed">• {b}</div>
              ))}
            </div>
          )}
        </div>

        {/* 3. WHAT COULD GO WRONG? */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
          <span className="text-xs text-[#64748B] font-semibold flex items-center gap-1.5">
            <Shield size={13} className="text-amber-600" /> 3. What Could Go Wrong? (Plain-English Risk Analysis)
          </span>

          <div className="space-y-2 text-xs">
            {isLargePosition && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <p className="text-[#64748B] leading-relaxed">
                  <strong className="text-[#131722]">Excessive Position Sizing:</strong> Committing {positionRatio.toFixed(1)}% of your capital to one order violates standard institutional risk management guidelines (which recommend never risking more than 5–10% of portfolio capital on a single position).
                </p>
              </div>
            )}

            {isLowCash && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F23645] mt-1.5 shrink-0" />
                <p className="text-[#64748B] leading-relaxed">
                  <strong className="text-[#131722]">Depleted Liquid Reserves:</strong> Your liquid cash will drop to {remainingCashPercent.toFixed(1)}%. If a superior market opportunity appears or prices drop, you will have no "dry powder" left to buy the dip.
                </p>
              </div>
            )}

            {isLossChasing && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F23645] mt-1.5 shrink-0" />
                <p className="text-[#64748B] leading-relaxed">
                  <strong className="text-[#131722]">Loss Chasing / Revenge Trading Bias:</strong> You are taking a large trade shortly after an unprofitable exit. Subconsciously, you may be attempting to "make back lost virtual money quickly," which is the single most common cause of catastrophic drawdowns.
                </p>
              </div>
            )}

            {isLeveraged && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F23645] mt-1.5 shrink-0" />
                <p className="text-[#64748B] leading-relaxed">
                  <strong className="text-[#131722]">Leverage Magnification:</strong> At {trade.leverageMultiplier}x intraday leverage, every 1% move in the stock creates a {trade.leverageMultiplier}% swing in your deposited capital. A simple 20% correction wipes out 100% of your margin.
                </p>
              </div>
            )}

            {isOptions && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F23645] mt-1.5 shrink-0" />
                <p className="text-[#64748B] leading-relaxed">
                  <strong className="text-[#131722]">Time-Decay & 100% Premium Loss Risk:</strong> Option contracts have strict expiry deadlines. If the underlying stock doesn't move decisively past your strike price before expiry, the contract expires worthless, resulting in total loss of paid premium.
                </p>
              </div>
            )}

            {/* Asymmetric Loss Math Rule */}
            <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#64748B]">
              <span className="text-[#2962FF] font-bold block mb-0.5">📐 The Law of Asymmetric Recovery:</span>
              A 20% loss requires a 25% gain to break even. A 50% loss requires a 100% gain just to get back to zero! Protect your downside first.
            </div>
          </div>
        </div>

        {/* 4. SCENARIO ANALYSIS (HYPOTHETICAL SIMULATION) */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B] font-semibold flex items-center gap-1.5">
              <Sliders size={13} className="text-[#2962FF]" /> 4. Hypothetical Scenario Stress Test
            </span>
            <span className="text-[11px] text-[#64748B]">Educational Model • Not a Price Target</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[11px] text-[#64748B] text-left">
                  <th className="py-2 font-medium">Stock Price Movement</th>
                  <th className="py-2 font-medium">Simulated P&L (₹)</th>
                  <th className="py-2 font-medium">Return on Margin</th>
                  <th className="py-2 text-right font-medium">Impact on Total Net Worth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {scenarios.map((sc, idx) => (
                  <tr key={idx} className="hover:bg-white transition-colors">
                    <td className="py-2.5 font-semibold text-[#131722] flex items-center gap-1.5">
                      {sc.isGain ? <TrendingUp size={13} className="text-[#089981]" /> : <TrendingDown size={13} className="text-[#F23645]" />}
                      {sc.label}
                    </td>
                    <td className={`py-2.5 font-semibold tabular-nums ${sc.pnlAmount >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                      {sc.pnlAmount >= 0 ? '+' : '-'}₹{Math.abs(Math.round(sc.pnlAmount)).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 text-[#64748B] tabular-nums">
                      {sc.effectiveReturnOnMargin >= 0 ? '+' : '-'}{Math.abs(sc.effectiveReturnOnMargin).toFixed(1)}%
                      {sc.isLiquidated && <span className="text-[10px] text-[#F23645] ml-1 font-bold">(WIPEOUT)</span>}
                    </td>
                    <td className={`py-2.5 text-right font-semibold tabular-nums ${sc.portfolioImpactPercent >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                      {sc.portfolioImpactPercent >= 0 ? '+' : '-'}{Math.abs(sc.portfolioImpactPercent).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[#64748B] text-center pt-1">
            * Hypothesized movements evaluate mathematical exposure. Real market volatility is non-linear and unpredictable.
          </p>
        </div>

        {/* 5. F&O REGULATORY DISCLOSURE CALLOUT */}
        {(isLeveraged || isOptions) && (
          <div className="p-4 rounded-xl bg-[#F23645]/10 border border-[#F23645]/25 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#F23645] font-bold">
              <ShieldAlert size={15} /> SEBI Regulatory Risk Disclosure (F&O & Derivatives)
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              According to a study published by the Securities and Exchange Board of India (SEBI):
              <strong className="text-[#131722] block mt-1">
                "93% of individual retail traders in equity Futures & Options incurred net trading losses, with an average net loss of ₹2.0 Lakhs per trader over a three-year period."
              </strong>
            </p>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Aurivero provides this educational simulator so beginners understand how leverage creates rapid, permanent capital destruction before risking hard-earned personal savings.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onAdjustSize(recommendedQty);
              }}
              icon={<Sliders size={14} />}
              className="w-full sm:w-auto"
            >
              Adjust to Safe Size ({recommendedQty} shares • 8% Portfolio)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                navigate('/learn');
              }}
              icon={<BookOpen size={14} />}
              className="text-xs hidden sm:flex"
            >
              Learn Risk Rules
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="md"
              onClick={onClose}
              className="w-1/2 sm:w-auto"
            >
              Cancel Trade
            </Button>
            <Button
              variant={severityLevel === 'CRITICAL' ? 'danger' : 'primary'}
              size="md"
              disabled={warningTier === 'CRITICAL'}
              onClick={() => {
                onConfirmTrade();
                onClose();
              }}
              icon={<CheckCircle2 size={15} />}
              className="w-1/2 sm:w-auto"
            >
              {warningTier === 'CRITICAL' ? 'Blocked: Adjust Size / Leverage' : 'I Understand Risks — Confirm Trade'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
