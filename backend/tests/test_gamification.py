import sys
import uuid
import json
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
for p in (str(REPO_ROOT), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_connection
from backend.app.services.gamification_service import (
    gamification_service,
    compute_level_info,
    LEVEL_TITLES,
)

client = TestClient(app)


def register_user(prefix: str = "gam") -> tuple[str, str]:
    email = f"{prefix}_{uuid.uuid4().hex[:10]}@mindmark.test"
    resp = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": f"Learner {prefix.title()}",
            "password": "TestPassword123!",
            "experience_level": "beginner",
        },
    )
    assert resp.status_code in (200, 201), resp.text
    data = resp.json().get("data", resp.json())
    return data["access_token"], data["user"]["id"]


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_gamification_auth_required():
    for method, url in [
        ("GET", "/api/gamification/profile"),
        ("GET", "/api/gamification/levels"),
        ("GET", "/api/gamification/missions"),
        ("GET", "/api/gamification/skill-tree"),
        ("GET", "/api/gamification/badges"),
        ("GET", "/api/gamification/streak"),
        ("GET", "/api/gamification/seasons"),
        ("GET", "/api/gamification/xp-history"),
    ]:
        r = client.request(method, url)
        assert r.status_code == 401, f"Expected 401 for {method} {url}, got {r.status_code}"


def test_levels_and_idempotent_xp():
    assert len(LEVEL_TITLES) == 20
    assert compute_level_info(0)["current_level"] == 1
    assert compute_level_info(0)["level_title"] == "Beginner"
    assert compute_level_info(10000)["current_level"] == 20
    assert compute_level_info(10000)["level_title"] == "MINDMARK Elite"

    token, uid = register_user("xp")
    r1 = gamification_service.award_xp(uid, f"idem:{uid}:1", "LESSON_COMPLETE", "Intro Lesson", 50, counts_for_streak=True)
    assert r1["awarded"] is True and r1["xp_awarded"] == 50

    # Duplicate idempotency key must award 0 XP
    r2 = gamification_service.award_xp(uid, f"idem:{uid}:1", "LESSON_COMPLETE", "Intro Lesson", 50, counts_for_streak=True)
    assert r2["awarded"] is False and r2["duplicate"] is True and r2["xp_awarded"] == 0

    hist = client.get("/api/gamification/xp-history", headers=headers(token)).json()["data"]
    assert hist["total"] == 1


def test_skill_tree_prerequisites_and_badges():
    token, uid = register_user("skill")

    # Cannot complete mf-2 before mf-1
    bad = client.post("/api/gamification/skills/mf-2/complete", headers=headers(token), json={})
    assert bad.status_code == 400

    # Complete mf-1 -> unlocks First Lesson badge
    ok1 = client.post("/api/gamification/skills/mf-1/complete", headers=headers(token), json={})
    assert ok1.status_code == 200, ok1.text
    assert ok1.json()["data"]["xp_awarded"] == 50

    # Duplicate skill completion blocked with 409
    dup = client.post("/api/gamification/skills/mf-1/complete", headers=headers(token), json={})
    assert dup.status_code == 409

    # Now mf-2 succeeds
    ok2 = client.post("/api/gamification/skills/mf-2/complete", headers=headers(token), json={})
    assert ok2.status_code == 200

    badges = client.get("/api/gamification/badges", headers=headers(token)).json()["data"]
    unlocked_ids = {b["badge_id"] for b in badges["badges"] if b["unlocked"]}
    assert "first_lesson" in unlocked_ids


def test_missions_personalization_isolation_and_streak():
    t1, u1 = register_user("mis1")
    t2, u2 = register_user("mis2")

    # Seed Phase 1 FOMO evidence for u1
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cur = conn.cursor()
    for i in range(4):
        eid = f"ev_g_{uuid.uuid4().hex[:8]}"
        cur.execute(
            """
            INSERT INTO decision_events (
                id, user_id, client_event_id, symbol, sector, action,
                execution_price, quantity, total_value,
                portfolio_value_before, portfolio_value_after,
                cash_before, cash_after, market_change_pct, recent_drawdown_pct,
                stated_reason, confidence_level, viewed_info_json, created_at
            ) VALUES (?, ?, ?, 'RELIANCE', 'Energy', 'BUY', 2800, 10, 28000, 100000, 100000, 50000, 22000, 4.5, -1.0, 'FOMO', 5, '[]', ?)
            """,
            (eid, u1, f"c_{eid}", now),
        )
    cur.execute(
        """
        INSERT INTO behavior_patterns (
            id, user_id, pattern_key, pattern_name, detected, status,
            severity, confidence, evidence_count, observed_period,
            evidence_event_ids_json, what_happened, why_it_matters,
            what_user_can_learn, recommended_challenge, updated_at
        ) VALUES (?, ?, 'fomo_chasing', 'FOMO Chasing', 1, 'DETECTED', 'HIGH', 0.85, 4, '7d', '[]', 'w', 'y', 'l', 'fomo-trap', ?)
        """,
        (f"pat_{uuid.uuid4().hex[:8]}", u1, now),
    )
    conn.commit()
    conn.close()

    m1 = client.get("/api/gamification/missions", headers=headers(t1)).json()["data"]
    assert any(m["is_personalized"] for m in m1["daily_missions"])

    target_mid = m1["daily_missions"][0]["id"]
    # User 2 cannot complete User 1's mission (403)
    assert client.post(f"/api/gamification/missions/{target_mid}/complete", headers=headers(t2), json={}).status_code == 403

    # User 1 completes mission -> awards XP & counts toward streak
    comp = client.post(f"/api/gamification/missions/{target_mid}/complete", headers=headers(t1), json={})
    assert comp.status_code == 200
    assert comp.json()["data"]["xp_awarded"] > 0

    # Trading must NEVER increment streak
    s_before = client.get("/api/gamification/streak", headers=headers(t2)).json()["data"]["current_streak"]
    gamification_service.record_learning_activity(u2, "TRADE_EXECUTED")
    s_after = client.get("/api/gamification/streak", headers=headers(t2)).json()["data"]["current_streak"]
    assert s_before == s_after == 0

    # Gemini fallback verified on profile
    with patch("httpx.post", side_effect=RuntimeError("Simulated Gemini outage")):
        prof = client.get("/api/gamification/profile?use_ai=true", headers=headers(t1))
        assert prof.status_code == 200
        assert prof.json()["data"]["ai_source"] == "deterministic_fallback"


def main():
    tests = [
        test_gamification_auth_required,
        test_levels_and_idempotent_xp,
        test_skill_tree_prerequisites_and_badges,
        test_missions_personalization_isolation_and_streak,
    ]
    for fn in tests:
        print(f"Running {fn.__name__}...")
        fn()
        print(f"  PASS: {fn.__name__}")
    print(f"\nAll {len(tests)} Phase 5 Gamification tests passed!")


if __name__ == "__main__":
    main()
