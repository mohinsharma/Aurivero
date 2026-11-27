import json
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.app.config import settings
from backend.app.database import get_connection
from backend.app.services.bie_service import bie_service
from backend.app.services.fingerprint_service import fingerprint_service

logger = logging.getLogger("mindmark.mirror")

RUBRIC_GENERAL_VERSION = "v1.0-general"
RUBRIC_DIVERSIFICATION_VERSION = "v1.0-diversification"

SEED_CHALLENGES = [
    {
        "id": "panic-decision",
        "challenge_type": "PANIC_DECISION",
        "title": "Panic Decision Challenge",
        "target_pattern_key": "panic_selling",
        "target_dimension": "Emotional Control",
        "difficulty": "Intermediate",
        "estimated_minutes": 5,
        "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
        "scenario_version": "v1.0",
        "rubric_version": RUBRIC_GENERAL_VERSION,
        "intro_summary": "Your virtual portfolio holds ₹60,000 in blue-chip equities and ₹40,000 in cash. Sudden global macro jitters trigger a sharp two-stage market decline.",
        "stages": [
            {
                "stage_index": 0,
                "headline": "Stage 1: NIFTY drops -4.2% on global bond yield spike",
                "market_move_pct": -4.2,
                "portfolio_value": 97480.0,
                "cash": 40000.0,
                "summary": "Your holdings (RELIANCE, HDFCBANK) fell -4.2% intraday. No company-specific earnings warning was issued.",
                "info_panels": [
                    {"id": "macro_brief", "title": "Macro & Bond Yield Note", "content": "US 10Y yields rose 12 bps; FIIs sold index futures. Domestic GDP forecast remains unchanged."},
                    {"id": "company_fundamentals", "title": "Holdings Fundamentals Check", "content": "Both RELIANCE and HDFCBANK maintain healthy debt/equity and unchanged quarterly guidance."},
                ],
                "permitted_actions": ["HOLD", "REDUCE", "RESEARCH_MORE", "SELL_ALL"],
            },
            {
                "stage_index": 1,
                "headline": "Stage 2: Market extends drop -2.1% at open; Q3 results beat estimates",
                "market_move_pct": -2.1,
                "portfolio_value": 96200.0,
                "cash": 40000.0,
                "summary": "Volatility remains elevated, but HDFCBANK just reported 14% YoY deposit growth and stable NPAs.",
                "info_panels": [
                    {"id": "q3_earnings", "title": "Q3 Earnings Filing", "content": "HDFCBANK net profit grew 16% YoY; asset quality stable (GNPA 1.26%)."},
                    {"id": "risk_checklist", "title": "Stop-Loss & Horizon Check", "content": "Your declared plan is long-term allocation with a 15% fundamental stop-loss."},
                ],
                "permitted_actions": ["HOLD", "REDUCE", "BUY_MODEST", "SELL_ALL"],
            },
        ],
    },
    {
        "id": "fomo-trap",
        "challenge_type": "FOMO_TRAP",
        "title": "FOMO Trap Challenge",
        "target_pattern_key": "fomo",
        "target_dimension": "Emotional Control",
        "difficulty": "Beginner",
        "estimated_minutes": 4,
        "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
        "scenario_version": "v1.0",
        "rubric_version": RUBRIC_GENERAL_VERSION,
        "intro_summary": "A mid-cap tech stock rallies +9.4% in two sessions on viral social chatter. Practice separating hype from verified fundamentals.",
        "stages": [
            {
                "stage_index": 0,
                "headline": "Stage 1: HYPETECH surges +9.4% on retail social volume",
                "market_move_pct": 9.4,
                "portfolio_value": 100000.0,
                "cash": 100000.0,
                "summary": "Social feeds are full of 'breakout' posts. P/E ratio is now 92x vs sector average 28x.",
                "info_panels": [
                    {"id": "valuation_check", "title": "Valuation & P/E Snapshot", "content": "Current P/E: 92x (Sector median: 28x). Operating margin slipped 180 bps last quarter."},
                    {"id": "social_buzz", "title": "Market Attention Note", "content": "Volume is 4.5x 20-day average; no official exchange filing or new contract announced."},
                ],
                "permitted_actions": ["WAIT", "RESEARCH_MORE", "BUY_SMALL", "BUY_LARGE"],
            },
            {
                "stage_index": 1,
                "headline": "Stage 2: Exchange clarification — no M&A deal; stock pulls back -5.8%",
                "market_move_pct": -5.8,
                "portfolio_value": 98500.0,
                "cash": 100000.0,
                "summary": "The company clarified to NSE that merger rumors are baseless. Momentum buyers face immediate drawdown.",
                "info_panels": [
                    {"id": "nse_filing", "title": "NSE Exchange Clarification", "content": "Company denies viral acquisition rumor in official regulatory filing."},
                ],
                "permitted_actions": ["WAIT", "HOLD_CASH", "BUY_SMALL", "REDUCE"],
            },
        ],
    },
    {
        "id": "loss-recovery",
        "challenge_type": "LOSS_RECOVERY",
        "title": "Loss Recovery Challenge",
        "target_pattern_key": "loss_chasing",
        "target_dimension": "Loss Response",
        "difficulty": "Intermediate",
        "estimated_minutes": 5,
        "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
        "scenario_version": "v1.0",
        "rubric_version": RUBRIC_GENERAL_VERSION,
        "intro_summary": "Your virtual portfolio just absorbed a -₹6,500 realized loss. Practice resisting the urge to double position sizes to win it back quickly.",
        "stages": [
            {
                "stage_index": 0,
                "headline": "Stage 1: Post-Loss Setup — High-Beta Stock vs Diversified ETF",
                "market_move_pct": -1.4,
                "portfolio_value": 93500.0,
                "cash": 93500.0,
                "summary": "After a -₹6,500 loss, you see two options: a volatile small-cap down -6% today, or a broad NIFTY 50 ETF.",
                "info_panels": [
                    {"id": "sizing_rule", "title": "Position Sizing Math", "content": "Risking 40% to recover a 6.5% loss can turn a small setback into a 20% portfolio drawdown."},
                    {"id": "smallcap_risk", "title": "High-Beta Stock Risk Note", "content": "Beta 2.1, ATR 4.8% daily swing, debt-to-equity 1.9."},
                ],
                "permitted_actions": ["HOLD_CASH", "BUY_SMALL_ETF", "BUY_LARGE_VOLATILE", "RESEARCH_MORE"],
            },
            {
                "stage_index": 1,
                "headline": "Stage 2: High-beta stock drops another -4.5%; NIFTY ETF steady (+0.3%)",
                "market_move_pct": -4.5,
                "portfolio_value": 93780.0,
                "cash": 93500.0,
                "summary": "Volatility persisted in the small-cap while broad market remained calm.",
                "info_panels": [
                    {"id": "cooldown_note", "title": "Cooling-Off Rule", "content": "Professional risk desks reduce size by 50% or pause after a losing streak."},
                ],
                "permitted_actions": ["HOLD_CASH", "HOLD", "REDUCE", "BUY_SMALL_ETF"],
            },
        ],
    },
    {
        "id": "overconfidence-check",
        "challenge_type": "OVERCONFIDENCE",
        "title": "Overconfidence Calibration Challenge",
        "target_pattern_key": "overconfidence",
        "target_dimension": "Research Quality",
        "difficulty": "Intermediate",
        "estimated_minutes": 5,
        "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
        "scenario_version": "v1.0",
        "rubric_version": RUBRIC_GENERAL_VERSION,
        "intro_summary": "You are presented with partial headline data on a fast-growing company. Test whether your confidence matches the completeness of available evidence.",
        "stages": [
            {
                "stage_index": 0,
                "headline": "Stage 1: Incomplete Case — 'ALPHA CORP revenue grew +32% YoY'",
                "market_move_pct": 1.8,
                "portfolio_value": 100000.0,
                "cash": 100000.0,
                "summary": "Only revenue growth is shown so far. Debt, cash flow, and margin quality have NOT been disclosed yet.",
                "info_panels": [
                    {"id": "headline_only", "title": "Headline Growth Metric", "content": "Top-line revenue rose 32% YoY. Balance sheet & cash flow statement pending."},
                ],
                "permitted_actions": ["REQUEST_MORE_INFO", "WAIT", "BUY_SMALL", "BUY_LARGE"],
            },
            {
                "stage_index": 1,
                "headline": "Stage 2: Full Filing Revealed — Negative Free Cash Flow & Rising Debt",
                "market_move_pct": -0.9,
                "portfolio_value": 100000.0,
                "cash": 100000.0,
                "summary": "Cash flow from operations is negative (-₹420 Cr) and short-term debt doubled. Do you revise your view?",
                "info_panels": [
                    {"id": "cashflow_filing", "title": "Cash Flow & Debt Disclosure", "content": "Operating cash flow: -₹420 Cr; Debt/Equity jumped from 0.6 to 1.8; receivables days up 45%."},
                ],
                "permitted_actions": ["REVISE_VIEW", "WAIT", "REDUCE", "BUY_LARGE"],
            },
        ],
    },
    {
        "id": "diversification-builder",
        "challenge_type": "DIVERSIFICATION",
        "title": "Diversification & Correlation Challenge",
        "target_pattern_key": "poor_diversification",
        "target_dimension": "Diversification Awareness",
        "difficulty": "Beginner",
        "estimated_minutes": 5,
        "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
        "scenario_version": "v1.0",
        "rubric_version": RUBRIC_DIVERSIFICATION_VERSION,
        "intro_summary": "Allocate ₹1,00,000 across 6 stocks spanning IT (TCS, INFY), Banking (HDFCBANK), Energy (RELIANCE), FMCG (ITC), and Pharma (SUNPHARMA) while avoiding hidden sector concentration.",
        "stages": [
            {
                "stage_index": 0,
                "headline": "Stage 1: Build Your Diversified Virtual Allocation",
                "market_move_pct": 0.4,
                "portfolio_value": 100000.0,
                "cash": 100000.0,
                "summary": "Choose allocation weights (total <= 100%). Note that TCS & INFY share high IT-sector correlation.",
                "assets": [
                    {"symbol": "TCS", "sector": "IT"},
                    {"symbol": "INFY", "sector": "IT"},
                    {"symbol": "HDFCBANK", "sector": "Banking"},
                    {"symbol": "RELIANCE", "sector": "Energy"},
                    {"symbol": "ITC", "sector": "FMCG"},
                    {"symbol": "SUNPHARMA", "sector": "Pharma"},
                ],
                "info_panels": [
                    {"id": "correlation_note", "title": "Sector Correlation Guide", "content": "Owning both TCS and INFY at 25% each creates 50% single-sector IT exposure."},
                ],
                "permitted_actions": ["SUBMIT_ALLOCATION"],
            },
            {
                "stage_index": 1,
                "headline": "Stage 2: Sector Shock Simulation — US Tech Slowdown hits IT -8.0%",
                "market_move_pct": -8.0,
                "portfolio_value": 97500.0,
                "cash": 20000.0,
                "summary": "IT stocks fell -8.0% while FMCG (+1.2%) and Pharma (+0.8%) cushioned diversified portfolios.",
                "info_panels": [
                    {"id": "sector_impact", "title": "Portfolio Stress Test Result", "content": "Un-correlated sectors (FMCG, Pharma) reduced overall portfolio drawdown."},
                ],
                "permitted_actions": ["REBALANCE", "HOLD", "KEEP_CASH"],
            },
        ],
    },
    {
        "id": "strategy-consistency",
        "challenge_type": "STRATEGY_CONSISTENCY",
        "title": "Strategy Consistency Challenge",
        "target_pattern_key": "strategy_drift",
        "target_dimension": "Strategy Adherence",
        "difficulty": "Advanced",
        "estimated_minutes": 6,
        "data_source_label": "HISTORICAL & SYNTHETIC SIMULATION",
        "scenario_version": "v1.0",
        "rubric_version": RUBRIC_GENERAL_VERSION,
        "intro_summary": "Declare your strategy rule upfront, navigate Stage 1 market noise, and decide whether Stage 2's genuine fundamental shift justifies an update.",
        "stages": [
            {
                "stage_index": 0,
                "headline": "Stage 1: Mild Noise (-2.3% dip) — Fundamentals Unchanged",
                "market_move_pct": -2.3,
                "portfolio_value": 97700.0,
                "cash": 30000.0,
                "summary": "Your core holding dips -2.3% on routine profit booking. Your declared rule says hold unless fundamentals break.",
                "info_panels": [
                    {"id": "noise_check", "title": "Routine Volatility Note", "content": "No change in company earnings, management, or competitive moat."},
                ],
                "permitted_actions": ["FOLLOW_PLAN_HOLD", "REDUCE", "ABANDON_PLAN_SELL", "BUY_OVER_LIMIT"],
            },
            {
                "stage_index": 1,
                "headline": "Stage 2: Material Event — Auditor Resignation & Governance Flag",
                "market_move_pct": -11.5,
                "portfolio_value": 89000.0,
                "cash": 30000.0,
                "summary": "The statutory auditor resigned citing governance concerns—a genuine thesis break under your declared plan.",
                "info_panels": [
                    {"id": "auditor_filing", "title": "Exchange Governance Filing", "content": "Statutory auditor stepped down before AGM; independent audit committee convened."},
                ],
                "permitted_actions": ["EVIDENCE_BASED_EXIT", "REDUCE", "HOLD"],
            },
        ],
    },
]


class MirrorModeService:
    """Phase 3: Mirror Mode behavioral training engine."""

    @staticmethod
    def ensure_challenges_seeded():
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        for ch in SEED_CHALLENGES:
            cursor.execute("SELECT id FROM mirror_challenges WHERE id = ?", (ch["id"],))
            if not cursor.fetchone():
                cursor.execute(
                    """
                    INSERT INTO mirror_challenges (
                        id, challenge_type, title, target_pattern_key, target_dimension,
                        difficulty, estimated_minutes, data_source_label, scenario_version,
                        rubric_version, intro_summary, stages_json, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ch["id"], ch["challenge_type"], ch["title"], ch["target_pattern_key"],
                        ch["target_dimension"], ch["difficulty"], ch["estimated_minutes"],
                        ch["data_source_label"], ch["scenario_version"], ch["rubric_version"],
                        ch["intro_summary"], json.dumps(ch["stages"]), now,
                    ),
                )
        conn.commit()
        conn.close()

    # -------------------------------------------------------------------------
    # 1. ADAPTIVE CHALLENGE SELECTION
    # -------------------------------------------------------------------------
    @staticmethod
    def get_challenges_dashboard(user_id: str) -> Dict[str, Any]:
        MirrorModeService.ensure_challenges_seeded()
        profile = bie_service.get_full_profile(user_id)
        fp = fingerprint_service.get_fingerprint(user_id)

        patterns_by_key = {p["pattern_key"]: p for p in profile.get("patterns", [])}
        dims_by_name = {d["dimension"]: d for d in fp.get("dimensions", [])}
        events_count = profile.get("events_count", 0)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mirror_challenges ORDER BY difficulty ASC")
        all_challenges = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM mirror_results WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        results = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM mirror_sessions WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        sessions = [dict(r) for r in cursor.fetchall()]
        conn.close()

        completed_by_cid: Dict[str, List[Dict[str, Any]]] = {}
        for res in results:
            completed_by_cid.setdefault(res["challenge_id"], []).append(res)

        skipped_cids = {s["challenge_id"] for s in sessions if s["status"] == "SKIPPED"}

        enriched: List[Dict[str, Any]] = []
        personalized_recs: List[Dict[str, Any]] = []

        for ch in all_challenges:
            cid = ch["id"]
            pat = patterns_by_key.get(ch["target_pattern_key"], {})
            dim = dims_by_name.get(ch["target_dimension"], {})
            prev_runs = completed_by_cid.get(cid, [])
            best_dqs = max((r["dqs_score"] for r in prev_runs), default=None)

            # Personalized ONLY when sufficient real backend evidence exists (never on 1 unusual trade)
            pat_status = pat.get("status", "insufficient_evidence")
            has_strong_pat = bool(pat.get("detected")) and pat_status in ("moderate_evidence", "stronger_evidence", "emerging_pattern") and events_count >= 2
            has_weak_dim = bool(dim.get("has_sufficient_data")) and (dim.get("score") is not None and dim["score"] < 75.0)
            is_personalized = has_strong_pat or has_weak_dim

            if is_personalized and has_strong_pat:
                why_reason = (
                    f"Based on {pat.get('evidence_count', 0)} recorded observation(s) ({pat_status.replace('_', ' ')}), "
                    f"{pat.get('what_happened', '')} This challenge helps you practice {ch['target_dimension']} under pressure."
                )
            elif is_personalized and has_weak_dim:
                why_reason = (
                    f"Your {ch['target_dimension']} score is currently {dim.get('score')}/100 across "
                    f"{dim.get('observations_used', 0)} observation(s). This scenario builds practical discipline."
                )
            else:
                why_reason = "General Practice Challenge — build foundational decision habits even before extensive simulator history."

            priority_score = 0
            if is_personalized:
                priority_score += 50
            if pat_status in ("moderate_evidence", "stronger_evidence"):
                priority_score += 30
            if len(prev_runs) == 0:
                priority_score += 20  # Prefer uncompleted challenges first
            if cid in skipped_cids:
                priority_score -= 10

            item = {
                "id": cid,
                "challenge_type": ch["challenge_type"],
                "title": ch["title"],
                "target_pattern_key": ch["target_pattern_key"],
                "target_dimension": ch["target_dimension"],
                "difficulty": ch["difficulty"],
                "estimated_minutes": ch["estimated_minutes"],
                "data_source_label": ch["data_source_label"],
                "scenario_version": ch["scenario_version"],
                "intro_summary": ch["intro_summary"],
                "is_personalized": is_personalized,
                "recommendation_badge": "Personalized for You" if is_personalized else "General Practice",
                "why_recommended": why_reason,
                "completed_count": len(prev_runs),
                "best_dqs": best_dqs,
                "is_skipped": cid in skipped_cids,
                "_priority": priority_score,
            }
            enriched.append(item)
            if is_personalized and len(prev_runs) == 0:
                personalized_recs.append(item)

        enriched.sort(key=lambda x: x["_priority"], reverse=True)
        for item in enriched:
            item.pop("_priority", None)

        if not personalized_recs:
            # General practice selection when insufficient data or all personalized completed
            personalized_recs = [c for c in enriched if c["completed_count"] == 0][:2] or enriched[:2]

        return {
            "tagline": "Face your habits. Challenge your decisions. Improve your mindset.",
            "has_sufficient_personalization_data": events_count >= 2,
            "events_count": events_count,
            "personalized_recommendations": personalized_recs[:3],
            "available_challenges": enriched,
            "completed_challenges": [c for c in enriched if c["completed_count"] > 0],
            "progress_summary": {
                "challenges_completed": len(completed_by_cid),
                "total_attempts": len(results),
                "average_dqs": round(sum(r["dqs_score"] for r in results) / len(results), 1) if results else None,
                "total_mirror_xp": sum(r["xp_awarded"] for r in results),
            },
        }

    # -------------------------------------------------------------------------
    # 2. CHALLENGE DETAIL & SESSION START (NO ANSWER KEYS EXPOSED)
    # -------------------------------------------------------------------------
    @staticmethod
    def get_challenge_detail(challenge_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        MirrorModeService.ensure_challenges_seeded()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mirror_challenges WHERE id = ?", (challenge_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
        ch = dict(row)
        stages = json.loads(ch.pop("stages_json"))

        cursor.execute(
            "SELECT * FROM mirror_sessions WHERE user_id = ? AND challenge_id = ? AND status = 'IN_PROGRESS' ORDER BY created_at DESC LIMIT 1",
            (user_id, challenge_id),
        )
        active_sess = cursor.fetchone()
        conn.close()

        return {
            **ch,
            "stages": stages,
            "active_session": dict(active_sess) if active_sess else None,
        }

    @staticmethod
    def start_challenge(user_id: str, challenge_id: str, is_practice: bool = False, declared_strategy: Optional[str] = None) -> Dict[str, Any]:
        MirrorModeService.ensure_challenges_seeded()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mirror_challenges WHERE id = ?", (challenge_id,))
        ch = cursor.fetchone()
        if not ch:
            conn.close()
            return {"success": False, "message": "Challenge not found."}

        stages = json.loads(ch["stages_json"])
        dash = MirrorModeService.get_challenges_dashboard(user_id)
        ch_meta = next((c for c in dash["available_challenges"] if c["id"] == challenge_id), {})
        is_personalized = 1 if ch_meta.get("is_personalized") else 0

        now = datetime.utcnow().isoformat()
        session_id = f"msess-{uuid.uuid4().hex[:10]}"
        initial_portfolio = {
            "portfolio_value": stages[0].get("portfolio_value", 100000.0),
            "cash": stages[0].get("cash", 40000.0),
            "stage_history": [],
        }

        cursor.execute(
            """
            INSERT INTO mirror_sessions (
                id, user_id, challenge_id, is_personalized, is_practice, status,
                current_stage, total_stages, declared_plan_json, portfolio_state_json,
                scenario_version, xp_awarded, created_at
            )
            VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', 0, ?, ?, ?, ?, 0, ?)
            """,
            (
                session_id, user_id, challenge_id, is_personalized, 1 if is_practice else 0,
                len(stages), json.dumps({"declared_strategy": declared_strategy or "Balanced risk-controlled execution"}),
                json.dumps(initial_portfolio), ch["scenario_version"], now,
            ),
        )
        conn.commit()
        conn.close()

        return {
            "success": True,
            "session_id": session_id,
            "challenge_id": challenge_id,
            "is_personalized": bool(is_personalized),
            "is_practice": is_practice,
            "current_stage": 0,
            "total_stages": len(stages),
            "stage": stages[0],
            "portfolio_state": initial_portfolio,
        }

    # -------------------------------------------------------------------------
    # 3. DECISION SUBMISSION & STAGE PROGRESSION
    # -------------------------------------------------------------------------
    @staticmethod
    def submit_decision(user_id: str, challenge_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        session_id = payload["session_id"]
        cursor.execute("SELECT * FROM mirror_sessions WHERE id = ?", (session_id,))
        sess = cursor.fetchone()
        if not sess:
            conn.close()
            return {"success": False, "status_code": 404, "message": "Mirror session not found."}
        if sess["user_id"] != user_id:
            conn.close()
            return {"success": False, "status_code": 403, "message": "Forbidden: You do not own this Mirror session."}
        if sess["challenge_id"] != challenge_id:
            conn.close()
            return {"success": False, "status_code": 400, "message": "Session does not match challenge."}
        if sess["status"] == "COMPLETED":
            conn.close()
            return {"success": False, "status_code": 409, "message": "Challenge session already completed."}

        cursor.execute("SELECT stages_json FROM mirror_challenges WHERE id = ?", (challenge_id,))
        stages = json.loads(cursor.fetchone()["stages_json"])
        stage_idx = payload["stage_index"]
        if stage_idx < 0 or stage_idx >= len(stages):
            conn.close()
            return {"success": False, "status_code": 400, "message": "Invalid stage index."}

        stage_def = stages[stage_idx]
        if payload["action"] not in stage_def["permitted_actions"]:
            conn.close()
            return {
                "success": False,
                "status_code": 400,
                "message": f"Invalid action '{payload['action']}'. Permitted: {stage_def['permitted_actions']}",
            }

        # Duplicate decision protection (client_decision_id or session+stage)
        client_dec_id = payload.get("client_decision_id")
        if client_dec_id:
            cursor.execute("SELECT id FROM mirror_decisions WHERE user_id = ? AND client_decision_id = ?", (user_id, client_dec_id))
            if cursor.fetchone():
                conn.close()
                return {"success": False, "status_code": 409, "message": "Duplicate decision submission rejected."}

        cursor.execute("SELECT id FROM mirror_decisions WHERE session_id = ? AND stage_index = ?", (session_id, stage_idx))
        if cursor.fetchone():
            conn.close()
            return {"success": False, "status_code": 409, "message": f"Decision for stage {stage_idx} already recorded."}

        dec_id = f"mdec-{uuid.uuid4().hex[:10]}"
        now = datetime.utcnow().isoformat()
        cursor.execute(
            """
            INSERT INTO mirror_decisions (
                id, session_id, user_id, challenge_id, stage_index, client_decision_id,
                action, allocation_json, reasoning, confidence_level, invalidation_trigger,
                reviewed_info_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                dec_id, session_id, user_id, challenge_id, stage_idx, client_dec_id,
                payload["action"], json.dumps(payload.get("allocation")) if payload.get("allocation") else None,
                payload["reasoning"], payload["confidence_level"], payload.get("invalidation_trigger"),
                json.dumps(payload.get("reviewed_info") or []), now,
            ),
        )

        next_stage_idx = stage_idx + 1
        p_state = json.loads(sess["portfolio_state_json"])
        p_state["stage_history"].append({
            "stage_index": stage_idx,
            "action": payload["action"],
            "portfolio_value": stage_def.get("portfolio_value", p_state["portfolio_value"]),
        })
        if next_stage_idx < len(stages):
            p_state["portfolio_value"] = stages[next_stage_idx].get("portfolio_value", p_state["portfolio_value"])
            p_state["cash"] = stages[next_stage_idx].get("cash", p_state["cash"])

        cursor.execute(
            "UPDATE mirror_sessions SET current_stage = ?, portfolio_state_json = ? WHERE id = ?",
            (next_stage_idx, json.dumps(p_state), session_id),
        )
        conn.commit()
        conn.close()

        return {
            "success": True,
            "decision_id": dec_id,
            "next_stage_index": next_stage_idx,
            "ready_to_complete": next_stage_idx >= len(stages),
            "next_stage": stages[next_stage_idx] if next_stage_idx < len(stages) else None,
            "portfolio_state": p_state,
        }

    # -------------------------------------------------------------------------
    # 4. SERVER-SIDE DECISION QUALITY SCORE (DQS) & COMPLETION
    # -------------------------------------------------------------------------
    @staticmethod
    def _compute_dqs(
        challenge: Dict[str, Any],
        decisions: List[Dict[str, Any]],
        declared_plan: Dict[str, Any],
        reflection_text: str,
    ) -> Dict[str, Any]:
        """
        Official server-side educational rubric:
        DQS = (Reasoning * 0.30) + (Risk Management * 0.25) + (Evidence Use * 0.20)
              + (Plan Consistency * 0.15) + (Reflection * 0.10)
        Never rewards profit alone; never penalizes holding cash or accepting a loss.
        """
        ctype = challenge["challenge_type"]
        n = max(1, len(decisions))

        # 1. Reasoning Quality (0-100)
        reasoning_pts = []
        for d in decisions:
            txt = (d.get("reasoning") or "").strip()
            has_inv = bool((d.get("invalidation_trigger") or "").strip())
            pts = 50.0 + min(30.0, len(txt) * 0.45) + (20.0 if has_inv else 0.0)
            reasoning_pts.append(min(100.0, pts))
        reasoning_score = round(sum(reasoning_pts) / n, 1)

        # 2. Evidence Use (0-100)
        ev_pts = []
        for d in decisions:
            reviewed = json.loads(d.get("reviewed_info_json") or "[]")
            ev_pts.append(min(100.0, 35.0 + len(reviewed) * 32.5))
        evidence_score = round(sum(ev_pts) / n, 1)

        # 3. Risk Management (0-100) & 4. Plan Consistency (0-100)
        risk_score = 78.0
        plan_score = 80.0
        strengths: List[str] = []
        improvements: List[str] = []

        actions = [d["action"] for d in decisions]

        if ctype == "PANIC_DECISION":
            # Never penalize holding or researched REDUCE; only penalize unresearched SELL_ALL
            unresearched_sell_all = any(
                d["action"] == "SELL_ALL" and len(json.loads(d.get("reviewed_info_json") or "[]")) == 0
                for d in decisions
            )
            if unresearched_sell_all:
                risk_score = 52.0
                plan_score = 50.0
                improvements.append("Review quarterly fundamentals and your stop-loss plan before liquidating all holdings.")
            else:
                risk_score = 90.0
                plan_score = 88.0
                strengths.append("Maintained calm evaluation during simulated market drawdowns.")

        elif ctype == "FOMO_TRAP":
            if "BUY_LARGE" in actions:
                risk_score = 45.0
                plan_score = 55.0
                improvements.append("Avoid large entries into +9% social-buzz rallies before checking valuation.")
            else:
                risk_score = 92.0
                plan_score = 90.0
                strengths.append("Resisted chasing unverified social hype and protected capital.")

        elif ctype == "LOSS_RECOVERY":
            if "BUY_LARGE_VOLATILE" in actions:
                risk_score = 42.0
                plan_score = 48.0
                improvements.append("Escalating size in volatile stocks right after a loss compounds drawdown risk.")
            else:
                risk_score = 90.0
                plan_score = 88.0
                strengths.append("Kept position sizing disciplined after a simulated loss (holding cash/ETF is valid).")

        elif ctype == "OVERCONFIDENCE":
            s0_conf = decisions[0]["confidence_level"] if decisions else 3
            revised = any(a in ("REVISE_VIEW", "WAIT", "REDUCE") for a in actions[1:])
            if s0_conf >= 4 and len(json.loads(decisions[0].get("reviewed_info_json") or "[]")) <= 1:
                risk_score = 58.0
                improvements.append("Lower confidence ratings when balance sheet and cash flow data are still missing.")
            else:
                risk_score = 88.0
                strengths.append("Calibrated confidence appropriately to incomplete Stage 1 evidence.")
            if revised:
                plan_score = 92.0
                strengths.append("Updated your view cleanly when Stage 2 revealed negative free cash flow.")
            else:
                plan_score = 60.0
                improvements.append("Be willing to revise a thesis when new negative financial evidence arrives.")

        elif ctype == "DIVERSIFICATION":
            alloc = json.loads(decisions[0].get("allocation_json") or "{}") if decisions else {}
            if alloc:
                max_w = max(alloc.values(), default=0.0)
                it_w = alloc.get("TCS", 0.0) + alloc.get("INFY", 0.0)
                active_cnt = sum(1 for v in alloc.values() if v > 0)
                if max_w > 35.0 or it_w > 45.0 or active_cnt < 3:
                    risk_score = 54.0
                    plan_score = 58.0
                    improvements.append("Watch out for correlated IT exposure (TCS + INFY) and keep single stocks <= 30%.")
                else:
                    risk_score = 92.0
                    plan_score = 90.0
                    strengths.append("Built a well-balanced multi-sector allocation across uncorrelated industries.")
            else:
                risk_score = 80.0

        elif ctype == "STRATEGY_CONSISTENCY":
            s0_act = decisions[0]["action"] if decisions else "FOLLOW_PLAN_HOLD"
            s1_act = decisions[1]["action"] if len(decisions) > 1 else "EVIDENCE_BASED_EXIT"
            # Holding through Stage 1 noise + exiting on Stage 2 auditor resignation = sensible evidence-based update!
            if s0_act in ("ABANDON_PLAN_SELL", "BUY_OVER_LIMIT"):
                plan_score = 52.0
                risk_score = 56.0
                improvements.append("Avoid abandoning your plan or breaching exposure limits during routine -2% market noise.")
            else:
                plan_score = 90.0
                risk_score = 88.0
                strengths.append("Held steady through noise and adapted responsibly when material governance risk emerged.")

        # 5. Reflection & Learning (0-100)
        ref_clean = (reflection_text or "").strip()
        reflection_score = round(min(100.0, 40.0 + len(ref_clean) * 0.8), 1) if ref_clean else 40.0

        dqs = round(
            (reasoning_score * 0.30)
            + (risk_score * 0.25)
            + (evidence_score * 0.20)
            + (plan_score * 0.15)
            + (reflection_score * 0.10),
            1,
        )

        if not strengths:
            strengths.append("Completed the structured multi-stage decision exercise and documented rationale.")
        if not improvements:
            improvements.append("Continue using Pre-Decision Contracts in the Paper Simulator to lock in these habits.")

        return {
            "dqs_score": dqs,
            "reasoning_score": reasoning_score,
            "risk_management_score": risk_score,
            "evidence_use_score": evidence_score,
            "plan_consistency_score": plan_score,
            "reflection_score": reflection_score,
            "rubric_version": challenge["rubric_version"],
            "strengths": strengths,
            "improvements": improvements,
        }

    @staticmethod
    def _generate_gemini_feedback(challenge: Dict[str, Any], dqs_data: Dict[str, Any], decisions: List[Dict[str, Any]], use_ai: bool) -> Dict[str, str]:
        fallback = (
            f"Completed {challenge['title']} with a Decision Quality Score of {dqs_data['dqs_score']}/100. "
            f"Strength: {dqs_data['strengths'][0]} Next focus: {dqs_data['improvements'][0]}"
        )
        if not use_ai or not settings.is_ai_live:
            return {"text": fallback, "source": "deterministic_backend"}

        summary_payload = {
            "challenge": challenge["title"],
            "dqs_score": dqs_data["dqs_score"],
            "components": {
                "reasoning": dqs_data["reasoning_score"],
                "risk_management": dqs_data["risk_management_score"],
                "evidence_use": dqs_data["evidence_use_score"],
                "plan_consistency": dqs_data["plan_consistency_score"],
                "reflection": dqs_data["reflection_score"],
            },
            "actions_taken": [d["action"] for d in decisions],
            "strengths": dqs_data["strengths"],
            "improvements": dqs_data["improvements"],
        }
        prompt = (
            "You are MINDMARK AI Coach. Explain this Mirror Mode challenge result in 2-3 clear, encouraging sentences. "
            "Use ONLY the verified backend data below. Do NOT invent events, modify scores, give real-money buy/sell calls, "
            "or diagnose psychological disorders:\n"
            f"{json.dumps(summary_payload)}"
        )
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
            resp = httpx.post(
                url,
                params={"key": settings.GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 400, "thinkingConfig": {"thinkingBudget": 0}},
                },
                timeout=12.0,
            )
            if resp.status_code == 200:
                parts = resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
                txt = "".join(p.get("text", "") for p in parts).strip()
                if txt:
                    return {"text": txt, "source": f"gemini:{settings.GEMINI_MODEL}"}
        except Exception as e:
            logger.warning(f"[MirrorMode] Gemini debrief fallback triggered: {type(e).__name__}")

        return {"text": fallback, "source": "deterministic_fallback"}

    @staticmethod
    def complete_challenge(user_id: str, challenge_id: str, session_id: str, reflection_text: str = "", use_ai: bool = True) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM mirror_sessions WHERE id = ?", (session_id,))
        sess = cursor.fetchone()
        if not sess:
            conn.close()
            return {"success": False, "status_code": 404, "message": "Mirror session not found."}
        if sess["user_id"] != user_id:
            conn.close()
            return {"success": False, "status_code": 403, "message": "Forbidden: You do not own this session."}
        if sess["status"] == "COMPLETED":
            conn.close()
            return {"success": False, "status_code": 409, "message": "Challenge session already completed (duplicate completion blocked)."}

        cursor.execute("SELECT * FROM mirror_challenges WHERE id = ?", (challenge_id,))
        ch_row = cursor.fetchone()
        if not ch_row:
            conn.close()
            return {"success": False, "status_code": 404, "message": "Challenge not found."}
        ch = dict(ch_row)

        cursor.execute("SELECT * FROM mirror_decisions WHERE session_id = ? ORDER BY stage_index ASC", (session_id,))
        decisions = [dict(r) for r in cursor.fetchall()]
        if len(decisions) == 0:
            conn.close()
            return {"success": False, "status_code": 400, "message": "At least one decision must be submitted before completing."}

        declared_plan = json.loads(sess["declared_plan_json"] or "{}")
        dqs_data = MirrorModeService._compute_dqs(ch, decisions, declared_plan, reflection_text)
        ai_fb = MirrorModeService._generate_gemini_feedback(ch, dqs_data, decisions, use_ai)

        # XP Reward Calculation with strict duplicate-XP prevention
        cursor.execute(
            "SELECT MAX(dqs_score) as best_dqs, COUNT(*) as cnt, SUM(xp_awarded) as prev_xp FROM mirror_results WHERE user_id = ? AND challenge_id = ?",
            (user_id, challenge_id),
        )
        prev_stats = cursor.fetchone()
        prev_count = prev_stats["cnt"] or 0
        prev_best = prev_stats["best_dqs"]

        xp_awarded = 0
        if not sess["is_practice"]:
            if prev_count == 0:
                xp_awarded += 75 if sess["is_personalized"] else 60
                if len((reflection_text or "").strip()) >= 15:
                    xp_awarded += 20
            elif prev_best is not None and dqs_data["dqs_score"] >= (prev_best + 10.0) and (prev_stats["prev_xp"] or 0) < 175:
                # Improvement bonus across repeated attempts (awarded once)
                xp_awarded += 100

        now = datetime.utcnow().isoformat()
        res_id = f"mres-{uuid.uuid4().hex[:10]}"

        cursor.execute(
            """
            INSERT INTO mirror_results (
                id, session_id, user_id, challenge_id, dqs_score, reasoning_score,
                risk_management_score, evidence_use_score, plan_consistency_score,
                reflection_score, rubric_version, reflection_text, feedback_summary,
                ai_explanation, ai_source, strengths_json, improvements_json, xp_awarded, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                res_id, session_id, user_id, challenge_id, dqs_data["dqs_score"],
                dqs_data["reasoning_score"], dqs_data["risk_management_score"],
                dqs_data["evidence_use_score"], dqs_data["plan_consistency_score"],
                dqs_data["reflection_score"], dqs_data["rubric_version"], reflection_text,
                ai_fb["text"], ai_fb["text"], ai_fb["source"],
                json.dumps(dqs_data["strengths"]), json.dumps(dqs_data["improvements"]),
                xp_awarded, now,
            ),
        )

        cursor.execute(
            "UPDATE mirror_sessions SET status = 'COMPLETED', xp_awarded = ?, completed_at = ? WHERE id = ?",
            (xp_awarded, now, session_id),
        )

        if xp_awarded > 0:
            cursor.execute("UPDATE users SET total_learning_xp = total_learning_xp + ? WHERE id = ?", (xp_awarded, user_id))

        # Mark matching Phase 1 training assignment completed if present
        cursor.execute(
            "UPDATE training_assignments SET status = 'COMPLETED', completed_at = ? WHERE user_id = ? AND pattern_key = ?",
            (now, user_id, ch["target_pattern_key"]),
        )

        conn.commit()
        conn.close()

        return {
            "success": True,
            "result_id": res_id,
            "session_id": session_id,
            "challenge_id": challenge_id,
            "is_practice": bool(sess["is_practice"]),
            "declared_plan": declared_plan,
            "decisions": decisions,
            **dqs_data,
            "feedback_summary": ai_fb["text"],
            "ai_source": ai_fb["source"],
            "xp_awarded": xp_awarded,
        }

    @staticmethod
    def skip_challenge(user_id: str, challenge_id: str) -> Dict[str, Any]:
        MirrorModeService.ensure_challenges_seeded()
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        sess_id = f"msess-{uuid.uuid4().hex[:10]}"
        cursor.execute(
            """
            INSERT INTO mirror_sessions (id, user_id, challenge_id, is_personalized, is_practice, status, current_stage, total_stages, created_at, completed_at)
            VALUES (?, ?, ?, 0, 0, 'SKIPPED', 0, 2, ?, ?)
            """,
            (sess_id, user_id, challenge_id, now, now),
        )
        conn.commit()
        conn.close()
        return {"success": True, "challenge_id": challenge_id, "message": "Challenge skipped without penalty."}

    @staticmethod
    def get_history(user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT r.*, c.title as challenge_title, c.challenge_type, c.target_dimension, s.is_practice
            FROM mirror_results r
            JOIN mirror_challenges c ON r.challenge_id = c.id
            JOIN mirror_sessions s ON r.session_id = s.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
            """,
            (user_id,),
        )
        rows = []
        for r in cursor.fetchall():
            d = dict(r)
            d["strengths"] = json.loads(d.pop("strengths_json", "[]"))
            d["improvements"] = json.loads(d.pop("improvements_json", "[]"))
            d["is_practice"] = bool(d.get("is_practice"))
            rows.append(d)
        conn.close()
        return {"results": rows, "total": len(rows)}


mirror_service = MirrorModeService()
