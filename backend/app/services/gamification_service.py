import json
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from backend.app.config import settings
from backend.app.database import get_connection
from backend.app.services.bie_service import bie_service

logger = logging.getLogger("mindmark.gamification")

# Configurable Central XP Reward Table
XP_REWARDS: Dict[str, int] = {
    "LESSON_COMPLETE": 50,
    "QUIZ_HIGH_SCORE": 40,
    "MIRROR_CHALLENGE": 60,
    "PERSONALIZED_CHALLENGE": 75,
    "DECISION_REFLECTION": 20,
    "RISK_EXERCISE": 30,
    "DAILY_MISSION": 30,
    "WEEKLY_MISSION": 100,
    "BEHAVIORAL_IMPROVEMENT": 100,
    "ARENA_PARTICIPATE": 25,
    "ARENA_FIRST": 100,
    "ARENA_SECOND": 60,
    "ARENA_THIRD": 40,
}

# 20-Level Progression Titles
LEVEL_TITLES: List[str] = [
    "Beginner",                   # 1
    "Market Explorer",            # 2
    "Finance Learner",            # 3
    "Risk Rookie",                # 4
    "Smart Observer",             # 5
    "Research Apprentice",        # 6
    "Decision Builder",           # 7
    "Strategy Learner",           # 8
    "Portfolio Planner",          # 9
    "Risk Controller",            # 10
    "Market Analyst",             # 11
    "Discipline Seeker",          # 12
    "Research Specialist",        # 13
    "Strategy Architect",         # 14
    "Portfolio Guardian",         # 15
    "Behavioral Analyst",         # 16
    "Market Strategist",          # 17
    "Decision Master",            # 18
    "Financial Intelligence Pro", # 19
    "MINDMARK Elite",             # 20
]


def xp_threshold_for_level(level: int) -> int:
    """Approachable progressive XP curve for levels 1..20."""
    if level <= 1:
        return 0
    l = min(level, 20) - 1
    return 100 * l + 25 * l * (l - 1) // 2


def compute_level_info(total_xp: int) -> Dict[str, Any]:
    xp = max(0, int(total_xp or 0))
    current_level = 1
    for lvl in range(1, 21):
        if xp >= xp_threshold_for_level(lvl):
            current_level = lvl
        else:
            break
    curr_floor = xp_threshold_for_level(current_level)
    next_level = min(20, current_level + 1)
    next_floor = xp_threshold_for_level(next_level)
    if current_level >= 20:
        progress_pct = 100.0
        xp_needed = 0
    else:
        span = max(1, next_floor - curr_floor)
        progress_pct = round(min(100.0, ((xp - curr_floor) / span) * 100.0), 1)
        xp_needed = max(0, next_floor - xp)

    return {
        "current_level": current_level,
        "level_title": LEVEL_TITLES[current_level - 1],
        "total_xp": xp,
        "current_level_xp": curr_floor,
        "next_level": next_level,
        "next_level_title": LEVEL_TITLES[next_level - 1],
        "next_level_xp": next_floor,
        "xp_needed_for_next": xp_needed,
        "progress_pct": progress_pct,
    }


# Six Skill Branches with connected exercises & prerequisites
SKILL_TREE_NODES: List[Dict[str, Any]] = [
    # A. Market Fundamentals
    {"id": "mf-1", "branch": "Market Fundamentals", "name": "Stock Market & Indices (NIFTY/SENSEX)", "description": "Understand equity ownership, NSE/BSE exchanges, and benchmark indices.", "difficulty": "Beginner", "xp_reward": 50, "prerequisites": [], "route": "/academy", "activity_label": "Complete Academy Intro"},
    {"id": "mf-2", "branch": "Market Fundamentals", "name": "Market & Limit Orders", "description": "Master order types, bid-ask spreads, and slippage control.", "difficulty": "Beginner", "xp_reward": 50, "prerequisites": ["mf-1"], "route": "/simulator", "activity_label": "Practice Order Types"},
    {"id": "mf-3", "branch": "Market Fundamentals", "name": "Market Trends & Volatility", "description": "Distinguish normal volatility from structural trend shifts.", "difficulty": "Intermediate", "xp_reward": 60, "prerequisites": ["mf-2"], "route": "/markets/terminal", "activity_label": "Inspect Trend & Volatility"},
    # B. Research Intelligence
    {"id": "ri-1", "branch": "Research Intelligence", "name": "Company Fundamentals & Statements", "description": "Read revenue, operating profit, debt, and cash flow statements.", "difficulty": "Beginner", "xp_reward": 50, "prerequisites": [], "route": "/markets/screener", "activity_label": "Analyze Company Fundamentals"},
    {"id": "ri-2", "branch": "Research Intelligence", "name": "P/E & Valuation Basics", "description": "Compare valuation multiples against sector peers and growth.", "difficulty": "Intermediate", "xp_reward": 55, "prerequisites": ["ri-1"], "route": "/markets/screener", "activity_label": "Screen Valuation Ratios"},
    {"id": "ri-3", "branch": "Research Intelligence", "name": "News Analysis & Fact vs Speculation", "description": "Separate verified exchange filings from social media rumors.", "difficulty": "Intermediate", "xp_reward": 60, "prerequisites": ["ri-2"], "route": "/news-explainer", "activity_label": "Verify Market News"},
    # C. Risk Management
    {"id": "rm-1", "branch": "Risk Management", "name": "Position Sizing & Exposure", "description": "Cap single-stock exposure to protect capital from tail events.", "difficulty": "Beginner", "xp_reward": 50, "prerequisites": [], "route": "/markets/risk", "activity_label": "Run Position Sizing Lab"},
    {"id": "rm-2", "branch": "Risk Management", "name": "Drawdowns & Risk/Reward", "description": "Understand asymmetric loss recovery math and stop-loss rules.", "difficulty": "Intermediate", "xp_reward": 60, "prerequisites": ["rm-1"], "route": "/markets/risk", "activity_label": "Simulate Drawdown Recovery"},
    {"id": "rm-3", "branch": "Risk Management", "name": "Capital Protection Under Stress", "description": "Maintain liquidity buffers during sharp market sell-offs.", "difficulty": "Advanced", "xp_reward": 75, "prerequisites": ["rm-2"], "route": "/mirror-mode", "activity_label": "Complete Panic Decision"},
    # D. Behavioral Discipline
    {"id": "bd-1", "branch": "Behavioral Discipline", "name": "FOMO Awareness", "description": "Recognize viral rally chasing before committing capital.", "difficulty": "Beginner", "xp_reward": 50, "prerequisites": [], "route": "/mirror-mode", "activity_label": "Complete FOMO Trap"},
    {"id": "bd-2", "branch": "Behavioral Discipline", "name": "Loss Response & Overconfidence", "description": "Prevent revenge trading and overconfident sizing after streaks.", "difficulty": "Intermediate", "xp_reward": 60, "prerequisites": ["bd-1"], "route": "/behavioral-insights", "activity_label": "Audit Behavioral Patterns"},
    {"id": "bd-3", "branch": "Behavioral Discipline", "name": "Strategy Consistency & Reflection", "description": "Honor Pre-Decision Contracts and review past decisions.", "difficulty": "Intermediate", "xp_reward": 65, "prerequisites": ["bd-2"], "route": "/behavioral-insights", "activity_label": "Review Decision Fingerprint"},
    # E. Portfolio Construction
    {"id": "pc-1", "branch": "Portfolio Construction", "name": "Asset Allocation & Sector Mix", "description": "Balance equities, ETFs, and cash across uncorrelated sectors.", "difficulty": "Beginner", "xp_reward": 50, "prerequisites": ["rm-1"], "route": "/portfolio", "activity_label": "Inspect Sector Allocation"},
    {"id": "pc-2", "branch": "Portfolio Construction", "name": "Concentration & Correlation", "description": "Detect hidden sector overlap and correlated drawdowns.", "difficulty": "Intermediate", "xp_reward": 60, "prerequisites": ["pc-1"], "route": "/mirror-mode", "activity_label": "Complete Diversification Builder"},
    {"id": "pc-3", "branch": "Portfolio Construction", "name": "Portfolio Rebalancing Concepts", "description": "Rebalance weights systematically back to target risk limits.", "difficulty": "Advanced", "xp_reward": 70, "prerequisites": ["pc-2"], "route": "/arena", "activity_label": "Enter Portfolio Architect"},
    # F. Advanced Decision Making
    {"id": "ad-1", "branch": "Advanced Decision Making", "name": "Scenario & Replay Analysis", "description": "Practice decisions across historical market regimes.", "difficulty": "Intermediate", "xp_reward": 60, "prerequisites": ["ri-2", "rm-2"], "route": "/market-replay", "activity_label": "Run Historical Replay"},
    {"id": "ad-2", "branch": "Advanced Decision Making", "name": "Evidence-Based Reasoning", "description": "Build falsifiable theses with explicit invalidation triggers.", "difficulty": "Advanced", "xp_reward": 75, "prerequisites": ["ad-1", "bd-2"], "route": "/arena", "activity_label": "Compete in Analyst Duel"},
    {"id": "ad-3", "branch": "Advanced Decision Making", "name": "Decision Quality Under Uncertainty", "description": "Sustain high DQS across multi-stage macro shocks.", "difficulty": "Advanced", "xp_reward": 85, "prerequisites": ["ad-2"], "route": "/arena", "activity_label": "Complete Decision Pressure"},
]

BADGE_CATALOG: List[Dict[str, Any]] = [
    # Learning badges
    {"badge_id": "first_lesson", "name": "First Lesson", "description": "Complete your first skill node or learning activity.", "category": "Learning", "unlock_condition": "Complete 1 skill node or lesson", "xp_reward": 25, "rarity": "Common", "icon": "BookOpen"},
    {"badge_id": "quiz_champion", "name": "Quiz Champion", "description": "Demonstrate strong comprehension in learning checks.", "category": "Learning", "unlock_condition": "Complete 3 skill nodes", "xp_reward": 50, "rarity": "Uncommon", "icon": "Award"},
    {"badge_id": "knowledge_explorer", "name": "Knowledge Explorer", "description": "Explore multiple branches of the Investor Skill Tree.", "category": "Learning", "unlock_condition": "Complete skills across 3 branches", "xp_reward": 75, "rarity": "Rare", "icon": "Compass"},
    {"badge_id": "research_detective", "name": "Research Detective", "description": "Master company fundamentals and rumor verification.", "category": "Learning", "unlock_condition": "Complete all Research Intelligence skills", "xp_reward": 100, "rarity": "Epic", "icon": "Search"},
    # Risk-management badges
    {"badge_id": "risk_guardian", "name": "Risk Guardian", "description": "Protect virtual capital with disciplined sizing.", "category": "Risk Management", "unlock_condition": "Complete Risk Management skill rm-1 or score >=85 risk in Arena", "xp_reward": 50, "rarity": "Uncommon", "icon": "ShieldCheck"},
    {"badge_id": "diversification_defender", "name": "Diversification Defender", "description": "Maintain balanced multi-sector exposure.", "category": "Risk Management", "unlock_condition": "Complete Portfolio Construction pc-2", "xp_reward": 60, "rarity": "Rare", "icon": "PieChart"},
    {"badge_id": "capital_protector", "name": "Capital Protector", "description": "Complete advanced capital protection training.", "category": "Risk Management", "unlock_condition": "Complete all Risk Management skills", "xp_reward": 100, "rarity": "Epic", "icon": "Lock"},
    {"badge_id": "crash_survivor", "name": "Crash Survivor", "description": "Navigate simulated drawdowns without panic liquidation.", "category": "Risk Management", "unlock_condition": "Complete Crash Survivor in Arena or Panic Decision in Mirror Mode", "xp_reward": 60, "rarity": "Rare", "icon": "ShieldAlert"},
    # Behavioral badges
    {"badge_id": "fomo_resister", "name": "FOMO Resister", "description": "Resist hype-driven entries and verify fundamentals.", "category": "Behavioral", "unlock_condition": "Complete FOMO Awareness (bd-1)", "xp_reward": 50, "rarity": "Uncommon", "icon": "Eye"},
    {"badge_id": "discipline_builder", "name": "Discipline Builder", "description": "Build consistent decision habits across sessions.", "category": "Behavioral", "unlock_condition": "Complete 5 missions", "xp_reward": 75, "rarity": "Rare", "icon": "Target"},
    {"badge_id": "reflection_master", "name": "Reflection Master", "description": "Submit thoughtful post-decision reflections.", "category": "Behavioral", "unlock_condition": "Complete 3 reflections or Behavioral Discipline bd-3", "xp_reward": 75, "rarity": "Rare", "icon": "MessageSquare"},
    {"badge_id": "consistency_champion", "name": "Consistency Champion", "description": "Follow your declared strategy across changing markets.", "category": "Behavioral", "unlock_condition": "Complete all Behavioral Discipline skills", "xp_reward": 100, "rarity": "Epic", "icon": "CheckCircle2"},
    # Competition badges
    {"badge_id": "arena_debut", "name": "Arena Debut", "description": "Enter your first MINDMARK Arena contest.", "category": "Competition", "unlock_condition": "Complete 1 Arena contest", "xp_reward": 30, "rarity": "Common", "icon": "Swords"},
    {"badge_id": "top_performer", "name": "Top Performer", "description": "Achieve a high Decision Quality Score in Arena.", "category": "Competition", "unlock_condition": "Score >= 85 DQS in an Arena contest", "xp_reward": 75, "rarity": "Rare", "icon": "Trophy"},
    {"badge_id": "analyst_duel_winner", "name": "Analyst Duel Winner", "description": "Win a structured 1v1 Analyst Duel.", "category": "Competition", "unlock_condition": "Win 1 Arena Analyst Duel", "xp_reward": 80, "rarity": "Rare", "icon": "Scale"},
    # Progress badges
    {"badge_id": "seven_day_learner", "name": "Seven-Day Learner", "description": "Maintain a 7-day meaningful learning streak.", "category": "Progress", "unlock_condition": "Reach a 7-day learning streak", "xp_reward": 100, "rarity": "Rare", "icon": "Flame"},
    {"badge_id": "skill_tree_explorer", "name": "Skill Tree Explorer", "description": "Complete at least 6 skills across the Skill Tree.", "category": "Progress", "unlock_condition": "Complete 6 skill nodes", "xp_reward": 100, "rarity": "Epic", "icon": "GitBranch"},
    {"badge_id": "mindmark_elite", "name": "MINDMARK Elite", "description": "Reach Level 20 through disciplined financial learning.", "category": "Progress", "unlock_condition": "Reach Level 20", "xp_reward": 250, "rarity": "Legendary", "icon": "Crown"},
]

SEASONS_CATALOG: List[Dict[str, Any]] = [
    {"id": "2026-S1", "name": "Season 1: Foundations of Investing", "theme": "Market Basics & Order Discipline", "duration": "Q1 2026", "status": "COMPLETED", "milestones": [250, 500, 1000]},
    {"id": "2026-S2", "name": "Season 2: Mastering Risk", "theme": "Position Sizing & Drawdown Control", "duration": "Q2 2026", "status": "COMPLETED", "milestones": [250, 500, 1000]},
    {"id": "2026-S3", "name": "Season 3: Behavioral Discipline", "theme": "FOMO Resistance & Loss Response", "duration": "Q3 2026", "status": "COMPLETED", "milestones": [250, 500, 1000]},
    {"id": "2026-S4", "name": "Season 4: Portfolio Intelligence", "theme": "Multi-Sector Diversification & Evidence", "duration": "Q4 2026", "status": "ACTIVE", "milestones": [150, 400, 800, 1500]},
]
ACTIVE_SEASON_ID = "2026-S4"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class GamificationService:
    # -------------------------------------------------------------------------
    # CENTRAL IDEMPOTENT XP ENGINE
    # -------------------------------------------------------------------------
    def award_xp(
        self,
        user_id: str,
        idempotency_key: str,
        activity_type: str,
        reward_name: str,
        xp_amount: int,
        source_id: Optional[str] = None,
        counts_for_streak: bool = False,
        counts_for_season: bool = True,
    ) -> Dict[str, Any]:
        if xp_amount < 0:
            raise ValueError("XP amount cannot be negative")

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM gamification_xp_transactions WHERE idempotency_key = ?", (idempotency_key,))
        if cur.fetchone():
            cur.execute("SELECT total_learning_xp FROM users WHERE id = ?", (user_id,))
            u = cur.fetchone()
            conn.close()
            return {"awarded": False, "duplicate": True, "xp_awarded": 0, "level_info": compute_level_info(u["total_learning_xp"] if u else 0)}

        now_iso = _utc_now().isoformat()
        tx_id = f"xptx_{uuid.uuid4().hex[:12]}"
        cur.execute(
            """
            INSERT INTO gamification_xp_transactions (
                id, idempotency_key, user_id, activity_type, source_id, reward_name, xp_amount, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
            """,
            (tx_id, idempotency_key, user_id, activity_type, source_id, reward_name, xp_amount, now_iso),
        )

        cur.execute("SELECT total_learning_xp FROM users WHERE id = ?", (user_id,))
        u_before = cur.fetchone()
        old_xp = u_before["total_learning_xp"] if u_before else 0
        old_level = compute_level_info(old_xp)["current_level"]
        new_xp = old_xp + xp_amount
        lvl_info = compute_level_info(new_xp)
        tier = 4 if new_xp >= 1200 else 3 if new_xp >= 650 else 2

        cur.execute(
            "UPDATE users SET total_learning_xp = ?, current_tier_level = ? WHERE id = ?",
            (new_xp, tier, user_id),
        )

        if counts_for_season:
            cur.execute(
                "SELECT id, season_xp FROM gamification_season_progress WHERE user_id = ? AND season_id = ?",
                (user_id, ACTIVE_SEASON_ID),
            )
            sp = cur.fetchone()
            if not sp:
                cur.execute(
                    """
                    INSERT INTO gamification_season_progress (id, user_id, season_id, season_xp, completed_milestones_json, updated_at)
                    VALUES (?, ?, ?, ?, '[]', ?)
                    """,
                    (f"sp_{uuid.uuid4().hex[:10]}", user_id, ACTIVE_SEASON_ID, xp_amount, now_iso),
                )
            else:
                cur.execute(
                    "UPDATE gamification_season_progress SET season_xp = season_xp + ?, updated_at = ? WHERE id = ?",
                    (xp_amount, now_iso, sp["id"]),
                )

        conn.commit()
        conn.close()

        streak_info = None
        if counts_for_streak:
            streak_info = self.record_learning_activity(user_id, activity_type)

        newly_unlocked = self.evaluate_badges(user_id)
        return {
            "awarded": True,
            "duplicate": False,
            "transaction_id": tx_id,
            "xp_awarded": xp_amount,
            "leveled_up": lvl_info["current_level"] > old_level,
            "level_info": lvl_info,
            "streak": streak_info,
            "newly_unlocked_badges": newly_unlocked,
        }

    # -------------------------------------------------------------------------
    # STREAK SYSTEM (UTC DATE DEDUPLICATED, NO TRADING REQUIRED)
    # -------------------------------------------------------------------------
    def record_learning_activity(self, user_id: str, activity_type: str, activity_date: Optional[str] = None) -> Dict[str, Any]:
        # Never count opening app or trading as meaningful learning
        if activity_type.upper() in ("APP_OPEN", "TRADE_EXECUTED"):
            return self.get_streak(user_id)

        today_str = activity_date or _utc_now().date().isoformat()
        now_iso = _utc_now().isoformat()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM gamification_streak_logs WHERE user_id = ? AND activity_date = ?",
            (user_id, today_str),
        )
        if not cur.fetchone():
            cur.execute(
                """
                INSERT INTO gamification_streak_logs (id, user_id, activity_date, activity_type, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (f"strk_{uuid.uuid4().hex[:10]}", user_id, today_str, activity_type, now_iso),
            )
            conn.commit()

        # Recompute current & longest streak from sorted distinct dates
        cur.execute("SELECT activity_date FROM gamification_streak_logs WHERE user_id = ? ORDER BY activity_date ASC", (user_id,))
        dates = [datetime.strptime(r["activity_date"], "%Y-%m-%d").date() for r in cur.fetchall()]
        longest, run = 0, 0
        prev = None
        for d in dates:
            if prev is None or (d - prev).days == 1:
                run += 1
            elif (d - prev).days > 1:
                run = 1
            longest = max(longest, run)
            prev = d

        utc_today = _utc_now().date()
        current = run if dates and (utc_today - dates[-1]).days <= 1 else 0

        cur.execute(
            """
            INSERT INTO gamification_user_streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                current_streak = excluded.current_streak,
                longest_streak = MAX(gamification_user_streaks.longest_streak, excluded.longest_streak),
                last_activity_date = excluded.last_activity_date,
                updated_at = excluded.updated_at
            """,
            (user_id, current, longest, dates[-1].isoformat() if dates else None, now_iso),
        )
        cur.execute("UPDATE users SET learning_streak_days = ? WHERE id = ?", (current, user_id))
        conn.commit()
        conn.close()
        return self.get_streak(user_id)

    def get_streak(self, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM gamification_user_streaks WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        utc_today = _utc_now().date()
        week_dates = [(utc_today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
        cur.execute("SELECT activity_date FROM gamification_streak_logs WHERE user_id = ? AND activity_date >= ?", (user_id, week_dates[0]))
        active_dates = {r["activity_date"] for r in cur.fetchall()}
        conn.close()

        return {
            "current_streak": row["current_streak"] if row else 0,
            "longest_streak": row["longest_streak"] if row else 0,
            "last_activity_date": row["last_activity_date"] if row else None,
            "completed_today": utc_today.isoformat() in active_dates,
            "timezone_policy": "UTC",
            "weekly_calendar": [{"date": d, "completed": d in active_dates} for d in week_dates],
        }

    # -------------------------------------------------------------------------
    # SKILL TREE (6 BRANCHES + PREREQUISITE ENFORCEMENT)
    # -------------------------------------------------------------------------
    def get_skill_tree(self, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT skill_id, completed_at FROM gamification_skill_completions WHERE user_id = ?", (user_id,))
        completed_map = {r["skill_id"]: r["completed_at"] for r in cur.fetchall()}
        conn.close()

        branches: Dict[str, List[Dict[str, Any]]] = {}
        recommended_next = None
        for node in SKILL_TREE_NODES:
            is_done = node["id"] in completed_map
            prereqs_met = all(p in completed_map for p in node["prerequisites"])
            status = "COMPLETED" if is_done else ("UNLOCKED" if prereqs_met else "LOCKED")
            enriched = {
                **node,
                "status": status,
                "completed_at": completed_map.get(node["id"]),
            }
            if status == "UNLOCKED" and recommended_next is None:
                recommended_next = enriched
            branches.setdefault(node["branch"], []).append(enriched)

        return {
            "total_skills": len(SKILL_TREE_NODES),
            "completed_count": len(completed_map),
            "recommended_next_skill": recommended_next,
            "branches": [{"branch": k, "skills": v} for k, v in branches.items()],
        }

    def complete_skill(self, user_id: str, skill_id: str, exercise_answer: Optional[str] = None) -> Dict[str, Any]:
        node = next((n for n in SKILL_TREE_NODES if n["id"] == skill_id), None)
        if not node:
            raise ValueError("Skill node not found")

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT skill_id FROM gamification_skill_completions WHERE user_id = ?", (user_id,))
        done_ids = {r["skill_id"] for r in cur.fetchall()}

        if skill_id in done_ids:
            conn.close()
            raise PermissionError("DUPLICATE_SKILL: Skill already completed.")

        missing = [p for p in node["prerequisites"] if p not in done_ids]
        if missing:
            conn.close()
            raise ValueError(f"Prerequisites not completed: {', '.join(missing)}")

        now_iso = _utc_now().isoformat()
        cur.execute(
            """
            INSERT INTO gamification_skill_completions (id, user_id, skill_id, branch, xp_awarded, completed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (f"sk_{uuid.uuid4().hex[:10]}", user_id, skill_id, node["branch"], node["xp_reward"], now_iso),
        )
        conn.commit()
        conn.close()

        xp_res = self.award_xp(
            user_id=user_id,
            idempotency_key=f"skill:{user_id}:{skill_id}",
            activity_type="SKILL_COMPLETE",
            reward_name=f"Skill Unlocked: {node['name']}",
            xp_amount=node["xp_reward"],
            source_id=skill_id,
            counts_for_streak=True,
        )
        return {"skill_id": skill_id, "skill_name": node["name"], **xp_res}

    # -------------------------------------------------------------------------
    # DAILY & WEEKLY MISSIONS (PERSONALIZED + NON-PUNITIVE)
    # -------------------------------------------------------------------------
    def _ensure_missions(self, user_id: str) -> None:
        now = _utc_now()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM gamification_missions WHERE user_id = ? AND expires_at > ?",
            (user_id, now.isoformat()),
        )
        existing = cur.fetchall()
        has_daily = any(r["mission_type"] == "DAILY" for r in existing)
        has_weekly = any(r["mission_type"] == "WEEKLY" for r in existing)

        # Personalized evidence check from Phase 1/2
        personalized_mission = None
        try:
            bie = bie_service.get_full_profile(user_id)
            if (bie.get("events_count") or 0) >= 3:
                for p in bie.get("patterns", []):
                    if p.get("detected"):
                        pk = (p.get("pattern_key") or "").lower()
                        if "fomo" in pk:
                            personalized_mission = ("pers_fomo", "Complete a FOMO Resistance Check", "Review valuation & NSE filings before entering any breakout.", "Your Phase 1 activity showed FOMO chasing patterns.")
                            break
                        if "concentration" in pk or "diversification" in pk:
                            personalized_mission = ("pers_div", "Complete Portfolio Diversification Exercise", "Practice capping single-stock weights under 25%.", "Your Behavioral Insights flagged high concentration.")
                            break
                        if "panic" in pk:
                            personalized_mission = ("pers_risk", "Review Drawdown & Position Sizing Rules", "Complete a position-sizing risk exercise.", "Your Phase 1 history showed emotional drawdown exits.")
                            break
        except Exception:
            pass

        if not has_daily:
            exp_daily = (now + timedelta(hours=24)).isoformat()
            daily_pool = [
                ("daily_fund", "Complete One Market Fundamentals Lesson", "Study NIFTY/SENSEX basics or complete a Skill Tree node.", "Beginner", XP_REWARDS["DAILY_MISSION"], 0, None),
                ("daily_risk", "Complete a Risk-Awareness Exercise", "Calculate safe position sizing in the Risk Lab.", "Intermediate", XP_REWARDS["DAILY_MISSION"], 0, None),
            ]
            if personalized_mission:
                mk, title, desc, reason = personalized_mission
                daily_pool[1] = (mk, title, desc, "Intermediate", XP_REWARDS["DAILY_MISSION"] + 10, 1, reason)

            for mk, title, desc, diff, xp_r, is_p, reason in daily_pool:
                cur.execute(
                    """
                    INSERT INTO gamification_missions (
                        id, user_id, mission_key, title, description, mission_type,
                        difficulty, xp_reward, status, is_personalized, evidence_reason,
                        progress_current, progress_target, expires_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'DAILY', ?, ?, 'ACTIVE', ?, ?, 0, 1, ?, ?)
                    """,
                    (f"mis_{uuid.uuid4().hex[:10]}", user_id, mk, title, desc, diff, xp_r, is_p, reason, exp_daily, now.isoformat()),
                )

        if not has_weekly:
            exp_weekly = (now + timedelta(days=7)).isoformat()
            weekly_pool = [
                ("weekly_mirror", "Finish Two Mirror Mode Challenges", "Practice calm decision-making across simulated market scenarios.", "Intermediate", XP_REWARDS["WEEKLY_MISSION"]),
                ("weekly_reflect", "Complete Weekly Decision Reflection", "Review past simulator decisions and document key lessons.", "Beginner", XP_REWARDS["WEEKLY_MISSION"]),
            ]
            for mk, title, desc, diff, xp_r in weekly_pool:
                cur.execute(
                    """
                    INSERT INTO gamification_missions (
                        id, user_id, mission_key, title, description, mission_type,
                        difficulty, xp_reward, status, is_personalized, evidence_reason,
                        progress_current, progress_target, expires_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'WEEKLY', ?, ?, 'ACTIVE', 0, NULL, 0, 1, ?, ?)
                    """,
                    (f"mis_{uuid.uuid4().hex[:10]}", user_id, mk, title, desc, diff, xp_r, exp_weekly, now.isoformat()),
                )

        conn.commit()
        conn.close()

    def get_missions(self, user_id: str) -> Dict[str, Any]:
        self._ensure_missions(user_id)
        now_iso = _utc_now().isoformat()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM gamification_missions WHERE user_id = ? AND expires_at > ? ORDER BY mission_type ASC, created_at DESC",
            (user_id, now_iso),
        )
        rows = cur.fetchall()
        conn.close()

        items = [
            {
                "id": r["id"],
                "mission_key": r["mission_key"],
                "title": r["title"],
                "description": r["description"],
                "mission_type": r["mission_type"],
                "difficulty": r["difficulty"],
                "xp_reward": r["xp_reward"],
                "status": r["status"],
                "is_personalized": bool(r["is_personalized"]),
                "evidence_reason": r["evidence_reason"],
                "progress_current": r["progress_current"],
                "progress_target": r["progress_target"],
                "expires_at": r["expires_at"],
                "completed_at": r["completed_at"],
            }
            for r in rows
            if r["status"] != "DISMISSED"
        ]
        return {
            "server_now": now_iso,
            "daily_missions": [m for m in items if m["mission_type"] == "DAILY"],
            "weekly_missions": [m for m in items if m["mission_type"] == "WEEKLY"],
        }

    def complete_mission(self, user_id: str, mission_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM gamification_missions WHERE id = ?", (mission_id,))
        m = cur.fetchone()
        if not m:
            conn.close()
            raise ValueError("Mission not found")
        if m["user_id"] != user_id:
            conn.close()
            raise PermissionError("FORBIDDEN: Mission belongs to another user")
        if m["status"] == "COMPLETED":
            conn.close()
            raise PermissionError("DUPLICATE_MISSION: Mission already completed")
        if m["expires_at"] < _utc_now().isoformat():
            conn.close()
            raise ValueError("Mission has expired")

        now_iso = _utc_now().isoformat()
        cur.execute(
            "UPDATE gamification_missions SET status = 'COMPLETED', progress_current = progress_target, completed_at = ? WHERE id = ?",
            (now_iso, mission_id),
        )
        conn.commit()
        conn.close()

        xp_res = self.award_xp(
            user_id=user_id,
            idempotency_key=f"mission:{user_id}:{mission_id}",
            activity_type=f"{m['mission_type']}_MISSION",
            reward_name=f"Mission Complete: {m['title']}",
            xp_amount=m["xp_reward"],
            source_id=mission_id,
            counts_for_streak=True,
        )
        return {"mission_id": mission_id, "status": "COMPLETED", **xp_res}

    def update_mission_status(self, user_id: str, mission_id: str, new_status: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM gamification_missions WHERE id = ?", (mission_id,))
        m = cur.fetchone()
        if not m:
            conn.close()
            raise ValueError("Mission not found")
        if m["user_id"] != user_id:
            conn.close()
            raise PermissionError("FORBIDDEN")
        cur.execute("UPDATE gamification_missions SET status = ? WHERE id = ?", (new_status, mission_id))
        conn.commit()
        conn.close()
        return {"mission_id": mission_id, "status": new_status}

    # -------------------------------------------------------------------------
    # BADGE ENGINE (VERIFIABLE & DUPLICATE-PROOF)
    # -------------------------------------------------------------------------
    def evaluate_badges(self, user_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT badge_id FROM gamification_badges WHERE user_id = ?", (user_id,))
        owned = {r["badge_id"] for r in cur.fetchall()}

        cur.execute("SELECT skill_id, branch FROM gamification_skill_completions WHERE user_id = ?", (user_id,))
        skill_rows = cur.fetchall()
        done_skills = {r["skill_id"] for r in skill_rows}
        done_branches = {r["branch"] for r in skill_rows}

        cur.execute("SELECT COUNT(*) FROM gamification_missions WHERE user_id = ? AND status = 'COMPLETED'", (user_id,))
        missions_done = cur.fetchone()[0]

        cur.execute("SELECT longest_streak FROM gamification_user_streaks WHERE user_id = ?", (user_id,))
        s_row = cur.fetchone()
        longest_streak = s_row["longest_streak"] if s_row else 0

        cur.execute("SELECT total_learning_xp FROM users WHERE id = ?", (user_id,))
        u_row = cur.fetchone()
        level = compute_level_info(u_row["total_learning_xp"] if u_row else 0)["current_level"]

        cur.execute("SELECT COUNT(*), COALESCE(MAX(total_score), 0) FROM arena_entries WHERE user_id = ?", (user_id,))
        a_row = cur.fetchone()
        arena_cnt, arena_max = a_row[0], a_row[1]

        cur.execute("SELECT COUNT(*) FROM arena_duels WHERE winner_id = ?", (user_id,))
        duels_won = cur.fetchone()[0]

        conditions = {
            "first_lesson": len(done_skills) >= 1,
            "quiz_champion": len(done_skills) >= 3,
            "knowledge_explorer": len(done_branches) >= 3,
            "research_detective": {"ri-1", "ri-2", "ri-3"}.issubset(done_skills),
            "risk_guardian": "rm-1" in done_skills,
            "diversification_defender": "pc-2" in done_skills,
            "capital_protector": {"rm-1", "rm-2", "rm-3"}.issubset(done_skills),
            "crash_survivor": "rm-3" in done_skills,
            "fomo_resister": "bd-1" in done_skills,
            "discipline_builder": missions_done >= 5,
            "reflection_master": "bd-3" in done_skills,
            "consistency_champion": {"bd-1", "bd-2", "bd-3"}.issubset(done_skills),
            "arena_debut": arena_cnt >= 1,
            "top_performer": arena_max >= 85,
            "analyst_duel_winner": duels_won >= 1,
            "seven_day_learner": longest_streak >= 7,
            "skill_tree_explorer": len(done_skills) >= 6,
            "mindmark_elite": level >= 20,
        }

        unlocked_now = []
        now_iso = _utc_now().isoformat()
        for b in BADGE_CATALOG:
            bid = b["badge_id"]
            if bid not in owned and conditions.get(bid, False):
                cur.execute(
                    """
                    INSERT OR IGNORE INTO gamification_badges (
                        id, user_id, badge_id, name, description, category, rarity, icon, xp_reward, unlocked_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (f"bg_{uuid.uuid4().hex[:10]}", user_id, bid, b["name"], b["description"], b["category"], b["rarity"], b["icon"], b["xp_reward"], now_iso),
                )
                unlocked_now.append({**b, "unlocked": True, "date_unlocked": now_iso})

        conn.commit()
        conn.close()
        return unlocked_now

    def get_badges(self, user_id: str) -> Dict[str, Any]:
        self.evaluate_badges(user_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT badge_id, unlocked_at FROM gamification_badges WHERE user_id = ?", (user_id,))
        owned_map = {r["badge_id"]: r["unlocked_at"] for r in cur.fetchall()}
        conn.close()

        badges = [
            {
                **b,
                "unlocked": b["badge_id"] in owned_map,
                "date_unlocked": owned_map.get(b["badge_id"]),
            }
            for b in BADGE_CATALOG
        ]
        return {
            "unlocked_count": len(owned_map),
            "total_count": len(BADGE_CATALOG),
            "badges": badges,
        }

    # -------------------------------------------------------------------------
    # SEASONS & REWARD HISTORY & AI SUMMARY
    # -------------------------------------------------------------------------
    def get_seasons(self, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM gamification_season_progress WHERE user_id = ? AND season_id = ?", (user_id, ACTIVE_SEASON_ID))
        sp = cur.fetchone()
        conn.close()
        season_xp = sp["season_xp"] if sp else 0
        return {
            "active_season_id": ACTIVE_SEASON_ID,
            "active_season_xp": season_xp,
            "reset_policy": "Season resets only reset seasonal XP counters. Permanent XP, Levels, Badges, and Completed Skills are never deleted.",
            "seasons": [
                {**s, "user_season_xp": season_xp if s["id"] == ACTIVE_SEASON_ID else 0}
                for s in SEASONS_CATALOG
            ],
        }

    def get_xp_history(self, user_id: str, page: int = 1, limit: int = 25) -> Dict[str, Any]:
        offset = max(0, (page - 1) * limit)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM gamification_xp_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (user_id, limit, offset),
        )
        rows = cur.fetchall()
        cur.execute("SELECT COUNT(*) FROM gamification_xp_transactions WHERE user_id = ?", (user_id,))
        total = cur.fetchone()[0]
        conn.close()
        return {
            "page": page,
            "limit": limit,
            "total": total,
            "transactions": [
                {
                    "transaction_id": r["id"],
                    "activity_type": r["activity_type"],
                    "reward_name": r["reward_name"],
                    "xp_amount": r["xp_amount"],
                    "status": r["status"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ],
        }

    @staticmethod
    def _generate_progress_summary(level_info: Dict[str, Any], skills_done: int, next_skill: Optional[Dict[str, Any]], use_ai: bool = True) -> tuple[str, str]:
        rec_name = next_skill["name"] if next_skill else "MINDMARK Arena Contests"
        deterministic = (
            f"You are Level {level_info['current_level']} ({level_info['level_title']}) with {level_info['total_xp']} XP "
            f"and {skills_done} completed skills. Recommended next step: {rec_name}."
        )
        if not use_ai or not settings.GEMINI_API_KEY:
            return deterministic, "deterministic_backend"
        try:
            import httpx
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
            prompt = (
                f"In 2 encouraging sentences, summarize a student's financial learning progress: "
                f"Level {level_info['current_level']} ({level_info['level_title']}), {level_info['total_xp']} XP, "
                f"{skills_done} skills completed. Suggest '{rec_name}' next. Do not invent XP or give trading advice."
            )
            resp = httpx.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.4, "maxOutputTokens": 110, "thinkingConfig": {"thinkingBudget": 0}}},
                timeout=8.0,
            )
            if resp.status_code == 200:
                cands = resp.json().get("candidates") or []
                if cands:
                    txt = cands[0]["content"]["parts"][0]["text"].strip()
                    if txt:
                        return txt, "gemini"
        except Exception:
            pass
        return deterministic, "deterministic_fallback"

    def get_profile(self, user_id: str, use_ai: bool = True) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT total_learning_xp, full_name FROM users WHERE id = ?", (user_id,))
        u = cur.fetchone()
        conn.close()

        total_xp = u["total_learning_xp"] if u else 0
        level_info = compute_level_info(total_xp)
        skill_tree = self.get_skill_tree(user_id)
        missions = self.get_missions(user_id)
        badges = self.get_badges(user_id)
        streak = self.get_streak(user_id)
        seasons = self.get_seasons(user_id)
        history = self.get_xp_history(user_id, page=1, limit=10)
        summary, ai_source = self._generate_progress_summary(
            level_info, skill_tree["completed_count"], skill_tree["recommended_next_skill"], use_ai=use_ai
        )

        return {
            "user_id": user_id,
            "full_name": u["full_name"] if u else "Learner",
            "level_info": level_info,
            "xp_rewards_config": XP_REWARDS,
            "skill_tree": skill_tree,
            "missions": missions,
            "badges": badges,
            "streak": streak,
            "seasons": seasons,
            "recent_rewards": history["transactions"],
            "coach_summary": summary,
            "ai_source": ai_source,
        }


gamification_service = GamificationService()
