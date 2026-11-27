import json
import uuid
import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.app.config import settings
from backend.app.database import get_connection
from backend.app.services.gamification_service import gamification_service, compute_level_info
from backend.app.services.arena_service import arena_service

logger = logging.getLogger("mindmark.social")

CROWD_MIN_SAMPLE_SIZE = 3

SQUAD_BATTLE_SCENARIOS = {
    "sb-macro-shock": {
        "id": "sb-macro-shock",
        "title": "Global Rate Spike & Nifty Liquidity Stress",
        "summary": "A sudden +20 bps global bond yield spike triggers a -4.5% Nifty pullback. Your squad manages a ₹25,00,000 simulated equity & cash book.",
        "permitted_actions": ["HOLD_AND_MONITOR", "REDUCE_HIGH_BETA", "REBALANCE_DEFENSIVE", "DEPLOY_STAGED_CASH"],
    },
    "sb-earnings-miss": {
        "id": "sb-earnings-miss",
        "title": "Sector Leader Margin Compression",
        "summary": "Your largest IT holding reports flat revenue and 150 bps margin compression, while maintaining strong free cash flow.",
        "permitted_actions": ["HOLD_THESIS", "TRIM_EXPOSURE", "WAIT_FOR_CONCALL", "EXIT_POSITION"],
    },
}

CROWD_MIRROR_SCENARIOS = [
    {
        "id": "cm-rate-hike",
        "title": "Surprise Central Bank +25 bps Rate Hike",
        "summary": "Inflation prints 40 bps above consensus and the central bank delivers an unexpected +25 bps hike. Rate-sensitive sectors dip -3.2% intraday.",
        "options": ["HOLD_LONG_TERM", "REDUCE_RATE_SENSITIVE", "WAIT_FOR_CLOSE", "PANIC_SELL_ALL"],
        "educational_note": "Disciplined investors separate temporary rate volatility from long-term balance-sheet strength.",
        "outcome_note": "Historical simulation: quality low-debt companies recovered within 3 weeks while leveraged cyclicals lagged.",
    },
    {
        "id": "cm-viral-ipo",
        "title": "Viral Tech Listing Up +45% on Day 1",
        "summary": "A newly listed consumer-tech stock surges +45% on listing day with 85x P/S valuation and negative operating cash flow.",
        "options": ["WAIT_AND_RESEARCH", "SMALL_TRACKER_ONLY", "BUY_AGGRESSIVE", "AVOID_UNTIL_EARNINGS"],
        "educational_note": "Popularity is not a margin of safety; always inspect cash burn and lock-in expiry.",
        "outcome_note": "Historical simulation: post-lock-in supply pulled the stock -28% over the following quarter.",
    },
]

SEED_DEBATES = [
    {
        "id": "deb-featured-1",
        "title": "High Valuation + Rising Debt After +60% Rally",
        "case_text": "Company X has experienced a major price increase (+60% in 4 months). Its revenue is growing 18% YoY, but its P/E valuation is 78x and net debt has increased 35%. What should an investor investigate before deciding?",
        "format": "WEEKLY_FEATURED",
    }
]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _slug_username(name: str, user_id: str) -> str:
    base = re.sub(r"[^a-z0-9_]", "", (name or "trader").lower().replace(" ", "_"))[:18] or "trader"
    return f"{base}_{user_id[-4:].lower()}"


class SocialService:
    def _ensure_seeded(self) -> None:
        conn = get_connection()
        cur = conn.cursor()
        now_iso = _utc_now().isoformat()
        cur.execute("SELECT id FROM users LIMIT 1")
        u = cur.fetchone()
        if u:
            for d in SEED_DEBATES:
                cur.execute("SELECT id FROM social_debates WHERE id = ?", (d["id"],))
                if not cur.fetchone():
                    cur.execute(
                        """
                        INSERT INTO social_debates (id, creator_id, title, case_text, format, status, created_at)
                        VALUES (?, ?, ?, ?, ?, 'OPEN', ?)
                        """,
                        (d["id"], u["id"], d["title"], d["case_text"], d["format"], now_iso),
                    )
            conn.commit()
        conn.close()

    def _ensure_privacy(self, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_privacy_settings WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            cur.execute("SELECT full_name FROM users WHERE id = ?", (user_id,))
            u = cur.fetchone()
            uname = _slug_username(u["full_name"] if u else "trader", user_id)
            now_iso = _utc_now().isoformat()
            cur.execute(
                """
                INSERT INTO social_privacy_settings (
                    user_id, username, show_university, show_squads, show_achievements,
                    show_arena_rank, notify_squads, notify_challenges, notify_debates, updated_at
                ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, ?)
                """,
                (user_id, uname, now_iso),
            )
            conn.commit()
            cur.execute("SELECT * FROM social_privacy_settings WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
        conn.close()
        return {
            "user_id": row["user_id"],
            "username": row["username"],
            "show_university": bool(row["show_university"]),
            "show_squads": bool(row["show_squads"]),
            "show_achievements": bool(row["show_achievements"]),
            "show_arena_rank": bool(row["show_arena_rank"]),
            "notify_squads": bool(row["notify_squads"]),
            "notify_challenges": bool(row["notify_challenges"]),
            "notify_debates": bool(row["notify_debates"]),
        }

    def _notify(self, user_id: str, notif_type: str, message: str) -> None:
        priv = self._ensure_privacy(user_id)
        if notif_type.startswith("SQUAD") and not priv["notify_squads"]:
            return
        if notif_type.startswith("CHALLENGE") and not priv["notify_challenges"]:
            return
        if notif_type.startswith("DEBATE") and not priv["notify_debates"]:
            return
        conn = get_connection()
        conn.execute(
            "INSERT INTO social_notifications (id, user_id, notif_type, message, is_read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
            (f"ntf_{uuid.uuid4().hex[:10]}", user_id, notif_type, message, _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()

    # -------------------------------------------------------------------------
    # DASHBOARD
    # -------------------------------------------------------------------------
    def get_dashboard(self, user_id: str) -> Dict[str, Any]:
        self._ensure_seeded()
        priv = self._ensure_privacy(user_id)
        squads = self.list_squads(user_id)
        debates = self.list_debates(user_id)
        feed = self.get_feed(user_id, limit=10)
        fc = arena_service.list_friend_challenges(user_id)
        uni = arena_service.get_university_league(user_id)
        notifs = self.get_notifications(user_id)
        return {
            "tagline": "Think together. Challenge each other. Make smarter decisions.",
            "privacy": priv,
            "my_squads": squads["my_squads"],
            "open_squad_battles": squads["battles"],
            "pending_invitations": squads["invitations"],
            "friend_challenges": fc,
            "debates": debates,
            "crowd_scenarios": self.list_crowd_scenarios(user_id),
            "university_league": uni,
            "feed": feed["posts"],
            "notifications": notifs,
        }

    # -------------------------------------------------------------------------
    # FEATURE A: SQUADS & SQUAD BATTLES (3-5 MEMBERS)
    # -------------------------------------------------------------------------
    def create_squad(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_privacy(user_id)
        squad_id = f"sq_{uuid.uuid4().hex[:10]}"
        code = f"SQ-{uuid.uuid4().hex[:6].upper()}"
        now_iso = _utc_now().isoformat()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO social_squads (id, name, description, avatar, invite_code, leader_id, university_name, max_members, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 5, ?)
            """,
            (squad_id, payload["name"].strip(), payload.get("description", ""), payload.get("avatar", "Shield"), code, user_id, payload.get("university_name"), now_iso),
        )
        cur.execute(
            "INSERT INTO social_squad_members (id, squad_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Strategist', ?)",
            (f"sqm_{uuid.uuid4().hex[:10]}", squad_id, user_id, now_iso),
        )
        conn.commit()
        conn.close()
        return self.get_squad_detail(squad_id, user_id)

    def list_squads(self, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT s.*, m.role AS my_role,
                   (SELECT COUNT(*) FROM social_squad_members sm WHERE sm.squad_id = s.id) AS member_count
            FROM social_squads s
            JOIN social_squad_members m ON m.squad_id = s.id
            WHERE m.user_id = ?
            ORDER BY s.created_at DESC
            """,
            (user_id,),
        )
        my_squads = [dict(r) for r in cur.fetchall()]

        cur.execute(
            """
            SELECT i.*, s.name AS squad_name
            FROM social_squad_invitations i
            JOIN social_squads s ON s.id = i.squad_id
            WHERE i.invitee_id = ? AND i.status = 'PENDING'
            ORDER BY i.created_at DESC
            """,
            (user_id,),
        )
        invitations = [dict(r) for r in cur.fetchall()]

        cur.execute("SELECT * FROM social_squad_battles ORDER BY created_at DESC LIMIT 20")
        battles = [dict(r) for r in cur.fetchall()]
        conn.close()
        return {"my_squads": my_squads, "invitations": invitations, "battles": battles}

    def get_squad_detail(self, squad_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_squads WHERE id = ?", (squad_id,))
        sq = cur.fetchone()
        if not sq:
            conn.close()
            raise ValueError("Squad not found")
        cur.execute(
            """
            SELECT sm.user_id, sm.role, sm.joined_at, u.full_name, p.username
            FROM social_squad_members sm
            JOIN users u ON u.id = sm.user_id
            LEFT JOIN social_privacy_settings p ON p.user_id = sm.user_id
            WHERE sm.squad_id = ?
            """,
            (squad_id,),
        )
        members = [dict(r) for r in cur.fetchall()]
        conn.close()
        return {**dict(sq), "members": members, "min_battle_members": 3, "max_members": sq["max_members"]}

    def invite_to_squad(self, squad_id: str, inviter_id: str, invitee_email: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM social_squad_members WHERE squad_id = ? AND user_id = ?", (squad_id, inviter_id))
        if not cur.fetchone():
            conn.close()
            raise PermissionError("FORBIDDEN: Only squad members can invite others.")
        cur.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (invitee_email.strip(),))
        invitee = cur.fetchone()
        if not invitee:
            conn.close()
            raise ValueError("User email not found.")
        cur.execute("SELECT COUNT(*) FROM social_squad_members WHERE squad_id = ?", (squad_id,))
        if cur.fetchone()[0] >= 5:
            conn.close()
            raise ValueError("Squad is full (maximum 5 members).")
        cur.execute("SELECT 1 FROM social_squad_members WHERE squad_id = ? AND user_id = ?", (squad_id, invitee["id"]))
        if cur.fetchone():
            conn.close()
            raise PermissionError("DUPLICATE_MEMBER: User is already in this squad.")

        inv_id = f"sqinv_{uuid.uuid4().hex[:10]}"
        cur.execute(
            "INSERT INTO social_squad_invitations (id, squad_id, inviter_id, invitee_id, status, created_at) VALUES (?, ?, ?, ?, 'PENDING', ?)",
            (inv_id, squad_id, inviter_id, invitee["id"], _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()
        self._notify(invitee["id"], "SQUAD_INVITE", "You received a new MINDMARK Squad invitation.")
        return {"invitation_id": inv_id, "squad_id": squad_id, "status": "PENDING"}

    def accept_invitation(self, invitation_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_squad_invitations WHERE id = ?", (invitation_id,))
        inv = cur.fetchone()
        if not inv:
            conn.close()
            raise ValueError("Invitation not found")
        if inv["invitee_id"] != user_id:
            conn.close()
            raise PermissionError("FORBIDDEN: Not your invitation.")
        if inv["status"] != "PENDING":
            conn.close()
            raise ValueError("Invitation already processed")

        cur.execute("SELECT COUNT(*) FROM social_squad_members WHERE squad_id = ?", (inv["squad_id"],))
        if cur.fetchone()[0] >= 5:
            conn.close()
            raise ValueError("Squad has reached its 5-member limit.")

        cur.execute(
            "INSERT OR IGNORE INTO social_squad_members (id, squad_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Market Analyst', ?)",
            (f"sqm_{uuid.uuid4().hex[:10]}", inv["squad_id"], user_id, _utc_now().isoformat()),
        )
        cur.execute("UPDATE social_squad_invitations SET status = 'ACCEPTED' WHERE id = ?", (invitation_id,))
        conn.commit()
        conn.close()
        return {"squad_id": inv["squad_id"], "status": "ACCEPTED"}

    def join_by_code(self, user_id: str, invite_code: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, max_members FROM social_squads WHERE UPPER(invite_code) = UPPER(?)", (invite_code.strip(),))
        sq = cur.fetchone()
        if not sq:
            conn.close()
            raise ValueError("Invalid squad invite code")
        cur.execute("SELECT COUNT(*) FROM social_squad_members WHERE squad_id = ?", (sq["id"],))
        if cur.fetchone()[0] >= sq["max_members"]:
            conn.close()
            raise ValueError("Squad is full (maximum 5 members).")
        cur.execute("SELECT 1 FROM social_squad_members WHERE squad_id = ? AND user_id = ?", (sq["id"], user_id))
        if cur.fetchone():
            conn.close()
            raise PermissionError("DUPLICATE_MEMBER: Already a member of this squad.")
        cur.execute(
            "INSERT INTO social_squad_members (id, squad_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Researcher', ?)",
            (f"sqm_{uuid.uuid4().hex[:10]}", sq["id"], user_id, _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()
        return self.get_squad_detail(sq["id"], user_id)

    def leave_squad(self, squad_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM social_squad_members WHERE squad_id = ? AND user_id = ?", (squad_id, user_id))
        conn.commit()
        conn.close()
        return {"squad_id": squad_id, "left": True}

    def assign_role(self, squad_id: str, actor_id: str, member_user_id: str, role: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM social_squad_members WHERE squad_id = ? AND user_id = ?", (squad_id, actor_id))
        if not cur.fetchone():
            conn.close()
            raise PermissionError("FORBIDDEN")
        cur.execute("UPDATE social_squad_members SET role = ? WHERE squad_id = ? AND user_id = ?", (role, squad_id, member_user_id))
        conn.commit()
        conn.close()
        return {"squad_id": squad_id, "member_user_id": member_user_id, "role": role}

    def create_battle(self, squad_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM social_squad_members WHERE squad_id = ? AND user_id = ?", (squad_id, user_id))
        if not cur.fetchone():
            conn.close()
            raise PermissionError("FORBIDDEN: Must belong to squad")
        scen = SQUAD_BATTLE_SCENARIOS.get(payload.get("scenario_id", "sb-macro-shock"), SQUAD_BATTLE_SCENARIOS["sb-macro-shock"])
        bid = f"bat_{uuid.uuid4().hex[:10]}"
        cur.execute(
            """
            INSERT INTO social_squad_battles (id, challenger_squad_id, title, scenario_id, scenario_json, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'OPEN', ?)
            """,
            (bid, squad_id, payload["title"], scen["id"], json.dumps(scen), _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()
        gamification_service.award_xp(user_id, f"sq_join:{bid}:{user_id}", "SQUAD_BATTLE_JOIN", "Joined Squad Battle", 15, source_id=bid)
        return {"battle_id": bid, "challenger_squad_id": squad_id, "scenario": scen, "status": "OPEN"}

    def join_battle(self, battle_id: str, squad_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_squad_battles WHERE id = ?", (battle_id,))
        bat = cur.fetchone()
        if not bat:
            conn.close()
            raise ValueError("Battle not found")
        if bat["challenger_squad_id"] == squad_id:
            conn.close()
            raise ValueError("Cannot join your own squad's battle")
        cur.execute("UPDATE social_squad_battles SET opponent_squad_id = ?, status = 'IN_PROGRESS' WHERE id = ?", (squad_id, battle_id))
        conn.commit()
        conn.close()
        gamification_service.award_xp(user_id, f"sq_join:{battle_id}:{user_id}", "SQUAD_BATTLE_JOIN", "Joined Squad Battle", 15, source_id=battle_id)
        return {"battle_id": battle_id, "opponent_squad_id": squad_id, "status": "IN_PROGRESS"}

    def contribute_to_battle(self, battle_id: str, squad_id: str, user_id: str, analysis: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT role FROM social_squad_members WHERE squad_id = ? AND user_id = ?", (squad_id, user_id))
        mem = cur.fetchone()
        if not mem:
            conn.close()
            raise PermissionError("FORBIDDEN: Not a member of this squad")
        cur.execute("SELECT * FROM social_squad_battles WHERE id = ?", (battle_id,))
        bat = cur.fetchone()
        if not bat:
            conn.close()
            raise ValueError("Battle not found")

        is_chal = bat["challenger_squad_id"] == squad_id
        col = "challenger_contributions_json" if is_chal else "opponent_contributions_json"
        contribs = json.loads(bat[col] or "[]")
        contribs = [c for c in contribs if c["user_id"] != user_id]
        contribs.append({"user_id": user_id, "role": mem["role"], "analysis": analysis.strip()})
        cur.execute(f"UPDATE social_squad_battles SET {col} = ? WHERE id = ?", (json.dumps(contribs), battle_id))
        conn.commit()
        conn.close()
        gamification_service.award_xp(user_id, f"sq_contrib:{battle_id}:{user_id}", "SQUAD_CONTRIBUTION", "Squad Role Contribution", 20, source_id=battle_id)
        return {"battle_id": battle_id, "squad_id": squad_id, "contributions_count": len(contribs)}

    def submit_battle(self, battle_id: str, squad_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_squad_battles WHERE id = ?", (battle_id,))
        bat = cur.fetchone()
        if not bat:
            conn.close()
            raise ValueError("Battle not found")

        is_chal = bat["challenger_squad_id"] == squad_id
        if not is_chal and bat["opponent_squad_id"] != squad_id:
            conn.close()
            raise PermissionError("FORBIDDEN: Squad is not in this battle")

        contribs = json.loads((bat["challenger_contributions_json"] if is_chal else bat["opponent_contributions_json"]) or "[]")
        r_score = min(100.0, 55.0 + len(payload["team_reasoning"].strip()) * 0.25)
        k_score = min(100.0, 55.0 + len(payload["risk_plan"].strip()) * 0.30)
        e_score = min(100.0, 55.0 + len(payload["evidence_summary"].strip()) * 0.30)
        role_score = min(100.0, 55.0 + len(contribs) * 15.0)
        refl_score = min(100.0, 60.0 + len((payload.get("final_reflection") or "").strip()) * 0.4)
        total = round(r_score * 0.30 + k_score * 0.25 + e_score * 0.20 + role_score * 0.15 + refl_score * 0.10, 1)

        if is_chal:
            cur.execute("UPDATE social_squad_battles SET challenger_final_json = ?, challenger_score = ? WHERE id = ?", (json.dumps(payload), total, battle_id))
        else:
            cur.execute("UPDATE social_squad_battles SET opponent_final_json = ?, opponent_score = ? WHERE id = ?", (json.dumps(payload), total, battle_id))

        cur.execute("SELECT * FROM social_squad_battles WHERE id = ?", (battle_id,))
        updated = cur.fetchone()
        winner = None
        if updated["challenger_score"] > 0 and updated["opponent_score"] > 0:
            winner = updated["challenger_squad_id"] if updated["challenger_score"] >= updated["opponent_score"] else updated["opponent_squad_id"]
            cur.execute(
                "UPDATE social_squad_battles SET status = 'COMPLETED', winner_squad_id = ?, completed_at = ? WHERE id = ?",
                (winner, _utc_now().isoformat(), battle_id),
            )
            cur.execute("SELECT user_id FROM social_squad_members WHERE squad_id = ?", (winner,))
            win_members = [r["user_id"] for r in cur.fetchall()]
        else:
            win_members = []
        conn.commit()
        conn.close()

        for uid in win_members:
            gamification_service.award_xp(uid, f"sq_win:{battle_id}:{uid}", "SQUAD_BATTLE_WIN", "Won Official Squad Battle", 50, source_id=battle_id)

        return {"battle_id": battle_id, "squad_id": squad_id, "team_score": total, "individual_contributions": contribs, "winner_squad_id": winner}

    # -------------------------------------------------------------------------
    # FEATURE B: FRIEND SEARCH & SIDE-BY-SIDE CHALLENGE COMPARISON
    # -------------------------------------------------------------------------
    def search_users_by_username(self, query: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT p.user_id, p.username, u.full_name, u.avatar_url
            FROM social_privacy_settings p
            JOIN users u ON u.id = p.user_id
            WHERE LOWER(p.username) LIKE LOWER(?) OR LOWER(u.full_name) LIKE LOWER(?)
            LIMIT 15
            """,
            (f"%{query.strip()}%", f"%{query.strip()}%"),
        )
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    def submit_friend_challenge(self, challenge_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_friend_challenges WHERE id = ?", (challenge_id,))
        fc = cur.fetchone()
        if not fc:
            conn.close()
            raise ValueError("Friend challenge not found")
        if user_id not in (fc["creator_id"], fc["opponent_id"]):
            conn.close()
            raise PermissionError("FORBIDDEN: Not a participant in this friend challenge.")

        cur.execute("SELECT * FROM arena_contests WHERE id = ?", (fc["contest_id"],))
        contest = cur.fetchone()
        scores = arena_service._score_contest_submission(contest, payload)
        reasoning_text = payload.get("reasoning") or payload.get("mitigation_plan") or payload.get("argument") or ""

        if user_id == fc["creator_id"]:
            cur.execute(
                "UPDATE arena_friend_challenges SET creator_score = ?, creator_submission_json = ?, creator_reasoning = ?, status = 'IN_PROGRESS' WHERE id = ?",
                (scores["total_score"], json.dumps(scores), reasoning_text, challenge_id),
            )
        else:
            cur.execute(
                "UPDATE arena_friend_challenges SET opponent_score = ?, opponent_submission_json = ?, opponent_reasoning = ?, status = 'IN_PROGRESS' WHERE id = ?",
                (scores["total_score"], json.dumps(scores), reasoning_text, challenge_id),
            )

        cur.execute("SELECT * FROM arena_friend_challenges WHERE id = ?", (challenge_id,))
        upd = cur.fetchone()
        if upd["creator_score"] is not None and upd["opponent_score"] is not None:
            winner = upd["creator_id"] if upd["creator_score"] >= upd["opponent_score"] else upd["opponent_id"]
            cur.execute(
                "UPDATE arena_friend_challenges SET status = 'COMPLETED', winner_id = ?, completed_at = ? WHERE id = ?",
                (winner, _utc_now().isoformat(), challenge_id),
            )
        conn.commit()
        conn.close()
        gamification_service.award_xp(user_id, f"fc_done:{challenge_id}:{user_id}", "FRIEND_CHALLENGE", "Completed Friend Challenge", 25, source_id=challenge_id)
        return {"challenge_id": challenge_id, **scores}

    def get_friend_challenge_results(self, challenge_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM arena_friend_challenges WHERE id = ?", (challenge_id,))
        fc = cur.fetchone()
        conn.close()
        if not fc:
            raise ValueError("Friend challenge not found")
        if user_id not in (fc["creator_id"], fc["opponent_id"]):
            raise PermissionError("FORBIDDEN: Not a participant in this friend challenge.")
        both_done = fc["creator_score"] is not None and fc["opponent_score"] is not None
        if not both_done:
            return {"challenge_id": challenge_id, "status": fc["status"], "results_ready": False, "message": "Side-by-side results unlock once both participants submit."}

        share_r = bool(fc["share_reasoning"])
        return {
            "challenge_id": challenge_id,
            "status": fc["status"],
            "results_ready": True,
            "winner_id": fc["winner_id"],
            "creator": {
                "user_id": fc["creator_id"],
                "breakdown": json.loads(fc["creator_submission_json"] or "{}"),
                "reasoning": fc["creator_reasoning"] if (share_r or user_id == fc["creator_id"]) else "Private",
            },
            "opponent": {
                "user_id": fc["opponent_id"],
                "breakdown": json.loads(fc["opponent_submission_json"] or "{}"),
                "reasoning": fc["opponent_reasoning"] if (share_r or user_id == fc["opponent_id"]) else "Private",
            },
        }

    # -------------------------------------------------------------------------
    # FEATURE C: DECISION DEBATES
    # -------------------------------------------------------------------------
    def list_debates(self, user_id: str) -> List[Dict[str, Any]]:
        self._ensure_seeded()
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_debates ORDER BY created_at DESC LIMIT 30")
        debates = []
        for d in cur.fetchall():
            cur.execute(
                """
                SELECT s.*, p.username
                FROM social_debate_submissions s
                LEFT JOIN social_privacy_settings p ON p.user_id = s.user_id
                WHERE s.debate_id = ?
                ORDER BY s.rubric_score DESC
                """,
                (d["id"],),
            )
            subs = [
                {
                    "id": s["id"],
                    "username": s["username"] or "learner",
                    "interpretation": s["interpretation"],
                    "evidence": s["evidence"],
                    "risks": s["risks"],
                    "counterarguments": s["counterarguments"],
                    "invalidation_info": s["invalidation_info"],
                    "rubric_score": s["rubric_score"],
                    "ai_feedback": s["ai_feedback"],
                    "ai_source": s["ai_source"],
                    "reactions": json.loads(s["reactions_json"] or "{}"),
                }
                for s in cur.fetchall()
            ]
            debates.append({**dict(d), "submissions": subs})
        conn.close()
        return debates

    def create_debate(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        did = f"deb_{uuid.uuid4().hex[:10]}"
        now_iso = _utc_now().isoformat()
        conn = get_connection()
        conn.execute(
            "INSERT INTO social_debates (id, creator_id, title, case_text, format, university_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)",
            (did, user_id, payload["title"], payload["case_text"], payload["format"], payload.get("university_name"), now_iso),
        )
        conn.commit()
        conn.close()
        return {"id": did, **payload, "status": "OPEN", "created_at": now_iso}

    def submit_debate_entry(self, debate_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_seeded()
        self._ensure_privacy(user_id)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_debates WHERE id = ?", (debate_id,))
        deb = cur.fetchone()
        if not deb:
            conn.close()
            raise ValueError("Debate not found")
        cur.execute("SELECT id FROM social_debate_submissions WHERE debate_id = ? AND user_id = ?", (debate_id, user_id))
        if cur.fetchone():
            conn.close()
            raise PermissionError("DUPLICATE_SUBMISSION: You already submitted an entry for this debate.")

        score = round(
            min(100.0, 58.0 + len(payload["evidence"]) * 0.12 + len(payload["risks"]) * 0.10 + len(payload["counterarguments"]) * 0.10 + len(payload["invalidation_info"]) * 0.08),
            1,
        )
        feedback = f"Debate rubric score {score}/100 based on evidence, risk awareness, counterarguments, and uncertainty recognition."
        ai_source = "deterministic_backend"
        if payload.get("use_ai", True) and settings.GEMINI_API_KEY:
            try:
                import httpx
                model = settings.GEMINI_MODEL or "gemini-3.6-flash"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
                resp = httpx.post(
                    url,
                    json={"contents": [{"parts": [{"text": f"In 2 concise sentences, summarize strengths and gaps of this debate argument without picking a winner or changing score {score}/100: {payload['interpretation'][:300]}"}]}], "generationConfig": {"maxOutputTokens": 100, "thinkingConfig": {"thinkingBudget": 0}}},
                    timeout=8.0,
                )
                if resp.status_code == 200:
                    cands = resp.json().get("candidates") or []
                    if cands:
                        feedback = cands[0]["content"]["parts"][0]["text"].strip()
                        ai_source = "gemini"
            except Exception:
                ai_source = "deterministic_fallback"
        elif payload.get("use_ai", True):
            ai_source = "deterministic_fallback"

        sid = f"dsub_{uuid.uuid4().hex[:10]}"
        cur.execute(
            """
            INSERT INTO social_debate_submissions (
                id, debate_id, user_id, interpretation, evidence, risks, counterarguments,
                invalidation_info, rubric_score, ai_feedback, ai_source, reactions_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)
            """,
            (sid, debate_id, user_id, payload["interpretation"], payload["evidence"], payload["risks"], payload["counterarguments"], payload["invalidation_info"], score, feedback, ai_source, _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()
        gamification_service.award_xp(user_id, f"deb_sub:{debate_id}:{user_id}", "DEBATE_SUBMISSION", "Submitted Decision Debate", 30, source_id=debate_id, counts_for_streak=True)
        return {"submission_id": sid, "debate_id": debate_id, "rubric_score": score, "ai_feedback": feedback, "ai_source": ai_source}

    def react_to_debate(self, debate_id: str, submission_id: str, reaction: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT reactions_json FROM social_debate_submissions WHERE id = ? AND debate_id = ?", (submission_id, debate_id))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise ValueError("Debate submission not found")
        rx = json.loads(row["reactions_json"] or "{}")
        rx[reaction] = rx.get(reaction, 0) + 1
        cur.execute("UPDATE social_debate_submissions SET reactions_json = ? WHERE id = ?", (json.dumps(rx), submission_id))
        conn.commit()
        conn.close()
        return {"submission_id": submission_id, "reactions": rx}

    # -------------------------------------------------------------------------
    # FEATURE D: CROWD MIRROR (PRIVACY + MIN SAMPLE SIZE = 3)
    # -------------------------------------------------------------------------
    def list_crowd_scenarios(self, user_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT scenario_id FROM social_crowd_submissions WHERE user_id = ? AND is_practice = 0", (user_id,))
        done = {r["scenario_id"] for r in cur.fetchall()}
        conn.close()
        return [{**s, "user_submitted": s["id"] in done} for s in CROWD_MIRROR_SCENARIOS]

    def submit_crowd_mirror(self, scenario_id: str, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        scen = next((s for s in CROWD_MIRROR_SCENARIOS if s["id"] == scenario_id), None)
        if not scen:
            raise ValueError("Crowd Mirror scenario not found")
        if payload["action"] not in scen["options"]:
            raise ValueError("Invalid action for scenario")

        is_pr = 1 if payload.get("is_practice") else 0
        conn = get_connection()
        cur = conn.cursor()
        if not is_pr:
            cur.execute("SELECT id FROM social_crowd_submissions WHERE scenario_id = ? AND user_id = ? AND is_practice = 0", (scenario_id, user_id))
            if cur.fetchone():
                conn.close()
                raise PermissionError("DUPLICATE_SUBMISSION: Official Crowd Mirror response already locked.")

        cid = f"cm_{uuid.uuid4().hex[:10]}"
        cur.execute(
            """
            INSERT OR REPLACE INTO social_crowd_submissions (
                id, scenario_id, user_id, is_practice, action, risk_category, reasoning, reflection_text, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (cid, scenario_id, user_id, is_pr, payload["action"], payload["risk_category"], payload["reasoning"], payload.get("reflection_text", ""), _utc_now().isoformat()),
        )
        conn.commit()
        conn.close()
        if not is_pr:
            gamification_service.award_xp(user_id, f"crowd:{scenario_id}:{user_id}", "CROWD_MIRROR", "Crowd Mirror Reflection", 20, source_id=scenario_id, counts_for_streak=True)
        return self.get_crowd_mirror_results(scenario_id, user_id, allow_practice=bool(is_pr))

    def get_crowd_mirror_results(self, scenario_id: str, user_id: str, allow_practice: bool = False) -> Dict[str, Any]:
        scen = next((s for s in CROWD_MIRROR_SCENARIOS if s["id"] == scenario_id), None)
        if not scen:
            raise ValueError("Crowd Mirror scenario not found")

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_crowd_submissions WHERE scenario_id = ? AND user_id = ? AND is_practice = 0", (scenario_id, user_id))
        mine = cur.fetchone()
        if not mine and not allow_practice:
            conn.close()
            raise PermissionError("LOCKED: Submit your official decision before viewing community aggregate results.")

        cur.execute("SELECT action, risk_category FROM social_crowd_submissions WHERE scenario_id = ? AND is_practice = 0", (scenario_id,))
        official_rows = cur.fetchall()
        conn.close()

        n = len(official_rows)
        insufficient = n < CROWD_MIN_SAMPLE_SIZE
        action_pcts = None
        risk_pcts = None
        if not insufficient and n > 0:
            a_counts, r_counts = {}, {}
            for r in official_rows:
                a_counts[r["action"]] = a_counts.get(r["action"], 0) + 1
                r_counts[r["risk_category"]] = r_counts.get(r["risk_category"], 0) + 1
            action_pcts = {k: round((v / n) * 100.0, 1) for k, v in a_counts.items()}
            risk_pcts = {k: round((v / n) * 100.0, 1) for k, v in r_counts.items()}

        return {
            "scenario_id": scenario_id,
            "participants_count": n,
            "minimum_sample_size": CROWD_MIN_SAMPLE_SIZE,
            "insufficient_sample": insufficient,
            "sample_notice": f"Insufficient sample size ({n}/{CROWD_MIN_SAMPLE_SIZE} official participants) to display percentages." if insufficient else f"Aggregated across {n} official participants. Popularity does not guarantee correctness.",
            "action_percentages": action_pcts,
            "risk_percentages": risk_pcts,
            "your_action": mine["action"] if mine else None,
            "your_risk_category": mine["risk_category"] if mine else None,
            "educational_note": scen["educational_note"],
            "outcome_note": scen["outcome_note"],
        }

    # -------------------------------------------------------------------------
    # FEATURE F: COMMUNITY FEED, MODERATION, PRIVACY & NOTIFICATIONS
    # -------------------------------------------------------------------------
    def get_feed(self, user_id: str, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        offset = max(0, (page - 1) * limit)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT p.*, pr.username, u.full_name
            FROM social_posts p
            JOIN users u ON u.id = p.user_id
            LEFT JOIN social_privacy_settings pr ON pr.user_id = p.user_id
            WHERE p.is_flagged = 0
              AND p.user_id NOT IN (SELECT blocked_user_id FROM social_blocks WHERE user_id = ?)
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
            """,
            (user_id, limit, offset),
        )
        posts = []
        for r in cur.fetchall():
            cur.execute("SELECT c.*, pr.username FROM social_comments c LEFT JOIN social_privacy_settings pr ON pr.user_id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at ASC", (r["id"],))
            comments = [{"id": c["id"], "username": c["username"] or "learner", "content": c["content"], "created_at": c["created_at"]} for c in cur.fetchall()]
            posts.append({
                "id": r["id"],
                "user_id": r["user_id"],
                "username": r["username"] or "learner",
                "post_type": r["post_type"],
                "title": r["title"],
                "content": r["content"],
                "reactions": json.loads(r["reactions_json"] or "{}"),
                "comments": comments,
                "is_mine": r["user_id"] == user_id,
                "created_at": r["created_at"],
            })
        conn.close()
        return {"posts": posts, "page": page, "limit": limit}

    def create_post(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_privacy(user_id)
        if any(phrase in payload["content"].lower() for phrase in ("guaranteed returns", "buy now 100% profit")):
            raise ValueError("Post blocked by content moderation: misleading financial claims are prohibited.")
        pid = f"spost_{uuid.uuid4().hex[:10]}"
        now_iso = _utc_now().isoformat()
        conn = get_connection()
        conn.execute(
            "INSERT INTO social_posts (id, user_id, post_type, title, content, shared_ref_id, reactions_json, created_at) VALUES (?, ?, ?, ?, ?, ?, '{}', ?)",
            (pid, user_id, payload["post_type"], payload["title"], payload["content"], payload.get("shared_ref_id"), now_iso),
        )
        conn.commit()
        conn.close()
        return {"id": pid, **payload, "created_at": now_iso}

    def comment_post(self, post_id: str, user_id: str, content: str) -> Dict[str, Any]:
        self._ensure_privacy(user_id)
        cid = f"scmt_{uuid.uuid4().hex[:10]}"
        conn = get_connection()
        conn.execute("INSERT INTO social_comments (id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)", (cid, post_id, user_id, content, _utc_now().isoformat()))
        conn.commit()
        conn.close()
        return {"comment_id": cid, "post_id": post_id, "content": content}

    def react_post(self, post_id: str, reaction: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT reactions_json FROM social_posts WHERE id = ?", (post_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise ValueError("Post not found")
        rx = json.loads(row["reactions_json"] or "{}")
        rx[reaction] = rx.get(reaction, 0) + 1
        cur.execute("UPDATE social_posts SET reactions_json = ? WHERE id = ?", (json.dumps(rx), post_id))
        conn.commit()
        conn.close()
        return {"post_id": post_id, "reactions": rx}

    def report_content(self, user_id: str, target_type: str, target_id: str, reason: str) -> Dict[str, Any]:
        rid = f"srep_{uuid.uuid4().hex[:10]}"
        conn = get_connection()
        conn.execute("INSERT INTO social_reports (id, reporter_id, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)", (rid, user_id, target_type, target_id, reason, _utc_now().isoformat()))
        conn.commit()
        conn.close()
        return {"report_id": rid, "status": "REPORTED"}

    def block_user(self, user_id: str, target_user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        conn.execute("INSERT OR IGNORE INTO social_blocks (id, user_id, blocked_user_id, created_at) VALUES (?, ?, ?, ?)", (f"blk_{uuid.uuid4().hex[:10]}", user_id, target_user_id, _utc_now().isoformat()))
        conn.commit()
        conn.close()
        return {"blocked_user_id": target_user_id}

    def delete_post(self, post_id: str, user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM social_posts WHERE id = ?", (post_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise ValueError("Post not found")
        if row["user_id"] != user_id:
            conn.close()
            raise PermissionError("FORBIDDEN: Cannot delete another user's post")
        cur.execute("DELETE FROM social_posts WHERE id = ?", (post_id,))
        conn.commit()
        conn.close()
        return {"deleted": True, "post_id": post_id}

    # -------------------------------------------------------------------------
    # PUBLIC PROFILE & PRIVACY SETTINGS & NOTIFICATIONS
    # -------------------------------------------------------------------------
    def get_public_profile(self, username: str) -> Dict[str, Any]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_privacy_settings WHERE LOWER(username) = LOWER(?)", (username,))
        priv = cur.fetchone()
        if not priv:
            conn.close()
            raise ValueError("Profile not found")
        uid = priv["user_id"]
        cur.execute("SELECT total_learning_xp, avatar_url FROM users WHERE id = ?", (uid,))
        u = cur.fetchone()
        lvl = compute_level_info(u["total_learning_xp"] if u else 0)

        achievements = []
        if priv["show_achievements"]:
            cur.execute("SELECT name, rarity, unlocked_at FROM gamification_badges WHERE user_id = ?", (uid,))
            achievements = [dict(r) for r in cur.fetchall()]

        arena_rank = None
        university = None
        cur.execute("SELECT arena_points, league, university_name FROM arena_user_stats WHERE user_id = ?", (uid,))
        ast = cur.fetchone()
        if ast:
            if priv["show_arena_rank"]:
                arena_rank = {"arena_points": ast["arena_points"], "league": ast["league"]}
            if priv["show_university"]:
                university = {"name": ast["university_name"], "affiliation_status": "self-reported"}

        squads = []
        if priv["show_squads"]:
            cur.execute("SELECT s.name, m.role FROM social_squads s JOIN social_squad_members m ON m.squad_id = s.id WHERE m.user_id = ?", (uid,))
            squads = [dict(r) for r in cur.fetchall()]
        conn.close()

        return {
            "username": priv["username"],
            "avatar_url": u["avatar_url"] if u else None,
            "level": lvl["current_level"],
            "level_title": lvl["level_title"],
            "university": university,
            "arena_rank": arena_rank,
            "public_achievements": achievements,
            "squad_memberships": squads,
        }

    def patch_privacy(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_privacy(user_id)
        conn = get_connection()
        cur = conn.cursor()
        updates, params = [], []
        for field in ("username", "show_university", "show_squads", "show_achievements", "show_arena_rank", "notify_squads", "notify_challenges", "notify_debates"):
            if payload.get(field) is not None:
                updates.append(f"{field} = ?")
                params.append(payload[field] if field == "username" else (1 if payload[field] else 0))
        if updates:
            updates.append("updated_at = ?")
            params.append(_utc_now().isoformat())
            params.append(user_id)
            cur.execute(f"UPDATE social_privacy_settings SET {', '.join(updates)} WHERE user_id = ?", tuple(params))
            conn.commit()
        conn.close()
        return self._ensure_privacy(user_id)

    def get_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM social_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", (user_id,))
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows


social_service = SocialService()
