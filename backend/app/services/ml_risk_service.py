from __future__ import annotations

import math
import statistics
from datetime import datetime, timezone
from typing import Any, Dict, List

from backend.app.services.providers import get_provider
from backend.app.services.providers.base import NormalizedCandle, utc_now_iso

try:
    import numpy as np
    HAS_NUMPY = True
except Exception:
    np = None  # type: ignore[assignment]
    HAS_NUMPY = False

try:
    from sklearn.ensemble import RandomForestRegressor
    HAS_SKLEARN = True
except Exception:
    HAS_SKLEARN = False


def _std(vals: List[float]) -> float:
    return statistics.stdev(vals) if len(vals) >= 2 else 0.0


def _mean(vals: List[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _build_volatility_features(candles: List[NormalizedCandle], annual_factor: int):
    """
    Constructs strictly causal (non-leaking) feature rows at index `i`
    to predict forward 5-day realized annualized volatility `y_{i -> i+5}`.
    """
    closes = [c.close for c in candles]
    highs = [c.high for c in candles]
    lows = [c.low for c in candles]
    vols = [c.volume for c in candles]

    rets = [0.0] * len(candles)
    for i in range(1, len(candles)):
        rets[i] = (closes[i] - closes[i - 1]) / closes[i - 1] if closes[i - 1] > 0 else 0.0

    trs = [0.0] * len(candles)
    trs[0] = highs[0] - lows[0]
    for i in range(1, len(candles)):
        trs[i] = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))

    X, y, base_preds, dates = [], [], [], []
    horizon = 5
    min_hist = 60

    for i in range(min_hist, len(candles) - horizon):
        r5 = _std(rets[i - 5 : i]) * math.sqrt(annual_factor)
        r20 = _std(rets[i - 20 : i]) * math.sqrt(annual_factor)
        r60 = _std(rets[i - 60 : i]) * math.sqrt(annual_factor)
        atr_pct = _mean(trs[i - 14 : i]) / max(1e-9, closes[i])
        ret_5d = (closes[i] - closes[i - 5]) / max(1e-9, closes[i - 5])
        peak20 = max(closes[i - 20 : i + 1])
        dd20 = (peak20 - closes[i]) / max(1e-9, peak20)
        vol_ratio = r5 / max(1e-6, r20)
        v_slice = vols[i - 20 : i]
        v_std = _std(v_slice)
        vol_z = (vols[i] - _mean(v_slice)) / v_std if v_std > 0 else 0.0

        target_fwd = _std(rets[i + 1 : i + 1 + horizon]) * math.sqrt(annual_factor)
        if not all(math.isfinite(v) for v in (r5, r20, r60, atr_pct, ret_5d, dd20, vol_ratio, vol_z, target_fwd)):
            continue

        X.append([r5, r20, r60, atr_pct, abs(rets[i]), ret_5d, dd20, vol_ratio, vol_z])
        y.append(target_fwd)
        base_preds.append(r20)
        dates.append(candles[i].time)

    i = len(candles) - 1
    r5_now = _std(rets[i - 5 : i + 1]) * math.sqrt(annual_factor)
    r20_now = _std(rets[i - 20 : i + 1]) * math.sqrt(annual_factor)
    r60_now = _std(rets[i - 60 : i + 1]) * math.sqrt(annual_factor)
    atr_now = _mean(trs[i - 14 : i + 1]) / max(1e-9, closes[i])
    ret5_now = (closes[i] - closes[i - 5]) / max(1e-9, closes[i - 5])
    peak20_now = max(closes[i - 20 : i + 1])
    dd20_now = (peak20_now - closes[i]) / max(1e-9, peak20_now)
    vol_ratio_now = r5_now / max(1e-6, r20_now)
    v_slice_now = vols[i - 20 : i]
    v_std_now = _std(v_slice_now)
    vol_z_now = (vols[i] - _mean(v_slice_now)) / v_std_now if v_std_now > 0 else 0.0
    latest_x = [[r5_now, r20_now, r60_now, atr_now, abs(rets[i]), ret5_now, dd20_now, vol_ratio_now, vol_z_now]]

    return X, y, base_preds, dates, latest_x, rets, r20_now, r60_now, vol_z_now


async def evaluate_ml_risk_intelligence(asset_class: str, symbol: str) -> Dict[str, Any]:
    provider = get_provider(asset_class)
    series = await provider.get_candles(symbol=symbol, timeframe="1d", limit=500)
    candles = series.candles

    if len(candles) < 120:
        return {
            "symbol": series.symbol,
            "assetClass": series.assetClass,
            "available": False,
            "status": series.status,
            "source": series.source,
            "retrievedAt": utc_now_iso(),
            "reason": f"Insufficient history for walk-forward ML validation ({len(candles)} daily candles; minimum 120 required).",
        }

    annual_factor = 365 if series.assetClass == "CRYPTO" else 252
    X, y, base_preds, dates, latest_x, rets, r20_now, r60_now, vol_z_now = _build_volatility_features(
        candles, annual_factor
    )

    if len(X) < 50:
        return {
            "symbol": series.symbol,
            "assetClass": series.assetClass,
            "available": False,
            "status": series.status,
            "source": series.source,
            "retrievedAt": utc_now_iso(),
            "reason": "Insufficient clean feature rows after causal windowing.",
        }

    # Strict chronological split: 70% train, 30% unseen walk-forward out-of-sample test
    split_idx = int(len(X) * 0.7)
    X_train, y_train = X[:split_idx], y[:split_idx]
    X_test, y_test = X[split_idx:], y[split_idx:]
    base_test = base_preds[split_idx:]

    if HAS_SKLEARN and HAS_NUMPY:
        model = RandomForestRegressor(n_estimators=80, max_depth=5, min_samples_leaf=5, random_state=42)
        model.fit(np.array(X_train), np.array(y_train))
        test_preds = list(model.predict(np.array(X_test)))
        model_full = RandomForestRegressor(n_estimators=80, max_depth=5, min_samples_leaf=5, random_state=42)
        model_full.fit(np.array(X), np.array(y))
        est_vol = float(model_full.predict(np.array(latest_x))[0])
        model_name = "RandomForestRegressor (scikit-learn)"
    elif HAS_NUMPY:
        lam = 1.0
        Xtr = np.array(X_train)
        Xte = np.array(X_test)
        Xf = np.array(X)
        Xb = np.hstack([np.ones((len(Xtr), 1)), Xtr])
        w = np.linalg.solve(Xb.T @ Xb + lam * np.eye(Xb.shape[1]), Xb.T @ np.array(y_train))
        test_preds = list(np.hstack([np.ones((len(Xte), 1)), Xte]) @ w)
        Xb_full = np.hstack([np.ones((len(Xf), 1)), Xf])
        w_full = np.linalg.solve(Xb_full.T @ Xb_full + lam * np.eye(Xb_full.shape[1]), Xb_full.T @ np.array(y))
        est_vol = float((np.hstack([np.ones((1, 1)), np.array(latest_x)]) @ w_full)[0])
        model_name = "Ridge Regression (NumPy)"
    else:
        # Pure-Python EWMA Volatility Baseline (no external ML packages required)
        test_preds = [0.65 * row[1] + 0.35 * row[2] for row in X_test]
        est_vol = 0.65 * r20_now + 0.35 * r60_now
        model_name = "EWMA Volatility Blend (Pure Python)"

    model_mae = _mean([abs(p - a) for p, a in zip(test_preds, y_test)])
    baseline_mae = _mean([abs(p - a) for p, a in zip(base_test, y_test)])
    model_rmse = math.sqrt(_mean([(p - a) ** 2 for p, a in zip(test_preds, y_test)]))
    baseline_rmse = math.sqrt(_mean([(p - a) ** 2 for p, a in zip(base_test, y_test)]))
    beats_baseline = bool(model_mae < baseline_mae)

    # Volatility regime classification via historical percentile
    pct_rank = float((sum(1 for hv in y if hv <= r20_now) / len(y)) * 100.0)
    if pct_rank >= 75:
        regime = "HIGH"
    elif pct_rank >= 35:
        regime = "MODERATE"
    else:
        regime = "LOW"

    # Volatility trend
    if r20_now > r60_now * 1.15:
        vol_trend = "EXPANDING"
    elif r20_now < r60_now * 0.85:
        vol_trend = "CONTRACTING"
    else:
        vol_trend = "STABLE"

    # Unusual movement anomaly detection (latest 1D return Z-score vs 60d)
    ret_window = rets[-61:-1] if len(rets) > 61 else rets[:-1]
    ret_60_std = _std(ret_window)
    ret_z = float((rets[-1] - _mean(ret_window)) / max(1e-9, ret_60_std))
    anomaly_detected = bool(abs(ret_z) >= 2.2 or abs(float(vol_z_now)) >= 2.5)

    train_start = datetime.fromtimestamp(dates[0], tz=timezone.utc).strftime("%Y-%m-%d")
    test_start = datetime.fromtimestamp(dates[split_idx], tz=timezone.utc).strftime("%Y-%m-%d")
    data_end = datetime.fromtimestamp(candles[-1].time, tz=timezone.utc).strftime("%Y-%m-%d")

    chosen_vol = est_vol if beats_baseline else r20_now
    low_band = max(0.0, chosen_vol - model_mae)
    high_band = chosen_vol + model_mae

    return {
        "symbol": series.symbol,
        "assetClass": series.assetClass,
        "available": True,
        "modelName": model_name,
        "beatsBaseline": beats_baseline,
        "recommendation": (
            "ML volatility model outperformed the 20D persistence baseline out-of-sample."
            if beats_baseline
            else "20D EWMA/persistence baseline matched or outperformed ML out-of-sample; displaying baseline estimate."
        ),
        "volatilityRegime": regime,
        "volatilityPercentile": round(pct_rank, 1),
        "volatilityTrend": vol_trend,
        "current20dVolPct": round(r20_now * 100, 2),
        "current60dVolPct": round(r60_now * 100, 2),
        "estimatedNext5dVolPct": round(chosen_vol * 100, 2),
        "estimatedVolRangePct": [round(low_band * 100, 2), round(high_band * 100, 2)],
        "anomalyDetected": anomaly_detected,
        "latestReturnZScore": round(ret_z, 2),
        "latestVolumeZScore": round(vol_z_now, 2),
        "evaluation": {
            "validationMethod": "Chronological Walk-Forward Split (70% Train / 30% Unseen Test)",
            "trainSamples": int(len(X_train)),
            "testSamples": int(len(X_test)),
            "trainStartDate": train_start,
            "testStartDate": test_start,
            "dataEndDate": data_end,
            "modelMaePct": round(model_mae * 100, 2),
            "baselineMaePct": round(baseline_mae * 100, 2),
            "modelRmsePct": round(model_rmse * 100, 2),
            "baselineRmsePct": round(baseline_rmse * 100, 2),
        },
        "limitations": [
            "Volatility estimates are statistical approximations of future dispersion, not price direction predictions.",
            "Sudden earnings, RBI policy, or macro shocks can exceed historical volatility bands.",
            "Deterministic position sizing remains completely independent of ML estimates.",
        ],
        "status": series.status,
        "source": series.source,
        "retrievedAt": utc_now_iso(),
    }
