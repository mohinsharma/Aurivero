from __future__ import annotations

import asyncio
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    import numpy as np  # type: ignore

    HAS_NUMPY = True
except Exception:
    np = None  # type: ignore
    HAS_NUMPY = False

from backend.app.services.providers import get_provider


def _to_date_str(epoch_sec: int) -> str:
    return datetime.fromtimestamp(int(epoch_sec), tz=timezone.utc).strftime("%Y-%m-%d")


def _infer_currency(asset_class: str, symbol: str, provided: Optional[str]) -> str:
    if provided and provided.upper() in ("INR", "USD", "EUR", "GBP"):
        return provided.upper()
    ac = asset_class.upper()
    if ac == "CRYPTO":
        return "USD"
    if ac == "FOREX":
        sym = symbol.upper().replace("/", "")
        if sym.endswith("INR"):
            return "INR"
        return "USD"
    # STOCK: Indian stocks default to INR; common US tickers if any can still default INR unless specified
    return "INR"


def _mean(vals: List[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _std(vals: List[float], ddof: int = 1) -> float:
    n = len(vals)
    if n <= ddof:
        return 0.0
    m = _mean(vals)
    var = sum((x - m) ** 2 for x in vals) / (n - ddof)
    return math.sqrt(max(var, 0.0))


def _cov(a: List[float], b: List[float]) -> float:
    n = min(len(a), len(b))
    if n < 2:
        return 0.0
    ma = _mean(a[:n])
    mb = _mean(b[:n])
    return sum((a[i] - ma) * (b[i] - mb) for i in range(n)) / (n - 1)


def _corr(a: List[float], b: List[float]) -> float:
    sa = _std(a)
    sb = _std(b)
    if sa <= 1e-12 or sb <= 1e-12:
        return 0.0
    c = _cov(a, b) / (sa * sb)
    return max(-1.0, min(1.0, c))


def _percentile(sorted_vals: List[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    idx = (len(sorted_vals) - 1) * q
    lo = int(math.floor(idx))
    hi = min(len(sorted_vals) - 1, lo + 1)
    frac = idx - lo
    return sorted_vals[lo] * (1.0 - frac) + sorted_vals[hi] * frac


async def _fetch_usd_inr_rate() -> Tuple[float, str]:
    try:
        forex = get_provider("FOREX")
        quote = await forex.get_quote("USDINR")
        if quote.price and quote.price > 0:
            return float(quote.price), quote.freshness.status
    except Exception:
        pass
    return 84.5, "FALLBACK"


def _convert_amount(amount: float, from_curr: str, to_curr: str, usd_inr: float) -> float:
    fc = from_curr.upper()
    tc = to_curr.upper()
    if fc == tc:
        return amount
    if fc == "USD" and tc == "INR":
        return amount * usd_inr
    if fc == "INR" and tc == "USD":
        return amount / usd_inr if usd_inr > 0 else amount
    return amount


async def _fetch_symbol_history(
    asset_class: str,
    symbol: str,
    lookback_days: int,
) -> Tuple[str, Dict[str, float], Optional[float], str]:
    key = f"{asset_class.upper()}:{symbol.upper()}"
    try:
        provider = get_provider(asset_class.upper())
        series = await provider.get_candles(
            symbol=symbol.upper(),
            timeframe="1d",
            limit=max(60, min(lookback_days, 400)),
        )
        candles = sorted(series.candles, key=lambda c: c.time)
        returns_by_date: Dict[str, float] = {}
        for i in range(1, len(candles)):
            prev_c = candles[i - 1].close
            cur_c = candles[i].close
            if prev_c > 0 and cur_c > 0:
                returns_by_date[_to_date_str(candles[i].time)] = (cur_c - prev_c) / prev_c
        last_close = float(candles[-1].close) if candles else None
        return key, returns_by_date, last_close, series.status
    except Exception:
        return key, {}, None, "UNAVAILABLE"


async def compute_portfolio_risk(
    positions: List[Dict[str, Any]],
    cash_balance: float = 0.0,
    base_currency: str = "INR",
    confidence: float = 0.95,
    lookback_days: int = 252,
) -> Dict[str, Any]:
    """
    Computes correlated multi-asset portfolio risk metrics using historical daily returns:
    - Correlated Historical Simulation Portfolio VaR & CVaR (never sums individual VaRs)
    - N x N timestamp-aligned correlation matrix
    - Covariance-based Marginal Risk Contribution (MRC %)
    - Portfolio Beta (vs NIFTY50 for Indian equities or BTCUSDT for crypto-heavy portfolios)
    - Underwater drawdown series, concentration (HHI / Effective N), and sector breakdown
    """
    base_curr = base_currency.upper() if base_currency.upper() in ("INR", "USD") else "INR"
    usd_inr, fx_freshness = await _fetch_usd_inr_rate()

    if not positions:
        return {
            "baseCurrency": base_curr,
            "usdInrRate": round(usd_inr, 4),
            "fxFreshness": fx_freshness,
            "totalHoldingsValue": 0.0,
            "cashBalance": round(cash_balance, 2),
            "totalEquity": round(cash_balance, 2),
            "totalStopLossRisk": 0.0,
            "portfolioHeatPct": 0.0,
            "confidenceLevel": confidence,
            "lookbackDays": lookback_days,
            "alignedDays": 0,
            "annualizedVolatilityPct": 0.0,
            "portfolioDailyVarPct": 0.0,
            "portfolioDailyVarAmount": 0.0,
            "portfolioDailyCvarPct": 0.0,
            "portfolioDailyCvarAmount": 0.0,
            "undiversifiedVarAmount": 0.0,
            "diversificationBenefitPct": 0.0,
            "portfolioBeta": 0.0,
            "benchmarkSymbol": "NIFTY50",
            "maxDrawdownPct": 0.0,
            "currentDrawdownPct": 0.0,
            "concentration": {"hhi": 0.0, "effectiveN": 0.0, "largestPositionPct": 0.0, "largestSymbol": None},
            "positions": [],
            "correlationMatrix": {"labels": [], "matrix": []},
            "sectorExposure": [],
            "drawdownSeries": [],
            "methodology": "No open positions in portfolio.",
        }

    # Deduplicate upstream history fetches + include benchmarks
    unique_assets: List[Tuple[str, str]] = []
    seen_keys = set()
    for p in positions:
        ac = str(p.get("assetClass", "STOCK")).upper()
        sym = str(p.get("symbol", "")).upper().strip()
        if not sym:
            continue
        k = f"{ac}:{sym}"
        if k not in seen_keys:
            seen_keys.add(k)
            unique_assets.append((ac, sym))

    bench_tasks = [
        _fetch_symbol_history("STOCK", "NIFTY50", lookback_days),
        _fetch_symbol_history("CRYPTO", "BTCUSDT", lookback_days),
    ]
    asset_tasks = [_fetch_symbol_history(ac, sym, lookback_days) for ac, sym in unique_assets]

    results = await asyncio.gather(*asset_tasks, *bench_tasks)
    history_map: Dict[str, Dict[str, float]] = {}
    last_close_map: Dict[str, Optional[float]] = {}
    freshness_map: Dict[str, str] = {}
    for key, rmap, last_c, fresh in results:
        history_map[key] = rmap
        last_close_map[key] = last_c
        freshness_map[key] = fresh

    # Normalize positions into baseCurrency
    enriched: List[Dict[str, Any]] = []
    total_holdings_val = 0.0
    total_sl_risk = 0.0
    stock_val = 0.0
    crypto_val = 0.0

    for p in positions:
        ac = str(p.get("assetClass", "STOCK")).upper()
        sym = str(p.get("symbol", "")).upper().strip()
        if not sym:
            continue
        qty = float(p.get("quantity", 0) or 0)
        entry = float(p.get("entryPrice", 0) or 0)
        key = f"{ac}:{sym}"
        cur_raw = float(p.get("currentPrice", 0) or 0)
        if cur_raw <= 0:
            cur_raw = last_close_map.get(key) or entry
        curr = _infer_currency(ac, sym, p.get("currency"))
        sl_raw = p.get("stopLoss")
        sl = float(sl_raw) if sl_raw is not None and float(sl_raw) > 0 else None

        val_native = abs(qty * cur_raw)
        val_base = _convert_amount(val_native, curr, base_curr, usd_inr)

        sl_risk_native = abs(cur_raw - sl) * qty if sl is not None else 0.0
        sl_risk_base = _convert_amount(sl_risk_native, curr, base_curr, usd_inr)

        sector = str(p.get("sector") or ("N/A" if ac in ("CRYPTO", "FOREX") else "Unclassified"))

        total_holdings_val += val_base
        total_sl_risk += sl_risk_base
        if ac == "STOCK":
            stock_val += val_base
        elif ac == "CRYPTO":
            crypto_val += val_base

        enriched.append({
            "symbol": sym,
            "name": str(p.get("name") or sym),
            "assetClass": ac,
            "sector": sector,
            "quantity": qty,
            "entryPrice": entry,
            "currentPrice": cur_raw,
            "stopLoss": sl,
            "nativeCurrency": curr,
            "marketValueBase": val_base,
            "stopLossRiskBase": sl_risk_base,
            "historyKey": key,
            "freshness": freshness_map.get(key, "UNAVAILABLE"),
        })

    if not enriched or total_holdings_val <= 0:
        return await compute_portfolio_risk([], cash_balance, base_curr, confidence, lookback_days)

    total_equity = total_holdings_val + max(0.0, cash_balance)
    weights = [item["marketValueBase"] / total_holdings_val for item in enriched]

    # Align dates across holdings
    non_empty_date_sets = [set(history_map.get(item["historyKey"], {}).keys()) for item in enriched if history_map.get(item["historyKey"])]
    if non_empty_date_sets:
        common_dates = sorted(set.intersection(*non_empty_date_sets))
        alignment_mode = "intersection"
        if len(common_dates) < 25:
            # Mixed 24/7 crypto + weekday equities fallback: union of dates, 0.0 return on market holiday
            all_dates = sorted(set.union(*non_empty_date_sets))
            common_dates = all_dates[-min(len(all_dates), lookback_days):]
            alignment_mode = "union_zero_holiday_fill"
    else:
        common_dates = []
        alignment_mode = "none"

    aligned_series: List[List[float]] = []
    for item in enriched:
        rmap = history_map.get(item["historyKey"], {})
        aligned_series.append([rmap.get(d, 0.0) for d in common_dates])

    n_assets = len(enriched)
    n_days = len(common_dates)

    # Correlated Portfolio daily returns
    port_returns: List[float] = []
    if n_days >= 2:
        for t in range(n_days):
            port_returns.append(sum(weights[i] * aligned_series[i][t] for i in range(n_assets)))

    # Portfolio VaR & CVaR (Historical Simulation on correlated portfolio return series)
    alpha = max(0.01, min(0.20, 1.0 - confidence))
    if len(port_returns) >= 10:
        sorted_port = sorted(port_returns)
        var_q = _percentile(sorted_port, alpha)
        port_var_pct = max(0.0, -var_q * 100.0)
        tail = [r for r in sorted_port if r <= var_q]
        port_cvar_pct = max(port_var_pct, -_mean(tail) * 100.0 if tail else port_var_pct)
        port_ann_vol_pct = _std(port_returns) * math.sqrt(252.0) * 100.0
    else:
        port_var_pct = 0.0
        port_cvar_pct = 0.0
        port_ann_vol_pct = 0.0

    port_var_amt = total_holdings_val * (port_var_pct / 100.0)
    port_cvar_amt = total_holdings_val * (port_cvar_pct / 100.0)

    # Individual VaRs (for diversification benefit comparison only) & Marginal Risk Contributions
    undiversified_var_amt = 0.0
    cov_matrix: List[List[float]] = [[0.0] * n_assets for _ in range(n_assets)]
    corr_matrix: List[List[float]] = [[1.0 if i == j else 0.0 for j in range(n_assets)] for i in range(n_assets)]

    if n_days >= 5:
        for i in range(n_assets):
            for j in range(i, n_assets):
                c_ij = _cov(aligned_series[i], aligned_series[j])
                r_ij = 1.0 if i == j else _corr(aligned_series[i], aligned_series[j])
                cov_matrix[i][j] = c_ij
                cov_matrix[j][i] = c_ij
                corr_matrix[i][j] = round(r_ij, 3)
                corr_matrix[j][i] = round(r_ij, 3)

    # Portfolio variance sigma_p^2 = w^T Sigma w
    port_var_daily = 0.0
    sigma_w = [0.0] * n_assets
    for i in range(n_assets):
        s_i = sum(cov_matrix[i][j] * weights[j] for j in range(n_assets))
        sigma_w[i] = s_i
        port_var_daily += weights[i] * s_i

    # Benchmark returns for Beta
    bench_symbol = "BTCUSDT" if crypto_val > stock_val else "NIFTY50"
    bench_key = f"CRYPTO:BTCUSDT" if bench_symbol == "BTCUSDT" else "STOCK:NIFTY50"
    bench_map = history_map.get(bench_key, {})
    bench_aligned = [bench_map.get(d, 0.0) for d in common_dates] if common_dates else []
    bench_var = (_std(bench_aligned) ** 2) if len(bench_aligned) >= 5 else 0.0

    portfolio_beta = 0.0
    if bench_var > 1e-12 and len(port_returns) >= 10:
        portfolio_beta = _cov(port_returns, bench_aligned) / bench_var

    pos_outputs: List[Dict[str, Any]] = []
    for i, item in enumerate(enriched):
        w = weights[i]
        series_i = aligned_series[i]
        if len(series_i) >= 10:
            s_i_sorted = sorted(series_i)
            vq_i = _percentile(s_i_sorted, alpha)
            indiv_var_pct = max(0.0, -vq_i * 100.0)
            indiv_vol_pct = _std(series_i) * math.sqrt(252.0) * 100.0
        else:
            indiv_var_pct = 0.0
            indiv_vol_pct = 0.0

        indiv_var_amt = item["marketValueBase"] * (indiv_var_pct / 100.0)
        undiversified_var_amt += indiv_var_amt

        mrc_pct = ((w * sigma_w[i]) / port_var_daily * 100.0) if port_var_daily > 1e-12 else (w * 100.0)
        pos_beta = (_cov(series_i, bench_aligned) / bench_var) if bench_var > 1e-12 and len(series_i) >= 10 else 1.0

        pos_outputs.append({
            **item,
            "weightPct": round(w * 100.0, 2),
            "equityWeightPct": round((item["marketValueBase"] / total_equity) * 100.0, 2),
            "annualizedVolatilityPct": round(indiv_vol_pct, 2),
            "individualDailyVarPct": round(indiv_var_pct, 2),
            "individualDailyVarAmount": round(indiv_var_amt, 2),
            "riskContributionPct": round(mrc_pct, 2),
            "beta": round(pos_beta, 2),
        })

    div_benefit_pct = (
        ((undiversified_var_amt - port_var_amt) / undiversified_var_amt) * 100.0
        if undiversified_var_amt > 1e-9
        else 0.0
    )

    # Underwater Drawdown Series
    drawdown_series: List[Dict[str, Any]] = []
    max_dd_pct = 0.0
    cur_dd_pct = 0.0
    if port_returns and common_dates:
        equity_idx = 1.0
        peak = 1.0
        for d, r in zip(common_dates, port_returns):
            equity_idx *= (1.0 + r)
            if equity_idx > peak:
                peak = equity_idx
            dd = ((peak - equity_idx) / peak) * 100.0 if peak > 0 else 0.0
            if dd > max_dd_pct:
                max_dd_pct = dd
            cur_dd_pct = dd
            drawdown_series.append({
                "date": d,
                "drawdownPct": round(-dd, 3),
            })

    # Concentration metrics
    hhi = sum(w * w for w in weights)
    effective_n = (1.0 / hhi) if hhi > 1e-9 else float(n_assets)
    largest = max(pos_outputs, key=lambda x: x["weightPct"])

    # Sector exposure
    sector_totals: Dict[str, float] = {}
    for p in pos_outputs:
        sec = p["sector"]
        sector_totals[sec] = sector_totals.get(sec, 0.0) + p["marketValueBase"]
    sector_exposure = [
        {
            "sector": sec,
            "valueBase": round(val, 2),
            "weightPct": round((val / total_holdings_val) * 100.0, 2),
        }
        for sec, val in sorted(sector_totals.items(), key=lambda kv: kv[1], reverse=True)
    ]

    return {
        "baseCurrency": base_curr,
        "usdInrRate": round(usd_inr, 4),
        "fxFreshness": fx_freshness,
        "totalHoldingsValue": round(total_holdings_val, 2),
        "cashBalance": round(cash_balance, 2),
        "totalEquity": round(total_equity, 2),
        "totalStopLossRisk": round(total_sl_risk, 2),
        "portfolioHeatPct": round((total_sl_risk / total_equity) * 100.0, 2) if total_equity > 0 else 0.0,
        "confidenceLevel": confidence,
        "lookbackDays": lookback_days,
        "alignedDays": n_days,
        "annualizedVolatilityPct": round(port_ann_vol_pct, 2),
        "portfolioDailyVarPct": round(port_var_pct, 2),
        "portfolioDailyVarAmount": round(port_var_amt, 2),
        "portfolioDailyCvarPct": round(port_cvar_pct, 2),
        "portfolioDailyCvarAmount": round(port_cvar_amt, 2),
        "undiversifiedVarAmount": round(undiversified_var_amt, 2),
        "diversificationBenefitPct": round(max(0.0, div_benefit_pct), 2),
        "portfolioBeta": round(portfolio_beta, 2),
        "benchmarkSymbol": bench_symbol,
        "maxDrawdownPct": round(max_dd_pct, 2),
        "currentDrawdownPct": round(cur_dd_pct, 2),
        "concentration": {
            "hhi": round(hhi, 4),
            "effectiveN": round(effective_n, 2),
            "largestPositionPct": largest["weightPct"],
            "largestSymbol": largest["symbol"],
        },
        "positions": pos_outputs,
        "correlationMatrix": {
            "labels": [p["symbol"] for p in pos_outputs],
            "matrix": corr_matrix,
        },
        "sectorExposure": sector_exposure,
        "drawdownSeries": drawdown_series[-180:],
        "methodology": f"Correlated Historical Simulation ({alignment_mode}, {n_days} aligned days)",
    }
