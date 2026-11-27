import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.services.providers.base import (
    CandleSeriesResponse,
    NormalizedCandle,
    NormalizedQuote,
    utc_now_iso,
    validate_and_normalize_candles,
)
from backend.app.services.providers.cache_and_limiter import market_cache
from backend.app.services.providers.stocks_provider import get_indian_market_session

client = TestClient(app)


def _register_user(email_prefix: str) -> dict:
    email = f"{email_prefix}_{uuid.uuid4().hex[:8]}@mindmark.test"
    res = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": f"Test {email_prefix}",
            "password": "TestPassword123!",
            "experience_level": "INTERMEDIATE",
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    return {
        "token": data["access_token"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "user": data["user"],
    }


def test_markets_overview_and_search():
    res = client.get("/api/markets/overview")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data["indices"]) == 3
    assert len(data["stocks"]["all"]) >= 8
    assert len(data["crypto"]["all"]) >= 5
    assert len(data["forex"]["popular"]) >= 5

    # Search across all 3 asset classes
    s_res = client.get("/api/markets/search?q=BTC")
    assert s_res.status_code == 200
    symbols = [r["symbol"] for r in s_res.json()["data"]["results"]]
    assert "BTCUSDT" in symbols

    s_stock = client.get("/api/markets/search?q=RELIANCE&asset_class=STOCK")
    assert s_stock.status_code == 200
    assert any(r["symbol"] == "RELIANCE" for r in s_stock.json()["data"]["results"])

    s_fx = client.get("/api/markets/search?q=USDINR&asset_class=FOREX")
    assert s_fx.status_code == 200
    assert any(r["symbol"] == "USDINR" for r in s_fx.json()["data"]["results"])


def test_live_crypto_quote_and_all_timeframes():
    q_res = client.get("/api/markets/quote/CRYPTO/BTCUSDT")
    assert q_res.status_code == 200
    quote = q_res.json()["data"]["quote"]
    assert quote["symbol"] == "BTCUSDT"
    assert quote["assetClass"] == "CRYPTO"
    assert quote["status"] in ("LIVE", "CACHED")
    assert quote["price"] is not None and quote["price"] > 0
    assert quote["source"]
    assert quote["retrievedAt"]

    for tf in ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]:
        c_res = client.get(f"/api/markets/candles/CRYPTO/BTCUSDT?timeframe={tf}&limit=20")
        assert c_res.status_code == 200
        series = c_res.json()["data"]
        assert series["timeframe"] == tf
        assert len(series["candles"]) > 0
        c0 = series["candles"][0]
        assert c0["high"] >= c0["low"]


def test_stock_and_forex_quotes_and_freshness_truthfulness():
    stk_res = client.get("/api/markets/quote/STOCK/RELIANCE")
    assert stk_res.status_code == 200
    stk = stk_res.json()["data"]["quote"]
    assert stk["symbol"] == "RELIANCE"
    assert stk["exchange"] == "NSE"
    # Delayed Yahoo feed must NEVER claim LIVE
    assert stk["status"] in ("DELAYED", "MARKET_CLOSED", "CACHED", "UNAVAILABLE")
    assert stk["status"] != "LIVE"

    fx_res = client.get("/api/markets/quote/FOREX/USDINR")
    assert fx_res.status_code == 200
    fx = fx_res.json()["data"]["quote"]
    assert fx["symbol"] == "USDINR"
    assert fx["status"] in ("DELAYED", "MARKET_CLOSED", "CACHED", "UNAVAILABLE")
    assert fx["status"] != "LIVE"


def test_indian_market_session_holiday_and_hours():
    # Saturday in IST -> Closed
    sat = datetime(2026, 11, 28, 6, 0, tzinfo=timezone.utc)
    label, is_open = get_indian_market_session(sat)
    assert is_open is False
    assert "Weekend" in label

    # Weekday 10:00 IST (04:30 UTC) -> Open
    fri_open = datetime(2026, 11, 27, 4, 30, tzinfo=timezone.utc)
    label2, is_open2 = get_indian_market_session(fri_open)
    assert is_open2 is True
    assert "Regular Session Open" in label2


def test_invalid_timeframe_and_asset_class():
    r1 = client.get("/api/markets/candles/CRYPTO/BTCUSDT?timeframe=2y")
    assert r1.status_code == 400

    r2 = client.get("/api/markets/quote/COMMODITY/GOLD")
    assert r2.status_code == 400


def test_provider_failure_serves_cached_or_unavailable_never_fake():
    # Seed a cached quote and simulate upstream failure
    cached_quote = NormalizedQuote(
        symbol="SOLUSDT",
        displaySymbol="SOL/USDT",
        name="Solana",
        assetClass="CRYPTO",
        exchange="BINANCE",
        currency="USDT",
        price=150.0,
        source="Binance Spot REST",
        retrievedAt=utc_now_iso(),
        status="LIVE",
        delaySeconds=0,
    ).model_dump()
    market_cache.set("crypto:quote:SOLUSDT", cached_quote, ttl_seconds=0, asset_class="CRYPTO", symbol="SOLUSDT", source="Binance")

    with patch("httpx.AsyncClient.get", side_effect=TimeoutError("Simulated upstream timeout")):
        res = client.get("/api/markets/quote/CRYPTO/SOLUSDT")
        assert res.status_code == 200
        q = res.json()["data"]["quote"]
        assert q["status"] == "CACHED"
        assert q["price"] == 150.0

        # Symbol with no cache must return UNAVAILABLE, never synthetic price
        res_uncached = client.get("/api/markets/quote/CRYPTO/UNKNOWNCOINUSDT")
        assert res_uncached.status_code == 200
        q2 = res_uncached.json()["data"]["quote"]
        assert q2["status"] == "UNAVAILABLE"
        assert q2["price"] is None


def test_multi_watchlist_crud_and_authorization_isolation():
    user_a = _register_user("alpha")
    user_b = _register_user("beta")

    # User A creates a watchlist
    c_res = client.post(
        "/api/watchlists",
        json={"name": "Tech Leaders", "description": "NSE IT & US Crypto"},
        headers=user_a["headers"],
    )
    assert c_res.status_code == 200
    wl_a = c_res.json()["data"]["watchlist"]
    wl_id = wl_a["id"]

    # User A adds two items
    i1 = client.post(
        f"/api/watchlists/{wl_id}/items",
        json={"asset_class": "STOCK", "symbol": "TCS"},
        headers=user_a["headers"],
    )
    assert i1.status_code == 200
    item1_id = i1.json()["data"]["item"]["id"]

    i2 = client.post(
        f"/api/watchlists/{wl_id}/items",
        json={"asset_class": "CRYPTO", "symbol": "BTCUSDT"},
        headers=user_a["headers"],
    )
    assert i2.status_code == 200
    item2_id = i2.json()["data"]["item"]["id"]

    # Reorder items
    r_res = client.patch(
        f"/api/watchlists/{wl_id}/reorder",
        json={"item_ids": [item2_id, item1_id]},
        headers=user_a["headers"],
    )
    assert r_res.status_code == 200

    # Rename watchlist
    u_res = client.patch(
        f"/api/watchlists/{wl_id}",
        json={"name": "Renamed Leaders"},
        headers=user_a["headers"],
    )
    assert u_res.status_code == 200
    assert u_res.json()["data"]["watchlist"]["name"] == "Renamed Leaders"

    # User B CANNOT rename, add to, reorder, or delete User A's watchlist
    assert client.patch(f"/api/watchlists/{wl_id}", json={"name": "Hacked"}, headers=user_b["headers"]).status_code == 403
    assert client.post(f"/api/watchlists/{wl_id}/items", json={"asset_class": "STOCK", "symbol": "INFY"}, headers=user_b["headers"]).status_code == 403
    assert client.delete(f"/api/watchlists/{wl_id}", headers=user_b["headers"]).status_code == 403

    # User B's list does NOT contain User A's watchlist
    b_lists = client.get("/api/watchlists?include_quotes=false", headers=user_b["headers"]).json()["data"]["watchlists"]
    assert all(w["id"] != wl_id for w in b_lists)

    # User A removes item & deletes watchlist
    assert client.delete(f"/api/watchlists/{wl_id}/items/{item1_id}", headers=user_a["headers"]).status_code == 200
    assert client.delete(f"/api/watchlists/{wl_id}", headers=user_a["headers"]).status_code == 200


def test_websocket_crypto_live_stream():
    with client.websocket_connect("/api/markets/ws/CRYPTO/BTCUSDT") as ws:
        ws.send_text("ping")
        pong_or_tick = json.loads(ws.receive_text())
        assert pong_or_tick["type"] in ("PONG", "TICK", "STATUS")
        # Wait for at least 1 real Binance tick (within ~3s)
        received_tick = pong_or_tick if pong_or_tick["type"] == "TICK" else None
        for _ in range(5):
            if received_tick:
                break
            msg = json.loads(ws.receive_text())
            if msg["type"] == "TICK":
                received_tick = msg
                break
        assert received_tick is not None, "Expected real-time TICK from Binance WebSocket"
        assert received_tick["status"] == "LIVE"
        assert received_tick["source"] == "Binance WebSocket"
        assert received_tick["price"] > 0


def test_universal_search_international_and_altcoins():
    # International stock via Yahoo Finance Search
    r_aapl = client.get("/api/markets/search?q=AAPL&asset_class=STOCK")
    assert r_aapl.status_code == 200
    assert any(r["symbol"] == "AAPL" for r in r_aapl.json()["data"]["results"])

    # Altcoin via Binance ExchangeInfo
    r_doge = client.get("/api/markets/search?q=PEPE&asset_class=CRYPTO")
    assert r_doge.status_code == 200
    assert any("PEPE" in r["symbol"] for r in r_doge.json()["data"]["results"])


def test_groww_historical_ranges_and_candle_validation():
    for r_key in ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"]:
        res = client.get(f"/api/markets/candles/CRYPTO/BTCUSDT?range={r_key}&limit=100")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["range"] == r_key
        assert len(data["candles"]) > 0

    # Invalid range returns 400
    bad = client.get("/api/markets/candles/CRYPTO/BTCUSDT?range=10Y")
    assert bad.status_code == 400

    # Candle validation rejects malformed candles and deduplicates/sorts
    validated = validate_and_normalize_candles([
        NormalizedCandle(time=200, open=10, high=12, low=9, close=11, volume=5),
        NormalizedCandle(time=100, open=10, high=11, low=9, close=10.5, volume=3),
        NormalizedCandle(time=150, open=10, high=8, low=9, close=10, volume=1),   # invalid high < low
        NormalizedCandle(time=160, open=15, high=12, low=9, close=10, volume=1),  # invalid open > high
        NormalizedCandle(time=-5, open=10, high=12, low=9, close=10, volume=1),   # invalid timestamp
    ])
    assert [c.time for c in validated] == [100, 200]


def test_heatmap_and_extended_timeframes():
    hm = client.get("/api/markets/heatmap?universe=NIFTY50&timeframe=1D")
    assert hm.status_code == 200
    hdata = hm.json()["data"]
    assert hdata["universe"] == "NIFTY50"
    assert len(hdata["items"]) >= 10
    assert hdata["status"] in ("DELAYED", "MARKET_CLOSED", "CACHED")
    assert hdata["status"] != "LIVE"

    for tf in ["3m", "2h", "1M"]:
        r = client.get(f"/api/markets/candles/CRYPTO/BTCUSDT?timeframe={tf}&limit=15")
        assert r.status_code == 200
        assert len(r.json()["data"]["candles"]) > 0


def test_chart_drawings_layouts_and_custom_indicators_isolation():
    user_a = _register_user("chart_a")
    user_b = _register_user("chart_b")

    # Drawing CRUD + isolation
    drw = client.post(
        "/api/charts/drawings",
        json={
            "asset_class": "STOCK",
            "symbol": "RELIANCE",
            "tool_type": "TRENDLINE",
            "points": [{"time": 1700000000, "price": 2800.0}, {"time": 1700100000, "price": 2950.0}],
        },
        headers=user_a["headers"],
    )
    assert drw.status_code == 200
    did = drw.json()["data"]["drawing"]["id"]
    assert client.delete(f"/api/charts/drawings/{did}", headers=user_b["headers"]).status_code == 403
    assert client.delete(f"/api/charts/drawings/{did}", headers=user_a["headers"]).status_code == 200

    # Layout CRUD + isolation
    lay = client.post(
        "/api/charts/layouts",
        json={"name": "Dual NIFTY/BTC", "layout": {"dualMode": True}},
        headers=user_a["headers"],
    )
    assert lay.status_code == 200
    lid = lay.json()["data"]["layout"]["id"]
    assert client.delete(f"/api/charts/layouts/{lid}", headers=user_b["headers"]).status_code == 403
    assert client.delete(f"/api/charts/layouts/{lid}", headers=user_a["headers"]).status_code == 200

    # Custom Indicator CRUD + isolation
    ci = client.post(
        "/api/charts/custom-indicators",
        json={"name": "Spread", "expression": "sma(close, 10) - sma(close, 20)", "pane": "SEPARATE"},
        headers=user_a["headers"],
    )
    assert ci.status_code == 200
    cid = ci.json()["data"]["indicator"]["id"]
    assert client.delete(f"/api/charts/custom-indicators/{cid}", headers=user_b["headers"]).status_code == 403
    assert client.delete(f"/api/charts/custom-indicators/{cid}", headers=user_a["headers"]).status_code == 200
