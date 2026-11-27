import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from backend.app.config import settings
from backend.app.database import get_connection
from backend.app.services.bie_service import bie_service, SCORING_DIMENSIONS

logger = logging.getLogger("mindmark.fingerprint")

DIMENSION_DEFINITIONS = {
    "Risk Discipline": {
        "question": "Does the user manage position sizes and portfolio exposure responsibly?",
        "min_observations": 2,
        "suggestion": "Complete a position-sizing challenge in the Paper Simulator (keep single-stock weight <= 25%).",
        "route": "/simulator",
    },
    "Emotional Control": {
        "question": "How does the user respond to simulated losses and market volatility?",
        "min_observations": 2,
        "suggestion": "Complete a simulated market-crash scenario in Historical Market Replay.",
        "route": "/market-replay",
    },
    "Decision Consistency": {
        "question": "Does the user follow their previously stated investment plan?",
        "min_observations": 2,
        "suggestion": "Limit rapid reversals and keep a steady, deliberate decision cadence.",
        "route": "/simulator",
    },
    "Research Quality": {
        "question": "Does the user review relevant information before making decisions?",
        "min_observations": 2,
        "suggestion": "Complete a company-analysis exercise using the Market Screener & Academy before entering a trade.",
        "route": "/markets/screener",
    },
    "Diversification Awareness": {
        "question": "Does the user understand stock and sector concentration?",
        "min_observations": 2,
        "suggestion": "Rebuild a concentrated virtual portfolio across 3+ uncorrelated sectors.",
        "route": "/portfolio",
    },
    "Strategy Adherence": {
        "question": "Does the user follow their declared strategy instead of frequently changing it?",
        "min_observations": 1,
        "suggestion": "Complete a Pre-Decision Contract challenge and honor your planned exposure limit.",
        "route": "/simulator",
    },
    "Loss Response": {
        "question": "How does the user behave after experiencing simulated losses?",
        "min_observations": 1,
        "suggestion": "Practice the 'Recovery Trap' discipline rule: never escalate position size right after a loss.",
        "route": "/academy",
    },
}


class FingerprintService:
    """
    Phase 2: Investor Decision Fingerprint Service.
    Reuses Phase 1 BIE tables (decision_events, pre_decision_contracts,
    behavior_scores, behavior_patterns, behavior_snapshots, training_assignments).
    """

    @staticmethod
    def _load_user_records(user_id: str) -> Dict[str, Any]:
        # Ensure Phase 1 BIE profile is computed and persisted
        profile = bie_service.get_full_profile(user_id)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM decision_events WHERE user_id = ? ORDER BY created_at ASC", (user_id,))
        events = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM pre_decision_contracts WHERE user_id = ? ORDER BY created_at ASC", (user_id,))
        contracts = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM behavior_snapshots WHERE user_id = ? ORDER BY created_at ASC", (user_id,))
        snapshots = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT experience_level FROM users WHERE id = ?", (user_id,))
        u_row = cursor.fetchone()
        exp_level = u_row["experience_level"] if u_row else "BEGINNER"
        conn.close()

        return {
            "profile": profile,
            "events": events,
            "contracts": contracts,
            "snapshots": snapshots,
            "experience_level": exp_level,
        }

    # -------------------------------------------------------------------------
    # 1. INVESTOR DECISION FINGERPRINT (7 DIMENSIONS)
    # -------------------------------------------------------------------------
    @staticmethod
    def get_fingerprint(user_id: str) -> Dict[str, Any]:
        ctx = FingerprintService._load_user_records(user_id)
        profile = ctx["profile"]
        events = ctx["events"]
        contracts = ctx["contracts"]
        features = profile.get("features") or {}
        raw_scores = {s["dimension"]: s for s in profile.get("scores", [])}
        patterns_by_key = {p["pattern_key"]: p for p in profile.get("patterns", [])}

        total_events = len(events)
        closed_or_loss_events = sum(
            1 for e in events
            if e["action"] in ("SELL", "REDUCE") or (e.get("realized_pnl_delta") or 0.0) < 0
        )

        dimensions_out: List[Dict[str, Any]] = []
        measured_dims: List[Dict[str, Any]] = []

        for dim in SCORING_DIMENSIONS:
            meta = DIMENSION_DEFINITIONS[dim]
            raw = raw_scores.get(dim, {})

            # Determine actual observations applicable to this dimension
            if dim == "Strategy Adherence":
                obs_count = len(contracts)
            elif dim == "Loss Response":
                obs_count = closed_or_loss_events
            else:
                obs_count = total_events

            has_sufficient = obs_count >= meta["min_observations"]

            # Build supporting evidence from actual user activity
            supporting_evidence: List[str] = []
            if has_sufficient:
                if dim == "Risk Discipline":
                    supporting_evidence.append(f"Max single-stock exposure: {features.get('portfolio_concentration_pct', 0):.1f}%")
                    supporting_evidence.append(f"Top-3 holdings concentration: {features.get('top3_concentration_pct', 0):.1f}%")
                elif dim == "Emotional Control":
                    supporting_evidence.append(f"FOMO pattern: {'Detected' if patterns_by_key.get('fomo', {}).get('detected') else 'Not detected'}")
                    supporting_evidence.append(f"Panic selling pattern: {'Detected' if patterns_by_key.get('panic_selling', {}).get('detected') else 'Not detected'}")
                elif dim == "Decision Consistency":
                    supporting_evidence.append(f"Decisions per active day: {features.get('trades_per_active_day', 0)}")
                    supporting_evidence.append(f"Rapid reversals (<2h): {features.get('rapid_reversals_count', 0)}")
                elif dim == "Research Quality":
                    supporting_evidence.append(f"Research logged before {features.get('research_activity_rate', 0):.0f}% of decisions")
                    supporting_evidence.append(f"Undocumented rationale rate: {features.get('decisions_without_reasoning_pct', 0):.0f}%")
                elif dim == "Diversification Awareness":
                    supporting_evidence.append(f"Max sector concentration: {features.get('sector_concentration_pct', 0):.1f}%")
                elif dim == "Strategy Adherence":
                    supporting_evidence.append(f"Pre-Decision Contracts signed: {len(contracts)}")
                    supporting_evidence.append(f"Exposure limit deviations: {features.get('strategy_deviations_count', 0)}")
                elif dim == "Loss Response":
                    supporting_evidence.append(f"Closed/loss observations analyzed: {closed_or_loss_events}")
                    supporting_evidence.append(f"Avg size change after loss: {features.get('avg_size_change_after_loss_pct', 0):.1f}%")

            score_val = float(raw["current_score"]) if (has_sufficient and raw.get("current_score") is not None) else None
            prev_val = float(raw["previous_score"]) if (has_sufficient and raw.get("previous_score") is not None) else None

            dim_item = {
                "dimension": dim,
                "question": meta["question"],
                "has_sufficient_data": has_sufficient,
                "display_status": "Measured" if has_sufficient else "Not enough data yet",
                "score": score_val,
                "previous_score": prev_val,
                "trend": raw.get("trend", "STABLE") if has_sufficient else "UNAVAILABLE",
                "confidence": raw.get("confidence", "LOW") if has_sufficient else "LOW",
                "observations_used": obs_count,
                "min_observations_required": meta["min_observations"],
                "explanation": raw.get("explanation", meta["question"]) if has_sufficient else f"Not enough data yet ({obs_count}/{meta['min_observations']} observations recorded).",
                "supporting_evidence": supporting_evidence,
                "improvement_suggestion": meta["suggestion"],
                "action_route": meta["route"],
            }
            dimensions_out.append(dim_item)
            if has_sufficient and score_val is not None:
                measured_dims.append(dim_item)

        overall_score = (
            round(sum(d["score"] for d in measured_dims) / len(measured_dims), 1)
            if len(measured_dims) >= 3 else None
        )
        strongest = max(measured_dims, key=lambda d: d["score"]) if measured_dims else None
        weakest = min(measured_dims, key=lambda d: d["score"]) if measured_dims else None

        # Compare against earliest stored snapshot/scores if available
        prev_overall = (
            round(sum(d["previous_score"] for d in measured_dims if d["previous_score"] is not None) / len(measured_dims), 1)
            if len(measured_dims) >= 3 else None
        )

        archetype = FingerprintService.generate_archetype(user_id, preloaded_ctx=ctx, preloaded_dims=dimensions_out)

        return {
            "tagline": "Understand your decisions. Improve your discipline.",
            "events_count": total_events,
            "measured_dimensions_count": len(measured_dims),
            "total_dimensions_count": len(SCORING_DIMENSIONS),
            "has_sufficient_overall_data": overall_score is not None,
            "overall_score": overall_score,
            "previous_overall_score": prev_overall,
            "strongest_dimension": strongest,
            "dimension_needing_improvement": weakest,
            "dimensions": dimensions_out,
            "archetype": archetype,
            "educational_disclaimer": "These scores are educational indicators based on simulator activity—not scientifically validated psychological measurements or predictions of real-world investing performance.",
        }

    # -------------------------------------------------------------------------
    # 2. DYNAMIC INVESTOR ARCHETYPE GENERATOR
    # -------------------------------------------------------------------------
    @staticmethod
    def generate_archetype(
        user_id: str,
        preloaded_ctx: Optional[Dict[str, Any]] = None,
        preloaded_dims: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        ctx = preloaded_ctx or FingerprintService._load_user_records(user_id)
        events = ctx["events"]
        contracts = ctx["contracts"]
        patterns_by_key = {p["pattern_key"]: p for p in ctx["profile"].get("patterns", [])}

        if len(events) < 3:
            return {
                "has_sufficient_data": False,
                "primary_archetype": None,
                "display_status": "Not enough data yet",
                "observed_characteristics": [],
                "why_assigned": f"Recorded {len(events)} of 3 minimum decision events required to identify an Investor Archetype.",
                "evolves_note": "Your archetype will unlock automatically as you complete simulated decisions.",
            }

        if preloaded_dims is None:
            fp = FingerprintService.get_fingerprint(user_id)
            return fp["archetype"]

        dim_map = {d["dimension"]: d for d in preloaded_dims}
        risk_s = dim_map["Risk Discipline"]["score"] or 70.0
        emo_s = dim_map["Emotional Control"]["score"] or 70.0
        cons_s = dim_map["Decision Consistency"]["score"] or 70.0
        res_s = dim_map["Research Quality"]["score"] or 70.0
        strat_s = dim_map["Strategy Adherence"]["score"] or 70.0

        # Build mixed observed characteristics from real evidence
        characteristics: List[str] = []
        if res_s >= 72.0:
            characteristics.append(f"Research-oriented ({ctx['profile']['features'].get('research_activity_rate', 0):.0f}% of decisions backed by research)")
        if risk_s >= 75.0:
            characteristics.append(f"Measured position sizing (max single stock {ctx['profile']['features'].get('portfolio_concentration_pct', 0):.1f}%)")
        if len(contracts) >= 2 and strat_s >= 75.0:
            characteristics.append("Plan-committed (honors Pre-Decision Contract limits)")
        if patterns_by_key.get("fomo", {}).get("detected") or patterns_by_key.get("impulsive_decisions", {}).get("detected"):
            characteristics.append("Reactive to fast price moves or rapid entries")
        if patterns_by_key.get("portfolio_concentration", {}).get("detected"):
            characteristics.append("High-conviction / concentrated sizing explorer")
        if emo_s >= 78.0 and cons_s >= 75.0:
            characteristics.append("Calm pacing without rapid reversals")
        if not characteristics:
            characteristics.append("Developing balanced decision habits across early simulations")

        # Determine primary archetype without negative personality labeling
        if patterns_by_key.get("impulsive_decisions", {}).get("detected") or (emo_s < 62.0 and res_s < 60.0):
            primary = "The Impulsive Decision Maker"
            summary = "Recent simulated activity shows fast or reactive entries with limited prior research."
        elif len(contracts) >= 2 and risk_s >= 76.0 and strat_s >= 76.0:
            primary = "The Disciplined Planner"
            summary = "Consistently documents Pre-Decision Contracts and respects position-sizing boundaries."
        elif res_s >= 75.0:
            primary = "The Research-Driven Investor"
            summary = "Prioritizes reviewing company fundamentals and charts before committing virtual capital."
        elif patterns_by_key.get("portfolio_concentration", {}).get("detected") and not patterns_by_key.get("panic_selling", {}).get("detected"):
            primary = "The Risk Explorer"
            summary = "Tends to take larger concentrated positions while testing conviction in the simulator."
        elif cons_s >= 72.0 and any(d.get("trend") == "UP" for d in preloaded_dims if d["has_sufficient_data"]):
            primary = "The Consistency Builder"
            summary = "Demonstrating steady pacing and measurable upward progress across decision dimensions."
        elif ctx["profile"]["features"].get("trades_per_active_day", 0) <= 1.5 and emo_s >= 75.0:
            primary = "The Careful Observer"
            summary = "Takes a patient, selective approach with low trading turnover."
        else:
            primary = "The Balanced Learner"
            summary = "Developing a mix of risk awareness, research habits, and portfolio balance."

        return {
            "has_sufficient_data": True,
            "primary_archetype": primary,
            "summary": summary,
            "observed_characteristics": characteristics[:3],
            "why_assigned": f"Derived from {len(events)} recorded decision events and {len(contracts)} Pre-Decision Contract(s).",
            "evolves_note": "Your archetype evolves dynamically as you practice and refine your habits in the simulator.",
        }

    # -------------------------------------------------------------------------
    # 3. DECLARED VS OBSERVED BEHAVIOR
    # -------------------------------------------------------------------------
    @staticmethod
    def get_declared_vs_observed(user_id: str) -> Dict[str, Any]:
        ctx = FingerprintService._load_user_records(user_id)
        events = ctx["events"]
        contracts = ctx["contracts"]
        features = ctx["profile"].get("features") or {}
        exp_level = ctx["experience_level"]

        comparisons: List[Dict[str, Any]] = []

        # 1. Risk Limit Adherence (from Pre-Decision Contracts)
        if contracts:
            avg_planned = round(sum(c["planned_exposure_pct"] for c in contracts) / len(contracts), 1)
            events_with_contracts = [e for e in events if e.get("contract_id")]
            exceeded = [
                e for e in events_with_contracts
                if (e.get("stock_exposure_pct") or 0.0) > next(
                    (c["planned_exposure_pct"] for c in contracts if c["id"] == e["contract_id"]), 100.0
                ) + 5.0
            ]
            comparisons.append({
                "dimension": "Risk & Exposure Limit",
                "declared": f"Average planned exposure in Pre-Decision Contracts: {avg_planned}%",
                "observed": (
                    f"{len(exceeded)} of {len(events_with_contracts)} contracted decisions exceeded your planned limit."
                    if exceeded else f"All {len(events_with_contracts)} contracted decisions stayed within your planned limit."
                ),
                "difference": f"{len(exceeded)} deviation(s)" if exceeded else "Aligned",
                "aligned": len(exceeded) == 0,
                "evidence_count": len(events_with_contracts),
                "suggestion": "Double-check share quantity against your planned exposure % before clicking Confirm." if exceeded else "Keep enforcing your Pre-Decision Contract exposure cap.",
            })
        else:
            comparisons.append({
                "dimension": "Risk & Exposure Limit",
                "declared": f"Profile level: {exp_level} (no Pre-Decision Contracts signed yet).",
                "observed": f"Max observed single-stock exposure: {features.get('portfolio_concentration_pct', 0):.1f}%." if events else "Not enough data yet.",
                "difference": "No contract baseline yet",
                "aligned": True,
                "evidence_count": len(events),
                "suggestion": "Check the Pre-Decision Contract box before your next simulated trade to benchmark declared vs. actual sizing.",
            })

        # 2. Research Before Investing
        if events:
            researched_cnt = sum(1 for e in events if len(json.loads(e.get("viewed_info_json") or "[]")) > 0)
            research_contracts = sum(1 for c in contracts if "valuation" in c["why_making_decision"].lower() or "diversification" in c["why_making_decision"].lower())
            comparisons.append({
                "dimension": "Research Before Decisions",
                "declared": f"Stated analytical rationale in {research_contracts} Pre-Decision Contract(s)." if contracts else "Expected educational practice: review quote & chart before trading.",
                "observed": f"Research activity was recorded before {researched_cnt} of your {len(events)} simulated decisions.",
                "difference": f"{len(events) - researched_cnt} unresearched decision(s)" if researched_cnt < len(events) else "Consistent research habit",
                "aligned": researched_cnt >= (len(events) * 0.7),
                "evidence_count": len(events),
                "suggestion": "Review the company fundamentals and price chart before entering any position." if researched_cnt < len(events) else "Strong research consistency—keep logging your thesis.",
            })

        # 3. Drawdown & Volatility Patience
        drawdown_sells = [e for e in events if e["action"] in ("SELL", "REDUCE") and (e.get("recent_drawdown_pct") or 0.0) >= 5.0]
        comparisons.append({
            "dimension": "Drawdown Patience",
            "declared": f"Onboarding profile ({exp_level}): Aiming for calm, rule-based exits.",
            "observed": (
                f"Recorded {len(drawdown_sells)} exit(s) during >= 5% portfolio drawdowns."
                if events else "Not enough data yet."
            ),
            "difference": f"{len(drawdown_sells)} drawdown exit(s)" if drawdown_sells else "Steady during calm periods",
            "aligned": len(drawdown_sells) < 2,
            "evidence_count": len(events),
            "suggestion": "Write down what would prove your thesis wrong before entering so drawdown exits follow a plan." if drawdown_sells else "Continue documenting stop-loss invalidation triggers upfront.",
        })

        return {
            "events_count": len(events),
            "contracts_count": len(contracts),
            "comparisons": comparisons,
        }

    # -------------------------------------------------------------------------
    # 4. BEHAVIORAL IMPROVEMENT TIMELINE (7d / 30d / 90d / all)
    # -------------------------------------------------------------------------
    @staticmethod
    def get_improvement_timeline(user_id: str, period: str = "all") -> Dict[str, Any]:
        ctx = FingerprintService._load_user_records(user_id)
        snapshots = ctx["snapshots"]
        events = ctx["events"]
        assignments = ctx["profile"].get("training_assignments", [])
        patterns = ctx["profile"].get("patterns", [])

        cutoff: Optional[datetime] = None
        now = datetime.utcnow()
        if period == "7d":
            cutoff = now - timedelta(days=7)
        elif period == "30d":
            cutoff = now - timedelta(days=30)
        elif period == "90d":
            cutoff = now - timedelta(days=90)

        def _in_period(ts_str: str) -> bool:
            if cutoff is None:
                return True
            try:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None)
                return dt >= cutoff
            except Exception:
                return True

        filtered_snaps = [s for s in snapshots if _in_period(s["created_at"])]
        filtered_events = [e for e in events if _in_period(e["created_at"])]

        timeline_items: List[Dict[str, Any]] = []
        for s in filtered_snaps[-15:]:
            feats = json.loads(s["features_json"])
            timeline_items.append({
                "type": "SNAPSHOT",
                "timestamp": s["created_at"],
                "title": f"Behavioral Snapshot ({s['events_count']} events)",
                "detail": f"Research rate: {feats.get('research_activity_rate', 0):.0f}% • Max stock concentration: {feats.get('portfolio_concentration_pct', 0):.1f}% • Strategy deviations: {feats.get('strategy_deviations_count', 0)}",
            })

        for p in patterns:
            if p["detected"] and _in_period(p["updated_at"]):
                timeline_items.append({
                    "type": "PATTERN_DETECTED",
                    "timestamp": p["updated_at"],
                    "title": f"Pattern Observed: {p['pattern_name']}",
                    "detail": f"{p['status']} ({p['confidence']}% confidence) — {p['what_happened']}",
                })

        for a in assignments:
            if _in_period(a["assigned_at"]):
                timeline_items.append({
                    "type": "TRAINING_ASSIGNMENT",
                    "timestamp": a["assigned_at"],
                    "title": f"Exercise {a['status']}: {a['challenge_title']}",
                    "detail": a["description"],
                })

        timeline_items.sort(key=lambda x: x["timestamp"], reverse=True)

        # Score comparison from stored scores
        score_deltas = [
            {
                "dimension": s["dimension"],
                "previous_score": s["previous_score"],
                "current_score": s["current_score"],
                "delta": round(s["current_score"] - s["previous_score"], 1),
                "trend": s["trend"],
            }
            for s in ctx["profile"].get("scores", [])
        ]

        return {
            "period": period,
            "events_in_period": len(filtered_events),
            "snapshots_in_period": len(filtered_snaps),
            "score_deltas": score_deltas,
            "timeline": timeline_items,
        }

    # -------------------------------------------------------------------------
    # 5. PERSONALIZED RECOMMENDATIONS + GROUNDED GEMINI EXPLANATION
    # -------------------------------------------------------------------------
    @staticmethod
    def get_recommendations(user_id: str, use_ai: bool = True) -> Dict[str, Any]:
        fp = FingerprintService.get_fingerprint(user_id)
        measured = [d for d in fp["dimensions"] if d["has_sufficient_data"]]
        weak_dims = sorted([d for d in measured if d["score"] < 78.0], key=lambda x: x["score"])

        recs: List[Dict[str, Any]] = []
        for d in weak_dims[:4]:
            recs.append({
                "dimension": d["dimension"],
                "score": d["score"],
                "task": d["improvement_suggestion"],
                "action_route": d["action_route"],
                "evidence": d["supporting_evidence"],
            })

        if not recs:
            if not measured:
                recs.append({
                    "dimension": "Getting Started",
                    "score": None,
                    "task": "Complete 3 simulated trades with Pre-Decision Contracts to unlock personalized behavioral recommendations.",
                    "action_route": "/simulator",
                    "evidence": ["0–1 decision events recorded so far"],
                })
            else:
                recs.append({
                    "dimension": fp["strongest_dimension"]["dimension"] if fp["strongest_dimension"] else "Risk Discipline",
                    "score": fp["strongest_dimension"]["score"] if fp["strongest_dimension"] else None,
                    "task": "Strong process habits so far! Test your discipline in a Historical Market Replay crash scenario.",
                    "action_route": "/market-replay",
                    "evidence": ["All measured dimensions currently >= 78/100"],
                })

        fallback_summary = (
            f"Fingerprint based on {fp['events_count']} recorded decision(s). "
            + (
                f"Strongest habit: {fp['strongest_dimension']['dimension']} ({fp['strongest_dimension']['score']}/100). "
                if fp["strongest_dimension"] else ""
            )
            + (
                f"Primary focus area: {fp['dimension_needing_improvement']['dimension']} ({fp['dimension_needing_improvement']['score']}/100)."
                if fp["dimension_needing_improvement"] else "Complete a few more simulated decisions to measure all 7 dimensions."
            )
        )

        if not use_ai or not settings.is_ai_live or not measured:
            return {
                "source": "deterministic_backend",
                "summary": fallback_summary,
                "recommendations": recs,
            }

        structured_payload = {
            "overall_score": fp["overall_score"],
            "archetype": fp["archetype"].get("primary_archetype"),
            "strongest": fp["strongest_dimension"]["dimension"] if fp["strongest_dimension"] else None,
            "weakest": fp["dimension_needing_improvement"]["dimension"] if fp["dimension_needing_improvement"] else None,
            "recommendations": recs,
        }
        prompt = (
            "You are MINDMARK AI Tutor. Summarize this user's Investor Decision Fingerprint in 3 concise sentences "
            "using ONLY the verified backend data below. Do NOT invent evidence, do NOT overwrite scores, "
            "do NOT give buy/sell advice, and do NOT claim this is a clinical psychological test:\n"
            f"{json.dumps(structured_payload)}"
        )

        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
            resp = httpx.post(
                url,
                params={"key": settings.GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 450, "thinkingConfig": {"thinkingBudget": 0}},
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
                        "recommendations": recs,
                    }
        except Exception as e:
            logger.warning(f"[FingerprintService] Gemini fallback triggered: {type(e).__name__}")

        return {
            "source": "deterministic_fallback",
            "summary": fallback_summary,
            "recommendations": recs,
        }


fingerprint_service = FingerprintService()
