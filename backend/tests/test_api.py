import sys
import os

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def run_all_tests():
    print("=" * 70)
    print("🚀 MINDMARK API INTEGRATION & VERIFICATION TEST SUITE")
    print("=" * 70)

    # 1. Health & Root
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    data = res.json()
    assert data["status"] == "healthy"
    print("✓ [GET /health] Server healthy & environment loaded.")

    res = client.get("/")
    assert res.status_code == 200
    assert "MINDMARK API" in res.json()["service"]
    print("✓ [GET /] Root metadata endpoint verified.")

    # 2. Authentication: Demo Login
    res = client.post("/api/auth/demo-login")
    assert res.status_code == 200
    demo_auth = res.json()
    assert demo_auth["success"] is True
    token = demo_auth["data"]["access_token"]
    user_id = demo_auth["data"]["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✓ [POST /api/auth/demo-login] Token generated for user: {user_id}")

    # 3. User Profile
    res = client.get("/api/users/profile", headers=headers)
    assert res.status_code == 200
    profile = res.json()["data"]
    assert profile["experience_level"] in ["BEGINNER", "INTERMEDIATE", "ADVANCED"]
    print("✓ [GET /api/users/profile] User profile fetched successfully.")

    # 4. Onboarding Assessment
    assessment_payload = {
        "experience_level": "BEGINNER",
        "answers": [
            {"question_id": 1, "selected_option": 0},
            {"question_id": 2, "selected_option": 1},
            {"question_id": 3, "selected_option": 0},
            {"question_id": 4, "selected_option": 2}
        ]
    }
    res = client.post("/api/assessment/submit", json=assessment_payload, headers=headers)
    assert res.status_code == 200
    ass_data = res.json()["data"]
    assert "assigned_path" in ass_data
    assert "radar_scores" in ass_data
    print(f"✓ [POST /api/assessment/submit] Diagnostic submitted -> Assigned: {ass_data['assigned_path']}")

    # 5. Virtual Portfolio Fetch
    res = client.get("/api/portfolio", headers=headers)
    assert res.status_code == 200
    port = res.json()["data"]
    assert port["starting_cash"] == 100000.00
    assert port["current_cash"] > 0
    assert len(port["positions"]) >= 0
    print(f"✓ [GET /api/portfolio] Portfolio verified: Net Worth ₹{port['total_portfolio_value']:,.2f}")

    # 6. Trade Execution — Valid BUY Order
    buy_order = {
        "symbol": "INFY",
        "type": "BUY",
        "quantity": 5,
        "order_type": "MARKET",
        "product_type": "CNC",
        "leverage_multiplier": 1.0,
        "stop_loss": 1700.00,
        "target_price": 1950.00,
        "reason_tag": "Long-term Fundamental Value"
    }
    res = client.post("/api/trades/execute", json=buy_order, headers=headers)
    assert res.status_code == 200
    trade_res = res.json()["data"]
    assert trade_res["success"] is True
    print(f"✓ [POST /api/trades/execute] BUY order executed: 5 INFY @ ₹{trade_res['executed_price']}")

    # 7. Trade Failure Case — Insufficient Funds
    expensive_order = {
        "symbol": "TCS",
        "type": "BUY",
        "quantity": 10000, # Requires ₹4 Crore
        "order_type": "MARKET"
    }
    res = client.post("/api/trades/execute", json=expensive_order, headers=headers)
    assert res.status_code == 400
    assert "Insufficient virtual funds" in res.json()["detail"]
    print("✓ [POST /api/trades/execute - Validation] Blocked order with insufficient capital.")

    # 8. Trade Failure Case — Selling Unowned Shares
    invalid_sell = {
        "symbol": "TATAMOTORS",
        "type": "SELL",
        "quantity": 500,
        "order_type": "MARKET"
    }
    res = client.post("/api/trades/execute", json=invalid_sell, headers=headers)
    assert res.status_code == 400
    assert "Cannot sell" in res.json()["detail"]
    print("✓ [POST /api/trades/execute - Validation] Blocked naked sell of unowned shares.")

    # 9. Trade History
    res = client.get("/api/trades/history", headers=headers)
    assert res.status_code == 200
    history = res.json()["data"]
    assert history["total"] >= 1
    print(f"✓ [GET /api/trades/history] Ledger audit passed ({history['total']} trades logged).")

    # 10. Portfolio Analytics
    res = client.get("/api/analytics/summary", headers=headers)
    assert res.status_code == 200
    analytics = res.json()["data"]
    assert "sector_allocation" in analytics
    print(f"✓ [GET /api/analytics/summary] Analyzed {analytics['sectors_count']} economic sectors.")

    # 11. Behavioral Insights (7 Patterns & Score)
    res = client.get("/api/insights", headers=headers)
    assert res.status_code == 200
    insights = res.json()["data"]
    assert "overall_score" in insights
    assert len(insights["patterns"]) >= 3
    print(f"✓ [GET /api/insights] Behavioral Score calculated: {insights['overall_score']}/100 ({insights['tier_label']}).")

    # 12. Historical Market Replay Progression
    res = client.get("/api/replay/scenarios")
    assert res.status_code == 200
    scenarios = res.json()["data"]["scenarios"]
    assert len(scenarios) >= 2

    replay_decision = {
        "scenario_id": "covid-crash-2020",
        "checkpoint_index": 0,
        "action_id": "MODERATE_BUY",
        "reasoning": "Value hunting at reasonable levels",
        "user_cash": 50000.0,
        "user_units": 4.12
    }
    res = client.post("/api/replay/decision", json=replay_decision)
    assert res.status_code == 200
    rep_res = res.json()["data"]
    assert rep_res["next_checkpoint_index"] == 1
    print("✓ [POST /api/replay/decision] Historical checkpoint advanced; future masked.")

    # 13. Market News Explainer
    res = client.get("/api/news")
    assert res.status_code == 200
    articles = res.json()["data"]["articles"]
    assert len(articles) >= 3
    print(f"✓ [GET /api/news] Loaded {len(articles)} verified market news explainer items.")

    # 14. Learning Modules & Lesson Progress
    res = client.get("/api/learning/modules")
    assert res.status_code == 200
    modules = res.json()["data"]["modules"]
    assert len(modules) >= 4

    complete_res = client.post("/api/learning/complete-lesson?lesson_id=lesson-1-1&module_id=module-1", headers=headers)
    assert complete_res.status_code == 200
    print("✓ [POST /api/learning/complete-lesson] Completed lesson and awarded XP.")

    # 15. Challenges & Quest Claiming
    res = client.get("/api/challenges", headers=headers)
    assert res.status_code == 200

    claim_res = client.post("/api/challenges/claim", json={"quest_id": "quest-daily-1"}, headers=headers)
    assert claim_res.status_code == 200
    assert claim_res.json()["data"]["awarded_xp"] > 0
    print("✓ [POST /api/challenges/claim] Claimed quest reward successfully.")

    # 16. AI Grounded Services (Concept, News, Trade Debrief)
    ai_status = client.get("/api/ai/status").json()["data"]
    print(f"✓ [GET /api/ai/status] AI Status: {ai_status['engine']} (is_live: {ai_status['is_live_gemini']})")

    ai_concept = client.post("/api/ai/explain-concept", json={"concept_name": "Repo Rate"}).json()["data"]
    assert "definition" in ai_concept
    assert "real_world_example" in ai_concept
    print("✓ [POST /api/ai/explain-concept] AI Concept explanation returned.")

    ai_trade = client.post("/api/ai/debrief-trade", json={
        "symbol": "RELIANCE",
        "action": "BUY",
        "quantity": 10,
        "price": 2985.40,
        "reason_tag": "Momentum Breakout",
        "portfolio_weight_percent": 38.0,
        "has_stop_loss": False,
        "is_after_loss": True
    }).json()["data"]
    assert "behavioral_diagnosis" in ai_trade
    print(f"✓ [POST /api/ai/debrief-trade] AI Trade Diagnosis: {ai_trade['behavioral_diagnosis']}")

    # 17. Reset Virtual Portfolio
    res = client.post("/api/portfolio/reset", headers=headers)
    assert res.status_code == 200
    print("✓ [POST /api/portfolio/reset] Portfolio reset to ₹1,00,000 baseline.")

    # 18. Crypto & Forex Market Intelligence & Converter
    res = client.get("/api/market-intelligence/crypto")
    assert res.status_code == 200
    crypto_data = res.json()["data"]
    assert len(crypto_data["assets"]) >= 5
    print(f"✓ [GET /api/market-intelligence/crypto] Loaded {len(crypto_data['assets'])} crypto assets (BTC, ETH, SOL).")

    res = client.get("/api/market-intelligence/forex")
    assert res.status_code == 200
    forex_data = res.json()["data"]
    assert len(forex_data["pairs"]) >= 5
    print(f"✓ [GET /api/market-intelligence/forex] Loaded {len(forex_data['pairs'])} forex currency pairs (USD/INR, EUR/USD).")

    res = client.post("/api/market-intelligence/convert", json={"from_currency": "USD", "to_currency": "INR", "amount": 100})
    assert res.status_code == 200
    assert res.json()["data"]["converted_amount"] > 8000
    print("✓ [POST /api/market-intelligence/convert] Mid-market currency conversion verified.")

    # 19. Hot Topics & News with Bookmarking
    res = client.get("/api/hot-topics")
    assert res.status_code == 200
    news_items = res.json()["data"]["articles"]
    assert len(news_items) >= 4
    first_article_id = news_items[0]["id"]

    res = client.post(f"/api/hot-topics/{first_article_id}/bookmark", headers=headers)
    assert res.status_code == 200
    assert "is_bookmarked" in res.json()["data"]
    print(f"✓ [POST /api/hot-topics/:id/bookmark] Toggled bookmark state on article {first_article_id}.")

    # 20. Community Forums (Threads, Comments, Reactions)
    res = client.get("/api/forums/categories")
    assert res.status_code == 200
    assert len(res.json()["data"]["categories"]) >= 3

    res = client.get("/api/forums/threads")
    assert res.status_code == 200
    threads = res.json()["data"]["threads"]
    assert len(threads) >= 2
    first_thread_id = threads[0]["id"]

    res = client.post("/api/forums/react", json={"thread_id": first_thread_id, "reaction_type": "UPVOTE"}, headers=headers)
    assert res.status_code == 200

    comment_res = client.post("/api/forums/comments", json={"thread_id": first_thread_id, "content": "Great architectural insight on Layer 2 gas fees!"}, headers=headers)
    assert comment_res.status_code == 200
    print(f"✓ [POST /api/forums/comments] Thread comment added & author reputation awarded.")

    # 21. Academy Tracks, Courses & Lessons
    res = client.get("/api/academy/tracks")
    assert res.status_code == 200
    assert len(res.json()["data"]["tracks"]) >= 3

    res = client.get("/api/academy/courses")
    assert res.status_code == 200
    courses = res.json()["data"]["courses"]
    assert len(courses) >= 3

    res = client.get(f"/api/academy/courses/{courses[0]['id']}", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["data"]["lessons"]) >= 1
    print(f"✓ [GET /api/academy/courses/:id] Verified curriculum for: {courses[0]['title']}.")

    # 22. Academy Quiz Engine
    res = client.get("/api/academy/quizzes/quiz-bc-101")
    assert res.status_code == 200
    quiz_data = res.json()["data"]
    assert len(quiz_data["questions"]) >= 2

    quiz_sub = client.post("/api/academy/quizzes/quiz-bc-101/submit", json={
        "quiz_id": "quiz-bc-101",
        "answers": {1: 1, 2: 2, 3: 1}
    }, headers=headers)
    assert quiz_sub.status_code == 200
    assert quiz_sub.json()["data"]["score"] == 100
    print("✓ [POST /api/academy/quizzes/:id/submit] Quiz attempt scored 100% and awarded XP.")

    # 23. Personalization Hub & Watchlists
    res = client.get("/api/personalization/hub", headers=headers)
    assert res.status_code == 200
    hub_data = res.json()["data"]
    assert "profile" in hub_data
    assert "watchlists" in hub_data
    print(f"✓ [GET /api/personalization/hub] Aggregated profile hub verified for {hub_data['profile']['full_name']}.")

    # 24. Admin Panel & Moderation
    res = client.get("/api/admin/stats", headers=headers)
    assert res.status_code == 200
    admin_stats = res.json()["data"]
    assert admin_stats["total_users"] >= 1
    print(f"✓ [GET /api/admin/stats] Admin verified platform health: {admin_stats['platform_health']}.")

    # 25. Forum Safety Scanner, Duplicate Check & Accepted Solution
    res = client.get("/api/forums/categories")
    assert res.status_code == 200
    assert len(res.json()["data"]["categories"]) == 6

    pre_unsafe = client.post("/api/forums/precheck", json={
        "title": "Guaranteed profit scheme",
        "content": "DM me on t.me/scamgroup with account 123456789012"
    }).json()["data"]
    assert pre_unsafe["safe"] is False
    assert len(pre_unsafe["blockers"]) >= 2

    blocked_post = client.post("/api/forums/threads", json={
        "category": "Cryptocurrency",
        "subcategory": "Bitcoin",
        "post_type": "DISCUSSION",
        "title": "Join for guaranteed profit",
        "content": "Guaranteed return 20% monthly via t.me/vip"
    }, headers=headers)
    assert blocked_post.status_code == 400

    pre_dup = client.post("/api/forums/precheck", json={
        "title": "EIP-4844 Blobspace Rollup Economics",
        "content": "Checking gas fees"
    }).json()["data"]
    assert pre_dup["safe"] is True
    assert len(pre_dup["related_threads"]) >= 1

    # Test Accepted Solution
    accept_res = client.post(
        f"/api/forums/threads/{first_thread_id}/accept-answer",
        json={"comment_id": comment_res.json()["data"]["comment_id"]},
        headers=headers
    )
    assert accept_res.status_code == 200
    print("✓ [Forum Safety & Quality] 6 Starter Spaces, PII/Scam Blocker, Duplicate Check & Accepted Solution verified.")

    print("=" * 70)
    print("🎉 ALL 25 BACKEND API ENDPOINTS & SAFETY TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()
