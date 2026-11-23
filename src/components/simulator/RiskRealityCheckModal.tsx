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
      <div className="space-y-6 text-text-primary">
        {/* Severity Banner */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          severityLevel === 'CRITICAL'
            ? 'bg-danger/15 border-danger/60 text-danger'
            : severityLevel === 'HIGH'
            ? 'bg-warning/15 border-warning/60 text-warning'
            : 'bg-secondary/10 border-secondary/40 text-secondary'
        }`}>
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={20} className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs uppercase tracking-wider">
                  Risk Reality Assessment: {severityLevel} SEVERITY
                </span>
                <Badge variant={severityLevel === 'CRITICAL' ? 'danger' : severityLevel === 'HIGH' ? 'warning' : 'secondary'} size="sm">
                  Risk Score: {riskScore}/10
                </Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Before confirming this simulated order, evaluate how it reshapes your capital resilience.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 hidden sm:block">
            <span className="text-[10px] font-mono uppercase text-text-muted block">Position Sizing</span>
            <span className="text-sm font-bold font-mono text-text-primary">
              {positionRatio.toFixed(1)}% of Net Worth
            </span>
          </div>
        </div>

        {/* 1. YOUR DECISION SUMMARY */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/40 text-xs font-mono">
            <span className="text-text-muted uppercase font-semibold">1. Proposed Virtual Decision</span>
            <Badge variant={trade.type === 'BUY' ? 'primary' : 'danger'} size="sm">
              {trade.type} {trade.quantity} Shares
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-text-muted block">Ticker Asset</span>
              <span className="font-bold text-text-primary text-sm">{trade.symbol}</span>
              <span className="text-[10px] text-text-muted block">{trade.sector}</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Execution Price</span>
              <span className="font-bold text-text-primary text-sm">₹{trade.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-text-muted block">{trade.orderType} order</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Gross Exposure</span>
              <span className="font-bold text-text-primary text-sm">₹{Math.round(trade.totalValue).toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-text-muted block">{positionRatio.toFixed(1)}% portfolio</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Margin Required</span>
              <span className="font-bold text-primary text-sm">₹{Math.round(trade.marginRequired).toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-text-muted block">
                {isLeveraged ? `${trade.leverageMultiplier}x Intraday Leverage` : isOptions ? 'Option Premium' : '1x Delivery (CNC)'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. EXPOSURE & PORTFOLIO ALLOCATION GAUGE */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted uppercase font-semibold flex items-center gap-1.5">
              <Percent size={13} className="text-primary" /> 2. Exposure & Concentration Audit
            </span>
            <span className="text-text-secondary">
              Single-Stock Weight: <strong className={stockConcentrationPercent > 35 ? 'text-warning font-bold' : 'text-text-primary'}>{stockConcentrationPercent.toFixed(1)}%</strong>
            </span>
          </div>

          {/* Visual Exposure Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-background rounded-full h-3 overflow-hidden border border-border/50 flex">
              <div
                className={`h-full transition-all duration-300 ${
                  positionRatio > 40 ? 'bg-danger' : positionRatio > 25 ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(positionRatio, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-text-muted">
              <span>0% (Safe Sizing)</span>
              <span>15% (Prudent Limit)</span>
              <span>25% (High Risk)</span>
              <span>50%+ (Danger Zone)</span>
            </div>
          </div>

          {/* Before vs After Cash Reserve */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-background border border-border/40">
              <span className="text-[10px] text-text-muted block">Available Cash Before</span>
              <span className="font-bold text-text-primary">₹{Math.round(portfolio.virtualCash).toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/40">
              <span className="text-[10px] text-text-muted block">Remaining Cash After Trade</span>
              <span className={`font-bold ${remainingCashPercent < 15 ? 'text-danger' : 'text-primary'}`}>
                ₹{Math.round(remainingCash).toLocaleString('en-IN')} ({remainingCashPercent.toFixed(0)}% dry powder)
              </span>
            </div>
          </div>

          {/* Single Stock Concentration Callout */}
          {isStockConcentrated && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-text-secondary flex items-start gap-2">
              <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
              <span>
                <strong className="text-text-primary">Concentration Alert:</strong> One stock ({trade.symbol}) will represent <strong className="text-warning">{stockConcentrationPercent.toFixed(1)}%</strong> of your entire portfolio. If it falls sharply, your overall net worth will take a severe hit with no other assets to cushion the fall.
              </span>
            </div>
          )}
        </div>

        {/* 3. WHAT COULD GO WRONG? */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5">
          <span className="text-xs font-mono uppercase text-text-muted font-semibold block flex items-center gap-1.5">
            <Shield size={13} className="text-warning" /> 3. What Could Go Wrong? (Plain-English Risk Analysis)
          </span>

          <div className="space-y-2 text-xs">
            {isLargePosition && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                <p className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Excessive Position Sizing:</strong> Committing {positionRatio.toFixed(1)}% of your capital to one order violates standard institutional risk management guidelines (which recommend never risking more than 5–10% of portfolio capital on a single position).
                </p>
              </div>
            )}

            {isLowCash && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                <p className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Depleted Liquid Reserves:</strong> Your liquid cash will drop to {remainingCashPercent.toFixed(1)}%. If a superior market opportunity appears or prices drop, you will have no "dry powder" left to buy the dip.
                </p>
              </div>
            )}

            {isLossChasing && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                <p className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Loss Chasing / Revenge Trading Bias:</strong> You are taking a large trade shortly after an unprofitable exit. Subconsciously, you may be attempting to "make back lost virtual money quickly," which is the single most common cause of catastrophic drawdowns.
                </p>
              </div>
            )}

            {isLeveraged && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                <p className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Leverage Magnification:</strong> At {trade.leverageMultiplier}x intraday leverage, every 1% move in the stock creates a {trade.leverageMultiplier}% swing in your deposited capital. A simple 20% correction wipes out 100% of your margin.
                </p>
              </div>
            )}

            {isOptions && (
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                <p className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Time-Decay & 100% Premium Loss Risk:</strong> Option contracts have strict expiry deadlines. If the underlying stock doesn't move decisively past your strike price before expiry, the contract expires worthless, resulting in total loss of paid premium.
                </p>
              </div>
            )}

            {/* Asymmetric Loss Math Rule */}
            <div className="p-3 rounded-lg bg-background border border-border/50 text-[11px] text-text-secondary font-mono">
              <span className="text-primary font-bold block mb-0.5">📐 The Law of Asymmetric Recovery:</span>
              A 20% loss requires a 25% gain to break even. A 50% loss requires a 100% gain just to get back to zero! Protect your downside first.
            </div>
          </div>
        </div>

        {/* 4. SCENARIO ANALYSIS (HYPOTHETICAL SIMULATION) */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted uppercase font-semibold flex items-center gap-1.5">
              <Sliders size={13} className="text-primary" /> 4. Hypothetical Scenario Stress Test
            </span>
            <span className="text-[10px] text-text-muted">Educational Model • Not a Price Target</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-[10px] text-text-muted text-left uppercase">
                  <th className="py-2">Stock Price Movement</th>
                  <th className="py-2">Simulated P&L (₹)</th>
                  <th className="py-2">Return on Margin</th>
                  <th className="py-2 text-right">Impact on Total Net Worth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {scenarios.map((sc, idx) => (
                  <tr key={idx} className="hover:bg-background/40 transition-colors">
                    <td className="py-2.5 font-bold text-text-primary flex items-center gap-1.5">
                      {sc.isGain ? <TrendingUp size={13} className="text-primary" /> : <TrendingDown size={13} className="text-danger" />}
                      {sc.label}
                    </td>
                    <td className={`py-2.5 font-bold ${sc.pnlAmount >= 0 ? 'text-primary' : 'text-danger'}`}>
                      {sc.pnlAmount >= 0 ? '+' : ''}₹{Math.round(sc.pnlAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 text-text-secondary">
                      {sc.effectiveReturnOnMargin >= 0 ? '+' : ''}{sc.effectiveReturnOnMargin.toFixed(1)}%
                      {sc.isLiquidated && <span className="text-[9px] text-danger ml-1 font-bold">(WIPEOUT)</span>}
                    </td>
                    <td className={`py-2.5 text-right font-bold ${sc.portfolioImpactPercent >= 0 ? 'text-primary' : 'text-danger'}`}>
                      {sc.portfolioImpactPercent >= 0 ? '+' : ''}{sc.portfolioImpactPercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] font-mono text-text-muted text-center pt-1">
            * Hypothesized movements evaluate mathematical exposure. Real market volatility is non-linear and unpredictable.
          </p>
        </div>

        {/* 5. F&O REGULATORY DISCLOSURE CALLOUT */}
        {(isLeveraged || isOptions) && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-danger font-bold uppercase">
              <ShieldAlert size={15} /> SEBI Regulatory Risk Disclosure (F&O & Derivatives)
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              According to a study published by the Securities and Exchange Board of India (SEBI):
              <strong className="text-text-primary block mt-1">
                "93% of individual retail traders in equity Futures & Options incurred net trading losses, with an average net loss of ₹2.0 Lakhs per trader over a three-year period."
              </strong>
            </p>
            <p className="text-[11px] text-text-muted leading-relaxed font-sans">
              MINDMARK provides this educational simulator so beginners understand how leverage creates rapid, permanent capital destruction before risking hard-earned personal savings.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
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
              onClick={() => {
                onConfirmTrade();
                onClose();
              }}
              icon={<CheckCircle2 size={15} />}
              className="w-1/2 sm:w-auto"
            >
              I Understand Risks — Confirm Trade
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
