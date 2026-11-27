import sys
import os
import uuid
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings

client = TestClient(app)


def _register_user(tag: str) -> dict:
    email = f"fp_{tag}_{uuid.uuid4().hex[:6]}@mindmark.test"
    res = client.post("/api/auth/register", json={
        "email": email,
        "full_name": f"FP User {tag}",
        "password": "TestPassword123!",
        "experience_level": "BEGINNER",
    })
    assert res.status_code == 200
    d = res.json()["data"]
    return {"token": d["access_token"], "user_id": d["user"]["id"]}


def run_fingerprint_tests():
    print("=" * 72)
    print("🧬 MINDMARK PHASE 2 — INVESTOR DECISION FINGERPRINT TEST SUITE")
    print("=" * 72)

    # 1. Missing & invalid authentication MUST return 401
    for path in [
        "/api/fingerprint",
        "/api/fingerprint/history",
        "/api/fingerprint/archetype",
        "/api/fingerprint/declared-observed",
        "/api/fingerprint/recommendations",
    ]:
        r_missing = client.get(path)
        assert r_missing.status_code == 401, f"Expected 401 for missing auth on {path}, got {r_missing.status_code}"
        r_invalid = client.get(path, headers={"Authorization": "Bearer invalid_jwt_token"})
        assert r_invalid.status_code == 401, f"Expected 401 for invalid auth on {path}, got {r_invalid.status_code}"
    print("✓ [Auth] Missing and invalid authentication rejected with HTTP 401 across all 5 routes.")

    # 2. Insufficient data handling (no fabricated scores or demo data)
    u_new = _register_user("new")
    h_new = {"Authorization": f"Bearer {u_new['token']}"}
    fp_empty = client.get("/api/fingerprint", headers=h_new).json()["data"]
    assert fp_empty["events_count"] == 0
    assert fp_empty["has_sufficient_overall_data"] is False
    assert fp_empty["overall_score"] is None
    assert all(d["display_status"] == "Not enough data yet" and d["score"] is None for d in fp_empty["dimensions"])
    assert fp_empty["archetype"]["has_sufficient_data"] is False
    assert fp_empty["archetype"]["primary_archetype"] is None
    print("✓ [Insufficient Data] Displays 'Not enough data yet' with zero fabricated scores or demo data.")

    # 3. Record 4 researched decisions with Pre-Decision Contracts -> Sufficient data + Archetype + Declared vs Observed
    u1 = _register_user("planner")
    h1 = {"Authorization": f"Bearer {u1['token']}"}
    for i in range(4):
        action = "SELL" if i == 3 else "BUY"
        res = client.post("/api/behavior/events", json={
            "client_event_id": f"fp-plan-{i}",
            "symbol": ["TCS", "INFY", "HDFCBANK", "TCS"][i],
            "action": action,
            "quantity": 4,
            "execution_price": 2000.0,
            "stock_exposure_pct": 12.0,
            "realized_pnl_delta": 250.0 if action == "SELL" else 0.0,
            "viewed_info": ["fundamentals", "chart", "balance_sheet"],
            "stated_reason": "Long-term valuation",
            "decision_duration_sec": 85,
            "pre_decision_contract": {
                "why_making_decision": "Long-term valuation",
                "biggest_risk": "Sector slowdown",
                "what_proves_wrong": "Margin compression",
                "planned_exposure_pct": 15.0,
                "confidence_level": 4,
            }
        }, headers=h1)
        assert res.status_code == 200

    fp1 = client.get("/api/fingerprint", headers=h1).json()["data"]
    assert fp1["has_sufficient_overall_data"] is True
    assert fp1["overall_score"] is not None and 0 <= fp1["overall_score"] <= 100
    assert fp1["measured_dimensions_count"] == 7
    assert fp1["strongest_dimension"] is not None
    assert fp1["dimension_needing_improvement"] is not None
    assert fp1["archetype"]["has_sufficient_data"] is True
    assert fp1["archetype"]["primary_archetype"] in [
        "The Disciplined Planner", "The Research-Driven Investor", "The Careful Observer",
        "The Consistency Builder", "The Balanced Learner"
    ]
    assert len(fp1["archetype"]["observed_characteristics"]) >= 1
    print(f"✓ [Sufficient Data & Archetype] Score: {fp1['overall_score']}/100 | Archetype: {fp1['archetype']['primary_archetype']}")

    # 4. Dedicated Archetype endpoint + Mixed characteristics
    arch = client.get("/api/fingerprint/archetype", headers=h1).json()["data"]
    assert arch["has_sufficient_data"] is True
    assert len(arch["observed_characteristics"]) >= 2
    print(f"✓ [GET /api/fingerprint/archetype] Mixed characteristics: {arch['observed_characteristics']}")

    # 5. Declared vs Observed endpoint
    dec_obs = client.get("/api/fingerprint/declared-observed", headers=h1).json()["data"]
    assert dec_obs["contracts_count"] == 4
    assert len(dec_obs["comparisons"]) == 3
    assert dec_obs["comparisons"][0]["aligned"] is True
    print("✓ [GET /api/fingerprint/declared-observed] Verified contract alignment vs observed behavior.")

    # 6. Historical score comparison & period filters
    for period in ["7d", "30d", "90d", "all"]:
        hist = client.get(f"/api/fingerprint/history?period={period}", headers=h1).json()["data"]
        assert hist["period"] == period
        assert hist["events_in_period"] == 4
        assert hist["snapshots_in_period"] >= 1
        assert len(hist["score_deltas"]) == 7
    print("✓ [GET /api/fingerprint/history] Period filters (7d, 30d, 90d, all) & snapshots verified.")

    # 7. User data isolation (u_new still sees 0 events and no data from u1)
    fp_new_again = client.get("/api/fingerprint", headers=h_new).json()["data"]
    assert fp_new_again["events_count"] == 0
    assert fp_new_again["overall_score"] is None
    print("✓ [Isolation] User 2 fingerprint remains completely isolated from User 1.")

    # 8. Gemini failure/unavailable fallback on recommendations
    orig_key = settings.GEMINI_API_KEY
    settings.GEMINI_API_KEY = ""
    rec_fb = client.get("/api/fingerprint/recommendations?use_ai=true", headers=h1).json()["data"]
    settings.GEMINI_API_KEY = orig_key
    assert rec_fb["source"] in ("deterministic_backend", "deterministic_fallback")
    assert len(rec_fb["recommendations"]) >= 1
    print("✓ [GET /api/fingerprint/recommendations] Deterministic fallback verified when Gemini unavailable.")

    print("\n" + "=" * 72)
    print("🎉 ALL PHASE 2 INVESTOR DECISION FINGERPRINT TESTS PASSED!")
    print("=" * 72)


if __name__ == "__main__":
    run_fingerprint_tests()
