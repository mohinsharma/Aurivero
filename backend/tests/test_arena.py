import sys
import uuid
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
for p in (str(REPO_ROOT), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def register_user(prefix: str = "arena") -> tuple[str, str, str]:
    email = f"{prefix}_{uuid.uuid4().hex[:10]}@mindmark.test"
    resp = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": f"Arena {prefix.title()}",
            "password": "TestPassword123!",
            "experience_level": "intermediate",
        },
    )
    assert resp.status_code in (200, 201), resp.text
    data = resp.json().get("data", resp.json())
    return data["access_token"], data["user"]["id"], email


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_arena_auth_required():
    for method, url in [
        ("GET", "/api/arena/dashboard"),
        ("GET", "/api/arena/leaderboard?scope=global"),
        ("POST", "/api/arena/university"),
        ("POST", "/api/arena/friends"),
    ]:
        r = client.request(method, url)
        assert r.status_code == 401, f"Expected 401 for {method} {url}, got {r.status_code}"


def test_arena_dashboard_and_server_countdown():
    token, _, _ = register_user("dash")
    resp = client.get("/api/arena/dashboard", headers=headers(token))
    assert resp.status_code == 200, resp.text
    d = resp.json()["data"]
    assert d["hero_headline"] == "Your decisions. Your competition. Your rank."
    assert d["tagline"] == "Think smarter. Decide better. Rise through the ranks."
    assert d["server_now"]
    assert len(d["active_contests"]) >= 6
    assert len(d["upcoming_contests"]) >= 1
    assert d["upcoming_contests"][0]["starts_at"] > d["server_now"]


def test_all_six_contest_types_and_duplicate_prevention():
    token, _, _ = register_user("all6")

    submissions = [
        (
            "arena-crash-survivor-1",
            {
                "duration_sec": 95,
                "stage_decisions": [
                    {
                        "stage_index": 0,
                        "action": "HOLD",
                        "reasoning": "Macro yield spike has not altered company earnings guidance.",
                        "reviewed_info": ["macro_note", "fundamentals"],
                        "confidence_level": 4,
                    },
                    {
                        "stage_index": 1,
                        "action": "REBALANCE",
                        "reasoning": "TCS buyback confirms cash strength; keeping 25% cap.",
                        "reviewed_info": ["buyback_filing", "risk_rules"],
                        "confidence_level": 4,
                    },
                ],
                "use_ai": True,
            },
        ),
        (
            "arena-fomo-trap-1",
            {
                "duration_sec": 60,
                "stage_decisions": [
                    {
                        "stage_index": 0,
                        "action": "WAIT",
                        "reasoning": "96x P/E with no NSE filing and 24% promoter pledge is high risk.",
                        "reviewed_info": ["valuation", "exchange_check", "risk_note"],
                        "confidence_level": 5,
                    }
                ],
                "use_ai": True,
            },
        ),
        (
            "arena-portfolio-architect-1",
            {
                "duration_sec": 110,
                "allocation": {
                    "TCS": 20,
                    "HDFCBANK": 20,
                    "SUNPHARMA": 15,
                    "ITC": 15,
                    "NIFTYBEES": 20,
                    "SMALLCAPX": 10,
                },
                "reasoning": "Balanced across 5+ sectors with low small-cap beta exposure.",
                "reviewed_info": ["sector_cap", "beta_note"],
                "use_ai": True,
            },
        ),
        (
            "arena-decision-pressure-1",
            {
                "duration_sec": 140,
                "stage_decisions": [
                    {
                        "stage_index": 0,
                        "action": "REDUCE_RATE_SENSITIVE",
                        "reasoning": "Trimmed leveraged rate-sensitive names after MPC surprise.",
                        "reviewed_info": ["policy_text", "exposure_check"],
                        "confidence_level": 4,
                    },
                    {
                        "stage_index": 1,
                        "action": "HOLD",
                        "reasoning": "Core CPI anchored at 4.1% so no panic liquidation needed.",
                        "reviewed_info": ["core_cpi"],
                        "confidence_level": 4,
                    },
                ],
                "use_ai": True,
            },
        ),
        (
            "arena-analyst-duel-1",
            {
                "duration_sec": 180,
                "argument": "Wait for EV battery capex inflection before adding at 22x forward P/E.",
                "evidence": "EV EBITDA is -6% with ₹4,200 Cr capex and negative FCF this quarter.",
                "risks": "SUV demand slowdown or battery cost inflation could compress multiples.",
                "use_ai": True,
            },
        ),
        (
            "arena-bias-buster-1",
            {
                "duration_sec": 75,
                "selected_bias": "Loss Chasing (Revenge Trading)",
                "mitigation_plan": "Enforce a 24-hour cooling-off rule after any realized loss and cap position size at 10%.",
                "use_ai": True,
            },
        ),
    ]

    with patch("httpx.post", side_effect=RuntimeError("Simulated Gemini outage")):
        for cid, payload in submissions:
            detail = client.get(f"/api/arena/contests/{cid}", headers=headers(token))
            assert detail.status_code == 200, detail.text
            assert "expected_bias" not in str(detail.json()["data"]).lower()

            res = client.post(f"/api/arena/contests/{cid}/submit", headers=headers(token), json=payload)
            assert res.status_code == 200, f"Submit failed for {cid}: {res.text}"
            out = res.json()["data"]
            assert out["total_score"] >= 70
            assert out["arena_points_awarded"] > 0
            assert out["xp_awarded"] > 0
            assert out["ai_source"] == "deterministic_fallback"

    # Duplicate submission blocked with 409
    dup = client.post(
        "/api/arena/contests/arena-fomo-trap-1/submit",
        headers=headers(token),
        json=submissions[1][1],
    )
    assert dup.status_code == 409

    # Upcoming contest submission blocked with 400
    upc = client.post(
        "/api/arena/contests/arena-upcoming-university-cup/submit",
        headers=headers(token),
        json=submissions[2][1],
    )
    assert upc.status_code == 400


def test_duels_leagues_and_friends_leaderboard():
    t1, u1, e1 = register_user("duel1")
    t2, u2, e2 = register_user("duel2")

    # Set same university for both
    assert client.post("/api/arena/university", headers=headers(t1), json={"university_name": "IIT Delhi"}).status_code == 200
    assert client.post("/api/arena/university", headers=headers(t2), json={"university_name": "IIT Delhi"}).status_code == 200

    # Add friend
    fr = client.post("/api/arena/friends", headers=headers(t1), json={"friend_email": e2})
    assert fr.status_code == 200, fr.text

    # Open 1v1 duel created by u1 and joined by u2
    d_create = client.post(
        "/api/arena/duels/create",
        headers=headers(t1),
        json={
            "contest_id": "arena-analyst-duel-1",
            "argument": "Hold neutral stance until EV margins break even.",
            "evidence": "Net debt/equity 0.35x and negative quarterly FCF.",
            "risks": "Capex overrun or slower EV adoption.",
            "auto_match_benchmark": False,
            "use_ai": False,
        },
    )
    assert d_create.status_code == 200, d_create.text
    duel_id = d_create.json()["data"]["duel_id"]

    d_join = client.post(
        f"/api/arena/duels/{duel_id}/join",
        headers=headers(t2),
        json={
            "argument": "Accumulate gradually on SUV volume strength while sizing conservatively.",
            "evidence": "Revenue +14% YoY with SUV volume +19% and moderate 0.35x net debt/equity.",
            "risks": "Valuation at 22x vs 18x historical leaves little margin if EV losses widen.",
            "use_ai": False,
        },
    )
    assert d_join.status_code == 200, d_join.text
    assert d_join.json()["data"]["status"] == "COMPLETED"

    # Check Global, University, and Friends leaderboards
    for scope in ("global", "university", "friends"):
        lb = client.get(f"/api/arena/leaderboard?scope={scope}", headers=headers(t1))
        assert lb.status_code == 200, lb.text
        entries = lb.json()["data"]["entries"]
        assert len(entries) >= 1
        if scope == "friends":
            ids = {e["user_id"] for e in entries}
            assert u1 in ids and u2 in ids


def test_lifecycle_admin_practice_privacy_and_friend_challenges():
    from backend.app.database import get_connection
    t1, u1, e1 = register_user("life1")
    t2, u2, e2 = register_user("life2")
    t3, u3, e3 = register_user("life3")

    # Non-admin cannot create contest (403)
    non_admin = client.post(
        "/api/arena/contests",
        headers=headers(t1),
        json={
            "contest_type": "FOMO_TRAP",
            "title": "Unauthorized Contest",
            "description": "Should fail with 403",
            "difficulty": "Beginner",
        },
    )
    assert non_admin.status_code == 403

    # Promote u1 to ADMIN and create a contest
    conn = get_connection()
    conn.execute("UPDATE users SET role = 'ADMIN' WHERE id = ?", (u1,))
    conn.commit()
    conn.close()

    admin_create = client.post(
        "/api/arena/contests",
        headers=headers(t1),
        json={
            "contest_type": "BIAS_BUSTER",
            "title": "Admin Created Bias Challenge",
            "description": "Test admin contest lifecycle creation.",
            "difficulty": "Beginner",
            "scenario": {
                "vignette": "Trader doubles down after a loss.",
                "bias_options": ["Loss Chasing (Revenge Trading)", "Anchoring"],
                "expected_bias": "Loss Chasing (Revenge Trading)",
            },
        },
    )
    assert admin_create.status_code == 200, admin_create.text
    created_id = admin_create.json()["data"]["id"]

    # Register + duplicate registration check (409)
    reg1 = client.post(f"/api/arena/contests/{created_id}/register", headers=headers(t2))
    assert reg1.status_code == 200, reg1.text
    reg_dup = client.post(f"/api/arena/contests/{created_id}/register", headers=headers(t2))
    assert reg_dup.status_code == 409

    # Start & Practice mode (0 XP/points, allows retry)
    st_pr = client.post(f"/api/arena/contests/{created_id}/start", headers=headers(t2), json={"is_practice": True})
    assert st_pr.status_code == 200
    pr_sub = client.post(
        f"/api/arena/contests/{created_id}/submit",
        headers=headers(t2),
        json={
            "is_practice": True,
            "selected_bias": "Loss Chasing (Revenge Trading)",
            "mitigation_plan": "Use a 24h cooling-off period.",
            "reflection_text": "Practice reflection",
            "use_ai": False,
        },
    )
    assert pr_sub.status_code == 200
    assert pr_sub.json()["data"]["arena_points_awarded"] == 0
    assert pr_sub.json()["data"]["xp_awarded"] == 0

    # Official submission after practice is still allowed once, then results available
    off_sub = client.post(
        f"/api/arena/contests/{created_id}/submit",
        headers=headers(t2),
        json={
            "is_practice": False,
            "selected_bias": "Loss Chasing (Revenge Trading)",
            "mitigation_plan": "Use a strict 24h cooling-off rule and 10% position cap.",
            "reflection_text": "Learned to pause after losses.",
            "use_ai": False,
        },
    )
    assert off_sub.status_code == 200, off_sub.text
    assert off_sub.json()["data"]["xp_awarded"] > 0

    res_rev = client.get(f"/api/arena/contests/{created_id}/results", headers=headers(t2))
    assert res_rev.status_code == 200, res_rev.text
    assert res_rev.json()["data"]["final_rank"] == 1
    assert "score_breakdown" in res_rev.json()["data"]

    # Privacy opt-out hides user from public global leaderboard
    assert client.put(
        "/api/arena/profile",
        headers=headers(t2),
        json={"public_leaderboard_opt_in": False, "share_university": False},
    ).status_code == 200
    lb_u3 = client.get("/api/arena/leaderboards/global", headers=headers(t3)).json()["data"]["entries"]
    assert all(e["user_id"] != u2 for e in lb_u3)

    # Weekly, monthly, contest leaderboards & university-league endpoint
    assert client.get("/api/arena/leaderboards/weekly", headers=headers(t1)).status_code == 200
    assert client.get("/api/arena/leaderboards/monthly", headers=headers(t1)).status_code == 200
    assert client.get(f"/api/arena/leaderboards/contest?contest_id={created_id}", headers=headers(t1)).status_code == 200
    uni_lg = client.get("/api/arena/university-league", headers=headers(t1))
    assert uni_lg.status_code == 200
    assert uni_lg.json()["data"]["affiliation_status"] == "self-reported"

    # Friend Challenge lifecycle & 403 access check
    fc = client.post(
        "/api/arena/friend-challenges",
        headers=headers(t1),
        json={"contest_id": created_id, "opponent_email": e2, "share_reasoning": True},
    )
    assert fc.status_code == 200, fc.text
    fc_id = fc.json()["data"]["challenge_id"]
    assert client.post(f"/api/arena/friend-challenges/{fc_id}/accept", headers=headers(t3)).status_code == 403
    assert client.post(f"/api/arena/friend-challenges/{fc_id}/accept", headers=headers(t2)).status_code == 200


def main():
    tests = [
        test_arena_auth_required,
        test_arena_dashboard_and_server_countdown,
        test_all_six_contest_types_and_duplicate_prevention,
        test_duels_leagues_and_friends_leaderboard,
        test_lifecycle_admin_practice_privacy_and_friend_challenges,
    ]
    for fn in tests:
        print(f"Running {fn.__name__}...")
        fn()
        print(f"  PASS: {fn.__name__}")
    print(f"\nAll {len(tests)} MINDMARK Arena tests passed!")


if __name__ == "__main__":
    main()
