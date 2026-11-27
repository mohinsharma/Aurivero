from __future__ import annotations

import math
from typing import Any, Dict, List

from backend.app.services.providers import get_provider
from backend.app.services.providers.base import utc_now_iso


async def compute_historical_risk_analytics(
    asset_class: str,
    symbol: str,
    confidence: float = 0.95,
    lookback_days: int = 252,
) -> Dict[str, Any]:
    provider = get_provider(asset_class)
    series = await provider.get_candles(symbol=symbol, timeframe="1d", limit=max(60, min(lookback_days + 20, 500)))
    candles = series.candles

    if len(candles) < 30:
        return {
            "symbol": series.symbol,
            "assetClass": series.assetClass,
            "available": False,
            "status": series.status,
            "source": series.source,
            "retrievedAt": utc_now_iso(),
            "reason": f"Insufficient historical daily candles ({len(candles)} found; minimum 30 required).",
        }

    candles = candles[-lookback_days:] if len(candles) > lookback_days else candles
    trading_days_per_year = 365 if series.assetClass == "CRYPTO" else 252

    returns: List[float] = []
    log_returns: List[float] = []
    trs: List[float] = []
    for i in range(1, len(candles)):
        prev_c = candles[i - 1].close
        curr = candles[i]
        if prev_c > 0 and curr.close > 0:
            returns.append((curr.close - prev_c) / prev_c)
            log_returns.append(math.log(curr.close / prev_c))
        trs.append(
            max(
                curr.high - curr.low,
                abs(curr.high - prev_c),
                abs(curr.low - prev_c),
            )
        )

    n = len(returns)
    mean_ret = sum(returns) / n
    variance = sum((r - mean_ret) ** 2 for r in returns) / max(1, n - 1)
    daily_vol = math.sqrt(variance)
    annualized_vol_pct = round(daily_vol * math.sqrt(trading_days_per_year) * 100, 2)

    # Downside deviation (returns < 0)
    downside_sq = [min(0.0, r) ** 2 for r in returns]
    downside_dev_daily = math.sqrt(sum(downside_sq) / max(1, n))
    annualized_downside_pct = round(downside_dev_daily * math.sqrt(trading_days_per_year) * 100, 2)

    # ATR(14)
    atr_period = min(14, len(trs))
    atr_14 = sum(trs[-atr_period:]) / atr_period
    latest_close = candles[-1].close
    atr_pct = round((atr_14 / latest_close) * 100, 2) if latest_close > 0 else 0.0

    # Max Drawdown
    peak = candles[0].close
    max_dd = 0.0
    for c in candles:
        if c.close > peak:
            peak = c.close
        if peak > 0:
            dd = (peak - c.close) / peak
            if dd > max_dd:
                max_dd = dd

    # Historical Simulation VaR & CVaR (Expected Shortfall)
    sorted_rets = sorted(returns)
    alpha = max(0.01, min(0.25, 1.0 - confidence))
    cutoff_idx = max(0, min(len(sorted_rets) - 1, int(math.floor(alpha * len(sorted_rets)))))
    var_return = sorted_rets[cutoff_idx]
    tail_losses = [r for r in sorted_rets[: cutoff_idx + 1]]
    cvar_return = sum(tail_losses) / len(tail_losses) if tail_losses else var_return

    return {
        "symbol": series.symbol,
        "assetClass": series.assetClass,
        "currency": series.currency,
        "available": True,
        "latestPrice": latest_close,
        "lookbackCandles": len(candles),
        "annualizationFactor": trading_days_per_year,
        "historicalVolatilityPct": annualized_vol_pct,
        "downsideDeviationPct": annualized_downside_pct,
        "atr14": round(atr_14, 4),
        "atrPercent": atr_pct,
        "maxDrawdownPct": round(max_dd * 100, 2),
        "var": {
            "methodology": "Historical Simulation (Non-Parametric)",
            "confidenceLevel": confidence,
            "lookbackDays": len(candles),
            "dailyVarPct": round(abs(min(0.0, var_return)) * 100, 2),
            "dailyCvarPct": round(abs(min(0.0, cvar_return)) * 100, 2),
        },
        "disclaimer": "Historical risk metrics reflect past observed price distributions and do not guarantee future losses.",
        "status": series.status,
        "source": series.source,
        "retrievedAt": utc_now_iso(),
        "providerTimestamp": series.providerTimestamp,
    }
