import json
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from backend.app.config import settings
from backend.app.database import get_connection
from backend.app.services.bie_service import bie_service

logger = logging.getLogger("mindmark.arena")

ARENA_RUBRIC_VERSION = "v1.0-arena"
CURRENT_SEASON_ID = "2026-S4"

# Four competitive leagues (Bronze, Silver, Gold, Diamond)
LEAGUE_THRESHOLDS = [
    ("Diamond", 1400),
    ("Gold", 700),
    ("Silver", 300),
    ("Bronze", 0),
]

LEAGUE_RULES = {
    "leagues": [
        {"name": "Bronze", "min_points": 0, "min_contests": 0},
        {"name": "Silver", "min_points": 300, "min_contests": 2},
        {"name": "Gold", "min_points": 700, "min_contests": 4},
        {"name": "Diamond", "min_points": 1400, "min_contests": 6},
    ],
    "promotion_rule": "Earn Arena Points from official contests based on Decision Quality Score (DQS) and meet minimum contest participation.",
    "demotion_rule": "Season resets adjust high-tier points softly at season end. Users are NEVER demoted for choosing not to trade in the simulator.",
    "tie_break_rule": "Ties are broken by: (1) Total DQS DESC, (2) Risk Management Score DESC, (3) Strategy Consistency Score DESC, (4) Earlier submission timestamp ASC.",
}

MIRROR_CHALLENGE_MAP = {
    "CRASH_SURVIVOR": "panic-decision",
    "FOMO_TRAP": "fomo-trap",
    "PORTFOLIO_ARCHITECT": "diversification-builder",
    "DECISION_PRESSURE": "loss-recovery",
    "ANALYST_DUEL": "overconfidence-check",
    "BIAS_BUSTER": "strategy-consistency",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _compute_league(points: int) -> str:
    for name, threshold in LEAGUE_THRESHOLDS:
        if points >= threshold:
            return name
    return "Bronze"


def _build_seed_contests() -> List[Dict[str, Any]]:
    now = _utc_now()
    return [
        {
            "id": "arena-crash-survivor-1",
            "contest_type": "CRASH_SURVIVOR",
            "title": "Crash Survivor: Monsoon Liquidity Shock",
            "description": "Manage a ₹10,00,000 virtual portfolio across a 2-stage simulated market drawdown where new macro and earnings facts emerge each stage.",
            "difficulty": "Intermediate",
            "status": "ACTIVE",
            "starts_at": (now - timedelta(hours=6)).isoformat(),
            "ends_at": (now + timedelta(days=5)).isoformat(),
            "duration_minutes": 12,
            "time_window_sec": 300,
            "league_scope": "GLOBAL",
            "university_name": None,
            "rubric_version": ARENA_RUBRIC_VERSION,
            "scenario_version": "v1.0",
            "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
            "scenario": {
                "starting_portfolio_value": 1000000.0,
                "starting_cash": 350000.0,
                "holdings": [
                    {"symbol": "HDFCBANK", "sector": "Banking", "weight_pct": 25},
                    {"symbol": "TCS", "sector": "IT", "weight_pct": 20},
                    {"symbol": "RELIANCE", "sector": "Energy", "weight_pct": 20},
                ],
                "stages": [
                    {
                        "stage_index": 0,
                        "headline": "Stage 1: NIFTY drops -4.8% on global bond yield spike",
                        "summary": "All three equity holdings decline 4-5% intraday. No company-specific earnings warning has been filed.",
                        "portfolio_value": 968800.0,
                        "info_panels": [
                            {"id": "macro_note", "title": "Macro Bond Note", "content": "US 10Y yields jumped 14 bps; FIIs sold index futures. Domestic PMI remains expansionary at 57.2."},
                            {"id": "fundamentals", "title": "Holdings Health Check", "content": "HDFCBANK, TCS, and RELIANCE show unchanged FY guidance and healthy cash reserves."},
                        ],
                        "permitted_actions": ["HOLD", "REDUCE", "RESEARCH_MORE", "SELL_ALL"],
                    },
                    {
                        "stage_index": 1,
                        "headline": "Stage 2: Volatility persists (-2.0%), TCS announces ₹18,000 Cr buyback",
                        "summary": "Market sentiment remains nervous, but TCS board approves a buyback and HDFCBANK reiterates 14% deposit growth.",
                        "portfolio_value": 958000.0,
                        "info_panels": [
                            {"id": "buyback_filing", "title": "NSE Corporate Filing", "content": "TCS board approves buyback at 15% premium to spot; order book remains resilient."},
                            {"id": "risk_rules", "title": "Position Sizing Guardrail", "content": "Cash buffer is 35% of portfolio; max single-stock cap is 25%."},
                        ],
                        "permitted_actions": ["HOLD", "REBALANCE", "BUY_MODEST", "SELL_ALL"],
                    },
                ],
            },
        },
        {
            "id": "arena-fomo-trap-1",
            "contest_type": "FOMO_TRAP",
            "title": "FOMO Trap: Viral Mid-Cap Breakout",
            "description": "A simulated mid-cap stock rallies +11.2% on social media hype. Evaluate valuation, filings, and risk before deciding whether to act or wait.",
            "difficulty": "Beginner",
            "status": "ACTIVE",
            "starts_at": (now - timedelta(hours=3)).isoformat(),
            "ends_at": (now + timedelta(days=6)).isoformat(),
            "duration_minutes": 8,
            "time_window_sec": 240,
            "league_scope": "GLOBAL",
            "university_name": None,
            "rubric_version": ARENA_RUBRIC_VERSION,
            "scenario_version": "v1.0",
            "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
            "scenario": {
                "asset_symbol": "NOVAIND",
                "recent_move_pct": 11.2,
                "info_panels": [
                    {"id": "valuation", "title": "Valuation & Margins", "content": "P/E expanded to 96x vs sector median 29x. Operating margin fell 190 bps YoY."},
                    {"id": "exchange_check", "title": "NSE Rumor Verification", "content": "Volume is 4.8x 20-day average on unverified takeover chatter. No exchange filing exists."},
                    {"id": "risk_note", "title": "Liquidity & Slippage Note", "content": "Bid-ask spread widened 3x; promoter pledge stands at 24%."},
                ],
                "permitted_actions": ["WAIT", "RESEARCH_MORE", "BUY_SMALL", "BUY_LARGE"],
            },
        },
        {
            "id": "arena-portfolio-architect-1",
            "contest_type": "PORTFOLIO_ARCHITECT",
            "title": "Portfolio Architect: ₹10L Balanced Allocation",
            "description": "Allocate ₹10,00,000 across 6 simulated Indian assets. Ranked on diversification, concentration discipline, risk balance, and reasoning — never return alone.",
            "difficulty": "Intermediate",
            "status": "ACTIVE",
            "starts_at": (now - timedelta(hours=12)).isoformat(),
            "ends_at": (now + timedelta(days=7)).isoformat(),
            "duration_minutes": 10,
            "time_window_sec": 300,
            "league_scope": "UNIVERSITY",
            "university_name": "National University League",
            "rubric_version": ARENA_RUBRIC_VERSION,
            "scenario_version": "v1.0",
            "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
            "scenario": {
                "capital": 1000000.0,
                "assets": [
                    {"symbol": "TCS", "sector": "IT", "volatility": "Medium", "beta": 0.92},
                    {"symbol": "HDFCBANK", "sector": "Banking", "volatility": "Medium", "beta": 1.04},
                    {"symbol": "SUNPHARMA", "sector": "Pharma", "volatility": "Low", "beta": 0.72},
                    {"symbol": "ITC", "sector": "FMCG", "volatility": "Low", "beta": 0.68},
                    {"symbol": "NIFTYBEES", "sector": "Index ETF", "volatility": "Low", "beta": 1.00},
                    {"symbol": "SMALLCAPX", "sector": "High-Beta Smallcap", "volatility": "Very High", "beta": 1.95},
                ],
                "info_panels": [
                    {"id": "sector_cap", "title": "Diversification Guideline", "content": "Healthy portfolios cap single-stock weight <= 25-30% and span at least 4 sectors."},
                    {"id": "beta_note", "title": "Volatility & Beta Mix", "content": "Concentrating >40% in high-beta small-caps amplifies drawdown risk."},
                ],
            },
        },
        {
            "id": "arena-decision-pressure-1",
            "contest_type": "DECISION_PRESSURE",
            "title": "Decision Under Pressure: RBI Policy Surprise",
            "description": "Respond to a 2-stage simulated RBI rate surprise within a 180-second window. Decision quality and plan consistency outweigh raw speed.",
            "difficulty": "Advanced",
            "status": "ACTIVE",
            "starts_at": (now - timedelta(hours=2)).isoformat(),
            "ends_at": (now + timedelta(days=4)).isoformat(),
            "duration_minutes": 6,
            "time_window_sec": 180,
            "league_scope": "GLOBAL",
            "university_name": None,
            "rubric_version": ARENA_RUBRIC_VERSION,
            "scenario_version": "v1.0",
            "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
            "scenario": {
                "stages": [
                    {
                        "stage_index": 0,
                        "headline": "Stage 1: RBI unexpectedly hikes repo rate +25 bps",
                        "summary": "Rate-sensitive NBFCs and realty drop -3.5% in 10 minutes; 10Y G-Sec yields spike.",
                        "info_panels": [
                            {"id": "policy_text", "title": "MPC Statement", "content": "MPC cites temporary food inflation and keeps stance 'withdrawal of accommodation'."},
                            {"id": "exposure_check", "title": "Rate Sensitivity", "content": "High-debt realty faces higher borrowing cost; cash-rich IT/FMCG remain insulated."},
                        ],
                        "permitted_actions": ["HOLD", "REDUCE_RATE_SENSITIVE", "RESEARCH_MORE", "PANIC_SELL_ALL"],
                    },
                    {
                        "stage_index": 1,
                        "headline": "Stage 2: Governor clarifies hike is precautionary; banks stabilize",
                        "summary": "Core inflation remains anchored at 4.1%. Quality private banks recover half their intraday dip.",
                        "info_panels": [
                            {"id": "core_cpi", "title": "Core CPI Breakdown", "content": "Core inflation down 20 bps MoM; NIM guidance for large banks intact."},
                        ],
                        "permitted_actions": ["HOLD", "REBALANCE", "WAIT_FOR_CLOSE", "PANIC_SELL_ALL"],
                    },
                ],
            },
        },
        {
            "id": "arena-analyst-duel-1",
            "contest_type": "ANALYST_DUEL",
            "title": "Analyst Duel: EV Transition Auto Giant Case",
            "description": "Submit a structured bull/bear thesis with supporting evidence and explicit risk factors. Scored against a fixed rubric in a 1v1 duel.",
            "difficulty": "Intermediate",
            "status": "ACTIVE",
            "starts_at": (now - timedelta(hours=4)).isoformat(),
            "ends_at": (now + timedelta(days=7)).isoformat(),
            "duration_minutes": 10,
            "time_window_sec": 420,
            "league_scope": "GLOBAL",
            "university_name": None,
            "rubric_version": ARENA_RUBRIC_VERSION,
            "scenario_version": "v1.0",
            "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
            "scenario": {
                "case_title": "BHARATMOTORS Ltd. — Margin vs EV Capex Tradeoff",
                "case_facts": [
                    "Revenue grew 14% YoY, driven by SUV volume (+19%).",
                    "EV segment still posts -6% EBITDA margin due to ₹4,200 Cr battery capex.",
                    "Net debt/equity stands at 0.35x; free cash flow turned slightly negative this quarter.",
                    "Stock trades at 22x forward earnings vs 5-year average of 18x.",
                ],
            },
        },
        {
            "id": "arena-bias-buster-1",
            "contest_type": "BIAS_BUSTER",
            "title": "Bias Buster: Spot the Behavioral Trap",
            "description": "Diagnose the cognitive bias embedded in a trader's decision log and propose a concrete risk-management guardrail.",
            "difficulty": "Beginner",
            "status": "ACTIVE",
            "starts_at": (now - timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(days=6)).isoformat(),
            "duration_minutes": 7,
            "time_window_sec": 240,
            "league_scope": "GLOBAL",
            "university_name": None,
            "rubric_version": ARENA_RUBRIC_VERSION,
            "scenario_version": "v1.0",
            "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
            "scenario": {
                "vignette": "After losing ₹12,000 on a momentum trade in a mid-cap metal stock, Rohan immediately doubles his position size on a different high-beta stock without checking earnings or stop-loss levels, writing: 'I must make back my ₹12,000 before market close today.'",
                "bias_options": [
                    "Loss Chasing (Revenge Trading)",
                    "Diversification Bias",
                    "Passive Indexing Bias",
                    "Dividend Anchoring",
                ],
                "expected_bias": "Loss Chasing (Revenge Trading)",
            },
        },
        {
            "id": "arena-upcoming-university-cup",
            "contest_type": "PORTFOLIO_ARCHITECT",
            "title": "Inter-University Discipline Cup — Round 2",
            "description": "Upcoming scheduled university competition testing multi-sector risk budgeting under macro uncertainty.",
            "difficulty": "Intermediate",
            "status": "UPCOMING",
            "starts_at": (now + timedelta(hours=18, minutes=30)).isoformat(),
            "ends_at": (now + timedelta(days=4)).isoformat(),
            "duration_minutes": 15,
            "time_window_sec": 300,
            "league_scope": "UNIVERSITY",
            "university_name": "All University Leagues",
            "rubric_version": ARENA_RUBRIC_VERSION,
            "scenario_version": "v1.0",
            "data_source_label": "SYNTHETIC EDUCATIONAL SCENARIO",
            "scenario": {
                "capital": 1000000.0,
                "assets": [
                    {"symbol": "INFY", "sector": "IT", "volatility": "Medium", "beta": 0.95},
                    {"symbol": "ICICIBANK", "sector": "Banking", "volatility": "Medium", "beta": 1.05},
                    {"symbol": "HINDUNILVR", "sector": "FMCG", "volatility": "Low", "beta": 0.62},
                    {"symbol": "CIPLA", "sector": "Pharma", "volatility": "Low", "beta": 0.70},
                    {"symbol": "NIFTYBEES", "sector": "Index ETF", "volatility": "Low", "beta": 1.00},
                ],
                "info_panels": [],
            },
        },
        {
            "id": "arena-completed-benchmark-1",
            "contest_type": "CRASH_SURVIVOR",
            "title": "Q1 Volatility Stress Test (Archived)",
            "description": "Completed historical benchmark scenario evaluating drawdown discipline during sharp index gaps.",
            "difficulty": "Intermediate",
            "status": "COMPLETED",
            "starts_at": (now - timedelta(days=10)).isoformat(),
            "ends_at": (now - timedelta(days=3)).isoformat(),
            "duration_minutes": 10,
            "time_window_sec": 300,
            "league_scope": "GLOBAL",
            "university_name": None,
            "rubric_version": ARENA_RUBRIC_VERSION,
            "scenario_version": "v1.0",
            "data_source_label": "HISTORICAL & SYNTHETIC SIMULATION",
            "scenario": {"stages": []},
        },
    ]


class ArenaService:
    def _ensure_seeded(self) -> None:
        conn = get_connection()
        cur = conn.cursor()
        now_iso = _utc_now().isoformat()
        for c in _build_seed_contests():
            cur.execute("SELECT id FROM arena_contests WHERE id = ?", (c["id"],))
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO arena_contests (
                        id, contest_type, title, description, difficulty, status,
                        starts_at, ends_at, duration_minutes, time_window_sec,
                        league_scope, university_name, rubric_version, scenario_version,
                        data_source_label, scenario_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        c["id"], c["contest_type"], c["title"], c["description"],
                        c["difficulty"], c["status"], c["starts_at"], c["ends_at"],
                        c["duration_minutes"], c["time_window_sec"], c["league_scope"],
                        c["university_name"], c["rubric_version"], c.get("scenario_version", "v1.0"),
                        c["data_source_label"], json.dumps(c["scenario"]), now_iso,
                    ),
                )
        conn.commit()
        conn.close()

    def _audit(self, actor_id: str, action: str, target_type: str, target_id: str, details: Dict[str, Any]) -> None:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO arena_audit_logs (id, actor_id, action, target_type, target_id, details_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (f"aud_{uuid.uuid4().hex[:12]}", actor_id, action, target_type, target_id, json.dumps(details), _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()

    def _ensure_user_stats(self, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_user_stats WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            cur.execute("SELECT full_name FROM users WHERE id = ?", (user_id,))
            u = cur.fetchone()
            default_name = u["full_name"] if u else "Trader"
            now_iso = _utc_now().isoformat()
            cur.execute(
                """
                INSERT INTO arena_user_stats (
                    user_id, arena_points, league, university_name,
                    contests_completed, duels_won, achievements_json,
                    display_name, public_leaderboard_opt_in, share_university,
                    season_id, rank_history_json, updated_at
                ) VALUES (?, 0, 'Bronze', 'MINDMARK Open', 0, 0, '[]', ?, 1, 1, ?, '[]', ?)
                """,
                (user_id, default_name, CURRENT_SEASON_ID, now_iso),
            )
            conn.commit()
            cur.execute("SELECT * FROM arena_user_stats WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
        conn.close()
        return {
            "user_id": row["user_id"],
            "arena_points": row["arena_points"],
            "league": row["league"],
            "university_name": row["university_name"],
            "university_affiliation_status": "self-reported",
            "contests_completed": row["contests_completed"],
            "duels_won": row["duels_won"],
            "achievements": json.loads(row["achievements_json"] or "[]"),
            "display_name": row["display_name"] if "display_name" in row.keys() and row["display_name"] else None,
            "public_leaderboard_opt_in": bool(row["public_leaderboard_opt_in"]) if "public_leaderboard_opt_in" in row.keys() else True,
            "share_university": bool(row["share_university"]) if "share_university" in row.keys() else True,
            "season_id": row["season_id"] if "season_id" in row.keys() and row["season_id"] else CURRENT_SEASON_ID,
            "rank_history": json.loads(row["rank_history_json"] or "[]") if "rank_history_json" in row.keys() else [],
        }

    @staticmethod
    def _effective_status(row: Any) -> str:
        now = _utc_now()
        try:
            starts = datetime.fromisoformat(row["starts_at"])
            ends = datetime.fromisoformat(row["ends_at"])
            if now < starts:
                return "UPCOMING"
            if now > ends:
                return "COMPLETED"
            return "ACTIVE"
        except Exception:
            return row["status"]

    @staticmethod
    def _sanitize_contest_for_client(row: Any, include_scenario: bool = False) -> Dict[str, Any]:
        scenario = json.loads(row["scenario_json"] or "{}")
        safe_scenario = {k: v for k, v in scenario.items() if k != "expected_bias"}
        item = {
            "id": row["id"],
            "contest_type": row["contest_type"],
            "title": row["title"],
            "description": row["description"],
            "difficulty": row["difficulty"],
            "status": ArenaService._effective_status(row),
            "starts_at": row["starts_at"],
            "ends_at": row["ends_at"],
            "duration_minutes": row["duration_minutes"],
            "time_window_sec": row["time_window_sec"],
            "league_scope": row["league_scope"],
            "university_name": row["university_name"],
            "rubric_version": row["rubric_version"],
            "scenario_version": row["scenario_version"] if "scenario_version" in row.keys() else "v1.0",
            "data_source_label": row["data_source_label"],
        }
        if include_scenario:
            item["scenario"] = safe_scenario
        return item

    # -------------------------------------------------------------------------
    # ADMIN CONTEST CREATION & LIFECYCLE
    # -------------------------------------------------------------------------
    def create_contest_admin(self, admin_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        now = _utc_now()
        starts_at = payload.get("starts_at") or now.isoformat()
        ends_at = payload.get("ends_at") or (now + timedelta(days=5)).isoformat()
        cid = f"arena-{payload['contest_type'].lower().replace('_', '-')}-{uuid.uuid4().hex[:6]}"
        status = "UPCOMING" if datetime.fromisoformat(starts_at) > now else "ACTIVE"

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO arena_contests (
                id, contest_type, title, description, difficulty, status,
                starts_at, ends_at, duration_minutes, time_window_sec,
                league_scope, university_name, rubric_version, scenario_version,
                data_source_label, scenario_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cid, payload["contest_type"], payload["title"], payload["description"],
                payload["difficulty"], status, starts_at, ends_at,
                payload["duration_minutes"], payload["time_window_sec"],
                payload["league_scope"], payload.get("university_name"),
                payload.get("rubric_version", ARENA_RUBRIC_VERSION), "v1.0",
                "SYNTHETIC EDUCATIONAL SCENARIO", json.dumps(payload.get("scenario") or {}),
                now.isoformat(),
            ),
        )
        conn.commit()
        cur.execute("SELECT * FROM arena_contests WHERE id = ?", (cid,))
        row = cur.fetchone()
        conn.close()

        self._audit(admin_id, "CREATE_CONTEST", "contest", cid, {"title": payload["title"], "type": payload["contest_type"]})
        return self._sanitize_contest_for_client(row, include_scenario=False)

    def register_for_contest(self, contest_id: str, user_id: str) -> Dict[str, Any]:
        self._ensure_seeded()
        self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_contests WHERE id = ?", (contest_id,))
        contest = cur.fetchone()
        if not contest:
            conn.close()
            raise ValueError("Contest not found")
        if self._effective_status(contest) == "COMPLETED":
            conn.close()
            raise ValueError("Cannot register for a completed contest.")

        cur.execute(
            "SELECT id FROM arena_registrations WHERE contest_id = ? AND user_id = ?",
            (contest_id, user_id),
        )
        if cur.fetchone():
            conn.close()
            raise PermissionError("DUPLICATE_REGISTRATION: You are already registered for this contest.")

        reg_id = f"reg_{uuid.uuid4().hex[:10]}"
        now_iso = _utc_now().isoformat()
        cur.execute(
            """
            INSERT INTO arena_registrations (id, contest_id, user_id, registered_at, status)
            VALUES (?, ?, ?, ?, 'REGISTERED')
            """,
            (reg_id, contest_id, user_id, now_iso),
        )
        conn.commit()
        conn.close()
        return {"registration_id": reg_id, "contest_id": contest_id, "status": "REGISTERED", "registered_at": now_iso}

    def start_contest(self, contest_id: str, user_id: str, is_practice: bool = False) -> Dict[str, Any]:
        self._ensure_seeded()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_contests WHERE id = ?", (contest_id,))
        contest = cur.fetchone()
        if not contest:
            conn.close()
            raise ValueError("Contest not found")

        eff_status = self._effective_status(contest)
        if not is_practice:
            if eff_status == "UPCOMING":
                conn.close()
                raise ValueError("Official contest has not opened yet.")
            if eff_status == "COMPLETED":
                conn.close()
                raise ValueError("Official contest deadline has passed. Use practice mode instead.")

        now_iso = _utc_now().isoformat()
        if not is_practice:
            cur.execute(
                "SELECT id FROM arena_registrations WHERE contest_id = ? AND user_id = ?",
                (contest_id, user_id),
            )
            if not cur.fetchone():
                cur.execute(
                    """
                    INSERT INTO arena_registrations (id, contest_id, user_id, registered_at, started_at, status)
                    VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS')
                    """,
                    (f"reg_{uuid.uuid4().hex[:10]}", contest_id, user_id, now_iso, now_iso),
                )
            else:
                cur.execute(
                    "UPDATE arena_registrations SET started_at = COALESCE(started_at, ?), status = 'IN_PROGRESS' WHERE contest_id = ? AND user_id = ?",
                    (now_iso, contest_id, user_id),
                )
            conn.commit()
        conn.close()

        detail = self._sanitize_contest_for_client(contest, include_scenario=True)
        detail["server_now"] = now_iso
        detail["is_practice"] = is_practice
        return detail

    # -------------------------------------------------------------------------
    # DASHBOARD & CONTEST LISTING
    # -------------------------------------------------------------------------
    def get_dashboard(self, user_id: str) -> Dict[str, Any]:
        self._ensure_seeded()
        stats = self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM arena_contests ORDER BY starts_at ASC")
        contest_rows = cur.fetchall()

        cur.execute("SELECT contest_id FROM arena_registrations WHERE user_id = ?", (user_id,))
        registered_ids = {r["contest_id"] for r in cur.fetchall()}

        cur.execute(
            """
            SELECT e.*, c.title AS contest_title, c.contest_type, c.difficulty
            FROM arena_entries e
            JOIN arena_contests c ON c.id = e.contest_id
            WHERE e.user_id = ?
            ORDER BY e.submitted_at DESC
            """,
            (user_id,),
        )
        entry_rows = cur.fetchall()
        completed_ids = {r["contest_id"] for r in entry_rows}

        cur.execute("SELECT COUNT(*) + 1 AS rk FROM arena_user_stats WHERE arena_points > ?", (stats["arena_points"],))
        rank_row = cur.fetchone()
        user_rank = rank_row["rk"] if rank_row else 1

        cur.execute("SELECT experience_level FROM users WHERE id = ?", (user_id,))
        u_row = cur.fetchone()
        exp_level = (u_row["experience_level"] if u_row else "BEGINNER").upper()
        conn.close()

        active_contests, upcoming_contests, completed_contests = [], [], []
        for r in contest_rows:
            item = self._sanitize_contest_for_client(r, include_scenario=False)
            item["user_submitted"] = r["id"] in completed_ids
            item["user_registered"] = r["id"] in registered_ids
            if item["status"] == "ACTIVE":
                active_contests.append(item)
            elif item["status"] == "UPCOMING":
                upcoming_contests.append(item)
            else:
                completed_contests.append(item)

        recommendations = self._build_recommendations(user_id, exp_level, active_contests)
        history = [
            {
                "entry_id": r["id"],
                "contest_id": r["contest_id"],
                "contest_title": r["contest_title"],
                "contest_type": r["contest_type"],
                "difficulty": r["difficulty"],
                "total_score": r["total_score"],
                "reasoning_score": r["reasoning_score"],
                "risk_score": r["risk_score"],
                "evidence_score": r["evidence_score"],
                "consistency_score": r["consistency_score"],
                "reflection_score": r["reflection_score"] if "reflection_score" in r.keys() else 75.0,
                "arena_points_awarded": r["arena_points_awarded"],
                "xp_awarded": r["xp_awarded"],
                "submitted_at": r["submitted_at"],
                "ai_feedback": r["ai_feedback"],
                "ai_source": r["ai_source"],
            }
            for r in entry_rows
        ]

        return {
            "tagline": "Think smarter. Decide better. Rise through the ranks.",
            "hero_headline": "Your decisions. Your competition. Your rank.",
            "server_now": _utc_now().isoformat(),
            "user_stats": {**stats, "global_rank": user_rank},
            "league_rules": LEAGUE_RULES,
            "active_contests": active_contests,
            "upcoming_contests": upcoming_contests,
            "completed_contests": completed_contests,
            "recommended_contests": recommendations,
            "participation_history": history,
        }

    def _build_recommendations(self, user_id: str, exp_level: str, active_contests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        detected_keys = set()
        has_bie_data = False
        try:
            bie = bie_service.get_full_profile(user_id)
            if (bie.get("events_count") or 0) >= 3:
                has_bie_data = True
                for p in bie.get("patterns", []):
                    if p.get("detected"):
                        detected_keys.add((p.get("pattern_key") or "").lower())
        except Exception:
            pass

        recs = []
        for c in active_contests:
            ctype = c["contest_type"]
            reason = f"Matches your {exp_level.title()} skill level for structured decision practice."
            is_personalized = False
            if has_bie_data:
                if ctype == "FOMO_TRAP" and any("fomo" in k for k in detected_keys):
                    reason = "Recommended from your Phase 1 activity: tests resistance to viral rally chasing."
                    is_personalized = True
                elif ctype == "CRASH_SURVIVOR" and any("panic" in k for k in detected_keys):
                    reason = "Recommended from your Behavioral Insights: practices calm drawdown management."
                    is_personalized = True
                elif ctype == "PORTFOLIO_ARCHITECT" and any("concentration" in k or "diversification" in k for k in detected_keys):
                    reason = "Recommended from your Fingerprint: strengthens multi-sector allocation discipline."
                    is_personalized = True
                elif ctype == "BIAS_BUSTER" and detected_keys:
                    reason = "Recommended from detected behavioral patterns to sharpen bias recognition."
                    is_personalized = True

            if is_personalized or len(recs) < 3:
                recs.append({**c, "is_personalized": is_personalized, "why_recommended": reason})
        return recs[:3]

    def get_contest_detail(self, contest_id: str, user_id: str) -> Dict[str, Any]:
        self._ensure_seeded()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_contests WHERE id = ?", (contest_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise ValueError("Contest not found")

        cur.execute("SELECT * FROM arena_entries WHERE contest_id = ? AND user_id = ?", (contest_id, user_id))
        existing = cur.fetchone()
        cur.execute("SELECT id FROM arena_registrations WHERE contest_id = ? AND user_id = ?", (contest_id, user_id))
        reg = cur.fetchone()
        conn.close()

        detail = self._sanitize_contest_for_client(row, include_scenario=True)
        detail["server_now"] = _utc_now().isoformat()
        detail["user_registered"] = bool(reg)
        detail["existing_entry"] = (
            {
                "entry_id": existing["id"],
                "total_score": existing["total_score"],
                "reasoning_score": existing["reasoning_score"],
                "risk_score": existing["risk_score"],
                "evidence_score": existing["evidence_score"],
                "consistency_score": existing["consistency_score"],
                "reflection_score": existing["reflection_score"] if "reflection_score" in existing.keys() else 75.0,
                "arena_points_awarded": existing["arena_points_awarded"],
                "xp_awarded": existing["xp_awarded"],
                "ai_feedback": existing["ai_feedback"],
                "ai_source": existing["ai_source"],
                "submitted_at": existing["submitted_at"],
            }
            if existing
            else None
        )
        return detail

    # -------------------------------------------------------------------------
    # 5-COMPONENT DQS SCORING & SUBMISSION
    # -------------------------------------------------------------------------
    @staticmethod
    def _score_contest_submission(contest_row: Any, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        DQS = (R * 0.30) + (K * 0.25) + (E * 0.20) + (C * 0.15) + (L * 0.10)
        Never rewards reckless risk-taking or virtual profit alone.
        """
        ctype = contest_row["contest_type"]
        scenario = json.loads(contest_row["scenario_json"] or "{}")

        reasoning_score = 72.0
        risk_score = 75.0
        evidence_score = 70.0
        consistency_score = 75.0
        strongest_decision = "Maintained structured documentation of rationale."
        improvement_area = "Review additional evidence panels before finalizing."

        if ctype in ("CRASH_SURVIVOR", "DECISION_PRESSURE"):
            decs = payload.get("stage_decisions") or []
            if not decs:
                raise ValueError("At least one stage decision is required.")
            r_list, e_list = [], []
            reckless_sell = False
            for d in decs:
                txt = (d.get("reasoning") or "").strip()
                r_list.append(min(100.0, 50.0 + len(txt) * 0.5))
                rev = d.get("reviewed_info") or []
                e_list.append(min(100.0, 40.0 + len(rev) * 30.0))
                if d.get("action") in ("SELL_ALL", "PANIC_SELL_ALL") and len(rev) == 0:
                    reckless_sell = True
            reasoning_score = round(sum(r_list) / len(r_list), 1)
            evidence_score = round(sum(e_list) / len(e_list), 1)
            if reckless_sell:
                risk_score = 52.0
                consistency_score = 55.0
                improvement_area = "Avoid unresearched full liquidation during sharp drawdowns."
            else:
                risk_score = 90.0
                consistency_score = 88.0
                strongest_decision = "Preserved risk discipline during multi-stage volatility without panic selling."

            if ctype == "DECISION_PRESSURE":
                window = contest_row["time_window_sec"] or 180
                if payload.get("duration_sec", 60) > window:
                    consistency_score = max(60.0, consistency_score - 8.0)

        elif ctype == "FOMO_TRAP":
            decs = payload.get("stage_decisions") or []
            action = decs[0]["action"] if decs else "WAIT"
            txt = (decs[0].get("reasoning") if decs else payload.get("reasoning")) or ""
            rev = (decs[0].get("reviewed_info") if decs else payload.get("reviewed_info")) or []
            reasoning_score = round(min(100.0, 52.0 + len(txt.strip()) * 0.5), 1)
            evidence_score = round(min(100.0, 40.0 + len(rev) * 28.0), 1)
            if action == "BUY_LARGE":
                risk_score = 45.0
                consistency_score = 52.0
                improvement_area = "Avoid oversized entries into unverified social-media rallies."
            elif action in ("WAIT", "RESEARCH_MORE"):
                risk_score = 92.0
                consistency_score = 90.0
                strongest_decision = "Resisted FOMO rally and prioritized valuation and filing checks."
            else:
                risk_score = 78.0
                consistency_score = 80.0

        elif ctype == "PORTFOLIO_ARCHITECT":
            alloc = payload.get("allocation") or {}
            if not alloc:
                raise ValueError("Portfolio allocation weights are required.")
            total_w = sum(float(v) for v in alloc.values())
            if abs(total_w - 100.0) > 1.5:
                raise ValueError("Allocation weights must sum to 100%.")
            max_w = max(float(v) for v in alloc.values())
            active_positions = sum(1 for v in alloc.values() if float(v) > 0)
            smallcap_w = float(alloc.get("SMALLCAPX", 0))
            txt = (payload.get("reasoning") or "").strip()
            rev = payload.get("reviewed_info") or []

            reasoning_score = round(min(100.0, 52.0 + len(txt) * 0.5), 1)
            evidence_score = round(min(100.0, 45.0 + len(rev) * 27.5), 1)
            risk_score = 92.0
            if max_w > 35:
                risk_score -= (max_w - 35) * 1.1
            if smallcap_w > 25:
                risk_score -= (smallcap_w - 25) * 0.9
            if active_positions < 4:
                risk_score -= 15.0
            risk_score = round(max(35.0, min(100.0, risk_score)), 1)
            consistency_score = round(88.0 if active_positions >= 4 and max_w <= 30 else 65.0, 1)
            if risk_score >= 85:
                strongest_decision = "Constructed a diversified multi-sector allocation with controlled concentration."
            else:
                improvement_area = "Cap single-stock and high-beta weights to improve portfolio resilience."

        elif ctype == "ANALYST_DUEL":
            arg = (payload.get("argument") or "").strip()
            ev = (payload.get("evidence") or "").strip()
            rk = (payload.get("risks") or "").strip()
            if not arg or not ev or not rk:
                raise ValueError("Argument, supporting evidence, and risks are required.")
            reasoning_score = round(min(100.0, 55.0 + len(arg) * 0.25), 1)
            evidence_score = round(min(100.0, 52.0 + len(ev) * 0.30), 1)
            risk_score = round(min(100.0, 52.0 + len(rk) * 0.30), 1)
            consistency_score = round((reasoning_score + risk_score) / 2.0, 1)
            strongest_decision = "Paired thesis argument with concrete downside risk factors."

        elif ctype == "BIAS_BUSTER":
            selected_bias = (payload.get("selected_bias") or "").strip()
            mitigation = (payload.get("mitigation_plan") or "").strip()
            if not selected_bias or not mitigation:
                raise ValueError("Please identify the bias and provide a mitigation guardrail.")
            expected = scenario.get("expected_bias", "")
            matched = selected_bias.lower() == expected.lower() or "loss chasing" in selected_bias.lower()
            reasoning_score = round(min(100.0, 55.0 + len(mitigation) * 0.45), 1)
            evidence_score = 92.0 if matched else 48.0
            risk_score = 90.0 if matched else 55.0
            consistency_score = 88.0 if matched else 60.0
            if matched:
                strongest_decision = "Accurately diagnosed the cognitive bias and proposed a concrete guardrail."
            else:
                improvement_area = "Review the vignette's post-loss doubling cue to spot Loss Chasing."

        refl = (payload.get("reflection_text") or "").strip()
        reflection_score = round(min(100.0, 60.0 + len(refl) * 0.5) if refl else 65.0, 1)

        total_score = round(
            reasoning_score * 0.30
            + risk_score * 0.25
            + evidence_score * 0.20
            + consistency_score * 0.15
            + reflection_score * 0.10,
            1,
        )
        return {
            "total_score": total_score,
            "reasoning_score": reasoning_score,
            "risk_score": risk_score,
            "evidence_score": evidence_score,
            "consistency_score": consistency_score,
            "reflection_score": reflection_score,
            "strongest_decision": strongest_decision,
            "improvement_area": improvement_area,
        }

    @staticmethod
    def _generate_feedback(contest_title: str, ctype: str, scores: Dict[str, Any], use_ai: bool) -> tuple[str, str, bool]:
        deterministic = (
            f"Completed {contest_title} ({ctype}) with DQS {scores['total_score']}/100. "
            f"Reasoning: {scores['reasoning_score']}, Risk: {scores['risk_score']}, "
            f"Evidence: {scores['evidence_score']}, Consistency: {scores['consistency_score']}, Reflection: {scores['reflection_score']}."
        )
        if not use_ai or not settings.GEMINI_API_KEY:
            return deterministic, "deterministic_backend", False
        try:
            import httpx
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
            prompt = (
                f"You are MINDMARK Arena Coach. Return ONLY valid JSON with keys 'feedback' (2 sentences) and 'reasoning_note' (1 sentence) "
                f"evaluating a student who scored {scores['total_score']}/100 in '{contest_title}' ({ctype}). "
                f"Do not modify scores or give real-money advice."
            )
            resp = httpx.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 180,
                        "responseMimeType": "application/json",
                        "thinkingConfig": {"thinkingBudget": 0},
                    },
                },
                timeout=10.0,
            )
            if resp.status_code == 200:
                candidates = resp.json().get("candidates") or []
                if candidates:
                    raw = candidates[0]["content"]["parts"][0]["text"].strip()
                    parsed = json.loads(raw)
                    if isinstance(parsed, dict) and parsed.get("feedback"):
                        return str(parsed["feedback"]), "gemini", True
        except Exception as e:
            logger.info(f"[Arena] Gemini feedback fallback triggered: {type(e).__name__}")
        return deterministic + " (AI written-answer evaluation unavailable; deterministic rubric applied.)", "deterministic_fallback", False

    def submit_contest(self, contest_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_seeded()
        stats = self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM arena_contests WHERE id = ?", (contest_id,))
        contest = cur.fetchone()
        if not contest:
            conn.close()
            raise ValueError("Contest not found")

        is_practice = bool(payload.get("is_practice", False))
        eff_status = self._effective_status(contest)
        if not is_practice:
            if eff_status == "UPCOMING":
                conn.close()
                raise ValueError("This contest has not started yet.")
            if eff_status == "COMPLETED":
                conn.close()
                raise ValueError("Official submission deadline has passed. Use practice mode instead.")

            cur.execute("SELECT id FROM arena_entries WHERE contest_id = ? AND user_id = ?", (contest_id, user_id))
            if cur.fetchone():
                conn.close()
                raise PermissionError("DUPLICATE_SUBMISSION: Official submission already locked for this contest.")

        scores = self._score_contest_submission(contest, payload)
        feedback, ai_source, ai_eval_ok = self._generate_feedback(
            contest["title"], contest["contest_type"], scores, payload.get("use_ai", True)
        )
        now_iso = _utc_now().isoformat()

        if is_practice:
            run_id = f"pr_{uuid.uuid4().hex[:12]}"
            cur.execute(
                """
                INSERT INTO arena_practice_runs (
                    id, contest_id, user_id, total_score, reasoning_score, risk_score,
                    evidence_score, consistency_score, reflection_score, rubric_version,
                    ai_feedback, ai_source, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id, contest_id, user_id, scores["total_score"], scores["reasoning_score"],
                    scores["risk_score"], scores["evidence_score"], scores["consistency_score"],
                    scores["reflection_score"], contest["rubric_version"], feedback, ai_source, now_iso,
                ),
            )
            conn.commit()
            conn.close()
            return {
                "entry_id": run_id,
                "contest_id": contest_id,
                "is_practice": True,
                **scores,
                "arena_points_awarded": 0,
                "xp_awarded": 0,
                "rubric_version": contest["rubric_version"],
                "ai_feedback": feedback,
                "ai_source": ai_source,
                "ai_written_eval_available": ai_eval_ok,
            }

        # Official submission rewards with idempotent transaction ledger
        arena_points_awarded = max(40, int(round(scores["total_score"] * 1.5)))
        has_reflection = bool((payload.get("reflection_text") or "").strip())
        xp_awarded = 25 + (20 if has_reflection else 0) + (55 if scores["total_score"] >= 80 else 25)
        entry_id = f"ae_{uuid.uuid4().hex[:12]}"
        scenario_ver = contest["scenario_version"] if "scenario_version" in contest.keys() else "v1.0"

        cur.execute(
            """
            INSERT INTO arena_entries (
                id, contest_id, user_id, university_name, status,
                started_at, submitted_at, duration_sec,
                total_score, reasoning_score, risk_score, evidence_score, consistency_score,
                reflection_score, arena_points_awarded, xp_awarded, rubric_version,
                scenario_version, strongest_decision, improvement_area,
                ai_feedback, ai_source, submission_json
            ) VALUES (?, ?, ?, ?, 'SCORED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry_id, contest_id, user_id, stats["university_name"],
                payload.get("started_at") or now_iso, now_iso, payload.get("duration_sec", 60),
                scores["total_score"], scores["reasoning_score"], scores["risk_score"],
                scores["evidence_score"], scores["consistency_score"], scores["reflection_score"],
                arena_points_awarded, xp_awarded, contest["rubric_version"], scenario_ver,
                scores["strongest_decision"], scores["improvement_area"],
                feedback, ai_source, json.dumps(payload),
            ),
        )

        # Idempotent reward transaction
        idem_key = f"reward:{contest_id}:{user_id}:official"
        cur.execute(
            """
            INSERT OR IGNORE INTO arena_reward_transactions (
                id, idempotency_key, user_id, contest_id, reward_type, xp_amount, arena_points_amount, created_at
            ) VALUES (?, ?, ?, ?, 'CONTEST_OFFICIAL', ?, ?, ?)
            """,
            (f"rtx_{uuid.uuid4().hex[:10]}", idem_key, user_id, contest_id, xp_awarded, arena_points_awarded, now_iso),
        )

        new_points = stats["arena_points"] + arena_points_awarded
        new_league = _compute_league(new_points)
        new_completed = stats["contests_completed"] + 1
        achievements = list(stats["achievements"])
        for badge, cond in [
            ("First Arena Entry", True),
            ("Risk Guardian", scores["risk_score"] >= 85),
            ("Research Champion", scores["evidence_score"] >= 85),
            ("Portfolio Architect", contest["contest_type"] == "PORTFOLIO_ARCHITECT" and scores["total_score"] >= 80),
            ("Consistency Champion", scores["consistency_score"] >= 85),
            ("Crash Survivor", contest["contest_type"] == "CRASH_SURVIVOR" and scores["total_score"] >= 75),
        ]:
            if cond and badge not in achievements:
                achievements.append(badge)

        rank_history = list(stats["rank_history"])
        rank_history.append({"contest_id": contest_id, "points": new_points, "league": new_league, "at": now_iso})

        cur.execute(
            """
            UPDATE arena_user_stats
            SET arena_points = ?, league = ?, contests_completed = ?,
                achievements_json = ?, rank_history_json = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (new_points, new_league, new_completed, json.dumps(achievements), json.dumps(rank_history[-20:]), now_iso, user_id),
        )

        cur.execute("UPDATE users SET total_learning_xp = total_learning_xp + ? WHERE id = ?", (xp_awarded, user_id))
        cur.execute("SELECT total_learning_xp FROM users WHERE id = ?", (user_id,))
        u_row = cur.fetchone()
        if u_row:
            new_xp = u_row["total_learning_xp"]
            new_tier = 4 if new_xp >= 1200 else 3 if new_xp >= 650 else 2
            cur.execute("UPDATE users SET current_tier_level = ? WHERE id = ?", (new_tier, user_id))

        conn.commit()
        conn.close()
        self._audit(user_id, "LOCK_OFFICIAL_SCORE", "arena_entry", entry_id, {"contest_id": contest_id, "total_score": scores["total_score"]})

        return {
            "entry_id": entry_id,
            "contest_id": contest_id,
            "is_practice": False,
            **scores,
            "arena_points_awarded": arena_points_awarded,
            "xp_awarded": xp_awarded,
            "new_arena_points": new_points,
            "new_league": new_league,
            "achievements": achievements,
            "rubric_version": contest["rubric_version"],
            "scenario_version": scenario_ver,
            "ai_feedback": feedback,
            "ai_source": ai_source,
            "ai_written_eval_available": ai_eval_ok,
        }

    # -------------------------------------------------------------------------
    # POST-CONTEST PERFORMANCE REVIEW
    # -------------------------------------------------------------------------
    def get_contest_results(self, contest_id: str, user_id: str) -> Dict[str, Any]:
        self._ensure_seeded()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_contests WHERE id = ?", (contest_id,))
        contest = cur.fetchone()
        if not contest:
            conn.close()
            raise ValueError("Contest not found")

        cur.execute(
            """
            SELECT * FROM arena_entries
            WHERE contest_id = ?
            ORDER BY total_score DESC, risk_score DESC, consistency_score DESC, submitted_at ASC
            """,
            (contest_id,),
        )
        all_entries = cur.fetchall()
        conn.close()

        user_rank = None
        user_entry = None
        for idx, e in enumerate(all_entries):
            if e["user_id"] == user_id:
                user_rank = idx + 1
                user_entry = e
                break

        if not user_entry:
            raise ValueError("No official contest result found for this user.")

        contest_avg = (
            round(sum(e["total_score"] for e in all_entries) / len(all_entries), 1)
            if len(all_entries) >= 2
            else None
        )

        patterns = []
        try:
            bie = bie_service.get_full_profile(user_id)
            patterns = [p["pattern_name"] for p in bie.get("patterns", []) if p.get("detected")]
        except Exception:
            pass

        ctype = contest["contest_type"]
        return {
            "contest_id": contest_id,
            "contest_title": contest["title"],
            "contest_type": ctype,
            "final_rank": user_rank,
            "total_participants": len(all_entries),
            "total_score": user_entry["total_score"],
            "score_breakdown": {
                "reasoning": user_entry["reasoning_score"],
                "risk_management": user_entry["risk_score"],
                "evidence_use": user_entry["evidence_score"],
                "strategy_consistency": user_entry["consistency_score"],
                "reflection": user_entry["reflection_score"] if "reflection_score" in user_entry.keys() else 75.0,
            },
            "strongest_decision": user_entry["strongest_decision"] or "Structured decision rationale.",
            "decision_needing_improvement": user_entry["improvement_area"] or "Keep checking all evidence panels.",
            "contest_average_score": contest_avg,
            "relevant_behavioral_patterns": patterns,
            "recommended_mirror_challenge": MIRROR_CHALLENGE_MAP.get(ctype, "panic-decision"),
            "learning_recommendation": f"Practice '{MIRROR_CHALLENGE_MAP.get(ctype, 'panic-decision')}' in Mirror Mode to reinforce these habits.",
            "tie_break_rule": LEAGUE_RULES["tie_break_rule"],
            "ai_feedback": user_entry["ai_feedback"],
            "ai_source": user_entry["ai_source"],
        }

    # -------------------------------------------------------------------------
    # ANALYST DUEL & FRIEND CHALLENGES
    # -------------------------------------------------------------------------
    @staticmethod
    def _score_duel_submission(arg: str, ev: str, rks: str) -> float:
        r = min(100.0, 55.0 + len(arg.strip()) * 0.25)
        e = min(100.0, 52.0 + len(ev.strip()) * 0.30)
        k = min(100.0, 52.0 + len(rks.strip()) * 0.30)
        return round(r * 0.35 + e * 0.35 + k * 0.30, 1)

    def create_duel(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_seeded()
        stats = self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_contests WHERE id = ?", (payload["contest_id"],))
        contest = cur.fetchone()
        if not contest or contest["contest_type"] != "ANALYST_DUEL":
            conn.close()
            raise ValueError("Analyst Duel contest not found")

        c_score = self._score_duel_submission(payload["argument"], payload["evidence"], payload["risks"])
        duel_id = f"duel_{uuid.uuid4().hex[:10]}"
        now_iso = _utc_now().isoformat()

        if payload.get("auto_match_benchmark", True):
            opp_arg = "Maintain cautious watch until EV battery capex stabilizes free cash flow."
            opp_ev = "Net debt/equity 0.35x and negative FCF with 22x forward P/E above 18x average."
            opp_rks = "SUV demand cyclicality or slower EV adoption could compress margins further."
            o_score = self._score_duel_submission(opp_arg, opp_ev, opp_rks)
            winner_id = user_id if c_score >= o_score else "BENCHMARK_ANALYST"
            status = "COMPLETED"
            completed_at = now_iso
            eval_json = json.dumps({"rubric_version": ARENA_RUBRIC_VERSION, "challenger_score": c_score, "opponent_score": o_score})
        else:
            opp_arg = opp_ev = opp_rks = None
            o_score = 0.0
            winner_id = None
            status = "OPEN"
            completed_at = None
            eval_json = "{}"

        cur.execute(
            """
            INSERT INTO arena_duels (
                id, contest_id, challenger_id, opponent_id, status,
                challenger_argument, challenger_evidence, challenger_risks, challenger_score,
                opponent_argument, opponent_evidence, opponent_risks, opponent_score,
                winner_id, evaluation_json, created_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                duel_id, payload["contest_id"], user_id,
                "BENCHMARK_ANALYST" if status == "COMPLETED" else None, status,
                payload["argument"], payload["evidence"], payload["risks"], c_score,
                opp_arg, opp_ev, opp_rks, o_score,
                winner_id, eval_json, now_iso, completed_at,
            ),
        )
        if winner_id == user_id:
            achievements = list(stats["achievements"])
            if "Analyst of the Week" not in achievements:
                achievements.append("Analyst of the Week")
            new_pts = stats["arena_points"] + 120
            cur.execute(
                "UPDATE arena_user_stats SET arena_points = ?, league = ?, duels_won = duels_won + 1, achievements_json = ?, updated_at = ? WHERE user_id = ?",
                (new_pts, _compute_league(new_pts), json.dumps(achievements), now_iso, user_id),
            )
        conn.commit()
        conn.close()
        return {"duel_id": duel_id, "status": status, "challenger_score": c_score, "opponent_score": o_score, "winner_id": winner_id, "evaluation": json.loads(eval_json)}

    def join_duel(self, duel_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_duels WHERE id = ?", (duel_id,))
        duel = cur.fetchone()
        if not duel:
            conn.close()
            raise ValueError("Duel not found")
        if duel["status"] != "OPEN":
            conn.close()
            raise ValueError("Duel is already completed")
        if duel["challenger_id"] == user_id:
            conn.close()
            raise ValueError("You cannot join your own duel")

        o_score = self._score_duel_submission(payload["argument"], payload["evidence"], payload["risks"])
        c_score = duel["challenger_score"]
        winner_id = user_id if o_score > c_score else duel["challenger_id"]
        now_iso = _utc_now().isoformat()
        eval_json = json.dumps({"rubric_version": ARENA_RUBRIC_VERSION, "challenger_score": c_score, "opponent_score": o_score})

        cur.execute(
            """
            UPDATE arena_duels
            SET opponent_id = ?, status = 'COMPLETED',
                opponent_argument = ?, opponent_evidence = ?, opponent_risks = ?,
                opponent_score = ?, winner_id = ?, evaluation_json = ?, completed_at = ?
            WHERE id = ?
            """,
            (user_id, payload["argument"], payload["evidence"], payload["risks"], o_score, winner_id, eval_json, now_iso, duel_id),
        )
        conn.commit()
        conn.close()
        return {"duel_id": duel_id, "status": "COMPLETED", "challenger_score": c_score, "opponent_score": o_score, "winner_id": winner_id, "evaluation": json.loads(eval_json)}

    def create_friend_challenge(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_seeded()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM arena_contests WHERE id = ?", (payload["contest_id"],))
        if not cur.fetchone():
            conn.close()
            raise ValueError("Contest not found")

        opp_id = None
        if payload.get("opponent_email"):
            cur.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (payload["opponent_email"].strip(),))
            opp = cur.fetchone()
            if not opp:
                conn.close()
                raise ValueError("Opponent email not found")
            if opp["id"] == user_id:
                conn.close()
                raise ValueError("Cannot challenge yourself")
            opp_id = opp["id"]

        fc_id = f"fc_{uuid.uuid4().hex[:10]}"
        code = f"MM-{uuid.uuid4().hex[:6].upper()}"
        now = _utc_now()
        exp = (now + timedelta(hours=payload.get("expires_hours", 48))).isoformat()
        cur.execute(
            """
            INSERT INTO arena_friend_challenges (
                id, challenge_code, contest_id, creator_id, opponent_id,
                status, share_reasoning, expires_at, created_at
            ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
            """,
            (fc_id, code, payload["contest_id"], user_id, opp_id, 1 if payload.get("share_reasoning", True) else 0, exp, now.isoformat()),
        )
        conn.commit()
        conn.close()
        return {"challenge_id": fc_id, "challenge_code": code, "contest_id": payload["contest_id"], "status": "PENDING", "expires_at": exp}

    def list_friend_challenges(self, user_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT fc.*, c.title AS contest_title, c.contest_type
            FROM arena_friend_challenges fc
            JOIN arena_contests c ON c.id = fc.contest_id
            WHERE fc.creator_id = ? OR fc.opponent_id = ?
            ORDER BY fc.created_at DESC
            """,
            (user_id, user_id),
        )
        rows = cur.fetchall()
        conn.close()
        now = _utc_now()
        items = []
        for r in rows:
            st = r["status"]
            if st == "PENDING" and datetime.fromisoformat(r["expires_at"]) < now:
                st = "EXPIRED"
            items.append({
                "challenge_id": r["id"],
                "challenge_code": r["challenge_code"],
                "contest_id": r["contest_id"],
                "contest_title": r["contest_title"],
                "contest_type": r["contest_type"],
                "creator_id": r["creator_id"],
                "opponent_id": r["opponent_id"],
                "status": st,
                "share_reasoning": bool(r["share_reasoning"]),
                "creator_score": r["creator_score"],
                "opponent_score": r["opponent_score"],
                "winner_id": r["winner_id"],
                "expires_at": r["expires_at"],
            })
        return items

    def accept_friend_challenge(self, challenge_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_friend_challenges WHERE id = ?", (challenge_id,))
        fc = cur.fetchone()
        if not fc:
            conn.close()
            raise ValueError("Friend challenge not found")
        if fc["creator_id"] == user_id:
            conn.close()
            raise ValueError("Creator cannot accept their own challenge")
        if fc["opponent_id"] and fc["opponent_id"] != user_id:
            conn.close()
            raise PermissionError("FORBIDDEN: You are not the invited opponent for this challenge.")
        if datetime.fromisoformat(fc["expires_at"]) < _utc_now():
            conn.close()
            raise ValueError("This friend challenge has expired.")

        cur.execute(
            "UPDATE arena_friend_challenges SET opponent_id = ?, status = 'ACCEPTED' WHERE id = ?",
            (user_id, challenge_id),
        )
        conn.commit()
        conn.close()
        return {"challenge_id": challenge_id, "status": "ACCEPTED", "contest_id": fc["contest_id"]}

    # -------------------------------------------------------------------------
    # LEADERBOARDS, PROFILE PRIVACY & UNIVERSITY LEAGUE
    # -------------------------------------------------------------------------
    def get_profile(self, user_id: str) -> Dict[str, Any]:
        stats = self._ensure_user_stats(user_id)
        return {**stats, "league_rules": LEAGUE_RULES}

    def update_profile(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()
        updates, params = [], []
        if payload.get("display_name") is not None:
            updates.append("display_name = ?")
            params.append(payload["display_name"].strip())
        if payload.get("public_leaderboard_opt_in") is not None:
            updates.append("public_leaderboard_opt_in = ?")
            params.append(1 if payload["public_leaderboard_opt_in"] else 0)
        if payload.get("share_university") is not None:
            updates.append("share_university = ?")
            params.append(1 if payload["share_university"] else 0)
        if payload.get("university_name") is not None:
            updates.append("university_name = ?")
            params.append(payload["university_name"].strip())
        if updates:
            updates.append("updated_at = ?")
            params.append(_utc_now().isoformat())
            params.append(user_id)
            cur.execute(f"UPDATE arena_user_stats SET {', '.join(updates)} WHERE user_id = ?", tuple(params))
            conn.commit()
        conn.close()
        return self.get_profile(user_id)

    def set_university(self, user_id: str, university_name: str) -> Dict[str, Any]:
        return self.update_profile(user_id, {"university_name": university_name})

    def add_friend(self, user_id: str, friend_email: str) -> Dict[str, Any]:
        self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(?)", (friend_email.strip(),))
        friend = cur.fetchone()
        if not friend:
            conn.close()
            raise ValueError("No MINDMARK user found with that email.")
        if friend["id"] == user_id:
            conn.close()
            raise ValueError("You cannot add yourself as a friend.")
        self._ensure_user_stats(friend["id"])
        cur.execute(
            "INSERT OR IGNORE INTO arena_friends (id, user_id, friend_user_id, created_at) VALUES (?, ?, ?, ?)",
            (f"fr_{uuid.uuid4().hex[:10]}", user_id, friend["id"], _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()
        return {"friend_user_id": friend["id"], "full_name": friend["full_name"], "email": friend["email"]}

    def get_leaderboard(
        self,
        user_id: str,
        scope: str = "global",
        university: Optional[str] = None,
        contest_id: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        stats = self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()
        scope_l = (scope or "global").lower()
        offset = max(0, (page - 1) * limit)

        if scope_l == "contest" and contest_id:
            cur.execute(
                """
                SELECT e.user_id, e.total_score AS sort_points, e.arena_points_awarded,
                       s.league, s.university_name, s.contests_completed, s.duels_won,
                       s.display_name, s.public_leaderboard_opt_in, s.share_university,
                       u.full_name, u.avatar_url, u.experience_level
                FROM arena_entries e
                JOIN arena_user_stats s ON s.user_id = e.user_id
                JOIN users u ON u.id = e.user_id
                WHERE e.contest_id = ? AND (s.public_leaderboard_opt_in = 1 OR e.user_id = ?)
                ORDER BY e.total_score DESC, e.risk_score DESC, e.consistency_score DESC, e.submitted_at ASC
                LIMIT ? OFFSET ?
                """,
                (contest_id, user_id, limit, offset),
            )
        elif scope_l in ("weekly", "monthly"):
            days = 7 if scope_l == "weekly" else 30
            cutoff = (_utc_now() - timedelta(days=days)).isoformat()
            cur.execute(
                """
                SELECT s.*, u.full_name, u.avatar_url, u.experience_level,
                       COALESCE(SUM(e.arena_points_awarded), 0) AS period_points
                FROM arena_user_stats s
                JOIN users u ON u.id = s.user_id
                LEFT JOIN arena_entries e ON e.user_id = s.user_id AND e.submitted_at >= ?
                WHERE s.public_leaderboard_opt_in = 1 OR s.user_id = ?
                GROUP BY s.user_id
                ORDER BY period_points DESC, s.arena_points DESC
                LIMIT ? OFFSET ?
                """,
                (cutoff, user_id, limit, offset),
            )
        elif scope_l == "university":
            target_uni = university or stats["university_name"]
            cur.execute(
                """
                SELECT s.*, u.full_name, u.avatar_url, u.experience_level
                FROM arena_user_stats s
                JOIN users u ON u.id = s.user_id
                WHERE LOWER(s.university_name) = LOWER(?) AND (s.share_university = 1 OR s.user_id = ?)
                ORDER BY s.arena_points DESC, s.contests_completed DESC
                LIMIT ? OFFSET ?
                """,
                (target_uni, user_id, limit, offset),
            )
        elif scope_l == "friends":
            cur.execute(
                """
                SELECT s.*, u.full_name, u.avatar_url, u.experience_level
                FROM arena_user_stats s
                JOIN users u ON u.id = s.user_id
                WHERE s.user_id = ?
                   OR s.user_id IN (SELECT friend_user_id FROM arena_friends WHERE user_id = ?)
                ORDER BY s.arena_points DESC, s.contests_completed DESC
                LIMIT ? OFFSET ?
                """,
                (user_id, user_id, limit, offset),
            )
        else:
            cur.execute(
                """
                SELECT s.*, u.full_name, u.avatar_url, u.experience_level
                FROM arena_user_stats s
                JOIN users u ON u.id = s.user_id
                WHERE s.public_leaderboard_opt_in = 1 OR s.user_id = ?
                ORDER BY s.arena_points DESC, s.contests_completed DESC
                LIMIT ? OFFSET ?
                """,
                (user_id, limit, offset),
            )

        rows = cur.fetchall()
        conn.close()

        entries = []
        for idx, r in enumerate(rows):
            rk = offset + idx + 1
            share_uni = bool(r["share_university"]) if "share_university" in r.keys() else True
            disp = r["display_name"] if "display_name" in r.keys() and r["display_name"] else r["full_name"]
            pts = r["period_points"] if "period_points" in r.keys() else (r["sort_points"] if "sort_points" in r.keys() else r["arena_points"])
            entries.append({
                "rank": rk,
                "user_id": r["user_id"],
                "full_name": disp,
                "avatar_url": r["avatar_url"] if "avatar_url" in r.keys() else None,
                "skill_level": r["experience_level"] if "experience_level" in r.keys() else "BEGINNER",
                "arena_points": pts,
                "league": r["league"],
                "university_name": r["university_name"] if (share_uni or r["user_id"] == user_id) else "Private",
                "contests_completed": r["contests_completed"],
                "duels_won": r["duels_won"],
                "is_current_user": r["user_id"] == user_id,
            })

        return {
            "scope": scope_l,
            "page": page,
            "limit": limit,
            "tie_break_rule": LEAGUE_RULES["tie_break_rule"],
            "university_filter": university or stats["university_name"] if scope_l == "university" else None,
            "entries": entries,
        }

    def get_university_league(self, user_id: str) -> Dict[str, Any]:
        stats = self._ensure_user_stats(user_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT university_name,
                   SUM(arena_points) AS team_points,
                   COUNT(*) AS members_count,
                   SUM(contests_completed) AS total_contests
            FROM arena_user_stats
            WHERE share_university = 1 AND university_name IS NOT NULL AND university_name != ''
            GROUP BY LOWER(university_name)
            ORDER BY team_points DESC
            LIMIT 25
            """
        )
        team_rows = cur.fetchall()
        conn.close()

        teams = [
            {
                "rank": idx + 1,
                "university_name": r["university_name"],
                "team_points": r["team_points"],
                "members_count": r["members_count"],
                "total_contests": r["total_contests"],
                "affiliation_status": "self-reported",
            }
            for idx, r in enumerate(team_rows)
        ]
        user_team_rank = next(
            (t["rank"] for t in teams if t["university_name"].lower() == stats["university_name"].lower()),
            None,
        )
        return {
            "user_university": stats["university_name"],
            "affiliation_status": "self-reported",
            "user_university_rank": user_team_rank,
            "teams": teams,
        }


arena_service = ArenaService()
