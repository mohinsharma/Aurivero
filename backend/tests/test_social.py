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


def register_user(prefix: str = "soc") -> tuple[str, str, str]:
    email = f"{prefix}_{uuid.uuid4().hex[:10]}@mindmark.test"
    resp = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": f"Social {prefix.title()}",
            "password": "TestPassword123!",
            "experience_level": "intermediate",
        },
    )
    assert resp.status_code in (200, 201), resp.text
    d = resp.json().get("data", resp.json())
    return d["access_token"], d["user"]["id"], email


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_social_auth_required():
    for method, url in [
        ("GET", "/api/social/dashboard"),
        ("GET", "/api/social/squads"),
        ("GET", "/api/social/debates"),
        ("GET", "/api/social/crowd-mirror/scenarios"),
        ("GET", "/api/social/feed"),
        ("GET", "/api/social/notifications"),
    ]:
        assert client.request(method, url).status_code == 401


def test_squads_limits_roles_and_battle_lifecycle():
    users = [register_user(f"sq{i}") for i in range(6)]
    t0, u0, _ = users[0]

    sq = client.post("/api/social/squads", headers=headers(t0), json={"name": "Alpha Risk Squad"}).json()["data"]
    sq_id, code = sq["id"], sq["invite_code"]

    # Duplicate join blocked (409)
    assert client.post("/api/social/squads/join-code", headers=headers(t0), json={"invite_code": code}).status_code == 409

    # Join 4 more users (total 5)
    for t, _, _ in users[1:5]:
        assert client.post("/api/social/squads/join-code", headers=headers(t), json={"invite_code": code}).status_code == 200

    # 6th user rejected (max 5 members)
    sixth = client.post("/api/social/squads/join-code", headers=headers(users[5][0]), json={"invite_code": code})
    assert sixth.status_code == 400

    # Assign role
    assert client.post(
        f"/api/social/squads/{sq_id}/roles",
        headers=headers(t0),
        json={"member_user_id": users[1][1], "role": "Risk Officer"},
    ).status_code == 200

    # Opposing squad + battle
    t5, _, _ = users[5]
    sq2 = client.post("/api/social/squads", headers=headers(t5), json={"name": "Beta Analysts"}).json()["data"]
    bat = client.post(f"/api/social/squads/{sq_id}/battles", headers=headers(t0), json={"title": "Macro Stress Duel"}).json()["data"]
    bid = bat["battle_id"]

    assert client.post(f"/api/social/battles/{bid}/join/{sq2['id']}", headers=headers(t5)).status_code == 200
    assert client.post(f"/api/social/battles/{bid}/contribute/{sq_id}", headers=headers(users[1][0]), json={"analysis": "Checked beta exposure and cash buffer."}).status_code == 200

    s1 = client.post(
        f"/api/social/battles/{bid}/submit/{sq_id}",
        headers=headers(t0),
        json={
            "decision_action": "REBALANCE_DEFENSIVE",
            "team_reasoning": "Yield spike requires trimming leveraged cyclicals while holding core compounders.",
            "risk_plan": "Maintain 30% cash buffer and 20% single-stock cap.",
            "evidence_summary": "US 10Y yields +20 bps and domestic PMI resilient.",
            "final_reflection": "Role-based review prevented panic selling.",
        },
    )
    assert s1.status_code == 200, s1.text

    s2 = client.post(
        f"/api/social/battles/{bid}/submit/{sq2['id']}",
        headers=headers(t5),
        json={
            "decision_action": "HOLD_AND_MONITOR",
            "team_reasoning": "Holding core positions without overreacting to macro noise.",
            "risk_plan": "Stop-loss at 15% drawdown.",
            "evidence_summary": "Earnings guidance unchanged.",
        },
    )
    assert s2.status_code == 200
    assert s2.json()["data"]["winner_squad_id"] in (sq_id, sq2["id"])


def test_crowd_mirror_privacy_and_min_sample_size():
    scen_id = f"cm-rate-hike"
    u_list = [register_user(f"cm{i}") for i in range(3)]
    t0, _, _ = u_list[0]

    # Locked before submission (403)
    assert client.get(f"/api/social/crowd-mirror/{scen_id}/results", headers=headers(t0)).status_code == 403

    # Practice submission stays separate and does not count as official
    pr = client.post(
        f"/api/social/crowd-mirror/{scen_id}/submit",
        headers=headers(t0),
        json={"action": "HOLD_LONG_TERM", "risk_category": "Balanced", "reasoning": "Practice run reasoning check.", "is_practice": True},
    )
    assert pr.status_code == 200

    # First official submission -> still < 3 or >= 3 depending on prior DB state; check structure
    off0 = client.post(
        f"/api/social/crowd-mirror/{scen_id}/submit",
        headers=headers(t0),
        json={"action": "HOLD_LONG_TERM", "risk_category": "Balanced", "reasoning": "Strong balance sheets endure rate hikes.", "is_practice": False},
    )
    assert off0.status_code == 200

    # Duplicate official submission blocked (409)
    dup = client.post(
        f"/api/social/crowd-mirror/{scen_id}/submit",
        headers=headers(t0),
        json={"action": "WAIT_FOR_CLOSE", "risk_category": "Conservative", "reasoning": "Duplicate try.", "is_practice": False},
    )
    assert dup.status_code == 409

    # Submit 2 more official users so sample size >= 3
    for t, _, _ in u_list[1:]:
        assert client.post(
            f"/api/social/crowd-mirror/{scen_id}/submit",
            headers=headers(t),
            json={"action": "REDUCE_RATE_SENSITIVE", "risk_category": "Conservative", "reasoning": "Trimming rate-sensitive exposure.", "is_practice": False},
        ).status_code == 200

    res = client.get(f"/api/social/crowd-mirror/{scen_id}/results", headers=headers(t0)).json()["data"]
    assert res["participants_count"] >= 3
    assert res["insufficient_sample"] is False
    assert res["action_percentages"] is not None


def test_debates_friend_challenges_feed_and_privacy():
    t1, u1, e1 = register_user("deb1")
    t2, u2, e2 = register_user("deb2")
    t3, u3, e3 = register_user("deb3")

    # Debate submission + Gemini fallback + duplicate prevention
    with patch("httpx.post", side_effect=RuntimeError("Simulated Gemini outage")):
        dsub = client.post(
            "/api/social/debates/deb-featured-1/submissions",
            headers=headers(t1),
            json={
                "interpretation": "Wait for debt-to-EBITDA trajectory before paying 78x P/E.",
                "evidence": "Revenue grew 18% YoY but net debt rose 35%.",
                "risks": "Multiple compression if growth slows below 15%.",
                "counterarguments": "Bull case assumes margin expansion from operating leverage.",
                "invalidation_info": "Net debt reduction and 25% ROE.",
                "use_ai": True,
            },
        )
    assert dsub.status_code == 200, dsub.text
    assert dsub.json()["data"]["ai_source"] == "deterministic_fallback"
    assert client.post(
        "/api/social/debates/deb-featured-1/submissions",
        headers=headers(t1),
        json={
            "interpretation": "Duplicate attempt",
            "evidence": "Duplicate evidence text",
            "risks": "Duplicate risks text",
            "counterarguments": "Duplicate counter text",
            "invalidation_info": "Duplicate info",
            "use_ai": False,
        },
    ).status_code == 409

    # Friend challenge side-by-side & 403 non-participant check
    fc = client.post(
        "/api/social/friend-challenges",
        headers=headers(t1),
        json={"contest_id": "arena-bias-buster-1", "opponent_email": e2, "share_reasoning": False},
    ).json()["data"]
    fc_id = fc["challenge_id"]
    assert client.post(f"/api/social/friend-challenges/{fc_id}/accept", headers=headers(t2)).status_code == 200
    assert client.get(f"/api/social/friend-challenges/{fc_id}/results", headers=headers(t3)).status_code == 403

    sub_body = {"selected_bias": "Loss Chasing (Revenge Trading)", "mitigation_plan": "Use a 24h cooling-off rule.", "use_ai": False}
    assert client.post(f"/api/social/friend-challenges/{fc_id}/submit", headers=headers(t1), json=sub_body).status_code == 200
    assert client.post(f"/api/social/friend-challenges/{fc_id}/submit", headers=headers(t2), json=sub_body).status_code == 200
    comp = client.get(f"/api/social/friend-challenges/{fc_id}/results", headers=headers(t1)).json()["data"]
    assert comp["results_ready"] is True
    assert comp["opponent"]["reasoning"] == "Private"

    # Feed moderation, delete ownership, and public profile privacy
    bad_post = client.post("/api/social/posts", headers=headers(t1), json={"post_type": "INSIGHT", "title": "Bad", "content": "This has guaranteed returns!"})
    assert bad_post.status_code == 400
    good_post = client.post("/api/social/posts", headers=headers(t1), json={"post_type": "INSIGHT", "title": "Risk Tip", "content": "Always cap single-stock sizing."}).json()["data"]
    assert client.delete(f"/api/social/posts/{good_post['id']}", headers=headers(t2)).status_code == 403
    assert client.delete(f"/api/social/posts/{good_post['id']}", headers=headers(t1)).status_code == 200

    # Privacy controls
    priv = client.patch(
        "/api/social/profile/privacy",
        headers=headers(t1),
        json={"show_university": False, "show_arena_rank": False, "notify_debates": False},
    ).json()["data"]
    pub = client.get(f"/api/social/profile/{priv['username']}", headers=headers(t2)).json()["data"]
    assert pub["university"] is None
    assert pub["arena_rank"] is None


def main():
    tests = [
        test_social_auth_required,
        test_squads_limits_roles_and_battle_lifecycle,
        test_crowd_mirror_privacy_and_min_sample_size,
        test_debates_friend_challenges_feed_and_privacy,
    ]
    for fn in tests:
        print(f"Running {fn.__name__}...")
        fn()
        print(f"  PASS: {fn.__name__}")
    print(f"\nAll {len(tests)} Phase 6 Social Intelligence tests passed!")


if __name__ == "__main__":
    main()
