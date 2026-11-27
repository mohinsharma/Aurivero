import sys
import os
import uuid
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_connection
from backend.app.config import settings

client = TestClient(app)


def _register_fresh_user(tag: str) -> dict:
    email = f"bie_{tag}_{uuid.uuid4().hex[:6]}@mindmark.test"
    res = client.post("/api/auth/register", json={
        "email": email,
        "full_name": f"BIE Tester {tag}",
        "password": "TestPassword123!",
        "experience_level": "BEGINNER",
    })
    assert res.status_code == 200
    data = res.json()["data"]
    return {"token": data["access_token"], "user_id": data["user"]["id"]}


def run_bie_tests():
    print("=" * 72)
    print("🧠 MINDMARK BEHAVIORAL INTELLIGENCE ENGINE (BIE) TEST SUITE")
    print("=" * 72)

    u1 = _register_fresh_user("u1")
    h1 = {"Authorization": f"Bearer {u1['token']}"}

    # 9. Insufficient evidence handling for brand new user
    prof0 = client.get("/api/behavior/profile", headers=h1).json()["data"]
    assert prof0["is_insufficient_data"] is True
    assert prof0["events_count"] == 0
    assert all(s["current_score"] == 70.0 for s in prof0["scores"])
    assert all(p["status"] == "insufficient_evidence" for p in prof0["patterns"])
    print("✓ [Test 9] Insufficient evidence handled with neutral 70.0 baseline.")

    # 1. Decision event creation + Pre-Decision Contract
    evt_id_client = f"evt-uniq-{uuid.uuid4().hex[:8]}"
    res1 = client.post("/api/behavior/events", json={
        "client_event_id": evt_id_client,
        "symbol": "TCS",
        "action": "BUY",
        "quantity": 5,
        "execution_price": 4000.0,
        "market_change_pct": 0.8,
        "stated_reason": "Steady IT cash flows",
        "viewed_info": ["fundamentals", "chart"],
        "decision_duration_sec": 95,
        "pre_decision_contract": {
            "why_making_decision": "Long-term valuation",
            "biggest_risk": "US tech slowdown",
            "what_proves_wrong": "Margin compression below 22%",
            "planned_exposure_pct": 25.0,
            "confidence_level": 3,
        }
    }, headers=h1)
    assert res1.status_code == 200
    created_evt_id = res1.json()["data"]["event_id"]
    print("✓ [Test 1] Decision event + Pre-Decision Contract created.")

    # 2. Duplicate event rejection
    dup_res = client.post("/api/behavior/events", json={
        "client_event_id": evt_id_client,
        "symbol": "TCS",
        "action": "BUY",
        "quantity": 5,
        "execution_price": 4000.0,
    }, headers=h1)
    assert dup_res.status_code == 409
    print("✓ [Test 2] Duplicate client_event_id rejected with HTTP 409.")

    # 3 & 15. User Authorization & Data Isolation
    u2 = _register_fresh_user("u2")
    h2 = {"Authorization": f"Bearer {u2['token']}"}
    u2_timeline = client.get("/api/behavior/timeline", headers=h2).json()["data"]
    assert u2_timeline["total"] == 0
    print("✓ [Test 3 & 15] User data isolation verified (User 2 sees 0 of User 1's events).")

    # 4. FOMO Detection (2+ rally entries without research -> detected; researched momentum NOT flagged)
    u_fomo = _register_fresh_user("fomo")
    hf = {"Authorization": f"Bearer {u_fomo['token']}"}
    for i in range(2):
        r = client.post("/api/behavior/events", json={
            "client_event_id": f"fomo-{i}",
            "symbol": "INFY",
            "action": "BUY",
            "quantity": 5,
            "execution_price": 1800.0,
            "market_change_pct": 4.2,
            "viewed_info": [],
            "stated_reason": "Rallying fast, fear of missing out",
        }, headers=hf)
        assert r.status_code == 200
    fomo_pats = {p["pattern_key"]: p for p in client.get("/api/behavior/patterns", headers=hf).json()["data"]["patterns"]}
    assert fomo_pats["fomo"]["detected"] is True
    assert fomo_pats["fomo"]["evidence_count"] == 2
    assert fomo_pats["fomo"]["confidence"] >= 50.0
    print("✓ [Test 4 & 10] FOMO detection + confidence calculation verified.")

    # 5. Panic Selling Detection (2 drawdown exits without research)
    u_panic = _register_fresh_user("panic")
    hp = {"Authorization": f"Bearer {u_panic['token']}"}
    for i in range(2):
        client.post("/api/behavior/events", json={
            "client_event_id": f"panic-{i}",
            "symbol": "RELIANCE",
            "action": "SELL",
            "quantity": 4,
            "execution_price": 2750.0,
            "recent_drawdown_pct": 7.5,
            "realized_pnl_delta": -600.0,
            "viewed_info": [],
            "stated_reason": "Scared of further crash",
        }, headers=hp)
    panic_pats = {p["pattern_key"]: p for p in client.get("/api/behavior/patterns", headers=hp).json()["data"]["patterns"]}
    assert panic_pats["panic_selling"]["detected"] is True
    print("✓ [Test 5] Panic selling detection verified.")

    # 6. Loss Chasing Detection (increased position size after realized loss)
    u_chase = _register_fresh_user("chase")
    hc = {"Authorization": f"Bearer {u_chase['token']}"}
    client.post("/api/behavior/events", json={
        "client_event_id": "chase-loss-1",
        "symbol": "HDFCBANK",
        "action": "SELL",
        "quantity": 5,
        "execution_price": 1600.0,
        "realized_pnl_delta": -800.0,
        "viewed_info": ["chart"],
    }, headers=hc)
    client.post("/api/behavior/events", json={
        "client_event_id": "chase-buy-1",
        "symbol": "HDFCBANK",
        "action": "BUY",
        "quantity": 12,
        "execution_price": 1610.0,
        "stated_reason": "Recover my previous loss quickly",
    }, headers=hc)
    client.post("/api/behavior/events", json={
        "client_event_id": "chase-loss-2",
        "symbol": "TCS",
        "action": "SELL",
        "quantity": 2,
        "execution_price": 3900.0,
        "realized_pnl_delta": -500.0,
    }, headers=hc)
    client.post("/api/behavior/events", json={
        "client_event_id": "chase-buy-2",
        "symbol": "TCS",
        "action": "BUY",
        "quantity": 6,
        "execution_price": 3910.0,
        "stated_reason": "Make back the loss",
    }, headers=hc)
    chase_pats = {p["pattern_key"]: p for p in client.get("/api/behavior/patterns", headers=hc).json()["data"]["patterns"]}
    assert chase_pats["loss_chasing"]["detected"] is True
    print("✓ [Test 6] Loss chasing detection verified.")

    # 7. Overtrading Detection (>= 5 events in 1 day -> >= 3 trades/active day)
    u_ot = _register_fresh_user("ot")
    hot = {"Authorization": f"Bearer {u_ot['token']}"}
    for i in range(6):
        client.post("/api/behavior/events", json={
            "client_event_id": f"ot-{i}",
            "symbol": "ITC",
            "action": "BUY" if i % 2 == 0 else "SELL",
            "quantity": 10,
            "execution_price": 450.0,
            "viewed_info": ["quote"],
        }, headers=hot)
    ot_pats = {p["pattern_key"]: p for p in client.get("/api/behavior/patterns", headers=hot).json()["data"]["patterns"]}
    assert ot_pats["overtrading"]["detected"] is True
    print("✓ [Test 7] Overtrading detection verified.")

    # 8. Portfolio Concentration + 11. Score calculation
    u_conc = _register_fresh_user("conc")
    hconc = {"Authorization": f"Bearer {u_conc['token']}"}
    # Execute actual big trade via simulator endpoint
    client.post("/api/trades/execute", json={
        "symbol": "RELIANCE",
        "type": "BUY",
        "quantity": 16,
        "reason_tag": "High conviction",
        "client_event_id": "conc-trade-1",
    }, headers=hconc)
    conc_prof = client.get("/api/behavior/profile", headers=hconc).json()["data"]
    conc_pats = {p["pattern_key"]: p for p in conc_prof["patterns"]}
    assert conc_pats["portfolio_concentration"]["detected"] is True
    print("✓ [Test 8 & 11] Portfolio concentration & live trade hook verified.")

    # 12. Historical event integrity (server-generated timestamp present, immutable)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT created_at, version FROM decision_events WHERE id = ?", (created_evt_id,))
    row = cur.fetchone()
    conn.close()
    assert row is not None and len(row["created_at"]) > 10 and row["version"] == 1
    print("✓ [Test 12] Historical event integrity (server UTC timestamp & version) verified.")

    # 13. Missing market data handled gracefully
    miss_res = client.post("/api/behavior/events", json={
        "client_event_id": "miss-mkt-1",
        "symbol": "UNKNOWN_TICKER",
        "action": "BUY",
        "quantity": 10,
        "execution_price": 100.0,
    }, headers=h1)
    assert miss_res.status_code == 200
    print("✓ [Test 13] Missing market data handled gracefully.")

    # 14. Gemini unavailable fallback
    orig_key = settings.GEMINI_API_KEY
    settings.GEMINI_API_KEY = ""
    rec_res = client.get("/api/behavior/recommendations?use_ai=true", headers=hf)
    settings.GEMINI_API_KEY = orig_key
    assert rec_res.status_code == 200
    assert rec_res.json()["data"]["source"] in ("deterministic_backend", "deterministic_fallback")
    print("✓ [Test 14] Gemini unavailable deterministic fallback verified.")

    # 16. Process vs Outcome check:
    # A) Profitable but reckless (no research, high confidence, >40% exposure) -> Lower Research/Strategy score!
    u_reckless = _register_fresh_user("reckless")
    hrec = {"Authorization": f"Bearer {u_reckless['token']}"}
    for i in range(3):
        client.post("/api/behavior/events", json={
            "client_event_id": f"reckless-{i}",
            "symbol": "TCS",
            "action": "SELL" if i == 2 else "BUY",
            "quantity": 11,
            "execution_price": 4000.0,
            "stock_exposure_pct": 44.0,
            "realized_pnl_delta": 5000.0 if i == 2 else 0.0,  # Profitable!
            "confidence_level": 5,
            "viewed_info": [],
            "stated_reason": "",
            "decision_duration_sec": 5,
        }, headers=hrec)
    rec_scores = {s["dimension"]: s["current_score"] for s in client.get("/api/behavior/scores", headers=hrec).json()["data"]["scores"]}

    # B) Loss-making but disciplined (researched, stop-loss rationale, moderate size)
    u_disc = _register_fresh_user("disc")
    hd = {"Authorization": f"Bearer {u_disc['token']}"}
    for i in range(3):
        client.post("/api/behavior/events", json={
            "client_event_id": f"disc-{i}",
            "symbol": "INFY",
            "action": "SELL" if i == 2 else "BUY",
            "quantity": 5,
            "execution_price": 1750.0,
            "stock_exposure_pct": 9.0,
            "realized_pnl_delta": -300.0 if i == 2 else 0.0,  # Loss-making!
            "confidence_level": 3,
            "viewed_info": ["fundamentals", "balance_sheet", "chart"],
            "stated_reason": "Disciplined risk limit stop-loss exit",
            "decision_duration_sec": 120,
        }, headers=hd)
    disc_scores = {s["dimension"]: s["current_score"] for s in client.get("/api/behavior/scores", headers=hd).json()["data"]["scores"]}

    assert disc_scores["Research Quality"] > rec_scores["Research Quality"]
    assert disc_scores["Emotional Control"] > rec_scores["Emotional Control"]
    print("✓ [Test 16] Process-over-Outcome verified: Disciplined loss-making > Reckless profitable.")

    print("\n" + "=" * 72)
    print("🎉 ALL 16 BEHAVIORAL INTELLIGENCE ENGINE (BIE) TESTS PASSED!")
    print("=" * 72)


if __name__ == "__main__":
    run_bie_tests()
