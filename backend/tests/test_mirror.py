import os
import sys
import uuid
import sqlite3
from pathlib import Path
from unittest.mock import patch

# Ensure repo root and backend/ are importable
BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
for p in (str(REPO_ROOT), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_connection

client = TestClient(app)


def register_test_user(prefix: str = "mirror") -> tuple[str, str]:
    email = f"{prefix}_{uuid.uuid4().hex[:10]}@mindmark.test"
    resp = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": f"Test {prefix.title()}",
            "password": "TestPassword123!",
            "experience_level": "intermediate",
        },
    )
    assert resp.status_code in (200, 201), f"Register failed: {resp.text}"
    body = resp.json()
    data = body.get("data", body)
    token = data["access_token"]
    user_id = data["user"]["id"]
    return token, user_id


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def seed_fomo_events_for_user(user_id: str, count: int = 4) -> None:
    """Insert synthetic Phase 1 BIE decision events indicating FOMO / loss-chasing."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cur = conn.cursor()
    event_ids = []
    for i in range(count):
        event_id = f"evt_fomo_{uuid.uuid4().hex[:10]}"
        event_ids.append(event_id)
        price = 2850.0 + i * 25
        qty = 20
        cur.execute(
            """
            INSERT INTO decision_events (
                id, user_id, client_event_id, symbol, sector, action,
                execution_price, quantity, total_value,
                portfolio_value_before, portfolio_value_after,
                cash_before, cash_after,
                market_change_pct, recent_drawdown_pct,
                stated_reason, confidence_level, viewed_info_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                user_id,
                f"cid_{event_id}",
                "RELIANCE",
                "Energy",
                "BUY",
                price,
                qty,
                price * qty,
                100000.0,
                100000.0,
                50000.0,
                25000.0,
                4.2,
                -2.5,
                "Everyone is buying this breakout right now",
                90,
                "[]",
                now,
            ),
        )
    cur.execute(
        """
        INSERT INTO behavior_patterns (
            id, user_id, pattern_key, pattern_name, detected, status,
            severity, confidence, evidence_count, observed_period,
            evidence_event_ids_json, what_happened, why_it_matters,
            what_user_can_learn, recommended_challenge, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            f"pat_{uuid.uuid4().hex[:10]}",
            user_id,
            "fomo_chasing",
            "FOMO Chasing",
            1,
            "DETECTED",
            "HIGH",
            0.85,
            count,
            "Last 7 days",
            json.dumps(event_ids) if "json" in globals() else "[]",
            "Repeatedly bought into sharp rallies without checking fundamentals.",
            "Chasing rallies increases downside risk if momentum reverses.",
            "Pause and verify valuation before entering.",
            "fomo-trap",
            now,
        ),
    )
    conn.commit()
    conn.close()


def test_auth_required():
    for method, url in [
        ("GET", "/api/mirror/challenges"),
        ("GET", "/api/mirror/history"),
        ("GET", "/api/mirror/recommendations"),
        ("POST", "/api/mirror/challenges/start"),
    ]:
        resp = client.request(method, url)
        assert resp.status_code == 401, f"Expected 401 for {method} {url}, got {resp.status_code}"

    bad_resp = client.get("/api/mirror/challenges", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert bad_resp.status_code == 401


def test_general_practice_selection_when_insufficient_data():
    token, _ = register_test_user("fresh")
    resp = client.get("/api/mirror/challenges", headers=auth_headers(token))
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]

    assert data["has_sufficient_personalization_data"] is False
    assert data["tagline"] == "Face your habits. Challenge your decisions. Improve your mindset."
    assert len(data["available_challenges"]) == 6

    for ch in data["available_challenges"]:
        assert ch["data_source_label"] in ("SYNTHETIC EDUCATIONAL SCENARIO", "HISTORICAL & SYNTHETIC SIMULATION")
        assert ch["is_personalized"] is False
        assert ch["recommendation_badge"] == "General Practice"


def test_personalized_selection_with_bie_evidence():
    token, user_id = register_test_user("fomo")
    seed_fomo_events_for_user(user_id, count=5)

    resp = client.get("/api/mirror/recommendations", headers=auth_headers(token))
    assert resp.status_code == 200, resp.text
    rec_data = resp.json()["data"]
    assert rec_data["has_sufficient_personalization_data"] is True
    assert len(rec_data["recommendations"]) >= 1

    ch_resp = client.get("/api/mirror/challenges", headers=auth_headers(token))
    assert ch_resp.status_code == 200
    ch_data = ch_resp.json()["data"]
    assert ch_data["has_sufficient_personalization_data"] is True
    personalized = [c for c in ch_data["available_challenges"] if c["is_personalized"]]
    assert len(personalized) >= 1
    assert any(c["id"] == "fomo-trap" for c in personalized), "Expected fomo-trap to be personalized for FOMO user"
    for p in personalized:
        assert p["recommendation_badge"] == "Personalized for You"
        assert p["why_recommended"]


def run_complete_challenge(token: str, challenge_id: str, stage_actions: list[dict], is_practice: bool = False) -> dict:
    # Inspect challenge details first (ensure scoring answer keys are not leaked)
    det = client.get(f"/api/mirror/challenges/{challenge_id}", headers=auth_headers(token))
    assert det.status_code == 200, det.text
    det_data = det.json()["data"]
    det_text = str(det_data).lower()
    assert "optimal_actions" not in det_text and "scoring_weights" not in det_text

    start_resp = client.post(
        "/api/mirror/challenges/start",
        headers=auth_headers(token),
        json={
            "challenge_id": challenge_id,
            "is_practice": is_practice,
            "declared_strategy": "Long-term quality investing with 15% max single-stock cap",
        },
    )
    assert start_resp.status_code == 200, f"Start failed for {challenge_id}: {start_resp.text}"
    session_id = start_resp.json()["data"]["session_id"]

    for idx, step in enumerate(stage_actions):
        payload = {
            "session_id": session_id,
            "stage_index": idx,
            "client_decision_id": f"cid_{challenge_id}_{idx}_{uuid.uuid4().hex[:8]}",
            "action": step["action"],
            "allocation": step.get("allocation"),
            "reasoning": step.get(
                "reasoning",
                "Checked fundamentals, sector exposure, and cash buffer before deciding on risk-controlled sizing.",
            ),
            "confidence_level": step.get("confidence_level", 4),
            "invalidation_trigger": step.get("invalidation_trigger", "Exit or reduce if thesis breaks on earnings miss."),
            "reviewed_info": step.get("reviewed_info", ["fundamentals", "portfolio_exposure", "risk_metrics"]),
        }
        dec_resp = client.post(
            f"/api/mirror/challenges/{challenge_id}/decision",
            headers=auth_headers(token),
            json=payload,
        )
        assert dec_resp.status_code == 200, f"Decision {challenge_id} stage {idx} failed: {dec_resp.text}"

    # Complete with Gemini mocked/unavailable to also verify deterministic fallback
    with patch("httpx.post", side_effect=RuntimeError("Simulated Gemini outage")):
        comp_resp = client.post(
            f"/api/mirror/challenges/{challenge_id}/complete",
            headers=auth_headers(token),
            json={
                "session_id": session_id,
                "reflection_text": "I stayed disciplined, checked evidence panels, and avoided emotional sizing.",
                "use_ai": True,
            },
        )
    assert comp_resp.status_code == 200, f"Complete failed for {challenge_id}: {comp_resp.text}"
    res = comp_resp.json()["data"]
    assert 0 <= res["dqs_score"] <= 100
    assert res["rubric_version"] in ("v1.0-general", "v1.0-diversification")
    assert res["ai_source"] == "deterministic_fallback"
    assert res["feedback_summary"]
    return {"session_id": session_id, "result": res}


def test_all_six_challenge_types_end_to_end():
    token, _ = register_test_user("all6")

    scenarios = {
        "panic-decision": [
            {"action": "RESEARCH_MORE"},
            {"action": "HOLD"},
        ],
        "fomo-trap": [
            {"action": "WAIT"},
            {"action": "BUY_SMALL"},
        ],
        "loss-recovery": [
            {"action": "HOLD_CASH"},
            {"action": "REDUCE"},
        ],
        "overconfidence-check": [
            {"action": "REQUEST_MORE_INFO"},
            {"action": "REVISE_VIEW"},
        ],
        "diversification-builder": [
            {
                "action": "SUBMIT_ALLOCATION",
                "allocation": {
                    "TCS": 15,
                    "INFY": 15,
                    "HDFCBANK": 20,
                    "RELIANCE": 20,
                    "ITC": 15,
                    "SUNPHARMA": 15,
                },
            },
            {"action": "REBALANCE"},
        ],
        "strategy-consistency": [
            {"action": "FOLLOW_PLAN_HOLD"},
            {"action": "EVIDENCE_BASED_EXIT"},
        ],
    }

    for cid, steps in scenarios.items():
        out = run_complete_challenge(token, cid, steps, is_practice=False)
        assert out["result"]["xp_awarded"] > 0, f"Expected positive XP for first completion of {cid}"

    # Verify all 6 appear in completed_challenges
    ch_resp = client.get("/api/mirror/challenges", headers=auth_headers(token))
    assert ch_resp.status_code == 200
    ch_data = ch_resp.json()["data"]
    assert len(ch_data["completed_challenges"]) == 6


def test_duplicate_prevention_xp_skip_and_isolation():
    token1, _ = register_test_user("owner")
    token2, _ = register_test_user("other")

    # Start panic-decision for user 1
    start = client.post(
        "/api/mirror/challenges/start",
        headers=auth_headers(token1),
        json={"challenge_id": "panic-decision", "is_practice": False, "declared_strategy": "Balanced"},
    ).json()["data"]
    session_id = start["session_id"]

    # User 2 cannot submit decision or complete user 1's session (403)
    cross_dec = client.post(
        "/api/mirror/challenges/panic-decision/decision",
        headers=auth_headers(token2),
        json={
            "session_id": session_id,
            "stage_index": 0,
            "client_decision_id": "cross_1",
            "action": "HOLD",
            "reasoning": "Cross user attempt",
            "confidence_level": 3,
            "invalidation_trigger": "None",
            "reviewed_info": [],
        },
    )
    assert cross_dec.status_code == 403

    # Invalid action rejected (400)
    bad_action = client.post(
        "/api/mirror/challenges/panic-decision/decision",
        headers=auth_headers(token1),
        json={
            "session_id": session_id,
            "stage_index": 0,
            "client_decision_id": "bad_act_1",
            "action": "INVALID_ACTION_XYZ",
            "reasoning": "Invalid",
            "confidence_level": 3,
            "invalidation_trigger": "None",
            "reviewed_info": [],
        },
    )
    assert bad_action.status_code == 400

    # Valid stage 0
    client_dec_id = f"dedup_{uuid.uuid4().hex[:8]}"
    ok0 = client.post(
        "/api/mirror/challenges/panic-decision/decision",
        headers=auth_headers(token1),
        json={
            "session_id": session_id,
            "stage_index": 0,
            "client_decision_id": client_dec_id,
            "action": "HOLD",
            "reasoning": "Reviewed drawdown context and earnings quality before holding.",
            "confidence_level": 4,
            "invalidation_trigger": "Exit if margin drops below 15%",
            "reviewed_info": ["fundamentals", "portfolio_exposure"],
        },
    )
    assert ok0.status_code == 200

    # Duplicate client_decision_id -> 409
    dup_cid = client.post(
        "/api/mirror/challenges/panic-decision/decision",
        headers=auth_headers(token1),
        json={
            "session_id": session_id,
            "stage_index": 1,
            "client_decision_id": client_dec_id,
            "action": "HOLD",
            "reasoning": "Duplicate client id",
            "confidence_level": 4,
            "invalidation_trigger": "None",
            "reviewed_info": [],
        },
    )
    assert dup_cid.status_code == 409

    # Duplicate stage_index -> 409
    dup_stage = client.post(
        "/api/mirror/challenges/panic-decision/decision",
        headers=auth_headers(token1),
        json={
            "session_id": session_id,
            "stage_index": 0,
            "client_decision_id": f"new_cid_{uuid.uuid4().hex[:8]}",
            "action": "REDUCE",
            "reasoning": "Duplicate stage",
            "confidence_level": 4,
            "invalidation_trigger": "None",
            "reviewed_info": [],
        },
    )
    assert dup_stage.status_code == 409

    # Stage 1
    ok1 = client.post(
        "/api/mirror/challenges/panic-decision/decision",
        headers=auth_headers(token1),
        json={
            "session_id": session_id,
            "stage_index": 1,
            "client_decision_id": f"s1_{uuid.uuid4().hex[:8]}",
            "action": "HOLD",
            "reasoning": "Thesis intact after checking liquidity.",
            "confidence_level": 4,
            "invalidation_trigger": "Break below support",
            "reviewed_info": ["risk_metrics"],
        },
    )
    assert ok1.status_code == 200

    # Complete first time
    comp1 = client.post(
        "/api/mirror/challenges/panic-decision/complete",
        headers=auth_headers(token1),
        json={"session_id": session_id, "reflection_text": "Stayed calm.", "use_ai": False},
    )
    assert comp1.status_code == 200
    assert comp1.json()["data"]["xp_awarded"] > 0

    # Duplicate complete -> 409
    comp_dup = client.post(
        "/api/mirror/challenges/panic-decision/complete",
        headers=auth_headers(token1),
        json={"session_id": session_id, "reflection_text": "Stayed calm.", "use_ai": False},
    )
    assert comp_dup.status_code == 409

    # Official retry with higher DQS may earn one-time improvement bonus (+100),
    # whereas a subsequent retry without further improvement must award 0 duplicate XP.
    retry_out = run_complete_challenge(
        token1,
        "panic-decision",
        [{"action": "HOLD"}, {"action": "HOLD"}],
        is_practice=False,
    )
    assert retry_out["result"]["xp_awarded"] in (0, 100)

    retry_same_out = run_complete_challenge(
        token1,
        "panic-decision",
        [{"action": "HOLD"}, {"action": "HOLD"}],
        is_practice=False,
    )
    assert retry_same_out["result"]["xp_awarded"] == 0, (
        f"Expected 0 duplicate XP on repeat retry, got {retry_same_out['result']['xp_awarded']}"
    )

    practice_out = run_complete_challenge(
        token1,
        "panic-decision",
        [{"action": "HOLD"}, {"action": "HOLD"}],
        is_practice=True,
    )
    assert practice_out["result"]["xp_awarded"] == 0

    # Skip without penalty
    skip_start = client.post(
        "/api/mirror/challenges/start",
        headers=auth_headers(token1),
        json={"challenge_id": "fomo-trap", "is_practice": False, "declared_strategy": "Balanced"},
    ).json()["data"]
    skip_resp = client.post(
        "/api/mirror/challenges/fomo-trap/skip",
        headers=auth_headers(token1),
        json={"session_id": skip_start["session_id"], "reason": "Not ready now"},
    )
    assert skip_resp.status_code == 200

    # History isolation: user 2 has 0 results, user 1 has 4 results
    h1 = client.get("/api/mirror/history", headers=auth_headers(token1)).json()["data"]
    h2 = client.get("/api/mirror/history", headers=auth_headers(token2)).json()["data"]
    assert h1["total"] == 4
    assert h2["total"] == 0


def main():
    tests = [
        test_auth_required,
        test_general_practice_selection_when_insufficient_data,
        test_personalized_selection_with_bie_evidence,
        test_all_six_challenge_types_end_to_end,
        test_duplicate_prevention_xp_skip_and_isolation,
    ]
    for fn in tests:
        print(f"Running {fn.__name__}...")
        fn()
        print(f"  PASS: {fn.__name__}")
    print(f"\nAll {len(tests)} Mirror Mode tests passed!")


if __name__ == "__main__":
    main()
