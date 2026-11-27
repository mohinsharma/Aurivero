import json
import re
import time
import uuid
import logging
from collections import defaultdict
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.app.config import settings
from backend.app.database import get_connection
from backend.app.services.ai_buddy_service import INJECTION_PATTERNS, OFF_TOPIC_PATTERNS, FINANCE_KEYWORDS
from backend.app.services.bie_service import bie_service
from backend.app.services.fingerprint_service import fingerprint_service
from backend.app.services.gamification_service import gamification_service
from backend.app.services.arena_service import arena_service

logger = logging.getLogger("mindmark.ai_coach")

COACH_SYSTEM_INSTRUCTION = """You are MINDMARK AI Coach, an educational financial intelligence assistant.

Your purpose is to help users understand financial concepts, improve simulated decision-making, learn risk management, and understand their MINDMARK progress.

You only answer questions related to financial education, markets, behavioral finance, and MINDMARK features.
Use simple language and keep responses concise.
When personal context is provided, use it only when relevant to the user's question.
Never invent user activity, market prices, financial news, diagnostic evidence, or performance scores.
Never claim to have observed a behavior unless supporting evidence is included in the supplied context.
Never calculate or modify official behavioral scores, Arena scores, XP, or rewards. These are determined by backend services.
Never provide guaranteed stock predictions or personalized real-money buy/sell recommendations.
Clearly distinguish educational simulations from real market information.
If information is missing, say so honestly.
If the question is outside financial education or MINDMARK, politely explain that you can only help with those topics.
Do not repeat generic disclaimers in every response.
Prefer short, direct answers with practical explanations."""

COACH_FINANCE_EXTRA = {
    "fingerprint", "mirror mode", "arena", "skill tree", "streak", "weakness",
    "risk discipline", "research quality", "diversification", "decision", "score",
    "improve", "recommend", "archetype", "lesson", "mission", "badge", "xp",
    "level", "pattern", "fomo", "panic", "loss", "consistency", "contract",
}

KNOWLEDGE_BASE = [
    {
        "id": "kb-risk-sizing",
        "title": "Position Sizing & Capital Protection",
        "tags": ["risk", "position sizing", "exposure", "drawdown", "discipline"],
        "summary": "Capping single-stock exposure (e.g., 10-20%) prevents one unexpected earnings miss from causing a severe portfolio drawdown.",
        "source": "MINDMARK Risk Academy",
        "route": "/markets/risk",
        "data_type": "EDUCATIONAL",
    },
    {
        "id": "kb-research-quality",
        "title": "Separating Verified Filings from Market Hype",
        "tags": ["research", "valuation", "p/e", "fomo", "fundamentals", "evidence"],
        "summary": "Reviewing quarterly revenue, operating margins, debt/equity, and exchange filings before trading reduces impulsive FOMO entries.",
        "source": "MINDMARK Research Intelligence",
        "route": "/markets/screener",
        "data_type": "EDUCATIONAL",
    },
    {
        "id": "kb-diversification",
        "title": "Sector Diversification & Concentration Risk",
        "tags": ["diversification", "portfolio", "sector", "concentration", "allocation"],
        "summary": "Spreading capital across uncorrelated sectors (IT, Banking, Pharma, FMCG, Index ETFs) cushions sector-specific shocks.",
        "source": "MINDMARK Portfolio Guide",
        "route": "/portfolio",
        "data_type": "EDUCATIONAL",
    },
    {
        "id": "kb-nifty-sensex",
        "title": "NIFTY 50 & SENSEX Benchmark Basics",
        "tags": ["nifty", "sensex", "nse", "bse", "index", "market"],
        "summary": "NIFTY 50 tracks 50 large-cap NSE stocks and SENSEX tracks 30 BSE blue-chips, serving as broad Indian equity benchmarks.",
        "source": "MINDMARK Market Fundamentals",
        "route": "/academy",
        "data_type": "EDUCATIONAL",
    },
]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AICoachService:
    def __init__(self):
        self._rate_buckets: Dict[str, List[float]] = defaultdict(list)

    def _check_rate_limit(self, user_id: str, limit: int = 20, window_sec: int = 60) -> None:
        now = time.time()
        bucket = [t for t in self._rate_buckets[user_id] if now - t < window_sec]
        if len(bucket) >= limit:
            raise PermissionError("RATE_LIMIT: Too many AI Coach requests. Please wait a minute.")
        bucket.append(now)
        self._rate_buckets[user_id] = bucket

    @staticmethod
    def _has_finance_keyword(low: str) -> bool:
        for k in FINANCE_KEYWORDS | COACH_FINANCE_EXTRA:
            if k == "₹":
                if k in low:
                    return True
            elif re.search(rf"\b{re.escape(k)}\b", low):
                return True
        return False

    @staticmethod
    def validate_domain(message: str) -> str:
        """Returns 'injection', 'off_topic', 'ambiguous', or 'allowed'."""
        low = (message or "").lower().strip()
        for pat in INJECTION_PATTERNS:
            if re.search(pat, low):
                return "injection"
        for pat in OFF_TOPIC_PATTERNS:
            if re.search(pat, low):
                if AICoachService._has_finance_keyword(low):
                    return "allowed"
                return "off_topic"
        if AICoachService._has_finance_keyword(low):
            return "allowed"
        if len(low.split()) <= 5:
            return "ambiguous"
        return "off_topic"

    # -------------------------------------------------------------------------
    # PERSONALIZED USER CONTEXT ENGINE (DATA MINIMIZED & STRICTLY ISOLATED)
    # -------------------------------------------------------------------------
    def get_user_context(self, user_id: str) -> Dict[str, Any]:
        bie = bie_service.get_full_profile(user_id)
        fp = fingerprint_service.get_fingerprint(user_id)
        arena_dash = arena_service.get_dashboard(user_id)

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT total_learning_xp FROM users WHERE id = ?", (user_id,))
        u_row = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM gamification_skill_completions WHERE user_id = ?", (user_id,))
        skills_done = cur.fetchone()[0]
        cur.execute(
            "SELECT challenge_id, dqs_score, created_at FROM mirror_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 3",
            (user_id,),
        )
        mirror_rows = [dict(r) for r in cur.fetchall()]
        conn.close()

        from backend.app.services.gamification_service import compute_level_info
        lvl = compute_level_info(u_row["total_learning_xp"] if u_row else 0)

        dims = fp.get("dimensions") or []
        scored_dims = [d for d in dims if d.get("score") is not None]
        def _dim_name(d: Dict[str, Any]) -> str:
            return d.get("name") or d.get("dimension") or d.get("title") or "Dimension"

        strongest_dim = max(scored_dims, key=lambda d: d["score"]) if scored_dims else None
        weakest_dim = min(scored_dims, key=lambda d: d["score"]) if scored_dims else None
        if strongest_dim:
            strongest_dim = {**strongest_dim, "name": _dim_name(strongest_dim)}
        if weakest_dim:
            weakest_dim = {**weakest_dim, "name": _dim_name(weakest_dim)}

        detected_patterns = [
            {
                "pattern_name": p["pattern_name"],
                "severity": p["severity"],
                "confidence": p["confidence"],
                "evidence_count": p["evidence_count"],
                "what_happened": p["what_happened"],
            }
            for p in (bie.get("patterns") or [])
            if p.get("detected")
        ]

        behavioral_summary = {
            _dim_name(d): {
                "score": d["score"],
                "confidence": d.get("confidence", "low"),
                "evidence_count": d.get("observations_count", 0),
                "explanation": d.get("explanation"),
            }
            for d in scored_dims
        }

        suggested_questions = [
            "What should I practice next?",
            "Explain my Investor Decision Fingerprint.",
            "How can I improve my research quality?",
        ]
        if weakest_dim:
            suggested_questions.insert(0, f"Why is my {weakest_dim['name']} score {weakest_dim['score']}?")
        if mirror_rows:
            suggested_questions.append("What did I learn from my last Mirror Mode challenge?")

        return {
            "tagline": "Your decisions. Your learning journey. Your AI coach.",
            "generated_at": _utc_now().isoformat(),
            "user_context": {
                "level": lvl["current_level"],
                "level_title": lvl["level_title"],
                "total_xp": lvl["total_xp"],
                "completed_skills": skills_done,
                "mirror_challenges_completed": len(mirror_rows),
                "arena_contests_completed": arena_dash["user_stats"]["contests_completed"],
                "arena_league": arena_dash["user_stats"]["league"],
                "simulator_events_count": bie.get("events_count", 0),
            },
            "archetype": fp.get("archetype"),
            "strongest_dimension": strongest_dim,
            "dimension_needing_improvement": weakest_dim,
            "behavioral_summary": behavioral_summary,
            "recent_patterns": detected_patterns[:3],
            "recent_mirror_results": mirror_rows,
            "arena_summary": {
                "rank": arena_dash["user_stats"]["global_rank"],
                "points": arena_dash["user_stats"]["arena_points"],
                "league": arena_dash["user_stats"]["league"],
            },
            "suggested_questions": suggested_questions[:5],
        }

    # -------------------------------------------------------------------------
    # ADAPTIVE RECOMMENDATIONS (EVIDENCE-BACKED & DISMISSIBLE)
    # -------------------------------------------------------------------------
    def get_recommendations(self, user_id: str) -> List[Dict[str, Any]]:
        ctx = self.get_user_context(user_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT rec_id FROM ai_coach_dismissed_recommendations WHERE user_id = ?", (user_id,))
        dismissed = {r["rec_id"] for r in cur.fetchall()}
        cur.execute("SELECT skill_id FROM gamification_skill_completions WHERE user_id = ?", (user_id,))
        done_skills = {r["skill_id"] for r in cur.fetchall()}
        conn.close()

        recs: List[Dict[str, Any]] = []
        weak = ctx.get("dimension_needing_improvement")
        if weak:
            wname = weak["name"].lower()
            if "risk" in wname and "rec-risk-sizing" not in dismissed:
                recs.append({
                    "id": "rec-risk-sizing",
                    "title": "Practice Position Sizing & Capital Protection",
                    "reason": f"Your {weak['name']} is {weak['score']}/100 ({weak.get('observations_count', 0)} observations).",
                    "route": "/markets/risk",
                    "action_label": "Open Risk Lab",
                })
            elif "research" in wname and "rec-research-screener" not in dismissed:
                recs.append({
                    "id": "rec-research-screener",
                    "title": "Analyze Company Fundamentals Before Trading",
                    "reason": f"Your {weak['name']} is {weak['score']}/100; checking ratios strengthens evidence quality.",
                    "route": "/markets/screener",
                    "action_label": "Open Screener",
                })
            elif "diversification" in wname and "rec-diversification-mirror" not in dismissed:
                recs.append({
                    "id": "rec-diversification-mirror",
                    "title": "Complete Diversification Builder in Mirror Mode",
                    "reason": f"Your {weak['name']} is {weak['score']}/100.",
                    "route": "/mirror-mode",
                    "action_label": "Open Mirror Mode",
                })

        if "mf-1" not in done_skills and "rec-skill-mf1" not in dismissed:
            recs.append({
                "id": "rec-skill-mf1",
                "title": "Start Market Fundamentals Skill Tree",
                "reason": "Build your core foundation in My Progress.",
                "route": "/my-progress",
                "action_label": "Open My Progress",
            })

        if not recs and "rec-arena-practice" not in dismissed:
            recs.append({
                "id": "rec-arena-practice",
                "title": "Test Decision Quality in MINDMARK Arena",
                "reason": "Apply your knowledge in a structured non-profit-driven contest.",
                "route": "/arena",
                "action_label": "Enter Arena",
            })
        return recs

    def dismiss_recommendation(self, user_id: str, rec_id: str) -> Dict[str, Any]:
        conn = get_connection()
        conn.execute(
            "INSERT OR IGNORE INTO ai_coach_dismissed_recommendations (id, user_id, rec_id, dismissed_at) VALUES (?, ?, ?, ?)",
            (f"dis_{uuid.uuid4().hex[:10]}", user_id, rec_id, _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()
        return {"rec_id": rec_id, "dismissed": True}

    # -------------------------------------------------------------------------
    # KNOWLEDGE RETRIEVAL (RAG)
    # -------------------------------------------------------------------------
    @staticmethod
    def retrieve_knowledge(query: str) -> List[Dict[str, Any]]:
        low = query.lower()
        hits = []
        ts = _utc_now().isoformat()
        for doc in KNOWLEDGE_BASE:
            if any(t in low for t in doc["tags"]):
                hits.append({**doc, "retrieved_at": ts})
        return hits[:3]

    # -------------------------------------------------------------------------
    # CHAT WITH CONVERSATION MEMORY & DETERMINISTIC FALLBACK
    # -------------------------------------------------------------------------
    def chat(self, user_id: str, message: str, conversation_id: Optional[str] = None, use_ai: bool = True) -> Dict[str, Any]:
        self._check_rate_limit(user_id)
        domain = self.validate_domain(message)
        now_iso = _utc_now().isoformat()

        conn = get_connection()
        cur = conn.cursor()
        if conversation_id:
            cur.execute("SELECT id, user_id FROM ai_coach_conversations WHERE id = ?", (conversation_id,))
            conv = cur.fetchone()
            if not conv:
                conn.close()
                raise ValueError("Conversation not found")
            if conv["user_id"] != user_id:
                conn.close()
                raise PermissionError("FORBIDDEN: Conversation belongs to another user")
            conv_id = conversation_id
        else:
            conv_id = f"conv_{uuid.uuid4().hex[:10]}"
            cur.execute(
                "INSERT INTO ai_coach_conversations (id, user_id, title, topic_tags_json, created_at, updated_at) VALUES (?, ?, ?, '[]', ?, ?)",
                (conv_id, user_id, message[:60], now_iso, now_iso),
            )
        conn.commit()
        conn.close()

        if domain in ("injection", "off_topic"):
            reply = {
                "answer": "I'm MINDMARK AI Coach — I can only help with financial education, market concepts, behavioral finance, and your MINDMARK learning progress.",
                "context_used": [],
                "evidence": [],
                "suggested_actions": [{"label": "Explore My Progress", "route": "/my-progress"}],
                "sources": [],
                "confidence": "high",
                "ai_source": "domain_guardrail",
            }
            self._save_turn(conv_id, user_id, message, reply)
            return {"conversation_id": conv_id, **reply}

        if domain == "ambiguous":
            reply = {
                "answer": "Could you clarify which financial concept or MINDMARK activity (e.g., NIFTY 50, risk discipline, Mirror Mode, or Arena) you'd like help with?",
                "context_used": [],
                "evidence": [],
                "suggested_actions": [],
                "sources": [],
                "confidence": "medium",
                "ai_source": "clarification",
            }
            self._save_turn(conv_id, user_id, message, reply)
            return {"conversation_id": conv_id, **reply}

        ctx = self.get_user_context(user_id)
        rag_docs = self.retrieve_knowledge(message)
        recs = self.get_recommendations(user_id)

        # Build evidence-grounded deterministic answer
        evidence: List[str] = []
        context_used: List[str] = ["user_progress"]
        if ctx["recent_patterns"]:
            context_used.append("behavioral_patterns")
            for p in ctx["recent_patterns"]:
                evidence.append(f"{p['pattern_name']} ({p['evidence_count']} observations, confidence {p['confidence']})")
        if ctx.get("dimension_needing_improvement"):
            context_used.append("investor_fingerprint")
            w = ctx["dimension_needing_improvement"]
            evidence.append(f"{w['name']}: {w['score']}/100 ({w.get('observations_count', 0)} observations)")

        det_parts = []
        if "weakness" in message.lower() or "score" in message.lower() or "fingerprint" in message.lower() or "improve" in message.lower():
            if ctx.get("dimension_needing_improvement"):
                w = ctx["dimension_needing_improvement"]
                det_parts.append(
                    f"Based on {w.get('observations_count', 0)} observed decisions, your lowest dimension is **{w['name']}** ({w['score']}/100): {w.get('explanation', '')}"
                )
            else:
                det_parts.append(
                    f"You have {ctx['user_context']['simulator_events_count']} simulator events recorded so far — log a few more decisions in the Paper Simulator or Mirror Mode to unlock a full behavioral breakdown."
                )
        if rag_docs:
            det_parts.append(rag_docs[0]["summary"])
        if not det_parts:
            det_parts.append(
                f"You are Level {ctx['user_context']['level']} ({ctx['user_context']['level_title']}) with {ctx['user_context']['completed_skills']} skills completed and {ctx['user_context']['arena_contests_completed']} Arena contests."
            )

        deterministic_answer = " ".join(det_parts)
        answer = deterministic_answer
        ai_source = "deterministic_fallback" if use_ai else "deterministic_backend"
        confidence = "medium" if evidence else "low"

        if use_ai and settings.GEMINI_API_KEY:
            try:
                import httpx
                model = settings.GEMINI_MODEL or "gemini-3.6-flash"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
                compact_prompt = json.dumps({
                    "question": message,
                    "user_context": ctx["user_context"],
                    "weakest_dimension": ctx.get("dimension_needing_improvement"),
                    "strongest_dimension": ctx.get("strongest_dimension"),
                    "recent_patterns": ctx["recent_patterns"],
                    "knowledge_docs": [{"title": d["title"], "summary": d["summary"]} for d in rag_docs],
                })
                resp = httpx.post(
                    url,
                    json={
                        "systemInstruction": {"parts": [{"text": COACH_SYSTEM_INSTRUCTION}]},
                        "contents": [{"parts": [{"text": f"Return JSON with key 'answer' (concise 2-4 sentences) and 'confidence' ('low'|'medium'|'high'). Context: {compact_prompt}"}]}],
                        "generationConfig": {"temperature": 0.35, "maxOutputTokens": 240, "responseMimeType": "application/json", "thinkingConfig": {"thinkingBudget": 0}},
                    },
                    timeout=12.0,
                )
                if resp.status_code == 200:
                    j = resp.json()
                    cands = j.get("candidates") or []
                    if cands:
                        parsed = json.loads(cands[0]["content"]["parts"][0]["text"].strip())
                        if isinstance(parsed, dict) and isinstance(parsed.get("answer"), str) and parsed["answer"].strip():
                            answer = parsed["answer"].strip()
                            confidence = parsed.get("confidence", confidence) if parsed.get("confidence") in ("low", "medium", "high") else confidence
                            ai_source = "gemini"
                            usage = j.get("usageMetadata") or {}
                            self._log_tokens(user_id, usage.get("promptTokenCount", 0), usage.get("candidatesTokenCount", 0), "gemini")
            except Exception as e:
                logger.info(f"[AI Coach] Gemini fallback triggered: {type(e).__name__}")
                ai_source = "deterministic_fallback"

        reply = {
            "answer": answer,
            "context_used": context_used,
            "evidence": evidence,
            "suggested_actions": [{"label": r["action_label"], "route": r["route"], "title": r["title"]} for r in recs[:2]],
            "sources": [{"title": d["title"], "source": d["source"], "data_type": d["data_type"], "retrieved_at": d["retrieved_at"]} for d in rag_docs],
            "confidence": confidence,
            "ai_source": ai_source,
        }
        self._save_turn(conv_id, user_id, message, reply)
        return {"conversation_id": conv_id, **reply}

    def _log_tokens(self, user_id: str, prompt_tok: int, comp_tok: int, source: str) -> None:
        conn = get_connection()
        conn.execute(
            "INSERT INTO ai_coach_token_usage (id, user_id, prompt_tokens, completion_tokens, source, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (f"tok_{uuid.uuid4().hex[:10]}", user_id, prompt_tok, comp_tok, source, _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()

    def _save_turn(self, conv_id: str, user_id: str, user_msg: str, assistant_reply: Dict[str, Any]) -> None:
        now_iso = _utc_now().isoformat()
        conn = get_connection()
        conn.execute(
            "INSERT INTO ai_coach_messages (id, conversation_id, user_id, role, content, structured_json, created_at) VALUES (?, ?, ?, 'user', ?, '{}', ?)",
            (f"msg_{uuid.uuid4().hex[:10]}", conv_id, user_id, user_msg, now_iso),
        )
        conn.execute(
            "INSERT INTO ai_coach_messages (id, conversation_id, user_id, role, content, structured_json, created_at) VALUES (?, ?, ?, 'assistant', ?, ?, ?)",
            (f"msg_{uuid.uuid4().hex[:10]}", conv_id, user_id, assistant_reply["answer"], json.dumps(assistant_reply), now_iso),
        )
        conn.execute("UPDATE ai_coach_conversations SET updated_at = ? WHERE id = ?", (now_iso, conv_id))
        conn.commit()
        conn.close()

    # -------------------------------------------------------------------------
    # AI DECISION REVIEW (EVALUATES ONLY AT-DECISION-TIME INFORMATION)
    # -------------------------------------------------------------------------
    def review_decision(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._check_rate_limit(user_id)
        pos_pct = float(payload.get("position_size_pct", 10.0))
        limit_pct = float(payload.get("risk_limit_pct", 20.0))
        within_limit = pos_pct <= limit_pct
        reasoning = (payload.get("stated_reasoning") or "").strip()
        mkt_ctx = (payload.get("market_context_at_time") or "").strip()

        review = {
            "what_you_did_well": (
                f"Documented a clear rationale for {payload['action']} on {payload['symbol']} "
                + ("while staying within your declared risk limit." if within_limit else "with an explicit thesis to review.")
            ),
            "risks_missed": (
                f"Position size ({pos_pct:.1f}%) exceeded your {limit_pct:.1f}% risk limit."
                if not within_limit
                else "Ensure you also define a clear invalidation trigger before entering or holding."
            ),
            "evidence_support": (
                "Your reasoning referenced available market context at decision time."
                if mkt_ctx
                else "No market or fundamental data snapshot was attached; verify valuation and filings before deciding."
            ),
            "plan_alignment": (
                f"Aligned with your declared strategy ({payload.get('declared_strategy')}) and {limit_pct:.1f}% risk cap."
                if within_limit
                else f"Deviated from your {limit_pct:.1f}% risk limit ({pos_pct:.1f}% used)."
            ),
            "invalidation_info": "Watch for quarterly earnings margin compression, debt spikes, or a breach of your thesis assumptions.",
            "practical_lesson": "Judge every decision by process quality and risk control at decision time, never by short-term price outcomes.",
            "ai_source": "deterministic_backend",
            "evaluated_at": _utc_now().isoformat(),
        }

        if payload.get("use_ai", True) and settings.GEMINI_API_KEY:
            try:
                import httpx
                model = settings.GEMINI_MODEL or "gemini-3.6-flash"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
                prompt = (
                    f"Evaluate this educational simulated decision using ONLY info available at decision time (never future prices). "
                    f"Return JSON with keys: what_you_did_well, risks_missed, evidence_support, plan_alignment, invalidation_info, practical_lesson. "
                    f"Data: {json.dumps(payload)}"
                )
                resp = httpx.post(
                    url,
                    json={
                        "systemInstruction": {"parts": [{"text": COACH_SYSTEM_INSTRUCTION}]},
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 280, "responseMimeType": "application/json", "thinkingConfig": {"thinkingBudget": 0}},
                    },
                    timeout=12.0,
                )
                if resp.status_code == 200:
                    cands = resp.json().get("candidates") or []
                    if cands:
                        parsed = json.loads(cands[0]["content"]["parts"][0]["text"].strip())
                        required_keys = ("what_you_did_well", "risks_missed", "evidence_support", "plan_alignment", "invalidation_info", "practical_lesson")
                        if isinstance(parsed, dict) and all(isinstance(parsed.get(k), str) and parsed.get(k) for k in required_keys):
                            for k in required_keys:
                                review[k] = parsed[k]
                            review["ai_source"] = "gemini"
            except Exception:
                review["ai_source"] = "deterministic_fallback"
        elif payload.get("use_ai", True):
            review["ai_source"] = "deterministic_fallback"

        return review

    # -------------------------------------------------------------------------
    # CONVERSATION MANAGEMENT & DELETION
    # -------------------------------------------------------------------------
    def list_conversations(self, user_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, created_at, updated_at FROM ai_coach_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 30",
            (user_id,),
        )
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    def get_conversation(self, conversation_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM ai_coach_conversations WHERE id = ?", (conversation_id,))
        conv = cur.fetchone()
        if not conv:
            conn.close()
            raise ValueError("Conversation not found")
        if conv["user_id"] != user_id:
            conn.close()
            raise PermissionError("FORBIDDEN: Conversation belongs to another user")
        cur.execute(
            "SELECT id, role, content, structured_json, created_at FROM ai_coach_messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (conversation_id,),
        )
        msgs = [{**dict(m), "structured": json.loads(m["structured_json"] or "{}")} for m in cur.fetchall()]
        conn.close()
        return {**dict(conv), "messages": msgs}

    def delete_conversation(self, conversation_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM ai_coach_conversations WHERE id = ?", (conversation_id,))
        conv = cur.fetchone()
        if not conv:
            conn.close()
            raise ValueError("Conversation not found")
        if conv["user_id"] != user_id:
            conn.close()
            raise PermissionError("FORBIDDEN: Cannot delete another user's conversation")
        cur.execute("DELETE FROM ai_coach_conversations WHERE id = ?", (conversation_id,))
        conn.commit()
        conn.close()
        return {"deleted": True, "conversation_id": conversation_id}


ai_coach_service = AICoachService()
