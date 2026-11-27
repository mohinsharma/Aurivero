from __future__ import annotations

import math
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.services.providers import get_provider
from backend.app.services.providers.base import utc_now_iso

LEARNING_LEVELS = {
    "ABSOLUTE_BEGINNER": {
        "code": "ABSOLUTE_BEGINNER",
        "label": "Absolute Beginner",
        "rank": 1,
        "description": "Building foundational literacy: capital protection, position sizing, and avoiding FOMO.",
    },
    "BASIC_UNDERSTANDING": {
        "code": "BASIC_UNDERSTANDING",
        "label": "Basic Market Understanding",
        "rank": 2,
        "description": "Understands stocks, indices, and basic orders; practicing stop-loss & R:R discipline.",
    },
    "INTERMEDIATE_TRADER": {
        "code": "INTERMEDIATE_TRADER",
        "label": "Intermediate Trader",
        "rank": 3,
        "description": "Evaluates volume confirmation, volatility regimes, and multi-factor risk.",
    },
    "ADVANCED_LEARNER": {
        "code": "ADVANCED_LEARNER",
        "label": "Advanced Learner",
        "rank": 4,
        "description": "Analyzes macro confluence, liquidity/gap risk, portfolio correlation, and tail drawdowns.",
    },
}


def classify_learning_level(experience_level: Optional[str], score: Optional[int] = None) -> Dict[str, Any]:
    raw = (experience_level or "").upper().strip()
    if raw in ("ADVANCED", "ADVANCED_LEARNER"):
        return LEARNING_LEVELS["ADVANCED_LEARNER"]
    if raw in ("INTERMEDIATE", "INTERMEDIATE_TRADER"):
        return LEARNING_LEVELS["INTERMEDIATE_TRADER"]
    if raw in ("BASIC", "BASIC_UNDERSTANDING"):
        return LEARNING_LEVELS["BASIC_UNDERSTANDING"]
    if raw in ("BEGINNER", "ABSOLUTE_BEGINNER"):
        return LEARNING_LEVELS["ABSOLUTE_BEGINNER"]
    if score is not None:
        if score >= 85:
            return LEARNING_LEVELS["INTERMEDIATE_TRADER"]
        if score >= 65:
            return LEARNING_LEVELS["BASIC_UNDERSTANDING"]
    return LEARNING_LEVELS["ABSOLUTE_BEGINNER"]


def _compute_sma(values: List[float], period: int) -> List[Optional[float]]:
    out: List[Optional[float]] = []
    for i in range(len(values)):
        if i + 1 < period:
            out.append(None)
        else:
            out.append(round(sum(values[i + 1 - period : i + 1]) / period, 2))
    return out


def _compute_rsi(values: List[float], period: int = 14) -> List[Optional[float]]:
    out: List[Optional[float]] = [None] * len(values)
    if len(values) <= period:
        return out
    gains: List[float] = []
    losses: List[float] = []
    for i in range(1, len(values)):
        diff = values[i] - values[i - 1]
        gains.append(max(0.0, diff))
        losses.append(max(0.0, -diff))
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for i in range(period, len(values)):
        if i > period:
            avg_gain = (avg_gain * (period - 1) + gains[i - 1]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i - 1]) / period
        if avg_loss <= 1e-12:
            out[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            out[i] = round(100.0 - (100.0 / (1.0 + rs)), 2)
    return out


async def build_historical_scenario(
    symbol: str = "RELIANCE",
    asset_class: str = "STOCK",
    window_seed: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Fetches REAL historical daily candles, splits them into:
    - visibleCandles (setup window with SMA20, RSI14, Support/Resistance)
    - hiddenOutcomeCandles (subsequent real movement hidden until user responds)
    Never fabricates market prices; transparently falls back to synthetic mode only if provider fails.
    """
    ac = asset_class.upper()
    sym = symbol.upper().strip()
    provider = get_provider(ac)
    series = await provider.get_candles(symbol=sym, timeframe="1d", limit=180)
    candles = sorted(series.candles, key=lambda c: c.time)

    if len(candles) < 60:
        return {
            "available": False,
            "dataType": "UNAVAILABLE",
            "symbol": sym,
            "assetClass": ac,
            "reason": f"Insufficient real historical candles ({len(candles)}) to construct a hidden-future scenario.",
        }

    # Pick a historical slice of 55 candles (40 visible + 15 hidden outcome)
    max_start = len(candles) - 56
    rng = random.Random(window_seed) if window_seed is not None else random.Random()
    start_idx = rng.randint(0, max(0, max_start))
    slice_candles = candles[start_idx : start_idx + 55]
    visible = slice_candles[:40]
    hidden = slice_candles[40:]

    closes = [c.close for c in slice_candles]
    sma20 = _compute_sma(closes, 20)
    rsi14 = _compute_rsi(closes, 14)

    vis_highs = [c.high for c in visible[-20:]]
    vis_lows = [c.low for c in visible[-20:]]
    resistance = round(max(vis_highs), 2)
    support = round(min(vis_lows), 2)

    last_vis = visible[-1]
    last_hid = hidden[-1]
    outcome_pct = round(((last_hid.close - last_vis.close) / max(1e-9, last_vis.close)) * 100.0, 2)
    max_adv_pct = round(((min(c.low for c in hidden) - last_vis.close) / max(1e-9, last_vis.close)) * 100.0, 2)
    max_fav_pct = round(((max(c.high for c in hidden) - last_vis.close) / max(1e-9, last_vis.close)) * 100.0, 2)

    vis_payload = [
        {
            "time": c.time,
            "date": datetime.fromtimestamp(c.time, tz=timezone.utc).strftime("%Y-%m-%d"),
            "open": c.open,
            "high": c.high,
            "low": c.low,
            "close": c.close,
            "volume": c.volume,
            "sma20": sma20[idx],
            "rsi14": rsi14[idx],
        }
        for idx, c in enumerate(visible)
    ]
    hid_payload = [
        {
            "time": c.time,
            "date": datetime.fromtimestamp(c.time, tz=timezone.utc).strftime("%Y-%m-%d"),
            "open": c.open,
            "high": c.high,
            "low": c.low,
            "close": c.close,
            "volume": c.volume,
            "sma20": sma20[40 + idx],
            "rsi14": rsi14[40 + idx],
        }
        for idx, c in enumerate(hidden)
    ]

    last_rsi = rsi14[39]
    last_sma = sma20[39]
    trend_note = (
        "Price is trading above its 20-day moving average"
        if last_sma and last_vis.close > last_sma
        else "Price is trading below its 20-day moving average"
    )

    return {
        "available": True,
        "scenarioType": "REAL_HISTORICAL",
        "dataType": "REAL HISTORICAL DATA",
        "symbol": series.symbol,
        "assetClass": series.assetClass,
        "exchange": "NSE/BSE" if ac == "STOCK" else ("Binance Spot" if ac == "CRYPTO" else "FX Spot"),
        "currency": series.currency,
        "timeframe": "1D",
        "source": series.source,
        "status": series.status,
        "isDelayed": series.status != "LIVE",
        "providerTimestamp": series.providerTimestamp,
        "supportLevel": support,
        "resistanceLevel": resistance,
        "lastVisibleClose": last_vis.close,
        "lastVisibleRsi": last_rsi,
        "visibleCandles": vis_payload,
        "hiddenOutcomeCandles": hid_payload,
        "prompts": [
            "What do you observe in price structure, volume, and RSI relative to support/resistance?",
            "Would you enter a trade, wait for confirmation, or avoid the setup? Why?",
            "If entering, state your entry, stop-loss, capital risk %, and what would invalidate your thesis.",
        ],
        "historicalDebrief": {
            "outcomeChangePct": outcome_pct,
            "maxFavorableExcursionPct": max_fav_pct,
            "maxAdverseExcursionPct": max_adv_pct,
            "marketIndication": f"{trend_note} (RSI-14: {last_rsi if last_rsi is not None else 'N/A'}) between support {support} and resistance {resistance}.",
            "keyRisksPresent": [
                f"Maximum adverse drawdown during the next 15 sessions was {max_adv_pct}%.",
                "Stop-loss orders can experience gap/slippage beyond the trigger price on overnight news.",
            ],
            "disciplinedTakeaway": (
                "Disciplined traders define invalidation before entry, cap risk at 1-2% of capital, and avoid chasing extended moves without volume confirmation."
            ),
        },
    }


RANDOM_SCENARIO_TEMPLATES = [
    {
        "archetype": "FALSE_BREAKOUT",
        "title": "The Low-Volume Breakout Trap",
        "assetClass": "STOCK",
        "concept": "Breakout Confirmation & Volume Divergence",
        "setup": "{symbol} breaks 2.5% above its 3-month resistance of ₹{resistance}, but trading volume is 38% below its 20-day average.",
        "question": "Would you enter immediately on the breakout candle, wait for a high-volume retest, or avoid the trade?",
        "choices": [
            {"id": "ENTER_NOW", "label": "Enter immediately with full size before missing the rally"},
            {"id": "WAIT_CONFIRM", "label": "Wait for a candle close + volume expansion or retest of ₹{resistance}"},
            {"id": "AVOID", "label": "Avoid for now and monitor if buyers actually defend the breakout"},
        ],
        "bestIds": ["WAIT_CONFIRM", "AVOID"],
        "hint": "Check whether institutional volume is supporting the move above resistance, or if thin liquidity could snap back into the range.",
        "explanation": "Low-volume breakouts frequently turn into bull traps (fakeouts). Waiting for volume confirmation or a successful retest protects you from being trapped at the high.",
    },
    {
        "archetype": "EMOTIONAL_RECOVERY",
        "title": "The Emotional Recovery Trade",
        "assetClass": "STOCK",
        "concept": "Revenge Trading & Daily Loss Limits",
        "setup": "You just lost ₹2,000 (2% of your ₹1,00,000 capital) on a morning trade in {symbol}. Ten minutes later, you spot a volatile spike in another stock and feel an urge to double your size to make back the ₹2,000 today.",
        "question": "What is the most disciplined action right now?",
        "choices": [
            {"id": "DOUBLE_DOWN", "label": "Double position size to recover the ₹2,000 quickly"},
            {"id": "STEP_AWAY", "label": "Respect your daily loss limit, pause trading, and log the emotional trigger"},
            {"id": "SMALL_PROBE", "label": "Take a small unscheduled impulse trade without a stop-loss"},
        ],
        "bestIds": ["STEP_AWAY"],
        "hint": "Ask yourself: am I reacting to a validated setup, or trying to erase emotional discomfort from the previous loss?",
        "explanation": "Increasing size after a loss (revenge trading) compounds drawdowns rapidly. Daily loss limits exist specifically to protect capital when emotional discipline is compromised.",
    },
    {
        "archetype": "FOMO_PARABOLIC",
        "title": "The Social-Media Hype Spike",
        "assetClass": "CRYPTO",
        "concept": "FOMO, Volatility & Asymmetric Risk/Reward",
        "setup": "{symbol} surges +8.5% in 2 hours. Social feeds are flooded with bullish targets. The nearest structural support is 9% below current price.",
        "question": "How should a risk-aware trader evaluate this opportunity?",
        "choices": [
            {"id": "CHASE_FOMO", "label": "Buy immediately so you don't miss the next 20%"},
            {"id": "PASS_OR_WAIT", "label": "Pass or wait for a pullback; chasing leaves a wide stop-loss and poor R:R"},
            {"id": "HIGH_LEVERAGE", "label": "Use 5x leverage with a tight 1% stop-loss"},
        ],
        "bestIds": ["PASS_OR_WAIT"],
        "hint": "Where would your stop-loss actually have to sit for invalidation, and what happens to your position size when stop distance is 9%?",
        "explanation": "Chasing parabolic candles forces either a dangerously wide stop-loss (crushing R:R) or a tiny tight stop that gets swept by normal volatility. Saying NO to poor R:R is a core skill.",
    },
    {
        "archetype": "GAP_NEWS_RISK",
        "title": "The Unexpected Overnight News Shock",
        "assetClass": "STOCK",
        "concept": "Gap Risk, Stop-Loss Limitations & Contingency Planning",
        "setup": "You hold {symbol} overnight with a stop-loss 2% below yesterday's close. Before market open, the company announces an unexpected regulatory investigation, and pre-open indicates a -7% gap down.",
        "question": "What will likely happen to your 2% stop-loss order at the market open?",
        "choices": [
            {"id": "GUARANTEED_2PCT", "label": "Exchange guarantees execution at exactly -2%"},
            {"id": "GAP_SLIPPAGE", "label": "Stop-loss triggers at open and fills near -7% (or worse) due to the gap"},
            {"id": "CANCELLED_PROFIT", "label": "Order automatically converts into a profit target"},
        ],
        "bestIds": ["GAP_SLIPPAGE"],
        "hint": "Can a stop-loss order execute at a price where zero shares actually trade?",
        "explanation": "Stop-loss orders do NOT guarantee execution price during overnight gaps or illiquid shocks. Sizing positions conservatively and respecting event risk limits catastrophic gap damage.",
    },
    {
        "archetype": "CONFLUENCE_CONFLICT",
        "title": "The Perfect Indicator vs Bearish Market",
        "assetClass": "STOCK",
        "concept": "Market Context & Indicator Limitations",
        "setup": "RSI on {symbol} shows a textbook oversold bounce signal, but NIFTY 50 is down -2.1% on heavy FII selling and breaking key support.",
        "question": "How do you weigh a single bullish indicator against a weak broader market?",
        "choices": [
            {"id": "BLIND_RSI", "label": "Buy full size because RSI rarely lies"},
            {"id": "RESPECT_CONTEXT", "label": "Respect broader market headwinds—wait for index stabilization or stay in cash"},
            {"id": "ADD_MARGIN", "label": "Use intraday margin to amplify the bounce"},
        ],
        "bestIds": ["RESPECT_CONTEXT"],
        "hint": "During broad market selloffs, correlations spike toward 1.0 and individual stocks often get dragged down regardless of oversold oscillators.",
        "explanation": "No single indicator works in isolation. Confluence with broader market structure and trend prevents catching falling knives.",
    },
]


def generate_random_scenario(level_code: str = "ABSOLUTE_BEGINNER", seed: Optional[int] = None) -> Dict[str, Any]:
    rng = random.Random(seed) if seed is not None else random.Random()
    tmpl = rng.choice(RANDOM_SCENARIO_TEMPLATES)
    stock_picks = [("RELIANCE", 2950), ("TCS", 4120), ("HDFCBANK", 1680), ("INFY", 1840), ("TATAMOTORS", 920)]
    crypto_picks = [("BTCUSDT", 88000), ("ETHUSDT", 3200), ("SOLUSDT", 195)]
    sym, ref_px = rng.choice(crypto_picks if tmpl["assetClass"] == "CRYPTO" else stock_picks)

    scenario_id = f"{tmpl['archetype'].lower()}-{rng.randint(1000, 9999)}"
    return {
        "scenarioId": scenario_id,
        "scenarioType": "AI_GENERATED_SIMULATION",
        "dataType": "AI-GENERATED SIMULATION",
        "difficultyLevel": level_code,
        "archetype": tmpl["archetype"],
        "title": tmpl["title"],
        "symbol": sym,
        "assetClass": tmpl["assetClass"],
        "concept": tmpl["concept"],
        "setup": tmpl["setup"].format(symbol=sym, resistance=ref_px),
        "question": tmpl["question"],
        "choices": [
            {"id": c["id"], "label": c["label"].format(resistance=ref_px)}
            for c in tmpl["choices"]
        ],
        "hint": tmpl["hint"],
        "bestIds": tmpl["bestIds"],
        "explanation": tmpl["explanation"],
        "disclaimer": "AI-generated educational simulation. Not real market data or investment advice.",
    }


def evaluate_socratic_response(
    archetype: str,
    selected_choice_id: str,
    user_reasoning: str,
    attempt_number: int = 1,
) -> Dict[str, Any]:
    tmpl = next((t for t in RANDOM_SCENARIO_TEMPLATES if t["archetype"] == archetype), RANDOM_SCENARIO_TEMPLATES[0])
    is_disciplined = selected_choice_id in tmpl["bestIds"]
    reasoning_len = len((user_reasoning or "").strip())

    if is_disciplined:
        return {
            "passed": True,
            "revealOutcome": True,
            "processScore": 95 if reasoning_len >= 15 else 82,
            "feedback": (
                f"Disciplined reasoning! You prioritized capital preservation and waited for proper {tmpl['concept'].lower()}."
            ),
            "overlookedRisks": [] if reasoning_len >= 15 else ["Write out your exact invalidation level so your rule is objective before entry."],
            "conceptTakeaway": tmpl["explanation"],
            "knowledgeCheck": {
                "question": f"In '{tmpl['title']}', what protects capital when conditions turn unfavorable?",
                "answer": tmpl["explanation"],
            },
        }

    # Never simply say "Wrong" — give a Socratic hint on attempt 1 so user can revise!
    if attempt_number <= 1:
        return {
            "passed": False,
            "revealOutcome": False,
            "processScore": 45,
            "feedback": "Pause and examine the hidden risk in this choice before committing virtual capital.",
            "socraticHint": tmpl["hint"],
            "overlookedRisks": [
                "Unfavorable risk-to-reward or unconfirmed market structure.",
                "Potential emotional/FOMO influence or gap/liquidity exposure.",
            ],
            "allowRevision": True,
        }

    return {
        "passed": False,
        "revealOutcome": True,
        "processScore": 55,
        "feedback": "Let's walk through what typically happens here so you can spot this trap next time.",
        "overlookedRisks": [tmpl["hint"]],
        "conceptTakeaway": tmpl["explanation"],
        "knowledgeCheck": {
            "question": f"Key lesson from '{tmpl['title']}':",
            "answer": tmpl["explanation"],
        },
    }


def evaluate_trade_risk_4tier(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    4-Tier AI Risk Warning Engine: GREEN | YELLOW | RED | CRITICAL
    Evaluates 10 risk factors + deterministic position sizing math + SEBI disclosures.
    """
    capital = max(1.0, float(payload.get("accountCapital", 100000)))
    risk_pct = max(0.0, float(payload.get("riskPercent", 1.5)))
    entry = max(0.01, float(payload.get("entryPrice", 100)))
    stop_loss = payload.get("stopLoss")
    target = payload.get("targetPrice")
    qty = max(0.0, float(payload.get("quantity", 1)))
    leverage = max(1.0, float(payload.get("leverage", 1.0)))
    daily_loss_pct = max(0.0, float(payload.get("dailyLossPct", 0.0)))
    daily_loss_limit_pct = max(0.5, float(payload.get("dailyLossLimitPct", 3.0)))
    portfolio_exposure_pct = max(0.0, float(payload.get("portfolioExposurePct", 0.0)))
    vol_regime = str(payload.get("volatilityRegime", "MODERATE")).upper()
    is_after_loss = bool(payload.get("isAfterLosingTrade", False))
    is_fomo = bool(payload.get("isFomoChase", False))
    upcoming_event = bool(payload.get("upcomingMajorEvent", False))
    low_liquidity = bool(payload.get("lowLiquidity", False))

    pos_value = entry * qty
    pos_ratio_pct = (pos_value / capital) * 100.0
    max_planned_loss = capital * (risk_pct / 100.0)
    risk_per_unit = abs(entry - float(stop_loss)) if stop_loss and float(stop_loss) > 0 else entry * 0.05
    theoretical_qty = math.floor(max_planned_loss / max(1e-6, risk_per_unit))
    actual_sl_risk_pct = ((risk_per_unit * qty) / capital) * 100.0
    rr_ratio = (
        abs(float(target) - entry) / max(1e-6, risk_per_unit)
        if target and float(target) > 0
        else None
    )

    triggers: List[Dict[str, str]] = []
    severity_rank = 0  # 0=GREEN, 1=YELLOW, 2=RED, 3=CRITICAL

    def add_trigger(level: str, factor: str, detail: str) -> None:
        nonlocal severity_rank
        rank_map = {"GREEN": 0, "YELLOW": 1, "RED": 2, "CRITICAL": 3}
        severity_rank = max(severity_rank, rank_map[level])
        triggers.append({"level": level, "factor": factor, "detail": detail})

    if not stop_loss or float(stop_loss) <= 0:
        add_trigger("RED", "Missing Stop-Loss", "No stop-loss defined. Unbounded downside risk violates disciplined capital protection.")
    elif (risk_per_unit / entry) * 100.0 > 8.0:
        add_trigger("YELLOW", "Wide Stop-Loss", f"Stop-loss distance ({(risk_per_unit/entry)*100:.1f}%) is wide; ensure size is scaled down accordingly.")

    if vol_regime == "HIGH":
        add_trigger("YELLOW", "Elevated Volatility", "Market volatility regime is HIGH; normal noise can trigger tight stops or widen slippage.")

    if pos_ratio_pct > 45.0:
        add_trigger("CRITICAL", "Catastrophic Position Size", f"Position consumes {pos_ratio_pct:.1f}% of capital, risking severe account drawdown.")
    elif pos_ratio_pct > 25.0 or actual_sl_risk_pct > 5.0:
        add_trigger("RED", "Oversized Position / Risk", f"Position size ({pos_ratio_pct:.1f}%) or trade risk ({actual_sl_risk_pct:.1f}%) exceeds prudent limits (5-10% trade risk can rapidly destroy capital).")

    if rr_ratio is not None and rr_ratio < 1.2:
        add_trigger("YELLOW", "Unattractive Risk/Reward", f"R:R of 1:{rr_ratio:.2f} requires a very high win rate just to break even.")

    if leverage >= 5.0:
        add_trigger("CRITICAL", "Excessive Leverage", f"{leverage:.1f}x leverage creates rapid liquidation risk on modest adverse moves.")
    elif leverage > 1.0:
        add_trigger("RED", "Margin Leverage Active", f"{leverage:.1f}x leverage magnifies losses and carries forced square-off risk.")

    if upcoming_event:
        add_trigger("YELLOW", "Upcoming Major Event", "Earnings, RBI policy, or macro events can cause overnight gaps past your stop-loss.")
    if low_liquidity:
        add_trigger("YELLOW", "Insufficient Liquidity", "Thin order-book liquidity increases slippage beyond planned stop-loss.")
    if daily_loss_pct >= daily_loss_limit_pct:
        add_trigger("CRITICAL", "Daily Loss Limit Breached", f"Daily loss ({daily_loss_pct:.1f}%) already hit your {daily_loss_limit_pct:.1f}% limit. Stop trading today.")
    if is_after_loss or is_fomo:
        add_trigger("CRITICAL" if is_after_loss and pos_ratio_pct > 20 else "RED", "Emotional / FOMO Bias", "Trade flagged after a loss or parabolic spike. Avoid revenge trading or FOMO chasing.")
    if portfolio_exposure_pct + pos_ratio_pct > 90.0:
        add_trigger("RED", "Excessive Portfolio Exposure", f"Combined exposure ({portfolio_exposure_pct + pos_ratio_pct:.1f}%) leaves inadequate cash buffer.")

    classifications = ["GREEN", "YELLOW", "RED", "CRITICAL"]
    classification = classifications[severity_rank]

    return {
        "classification": classification,
        "blockSimulation": classification == "CRITICAL",
        "triggers": triggers,
        "sizingMath": {
            "accountCapital": round(capital, 2),
            "riskPercent": round(risk_pct, 2),
            "maxPlannedLoss": round(max_planned_loss, 2),
            "riskPerUnit": round(risk_per_unit, 2),
            "theoreticalMaxQuantity": int(max(0, theoretical_qty)),
            "actualStopRiskPct": round(actual_sl_risk_pct, 2),
            "riskRewardRatio": round(rr_ratio, 2) if rr_ratio is not None else None,
            "slippageCaveat": f"Planned loss of {round(max_planned_loss, 2)} is NOT guaranteed due to slippage, overnight gaps, brokerage, and taxes.",
        },
        "sebiDisclosure": (
            "Educational simulation only. Never trade with borrowed money or emergency funds. "
            "Per SEBI studies, 93% of individual F&O traders incurred net losses; stop-loss orders do not guarantee fill prices."
        ),
    }


def build_daily_training_session(level_code: str = "ABSOLUTE_BEGINNER") -> Dict[str, Any]:
    return {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "level": LEARNING_LEVELS.get(level_code, LEARNING_LEVELS["ABSOLUTE_BEGINNER"]),
        "philosophy": "First learn how NOT to lose recklessly. Then learn how to evaluate opportunities.",
        "steps": [
            {
                "step": 1,
                "type": "ONE_MINUTE_CONCEPT",
                "title": "1-Minute Market Concept: Asymmetric Drawdown Math",
                "content": "A 10% loss requires an 11.1% gain to recover, but a 50% loss requires a +100% gain just to break even. Protecting capital from large drawdowns is mathematical survival.",
                "prompt": "If your ₹1,00,000 account drops 25% to ₹75,000, what percentage gain is needed to get back to ₹1,00,000?",
                "options": ["25.0%", "33.3%", "50.0%"],
                "correctOption": "33.3%",
            },
            {
                "step": 2,
                "type": "HISTORICAL_SCENARIO",
                "title": "Real Historical Market Scenario (Hidden Future)",
                "instruction": "Inspect the real historical daily chart, identify support/resistance & RSI, and submit your trade plan before revealing the next 15 sessions.",
            },
            {
                "step": 3,
                "type": "RANDOM_SCENARIO_1",
                "title": "Decision Scenario #1",
                "scenario": generate_random_scenario(level_code, seed=101),
            },
            {
                "step": 4,
                "type": "RANDOM_SCENARIO_2",
                "title": "Decision Scenario #2",
                "scenario": generate_random_scenario(level_code, seed=202),
            },
            {
                "step": 5,
                "type": "RISK_CHALLENGE",
                "title": "Position Sizing & Risk Challenge",
                "prompt": "Capital = ₹50,000 | Risk = 1% (₹500) | Entry = ₹250 | Stop-Loss = ₹245. Calculate theoretical max shares and explain why actual loss can still exceed ₹500.",
                "expectedShares": 100,
                "keyReason": "Overnight gaps, slippage, brokerage, and taxes can cause actual execution loss to exceed the planned ₹500.",
            },
            {
                "step": 6,
                "type": "KNOWLEDGE_CHECK",
                "title": "Short Knowledge Assessment",
                "prompt": "Which statement about stop-loss orders is true on Indian exchanges (NSE/BSE)?",
                "options": [
                    "Stop-loss guarantees exact execution price even after an overnight gap",
                    "Stop-loss triggers an exit order when reached, but gaps/illiquidity can cause slippage",
                    "Risking 10% per trade is universally safe for beginners",
                ],
                "correctOption": "Stop-loss triggers an exit order when reached, but gaps/illiquidity can cause slippage",
            },
        ],
    }


def build_weekly_report(behavioral_score: int = 76) -> Dict[str, Any]:
    return {
        "generatedAt": utc_now_iso(),
        "scores": {
            "riskManagement": min(100, max(40, behavioral_score + 6)),
            "decisionMaking": min(100, max(40, behavioral_score - 1)),
            "emotionalDiscipline": min(100, max(35, behavioral_score - 18)),
            "positionSizing": min(100, max(45, behavioral_score + 12)),
        },
        "biggestWeakness": "Entering trades after sudden price spikes without waiting for volume confirmation or pullback R:R.",
        "recommendedLesson": "FOMO, Breakout Confirmation & Daily Loss Limits",
        "spacedRepetitionQueue": [
            {"concept": "Breakout Volume Confirmation", "due": "Today", "masteryPct": 62},
            {"concept": "Gap Risk & Stop-Loss Slippage", "due": "In 2 days", "masteryPct": 74},
            {"concept": "Position Sizing Formula (Capital × Risk% / SL)", "due": "In 5 days", "masteryPct": 88},
        ],
        "processNote": "Rewards are based on disciplined risk process—even when a properly planned trade hits a planned stop-loss.",
    }
