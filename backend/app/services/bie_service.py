import json
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from backend.app.config import settings
from backend.app.database import get_connection
from backend.app.services.market_data_service import market_data_service
from backend.app.services.trade_service import trade_service

logger = logging.getLogger("mindmark.bie")

BIE_VERSION = 1

SCORING_DIMENSIONS = [
    "Risk Discipline",
    "Emotional Control",
    "Decision Consistency",
    "Research Quality",
    "Diversification Awareness",
    "Strategy Adherence",
    "Loss Response",
]


def _parse_dt(iso_str: str) -> datetime:
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()


def _confidence_tier(evidence_count: int, min_req: int) -> Tuple[str, float]:
    """Maps evidence count relative to minimum requirement into status label + confidence %."""
    if evidence_count == 0 or evidence_count < min_req:
        conf = round(min(40.0, (evidence_count / max(1, min_req)) * 40.0), 1)
        return "insufficient_evidence", conf
    if evidence_count == min_req:
        return "emerging_pattern", 58.0
    if evidence_count <= min_req + 1:
        return "moderate_evidence", 76.0
    return "stronger_evidence", min(95.0, 82.0 + (evidence_count - min_req) * 4.0)


class BehavioralIntelligenceEngine:
    """
    Production Behavioral Intelligence Engine (BIE).
    All feature extraction, bias detection, and scoring run deterministically on the backend.
    """

    # -------------------------------------------------------------------------
    # 1. IMMUTABLE DECISION EVENT RECORDING + PRE-DECISION CONTRACT
    # -------------------------------------------------------------------------
    @staticmethod
    def record_decision_event(
        user_id: str,
        payload: Dict[str, Any],
        portfolio_override: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        client_event_id = payload.get("client_event_id")
        if client_event_id:
            cursor.execute(
                "SELECT id FROM decision_events WHERE user_id = ? AND client_event_id = ?",
                (user_id, client_event_id),
            )
            dup = cursor.fetchone()
            if dup:
                conn.close()
                return {
                    "success": False,
                    "duplicate": True,
                    "existing_event_id": dup["id"],
                    "message": f"Duplicate decision event rejected (client_event_id={client_event_id}).",
                }

        symbol = payload["symbol"].upper().strip()
        stock_info = market_data_service.get_stock_by_symbol(symbol)
        sector = payload.get("sector") or (stock_info["sector"] if stock_info else "Unknown")

        # Validate price against market data when available; allow explicit price if symbol is external/test
        exec_price = payload.get("execution_price")
        if exec_price is None:
            if stock_info:
                exec_price = float(stock_info["price"])
            else:
                conn.close()
                return {
                    "success": False,
                    "duplicate": False,
                    "message": f"Execution price required when market data for {symbol} is unavailable.",
                }

        quantity = float(payload["quantity"])
        total_value = round(exec_price * quantity, 2)

        # Portfolio snapshot (server-side unless explicitly passed from TradeService)
        portfolio = portfolio_override or trade_service.get_portfolio(user_id)
        port_before = payload.get("portfolio_value_before")
        if port_before is None:
            port_before = float(portfolio["total_portfolio_value"])
        port_after = payload.get("portfolio_value_after")
        if port_after is None:
            port_after = port_before

        cash_before = payload.get("cash_before")
        if cash_before is None:
            cash_before = float(portfolio["current_cash"])
        cash_after = payload.get("cash_after")
        if cash_after is None:
            cash_after = cash_before

        stock_exp_pct = payload.get("stock_exposure_pct")
        if stock_exp_pct is None:
            stock_exp_pct = round((total_value / max(port_before, 1.0)) * 100.0, 2)

        sector_exp_pct = payload.get("sector_exposure_pct")
        if sector_exp_pct is None:
            sector_val = sum(
                p["current_value"] for p in portfolio.get("positions", []) if p.get("sector") == sector
            )
            if payload["action"] == "BUY":
                sector_val += total_value
            sector_exp_pct = round((sector_val / max(port_before, 1.0)) * 100.0, 2)

        market_chg = payload.get("market_change_pct")
        if market_chg is None and stock_info:
            market_chg = stock_info.get("changePercent")

        now_utc = datetime.utcnow().isoformat()
        event_id = f"evt-{uuid.uuid4().hex[:10]}"
        contract_id = None

        contract_data = payload.get("pre_decision_contract")
        confidence_level = payload.get("confidence_level")
        stated_reason = payload.get("stated_reason")

        if contract_data:
            contract_id = f"ctr-{uuid.uuid4().hex[:10]}"
            confidence_level = confidence_level or contract_data.get("confidence_level")
            if not stated_reason:
                stated_reason = contract_data.get("why_making_decision")
            cursor.execute(
                """
                INSERT INTO pre_decision_contracts (
                    id, user_id, event_id, symbol, action, why_making_decision,
                    biggest_risk, what_proves_wrong, planned_exposure_pct,
                    confidence_level, short_explanation, version, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    contract_id,
                    user_id,
                    event_id,
                    symbol,
                    payload["action"],
                    contract_data["why_making_decision"],
                    contract_data["biggest_risk"],
                    contract_data["what_proves_wrong"],
                    float(contract_data["planned_exposure_pct"]),
                    int(contract_data["confidence_level"]),
                    contract_data.get("short_explanation"),
                    BIE_VERSION,
                    now_utc,
                ),
            )

        cursor.execute(
            """
            INSERT INTO decision_events (
                id, user_id, client_event_id, scenario_id, symbol, sector, action,
                execution_price, quantity, total_value, realized_pnl_delta,
                portfolio_value_before, portfolio_value_after, cash_before, cash_after,
                stock_exposure_pct, sector_exposure_pct, market_change_pct,
                recent_drawdown_pct, stated_reason, confidence_level, viewed_info_json,
                contract_id, decision_duration_sec, subsequent_outcome_json, version, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
            """,
            (
                event_id,
                user_id,
                client_event_id,
                payload.get("scenario_id"),
                symbol,
                sector,
                payload["action"],
                exec_price,
                quantity,
                total_value,
                float(payload.get("realized_pnl_delta") or 0.0),
                port_before,
                port_after,
                cash_before,
                cash_after,
                stock_exp_pct,
                sector_exp_pct,
                market_chg,
                float(payload.get("recent_drawdown_pct") or 0.0),
                stated_reason,
                confidence_level,
                json.dumps(payload.get("viewed_info") or []),
                contract_id,
                payload.get("decision_duration_sec"),
                BIE_VERSION,
                now_utc,
            ),
        )

        conn.commit()
        conn.close()

        # Recalculate behavioral snapshot, patterns & scores after new event
        analysis = BehavioralIntelligenceEngine.recalculate_user_behavior(user_id)

        return {
            "success": True,
            "duplicate": False,
            "event_id": event_id,
            "contract_id": contract_id,
            "created_at": now_utc,
            "events_count": analysis["features"]["total_events"],
        }

    # -------------------------------------------------------------------------
    # 2. FEATURE EXTRACTION (100% BACKEND MATH)
    # -------------------------------------------------------------------------
    @staticmethod
    def extract_behavioral_features(
        events: List[Dict[str, Any]],
        contracts_by_id: Dict[str, Dict[str, Any]],
        portfolio: Dict[str, Any],
    ) -> Dict[str, Any]:
        total_events = len(events)
        if total_events == 0:
            positions = portfolio.get("positions", [])
            total_val = max(portfolio.get("total_portfolio_value", 100000.0), 1.0)
            max_stock_pct = max(((p["current_value"] / total_val) * 100.0 for p in positions), default=0.0)
            return {
                "total_events": 0,
                "active_days": 0,
                "trades_per_active_day": 0.0,
                "weekly_trading_frequency": 0.0,
                "average_holding_period_hours": None,
                "portfolio_concentration_pct": round(max_stock_pct, 2),
                "top3_concentration_pct": 0.0,
                "sector_concentration_pct": 0.0,
                "pct_sold_during_drawdowns": 0.0,
                "avg_size_change_after_loss_pct": 0.0,
                "rapid_reversals_count": 0,
                "decisions_without_reasoning_pct": 0.0,
                "trades_after_unusual_moves_count": 0,
                "avg_risk_exposure_change_pct": 0.0,
                "strategy_deviations_count": 0,
                "research_activity_rate": 0.0,
                "confidence_calibration_gap": 0.0,
                "volatile_market_actions_count": 0,
            }

        # Chronological order (oldest -> newest)
        ordered = sorted(events, key=lambda e: e["created_at"])

        active_days = len({e["created_at"][:10] for e in ordered})
        trades_per_active_day = round(total_events / max(1, active_days), 2)

        first_dt = _parse_dt(ordered[0]["created_at"])
        last_dt = _parse_dt(ordered[-1]["created_at"])
        span_weeks = max(1.0, (last_dt - first_dt).total_seconds() / (7 * 86400))
        weekly_freq = round(total_events / span_weeks, 2)

        # Holding period (BUY -> SELL on same symbol)
        open_buy_times: Dict[str, datetime] = {}
        holding_hours: List[float] = []
        rapid_reversals = 0
        last_action_by_sym: Dict[str, Tuple[str, datetime]] = {}

        for e in ordered:
            sym = e["symbol"]
            dt = _parse_dt(e["created_at"])
            act = e["action"]

            if sym in last_action_by_sym:
                prev_act, prev_dt = last_action_by_sym[sym]
                diff_hours = abs((dt - prev_dt).total_seconds()) / 3600.0
                if prev_act != act and act in ("BUY", "SELL", "REDUCE") and prev_act in ("BUY", "SELL", "REDUCE") and diff_hours <= 2.0:
                    rapid_reversals += 1
            last_action_by_sym[sym] = (act, dt)

            if act == "BUY" and sym not in open_buy_times:
                open_buy_times[sym] = dt
            elif act in ("SELL", "REDUCE") and sym in open_buy_times:
                hrs = max(0.0, (dt - open_buy_times[sym]).total_seconds() / 3600.0)
                holding_hours.append(hrs)
                if act == "SELL":
                    open_buy_times.pop(sym, None)

        avg_holding_hours = round(sum(holding_hours) / len(holding_hours), 2) if holding_hours else None

        # Portfolio & sector concentration from live portfolio (or latest event exposure fallback)
        positions = portfolio.get("positions", [])
        total_val = max(portfolio.get("total_portfolio_value", 100000.0), 1.0)
        stock_weights = sorted([(p["current_value"] / total_val) * 100.0 for p in positions], reverse=True)
        max_stock_pct = stock_weights[0] if stock_weights else max((e.get("stock_exposure_pct") or 0.0 for e in ordered), default=0.0)
        top3_pct = sum(stock_weights[:3]) if stock_weights else 0.0

        sector_totals: Dict[str, float] = {}
        for p in positions:
            sec = p.get("sector") or "Unknown"
            sector_totals[sec] = sector_totals.get(sec, 0.0) + p["current_value"]
        max_sector_pct = max(((v / total_val) * 100.0 for v in sector_totals.values()), default=0.0)

        # Drawdown selling
        sell_events = [e for e in ordered if e["action"] in ("SELL", "REDUCE")]
        drawdown_sells = [e for e in sell_events if (e.get("recent_drawdown_pct") or 0.0) >= 5.0]
        pct_sold_drawdown = round((len(drawdown_sells) / len(sell_events)) * 100.0, 2) if sell_events else 0.0

        # Position size changes after losses
        size_changes_after_loss: List[float] = []
        for i in range(1, len(ordered)):
            prev_e = ordered[i - 1]
            cur_e = ordered[i]
            if (prev_e.get("realized_pnl_delta") or 0.0) < 0 and cur_e["action"] == "BUY" and prev_e["total_value"] > 0:
                pct_delta = ((cur_e["total_value"] - prev_e["total_value"]) / prev_e["total_value"]) * 100.0
                size_changes_after_loss.append(pct_delta)
        avg_size_change_loss = round(sum(size_changes_after_loss) / len(size_changes_after_loss), 2) if size_changes_after_loss else 0.0

        # Missing reasoning & research
        no_reason_count = sum(1 for e in ordered if not (e.get("stated_reason") or "").strip())
        no_reason_pct = round((no_reason_count / total_events) * 100.0, 2)

        researched_count = 0
        unusual_move_trades = 0
        volatile_actions = 0
        exposure_deltas: List[float] = []
        strategy_deviations = 0
        conf_gaps: List[float] = []

        for idx, e in enumerate(ordered):
            viewed = json.loads(e.get("viewed_info_json") or "[]")
            has_research = len(viewed) > 0
            if has_research:
                researched_count += 1

            mkt_chg = e.get("market_change_pct")
            if mkt_chg is not None and abs(mkt_chg) >= 3.0:
                unusual_move_trades += 1
            if (mkt_chg is not None and abs(mkt_chg) >= 2.5) or (e.get("recent_drawdown_pct") or 0.0) >= 5.0:
                volatile_actions += 1

            if idx > 0:
                exposure_deltas.append(abs((e.get("stock_exposure_pct") or 0.0) - (ordered[idx - 1].get("stock_exposure_pct") or 0.0)))

            cid = e.get("contract_id")
            if cid and cid in contracts_by_id:
                c = contracts_by_id[cid]
                if (e.get("stock_exposure_pct") or 0.0) > (c.get("planned_exposure_pct", 100.0) + 10.0):
                    strategy_deviations += 1

            conf = e.get("confidence_level")
            if conf is not None:
                # High confidence (4-5) with no research or no stated reason -> calibration gap
                if conf >= 4 and (not has_research or not (e.get("stated_reason") or "").strip()):
                    conf_gaps.append(float(conf - 2))
                else:
                    conf_gaps.append(0.0)

        research_rate = round((researched_count / total_events) * 100.0, 2)
        avg_exp_delta = round(sum(exposure_deltas) / len(exposure_deltas), 2) if exposure_deltas else 0.0
        conf_gap = round(sum(conf_gaps) / len(conf_gaps), 2) if conf_gaps else 0.0

        return {
            "total_events": total_events,
            "active_days": active_days,
            "trades_per_active_day": trades_per_active_day,
            "weekly_trading_frequency": weekly_freq,
            "average_holding_period_hours": avg_holding_hours,
            "portfolio_concentration_pct": round(max_stock_pct, 2),
            "top3_concentration_pct": round(top3_pct, 2),
            "sector_concentration_pct": round(max_sector_pct, 2),
            "pct_sold_during_drawdowns": pct_sold_drawdown,
            "avg_size_change_after_loss_pct": avg_size_change_loss,
            "rapid_reversals_count": rapid_reversals,
            "decisions_without_reasoning_pct": no_reason_pct,
            "trades_after_unusual_moves_count": unusual_move_trades,
            "avg_risk_exposure_change_pct": avg_exp_delta,
            "strategy_deviations_count": strategy_deviations,
            "research_activity_rate": research_rate,
            "confidence_calibration_gap": conf_gap,
            "volatile_market_actions_count": volatile_actions,
        }

    # -------------------------------------------------------------------------
    # 3. 10 SEPARATE BIAS DETECTORS
    # -------------------------------------------------------------------------
    @staticmethod
    def run_all_detectors(
        events: List[Dict[str, Any]],
        contracts_by_id: Dict[str, Dict[str, Any]],
        features: Dict[str, Any],
        portfolio: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        ordered = sorted(events, key=lambda e: e["created_at"])
        obs_period = (
            f"{ordered[0]['created_at'][:10]} to {ordered[-1]['created_at'][:10]}"
            if ordered else "No decisions recorded yet"
        )

        detectors: List[Dict[str, Any]] = []

        # 1. FOMO Detection (min 2 qualifying events)
        fomo_ids = []
        for e in ordered:
            mkt = e.get("market_change_pct")
            viewed = json.loads(e.get("viewed_info_json") or "[]")
            reason = (e.get("stated_reason") or "").lower()
            is_fomo_reason = any(w in reason for w in ["fomo", "missing out", "rally", "everyone buying", "skyrocketing"])
            if e["action"] == "BUY":
                if is_fomo_reason or (mkt is not None and mkt >= 3.0 and len(viewed) < 2):
                    fomo_ids.append(e["id"])
        status, conf = _confidence_tier(len(fomo_ids), 2)
        detected = len(fomo_ids) >= 2
        detectors.append({
            "pattern_key": "fomo",
            "pattern_name": "Possible FOMO (Fear of Missing Out)",
            "detected": detected,
            "status": status,
            "severity": "HIGH" if len(fomo_ids) >= 3 else "MODERATE" if detected else "LOW",
            "confidence": conf,
            "evidence_count": len(fomo_ids),
            "min_evidence_required": 2,
            "observed_period": obs_period,
            "evidence_event_ids": fomo_ids,
            "what_happened": f"Observed {len(fomo_ids)} BUY entries following >= 3% rallies with limited prior research or FOMO-related rationale." if detected else "Insufficient repeated evidence of chasing rallies without research.",
            "why_it_matters": "Entering after sharp price spikes reduces your margin of safety and increases short-term pullback risk.",
            "what_user_can_learn": "Wait for your pre-defined setup and review fundamentals or risk limits before entering rallying stocks.",
            "recommended_challenge": "Wait-for-Pullback Patience Drill",
            "limitations": "Requires market_change_pct context; well-researched momentum entries (2+ research sources) are excluded.",
        })

        # 2. Panic Selling Detection (min 2 qualifying events)
        panic_ids = []
        for e in ordered:
            dd = e.get("recent_drawdown_pct") or 0.0
            viewed = json.loads(e.get("viewed_info_json") or "[]")
            reason = (e.get("stated_reason") or "").lower()
            is_researched_trim = len(viewed) >= 2 or any(w in reason for w in ["rebalance", "risk limit", "stop-loss", "stop loss", "thesis broken"])
            is_panic_reason = any(w in reason for w in ["panic", "scared", "crash", "fear"])
            if e["action"] in ("SELL", "REDUCE") and (is_panic_reason or (dd >= 5.0 and not is_researched_trim)):
                panic_ids.append(e["id"])
        status, conf = _confidence_tier(len(panic_ids), 2)
        detected = len(panic_ids) >= 2
        detectors.append({
            "pattern_key": "panic_selling",
            "pattern_name": "Possible Panic Selling",
            "detected": detected,
            "status": status,
            "severity": "HIGH" if len(panic_ids) >= 3 else "MODERATE" if detected else "LOW",
            "confidence": conf,
            "evidence_count": len(panic_ids),
            "min_evidence_required": 2,
            "observed_period": obs_period,
            "evidence_event_ids": panic_ids,
            "what_happened": f"Observed {len(panic_ids)} exits during >= 5% drawdowns without documented risk-plan triggers or research." if detected else "No repeated pattern of unresearched drawdown exits.",
            "why_it_matters": "Selling reflexively during volatility locks in temporary drawdowns and often misses subsequent recoveries.",
            "what_user_can_learn": "Separate planned stop-loss executions from sudden emotional reactions by writing exit criteria upfront.",
            "recommended_challenge": "Survive the Drawdown Simulation",
            "limitations": "Researched risk reductions and planned stop-loss exits are intentionally excluded.",
        })

        # 3. Loss Chasing Detection (min 2 qualifying events)
        chase_ids = []
        for i in range(1, len(ordered)):
            prev_e = ordered[i - 1]
            cur_e = ordered[i]
            reason = (cur_e.get("stated_reason") or "").lower()
            recovery_cue = any(w in reason for w in ["recover", "make back", "win back", "double down", "revenge"])
            size_jumped = (prev_e.get("realized_pnl_delta") or 0.0) < 0 and cur_e["action"] == "BUY" and prev_e["total_value"] > 0 and cur_e["total_value"] >= prev_e["total_value"] * 1.2
            if size_jumped or (recovery_cue and cur_e["action"] == "BUY"):
                chase_ids.append(cur_e["id"])
        status, conf = _confidence_tier(len(chase_ids), 2)
        detected = len(chase_ids) >= 2
        detectors.append({
            "pattern_key": "loss_chasing",
            "pattern_name": "Possible Loss Chasing",
            "detected": detected,
            "status": status,
            "severity": "HIGH" if detected else "LOW",
            "confidence": conf,
            "evidence_count": len(chase_ids),
            "min_evidence_required": 2,
            "observed_period": obs_period,
            "evidence_event_ids": chase_ids,
            "what_happened": f"Observed {len(chase_ids)} entries where position size increased >= 20% after a realized loss or cited loss-recovery reasoning." if detected else "Position sizing remained steady relative to prior outcomes.",
            "why_it_matters": "Escalating risk immediately after a loss compounds drawdowns when objectivity is lowest.",
            "what_user_can_learn": "Enforce a mandatory cooling-off pause and keep position sizes fixed or smaller after a loss.",
            "recommended_challenge": "The Recovery Trap",
            "limitations": "Depends on realized_pnl_delta recorded on closed trades.",
        })

        # 4. Overtrading Detection (min 5 events with high velocity or reversals)
        overtrade_ids = [e["id"] for e in ordered] if (features["trades_per_active_day"] >= 3.0 or features["rapid_reversals_count"] >= 2) and len(ordered) >= 5 else []
        status, conf = _confidence_tier(len(overtrade_ids), 5)
        detected = len(overtrade_ids) >= 5
        detectors.append({
            "pattern_key": "overtrading",
            "pattern_name": "Possible Overtrading",
            "detected": detected,
            "status": status,
            "severity": "MODERATE" if detected else "LOW",
            "confidence": conf,
            "evidence_count": len(overtrade_ids),
            "min_evidence_required": 5,
            "observed_period": obs_period,
            "evidence_event_ids": overtrade_ids[:8],
            "what_happened": f"Averaged {features['trades_per_active_day']} decisions/active day with {features['rapid_reversals_count']} rapid reversals." if detected else "Trading pace remains within measured educational limits.",
            "why_it_matters": "Frequent churning increases brokerage/slippage drag and invites impulsive decision fatigue.",
            "what_user_can_learn": "Focus on fewer, higher-conviction decisions backed by Pre-Decision Contracts.",
            "recommended_challenge": "High-Conviction Patience Week",
            "limitations": "Requires at least 5 decision events to establish a reliable activity baseline.",
        })

        # 5. Portfolio Concentration Detection
        max_stock = features["portfolio_concentration_pct"]
        top3 = features["top3_concentration_pct"]
        conc_events = [e["id"] for e in ordered if (e.get("stock_exposure_pct") or 0.0) >= 35.0]
        conc_ev_count = len(conc_events) if conc_events else (1 if max_stock >= 35.0 else 0)
        detected = max_stock >= 35.0 or top3 >= 75.0
        status = "stronger_evidence" if max_stock >= 50.0 else "moderate_evidence" if detected else ("insufficient_evidence" if len(ordered) == 0 else "emerging_pattern" if max_stock >= 28.0 else "insufficient_evidence")
        conf = 85.0 if max_stock >= 50.0 else 72.0 if detected else 30.0
        detectors.append({
            "pattern_key": "portfolio_concentration",
            "pattern_name": "Portfolio Concentration Risk",
            "detected": detected,
            "status": status if detected else ("insufficient_evidence" if len(ordered) < 2 else "emerging_pattern" if max_stock >= 28.0 else "insufficient_evidence"),
            "severity": "HIGH" if max_stock >= 45.0 else "MODERATE" if detected else "LOW",
            "confidence": conf,
            "evidence_count": conc_ev_count,
            "min_evidence_required": 1,
            "observed_period": obs_period,
            "evidence_event_ids": conc_events,
            "what_happened": f"Largest single-stock allocation reached {max_stock:.1f}% (Top-3 holdings: {top3:.1f}%)." if detected else f"Top single-stock exposure is {max_stock:.1f}%, within the 35% threshold.",
            "why_it_matters": "Concentrating >35% in one stock exposes the entire portfolio to single-company shocks.",
            "what_user_can_learn": "Cap individual positions at 15–25% of total portfolio value.",
            "recommended_challenge": "Position Sizing Cap Exercise",
            "limitations": "Evaluated against current virtual portfolio holdings and event exposure snapshots.",
        })

        # 6. Impulsive Decisions (speed alone NEVER triggers; requires fast + no reasoning + no research)
        impulsive_ids = []
        for e in ordered:
            dur = e.get("decision_duration_sec")
            viewed = json.loads(e.get("viewed_info_json") or "[]")
            reason = (e.get("stated_reason") or "").strip()
            if dur is not None and dur < 15 and len(viewed) == 0 and not reason:
                impulsive_ids.append(e["id"])
        status, conf = _confidence_tier(len(impulsive_ids), 3)
        detected = len(impulsive_ids) >= 3
        detectors.append({
            "pattern_key": "impulsive_decisions",
            "pattern_name": "Possible Impulsive Decisions",
            "detected": detected,
            "status": status,
            "severity": "MODERATE" if detected else "LOW",
            "confidence": conf,
            "evidence_count": len(impulsive_ids),
            "min_evidence_required": 3,
            "observed_period": obs_period,
            "evidence_event_ids": impulsive_ids,
            "what_happened": f"Detected {len(impulsive_ids)} rapid decisions (<15s) submitted without stated reasoning or prior research." if detected else "Decisions generally show either research review or documented rationale.",
            "why_it_matters": "Acting without a hypothesis or risk check turns simulation into guesswork.",
            "what_user_can_learn": "Use the Pre-Decision Contract to articulate your risk and invalidation level before clicking Buy/Sell.",
            "recommended_challenge": "The 60-Second Thesis Check",
            "limitations": "Decision speed alone never triggers this detector; requires missing reasoning and zero research.",
        })

        # 7. Loss Aversion (min 4 closed SELL/REDUCE outcomes with realized_pnl_delta)
        closed_outcomes = [e for e in ordered if e["action"] in ("SELL", "REDUCE") and e.get("realized_pnl_delta") not in (None, 0.0)]
        early_win_exits = [e["id"] for e in closed_outcomes if (e.get("realized_pnl_delta") or 0.0) > 0 and e["total_value"] > 0 and (e["realized_pnl_delta"] / e["total_value"]) < 0.03]
        status, conf = _confidence_tier(len(closed_outcomes), 4)
        detected = len(closed_outcomes) >= 4 and len(early_win_exits) >= 3
        detectors.append({
            "pattern_key": "loss_aversion",
            "pattern_name": "Possible Loss Aversion (Disposition Effect)",
            "detected": detected,
            "status": status if detected else ("insufficient_evidence" if len(closed_outcomes) < 4 else "emerging_pattern"),
            "severity": "MODERATE" if detected else "LOW",
            "confidence": conf if detected else min(40.0, len(closed_outcomes) * 10.0),
            "evidence_count": len(closed_outcomes),
            "min_evidence_required": 4,
            "observed_period": obs_period,
            "evidence_event_ids": early_win_exits,
            "what_happened": f"Across {len(closed_outcomes)} closed outcomes, {len(early_win_exits)} winning exits occurred at <3% gain while larger losses persisted." if detected else f"Only {len(closed_outcomes)} closed outcomes with realized P&L; minimum 4 required.",
            "why_it_matters": "Cutting winners too early while holding losers distorts long-term risk/reward expectancy.",
            "what_user_can_learn": "Define target and stop-loss levels symmetrically before entering a position.",
            "recommended_challenge": "Asymmetric Risk-Reward Lab",
            "limitations": "Requires at least 4 closed decisions with comparable realized outcome data.",
        })

        # 8. Overconfidence (never equates profitable outcome with good decision)
        overconf_ids = []
        for e in ordered:
            c_lvl = e.get("confidence_level")
            viewed = json.loads(e.get("viewed_info_json") or "[]")
            reason = (e.get("stated_reason") or "").strip()
            exp = e.get("stock_exposure_pct") or 0.0
            if c_lvl is not None and c_lvl >= 4 and (len(viewed) == 0 or not reason or exp > 35.0):
                overconf_ids.append(e["id"])
        status, conf = _confidence_tier(len(overconf_ids), 3)
        detected = len(overconf_ids) >= 3
        detectors.append({
            "pattern_key": "overconfidence",
            "pattern_name": "Possible Overconfidence",
            "detected": detected,
            "status": status,
            "severity": "MODERATE" if detected else "LOW",
            "confidence": conf,
            "evidence_count": len(overconf_ids),
            "min_evidence_required": 3,
            "observed_period": obs_period,
            "evidence_event_ids": overconf_ids,
            "what_happened": f"Observed {len(overconf_ids)} high-confidence (>=4/5) decisions made without research or with >35% single-stock exposure." if detected else "Self-reported confidence appears calibrated with supporting preparation.",
            "why_it_matters": "High certainty without verification leads to oversized bets—even if a lucky outcome happens once.",
            "what_user_can_learn": "Rate confidence based on evidence quality, not gut feeling.",
            "recommended_challenge": "Pre-Mortem Calibration Drill",
            "limitations": "Evaluates decision process vs. stated confidence; never judges process quality by short-term profit.",
        })

        # 9. Strategy Drift (comparing Pre-Decision Contracts / limits vs actual)
        drift_ids = []
        for e in ordered:
            cid = e.get("contract_id")
            if cid and cid in contracts_by_id:
                ctr = contracts_by_id[cid]
                if (e.get("stock_exposure_pct") or 0.0) > (ctr.get("planned_exposure_pct", 100.0) + 10.0):
                    drift_ids.append(e["id"])
        status, conf = _confidence_tier(len(drift_ids), 2)
        detected = len(drift_ids) >= 2
        detectors.append({
            "pattern_key": "strategy_drift",
            "pattern_name": "Possible Strategy Drift",
            "detected": detected,
            "status": status,
            "severity": "MODERATE" if detected else "LOW",
            "confidence": conf,
            "evidence_count": len(drift_ids),
            "min_evidence_required": 2,
            "observed_period": obs_period,
            "evidence_event_ids": drift_ids,
            "what_happened": f"Observed {len(drift_ids)} decisions where actual portfolio exposure exceeded your Pre-Decision Contract limit by >10%." if detected else "Observed allocations remain consistent with your declared Pre-Decision Contracts.",
            "why_it_matters": "Gradually abandoning your own exposure limits undermines any trading or investing plan.",
            "what_user_can_learn": "Review your Pre-Decision Contract limits before increasing position sizes.",
            "recommended_challenge": "Rule-Adherence Audit",
            "limitations": "Measured when Pre-Decision Contracts are completed.",
        })

        # 10. Poor Diversification (total portfolio sector + asset exposure)
        positions = portfolio.get("positions", [])
        total_val = max(portfolio.get("total_portfolio_value", 100000.0), 1.0)
        invested_pct = (portfolio.get("total_holdings_value", 0.0) / total_val) * 100.0
        unique_sectors = {p.get("sector") for p in positions if p.get("sector")}
        max_sec = features["sector_concentration_pct"]
        poor_div = (invested_pct > 50.0 and len(unique_sectors) < 3) or max_sec >= 45.0
        ev_cnt = len(positions) if poor_div else 0
        detectors.append({
            "pattern_key": "poor_diversification",
            "pattern_name": "Poor Sector Diversification",
            "detected": poor_div,
            "status": "stronger_evidence" if max_sec >= 65.0 else "moderate_evidence" if poor_div else "insufficient_evidence",
            "severity": "HIGH" if max_sec >= 60.0 else "MODERATE" if poor_div else "LOW",
            "confidence": 80.0 if poor_div else 30.0,
            "evidence_count": ev_cnt,
            "min_evidence_required": 2,
            "observed_period": obs_period,
            "evidence_event_ids": [],
            "what_happened": f"{invested_pct:.1f}% of portfolio is invested across {len(unique_sectors)} sector(s), with max sector exposure at {max_sec:.1f}%." if poor_div else "Portfolio sector exposure is balanced or held safely in cash.",
            "why_it_matters": "Even 5 different stocks can crash together if they all belong to the same economic sector.",
            "what_user_can_learn": "Spread invested capital across 3+ uncorrelated sectors (e.g., IT, Banking, FMCG, Energy).",
            "recommended_challenge": "Multi-Sector Balance Builder",
            "limitations": "Holding virtual cash is never penalized as poor diversification.",
        })

        return detectors

    # -------------------------------------------------------------------------
    # 4. TRANSPARENT SCORING SYSTEM (0–100)
    # -------------------------------------------------------------------------
    @staticmethod
    def compute_scores(
        events: List[Dict[str, Any]],
        features: Dict[str, Any],
        detectors: List[Dict[str, Any]],
        previous_scores: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        n = len(events)
        by_key = {d["pattern_key"]: d for d in detectors}

        def _conf_label(count: int, min_n: int = 3) -> str:
            if count < min_n:
                return "LOW"
            if count < 7:
                return "MEDIUM"
            return "HIGH"

        # Neutral baseline 70.0 when insufficient evidence; NEVER penalize for losing money, selling, or holding cash
        raw_scores: Dict[str, Tuple[float, int, str, str]] = {}
        if n < 2:
            raw_scores = {dim: (70.0, 0, "LOW", "Neutral baseline while gathering initial decision evidence.") for dim in SCORING_DIMENSIONS}
        else:
            # 1. Risk Discipline
            conc_pen = max(0.0, (features["portfolio_concentration_pct"] - 25.0) * 0.9)
            risk_score = max(20.0, min(100.0, 82.0 - conc_pen - (12.0 if by_key["strategy_drift"]["detected"] else 0.0)))
            raw_scores["Risk Discipline"] = (round(risk_score, 1), n, _conf_label(n), f"Based on max single-stock exposure ({features['portfolio_concentration_pct']:.1f}%) and limit adherence.")

            # 2. Emotional Control
            emo_pen = (15.0 if by_key["fomo"]["detected"] else 0.0) + (15.0 if by_key["panic_selling"]["detected"] else 0.0) + (12.0 if by_key["impulsive_decisions"]["detected"] else 0.0)
            emo_score = max(20.0, min(100.0, 84.0 - emo_pen))
            raw_scores["Emotional Control"] = (round(emo_score, 1), n, _conf_label(n), "Measures avoidance of unresearched rally entries, panic exits, and impulsive actions.")

            # 3. Decision Consistency
            cons_pen = (features["rapid_reversals_count"] * 7.0) + (12.0 if by_key["overtrading"]["detected"] else 0.0)
            cons_score = max(20.0, min(100.0, 83.0 - cons_pen))
            raw_scores["Decision Consistency"] = (round(cons_score, 1), n, _conf_label(n), f"Tracks pacing ({features['trades_per_active_day']}/day) and rapid reversals ({features['rapid_reversals_count']}).")

            # 4. Research Quality
            res_rate = features["research_activity_rate"]
            reason_rate = 100.0 - features["decisions_without_reasoning_pct"]
            res_score = max(20.0, min(100.0, 45.0 + (res_rate * 0.30) + (reason_rate * 0.25)))
            raw_scores["Research Quality"] = (round(res_score, 1), n, _conf_label(n), f"{res_rate:.0f}% of decisions logged prior research; {reason_rate:.0f}% included rationale.")

            # 5. Diversification Awareness
            div_pen = 18.0 if by_key["poor_diversification"]["detected"] else 0.0
            div_score = max(20.0, min(100.0, 86.0 - div_pen - max(0.0, (features["sector_concentration_pct"] - 40.0) * 0.4)))
            raw_scores["Diversification Awareness"] = (round(div_score, 1), n, _conf_label(n), f"Max sector allocation is {features['sector_concentration_pct']:.1f}%. Cash reserves are never penalized.")

            # 6. Strategy Adherence
            strat_pen = (features["strategy_deviations_count"] * 12.0) + (10.0 if by_key["overconfidence"]["detected"] else 0.0)
            strat_score = max(20.0, min(100.0, 85.0 - strat_pen))
            raw_scores["Strategy Adherence"] = (round(strat_score, 1), n, _conf_label(n), f"Evaluates alignment between Pre-Decision Contracts and actual exposures ({features['strategy_deviations_count']} deviations).")

            # 7. Loss Response
            loss_pen = (18.0 if by_key["loss_chasing"]["detected"] else 0.0) + (10.0 if by_key["loss_aversion"]["detected"] else 0.0)
            loss_score = max(20.0, min(100.0, 84.0 - loss_pen))
            raw_scores["Loss Response"] = (round(loss_score, 1), n, _conf_label(n), "Evaluates position sizing discipline following losses—never penalizes merely losing virtual money.")

        results = []
        for dim in SCORING_DIMENSIONS:
            cur, ev_cnt, conf, expl = raw_scores[dim]
            prev = previous_scores.get(dim, 70.0)
            trend = "UP" if cur > prev + 1.0 else "DOWN" if cur < prev - 1.0 else "STABLE"
            results.append({
                "dimension": dim,
                "current_score": cur,
                "previous_score": prev,
                "trend": trend,
                "evidence_count": ev_cnt,
                "confidence": conf,
                "explanation": expl,
            })
        return results

    # -------------------------------------------------------------------------
    # 5. RECALCULATE & PERSIST
    # -------------------------------------------------------------------------
    @staticmethod
    def recalculate_user_behavior(user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM decision_events WHERE user_id = ? ORDER BY created_at ASC", (user_id,))
        events = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM pre_decision_contracts WHERE user_id = ?", (user_id,))
        contracts = [dict(r) for r in cursor.fetchall()]
        contracts_by_id = {c["id"]: c for c in contracts}

        cursor.execute("SELECT dimension, current_score FROM behavior_scores WHERE user_id = ?", (user_id,))
        prev_scores = {r["dimension"]: float(r["current_score"]) for r in cursor.fetchall()}

        portfolio = trade_service.get_portfolio(user_id)
        features = BehavioralIntelligenceEngine.extract_behavioral_features(events, contracts_by_id, portfolio)
        detectors = BehavioralIntelligenceEngine.run_all_detectors(events, contracts_by_id, features, portfolio)
        scores = BehavioralIntelligenceEngine.compute_scores(events, features, detectors, prev_scores)

        now = datetime.utcnow().isoformat()

        # Save snapshot
        cursor.execute(
            "INSERT INTO behavior_snapshots (id, user_id, features_json, events_count, version, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (f"snap-{uuid.uuid4().hex[:10]}", user_id, json.dumps(features), len(events), BIE_VERSION, now),
        )

        # Upsert patterns & training assignments
        for d in detectors:
            cursor.execute(
                """
                INSERT INTO behavior_patterns (
                    id, user_id, pattern_key, pattern_name, detected, status, severity,
                    confidence, evidence_count, observed_period, evidence_event_ids_json,
                    what_happened, why_it_matters, what_user_can_learn, recommended_challenge,
                    limitations, version, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, pattern_key) DO UPDATE SET
                    detected=excluded.detected,
                    status=excluded.status,
                    severity=excluded.severity,
                    confidence=excluded.confidence,
                    evidence_count=excluded.evidence_count,
                    observed_period=excluded.observed_period,
                    evidence_event_ids_json=excluded.evidence_event_ids_json,
                    what_happened=excluded.what_happened,
                    why_it_matters=excluded.why_it_matters,
                    what_user_can_learn=excluded.what_user_can_learn,
                    recommended_challenge=excluded.recommended_challenge,
                    limitations=excluded.limitations,
                    updated_at=excluded.updated_at
                """,
                (
                    f"bpat-{user_id}-{d['pattern_key']}",
                    user_id,
                    d["pattern_key"],
                    d["pattern_name"],
                    1 if d["detected"] else 0,
                    d["status"],
                    d["severity"],
                    d["confidence"],
                    d["evidence_count"],
                    d["observed_period"],
                    json.dumps(d["evidence_event_ids"]),
                    d["what_happened"],
                    d["why_it_matters"],
                    d["what_user_can_learn"],
                    d["recommended_challenge"],
                    d["limitations"],
                    BIE_VERSION,
                    now,
                ),
            )
            if d["detected"]:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO training_assignments (id, user_id, pattern_key, challenge_title, description, status, assigned_at)
                    VALUES (?, ?, ?, ?, ?, 'ASSIGNED', ?)
                    """,
                    (
                        f"trn-{user_id}-{d['pattern_key']}",
                        user_id,
                        d["pattern_key"],
                        d["recommended_challenge"],
                        d["what_user_can_learn"],
                        now,
                    ),
                )

        # Upsert scores
        for s in scores:
            cursor.execute(
                """
                INSERT INTO behavior_scores (
                    id, user_id, dimension, current_score, previous_score, trend,
                    evidence_count, confidence, explanation, version, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, dimension) DO UPDATE SET
                    previous_score=behavior_scores.current_score,
                    current_score=excluded.current_score,
                    trend=excluded.trend,
                    evidence_count=excluded.evidence_count,
                    confidence=excluded.confidence,
                    explanation=excluded.explanation,
                    updated_at=excluded.updated_at
                """,
                (
                    f"bscr-{user_id}-{s['dimension']}",
                    user_id,
                    s["dimension"],
                    s["current_score"],
                    s["previous_score"],
                    s["trend"],
                    s["evidence_count"],
                    s["confidence"],
                    s["explanation"],
                    BIE_VERSION,
                    now,
                ),
            )

        conn.commit()
        conn.close()

        return {
            "features": features,
            "patterns": detectors,
            "scores": scores,
            "events_count": len(events),
            "contracts_count": len(contracts),
        }

    # -------------------------------------------------------------------------
    # 6. PROFILE, DIAGNOSTICS, TIMELINE & DECLARED VS OBSERVED
    # -------------------------------------------------------------------------
    @staticmethod
    def get_full_profile(user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM decision_events WHERE user_id = ?", (user_id,))
        ev_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM behavior_scores WHERE user_id = ?", (user_id,))
        score_count = cursor.fetchone()[0]
        conn.close()

        if score_count == 0:
            BehavioralIntelligenceEngine.recalculate_user_behavior(user_id)

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM behavior_scores WHERE user_id = ?", (user_id,))
        scores = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM behavior_patterns WHERE user_id = ? ORDER BY detected DESC, confidence DESC", (user_id,))
        patterns = []
        for r in cursor.fetchall():
            d = dict(r)
            d["detected"] = bool(d["detected"])
            d["evidence_event_ids"] = json.loads(d.pop("evidence_event_ids_json", "[]"))
            patterns.append(d)

        cursor.execute("SELECT * FROM behavior_snapshots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (user_id,))
        snap = cursor.fetchone()
        features = json.loads(snap["features_json"]) if snap else {}

        cursor.execute("SELECT * FROM pre_decision_contracts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", (user_id,))
        contracts = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM training_assignments WHERE user_id = ? ORDER BY assigned_at DESC", (user_id,))
        assignments = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT experience_level FROM users WHERE id = ?", (user_id,))
        u_row = cursor.fetchone()
        exp_level = u_row["experience_level"] if u_row else "BEGINNER"

        conn.close()

        # Declared vs Observed comparisons
        declared_vs_observed = []
        detected_map = {p["pattern_key"]: p for p in patterns}

        if contracts:
            avg_planned = sum(c["planned_exposure_pct"] for c in contracts) / len(contracts)
            drift = detected_map.get("strategy_drift", {})
            declared_vs_observed.append({
                "area": "Position Sizing Limit",
                "declared": f"Average planned exposure in Pre-Decision Contracts: {avg_planned:.1f}%",
                "observed": drift.get("what_happened", "Matches planned limits."),
                "aligned": not drift.get("detected", False),
            })

        panic = detected_map.get("panic_selling", {})
        declared_vs_observed.append({
            "area": "Drawdown Patience",
            "declared": f"Profile level ({exp_level}): Aiming for disciplined decision-making during market declines.",
            "observed": panic.get("what_happened", "Insufficient drawdown evidence collected yet."),
            "aligned": not panic.get("detected", False),
        })

        avg_overall = round(sum(s["current_score"] for s in scores) / max(1, len(scores)), 1)

        return {
            "events_count": ev_count,
            "is_insufficient_data": ev_count < 2,
            "overall_score": avg_overall,
            "disclaimer": "Educational behavioral diagnostics only—not a clinical psychological assessment or predictor of real-world returns.",
            "scores": scores,
            "patterns": patterns,
            "features": features,
            "declared_vs_observed": declared_vs_observed,
            "training_assignments": assignments,
        }

    @staticmethod
    def get_timeline(user_id: str, limit: int = 25, offset: int = 0) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM decision_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (user_id, limit, offset),
        )
        events = []
        for r in cursor.fetchall():
            d = dict(r)
            d["viewed_info"] = json.loads(d.pop("viewed_info_json", "[]"))
            events.append(d)

        cursor.execute("SELECT COUNT(*) FROM decision_events WHERE user_id = ?", (user_id,))
        total = cursor.fetchone()[0]
        conn.close()

        return {"events": events, "total": total, "has_more": (offset + len(events)) < total}

    # -------------------------------------------------------------------------
    # 7. GEMINI STRUCTURED EXPLANATIONS (NEVER INVENTS EVIDENCE OR SCORES)
    # -------------------------------------------------------------------------
    @staticmethod
    def get_recommendations(user_id: str, use_ai: bool = True) -> Dict[str, Any]:
        profile = BehavioralIntelligenceEngine.get_full_profile(user_id)
        detected = [p for p in profile["patterns"] if p["detected"]]

        fallback_recs = [
            {
                "pattern_name": p["pattern_name"],
                "explanation": p["what_happened"],
                "why_it_matters": p["why_it_matters"],
                "exercise": p["recommended_challenge"],
                "next_step": p["what_user_can_learn"],
            }
            for p in detected
        ]
        if not fallback_recs:
            fallback_recs = [
                {
                    "pattern_name": "Build Decision Evidence",
                    "explanation": "Complete a few more simulated trades with Pre-Decision Contracts to unlock personalized behavioral diagnostics.",
                    "why_it_matters": "Reliable pattern detection requires multiple observations across different market conditions.",
                    "exercise": "Complete 3 Paper Trades with Pre-Decision Contracts",
                    "next_step": "Visit the Paper Simulator and fill out the compact Pre-Decision Contract before placing an order.",
                }
            ]

        if not use_ai or not settings.is_ai_live or not detected:
            return {
                "source": "deterministic_backend",
                "recommendations": fallback_recs,
                "summary": "Structured educational guidance generated from verified backend behavioral records.",
            }

        # Send ONLY structured backend evidence to Gemini (never raw PII, never ask Gemini to score)
        structured_summary = [
            {
                "pattern": p["pattern_name"],
                "severity": p["severity"],
                "confidence": p["confidence"],
                "evidence_count": p["evidence_count"],
                "what_happened": p["what_happened"],
            }
            for p in detected[:4]
        ]
        prompt = (
            "You are MINDMARK AI Tutor. Based ONLY on these verified backend behavioral patterns "
            f"(do NOT invent new evidence, scores, or buy/sell recommendations):\n{json.dumps(structured_summary)}\n\n"
            "Return concise, encouraging educational guidance in 2-3 short bullet points explaining why these habits matter and one practical simulation exercise."
        )
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
            resp = httpx.post(
                url,
                params={"key": settings.GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600, "thinkingConfig": {"thinkingBudget": 0}},
                },
                timeout=12.0,
            )
            if resp.status_code == 200:
                parts = resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
                ai_text = "".join(pt.get("text", "") for pt in parts).strip()
                if ai_text:
                    return {
                        "source": "gemini",
                        "model": settings.GEMINI_MODEL,
                        "summary": ai_text,
                        "recommendations": fallback_recs,
                    }
        except Exception as e:
            logger.warning(f"[BIE] Gemini recommendation fallback triggered: {type(e).__name__}")

        return {
            "source": "deterministic_fallback",
            "recommendations": fallback_recs,
            "summary": "Structured educational guidance generated from verified backend behavioral records.",
        }


bie_service = BehavioralIntelligenceEngine()
