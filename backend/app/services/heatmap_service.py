from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

from backend.app.services.providers.base import DataFreshnessStatus, utc_now_iso
from backend.app.services.providers.cache_and_limiter import market_cache
from backend.app.services.providers.stocks_provider import (
    YAHOO_CHART_BASE,
    YAHOO_HEADERS,
    get_indian_market_session,
)

logger = logging.getLogger("mindmark.services.heatmap")

HEATMAP_UNIVERSE: List[Dict[str, Any]] = [
    # Banking
    {"symbol": "HDFCBANK", "providerSymbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd.", "sector": "Banking", "exchange": "NSE", "indices": ["NIFTY50", "NIFTYBANK"], "mcapCr": 1280000},
    {"symbol": "ICICIBANK", "providerSymbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd.", "sector": "Banking", "exchange": "NSE", "indices": ["NIFTY50", "NIFTYBANK"], "mcapCr": 890000},
    {"symbol": "SBIN", "providerSymbol": "SBIN.NS", "name": "State Bank of India", "sector": "Banking", "exchange": "NSE", "indices": ["NIFTY50", "NIFTYBANK"], "mcapCr": 730000},
    {"symbol": "KOTAKBANK", "providerSymbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "sector": "Banking", "exchange": "NSE", "indices": ["NIFTY50", "NIFTYBANK"], "mcapCr": 350000},
    {"symbol": "AXISBANK", "providerSymbol": "AXISBANK.NS", "name": "Axis Bank Ltd.", "sector": "Banking", "exchange": "NSE", "indices": ["NIFTY50", "NIFTYBANK"], "mcapCr": 360000},
    {"symbol": "BANKBARODA", "providerSymbol": "BANKBARODA.NS", "name": "Bank of Baroda", "sector": "Banking", "exchange": "NSE", "indices": ["NIFTYNEXT50", "NIFTYBANK"], "mcapCr": 125000},
    # IT
    {"symbol": "TCS", "providerSymbol": "TCS.NS", "name": "Tata Consultancy Services", "sector": "IT", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 1520000},
    {"symbol": "INFY", "providerSymbol": "INFY.NS", "name": "Infosys Ltd.", "sector": "IT", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 760000},
    {"symbol": "HCLTECH", "providerSymbol": "HCLTECH.NS", "name": "HCL Technologies", "sector": "IT", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 490000},
    {"symbol": "WIPRO", "providerSymbol": "WIPRO.NS", "name": "Wipro Ltd.", "sector": "IT", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 295000},
    {"symbol": "LTIM", "providerSymbol": "LTIM.NS", "name": "LTIMindtree Ltd.", "sector": "IT", "exchange": "NSE", "indices": ["NIFTYNEXT50"], "mcapCr": 175000},
    # Energy
    {"symbol": "RELIANCE", "providerSymbol": "RELIANCE.NS", "name": "Reliance Industries", "sector": "Energy", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 1980000},
    {"symbol": "ONGC", "providerSymbol": "ONGC.NS", "name": "Oil & Natural Gas Corp.", "sector": "Energy", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 330000},
    {"symbol": "NTPC", "providerSymbol": "NTPC.NS", "name": "NTPC Ltd.", "sector": "Energy", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 380000},
    {"symbol": "POWERGRID", "providerSymbol": "POWERGRID.NS", "name": "Power Grid Corp.", "sector": "Energy", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 310000},
    # Automobile
    {"symbol": "M&M", "providerSymbol": "M&M.NS", "name": "Mahindra & Mahindra", "sector": "Automobile", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 370000},
    {"symbol": "MARUTI", "providerSymbol": "MARUTI.NS", "name": "Maruti Suzuki India", "sector": "Automobile", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 385000},
    {"symbol": "BAJAJ-AUTO", "providerSymbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto Ltd.", "sector": "Automobile", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 270000},
    {"symbol": "EICHERMOT", "providerSymbol": "EICHERMOT.NS", "name": "Eicher Motors Ltd.", "sector": "Automobile", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 135000},
    # Healthcare
    {"symbol": "SUNPHARMA", "providerSymbol": "SUNPHARMA.NS", "name": "Sun Pharma Industries", "sector": "Healthcare", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 440000},
    {"symbol": "CIPLA", "providerSymbol": "CIPLA.NS", "name": "Cipla Ltd.", "sector": "Healthcare", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 125000},
    {"symbol": "DRREDDY", "providerSymbol": "DRREDDY.NS", "name": "Dr. Reddy's Labs", "sector": "Healthcare", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 105000},
    {"symbol": "DIVISLAB", "providerSymbol": "DIVISLAB.NS", "name": "Divi's Laboratories", "sector": "Healthcare", "exchange": "NSE", "indices": ["NIFTYNEXT50"], "mcapCr": 155000},
    # FMCG
    {"symbol": "ITC", "providerSymbol": "ITC.NS", "name": "ITC Ltd.", "sector": "FMCG", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 610000},
    {"symbol": "HINDUNILVR", "providerSymbol": "HINDUNILVR.NS", "name": "Hindustan Unilever", "sector": "FMCG", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 590000},
    {"symbol": "NESTLEIND", "providerSymbol": "NESTLEIND.NS", "name": "Nestle India Ltd.", "sector": "FMCG", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 225000},
    {"symbol": "VBL", "providerSymbol": "VBL.NS", "name": "Varun Beverages Ltd.", "sector": "FMCG", "exchange": "NSE", "indices": ["NIFTYNEXT50"], "mcapCr": 195000},
    # Financial Services
    {"symbol": "BAJFINANCE", "providerSymbol": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd.", "sector": "Financial Services", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 430000},
    {"symbol": "BAJAJFINSV", "providerSymbol": "BAJAJFINSV.NS", "name": "Bajaj Finserv Ltd.", "sector": "Financial Services", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 265000},
    {"symbol": "JIOFIN", "providerSymbol": "JIOFIN.NS", "name": "Jio Financial Services", "sector": "Financial Services", "exchange": "NSE", "indices": ["NIFTYNEXT50"], "mcapCr": 210000},
    # Metals
    {"symbol": "TATASTEEL", "providerSymbol": "TATASTEEL.NS", "name": "Tata Steel Ltd.", "sector": "Metals", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 190000},
    {"symbol": "JSWSTEEL", "providerSymbol": "JSWSTEEL.NS", "name": "JSW Steel Ltd.", "sector": "Metals", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 235000},
    {"symbol": "HINDALCO", "providerSymbol": "HINDALCO.NS", "name": "Hindalco Industries", "sector": "Metals", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 150000},
    # Telecom
    {"symbol": "BHARTIARTL", "providerSymbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd.", "sector": "Telecom", "exchange": "NSE", "indices": ["NIFTY50"], "mcapCr": 950000},
    {"symbol": "INDUSTOWER", "providerSymbol": "INDUSTOWER.NS", "name": "Indus Towers Ltd.", "sector": "Telecom", "exchange": "NSE", "indices": ["NIFTYNEXT50"], "mcapCr": 95000},
    # BSE Listed Examples
    {"symbol": "RELIANCE.BO", "providerSymbol": "RELIANCE.BO", "name": "Reliance Industries (BSE)", "sector": "Energy", "exchange": "BSE", "indices": ["BSE"], "mcapCr": 1980000},
    {"symbol": "TCS.BO", "providerSymbol": "TCS.BO", "name": "TCS Ltd. (BSE)", "sector": "IT", "exchange": "BSE", "indices": ["BSE"], "mcapCr": 1520000},
    {"symbol": "HDFCBANK.BO", "providerSymbol": "HDFCBANK.BO", "name": "HDFC Bank (BSE)", "sector": "Banking", "exchange": "BSE", "indices": ["BSE"], "mcapCr": 1280000},
]

_HEATMAP_TF_PARAMS = {
    "1D": ("1d", "5d"),
    "1W": ("1d", "1mo"),
    "1M": ("1d", "1mo"),
    "3M": ("1d", "3mo"),
    "6M": ("1d", "6mo"),
    "1Y": ("1d", "1y"),
}


async def _fetch_stock_perf(
    client: httpx.AsyncClient,
    item: Dict[str, Any],
    timeframe: str,
    is_open: bool,
) -> Optional[Dict[str, Any]]:
    cache_key = f"heatmap:item:{item['symbol']}:{timeframe}"
    fresh = market_cache.get_fresh(cache_key)
    if fresh is not None:
        return fresh

    interval, y_range = _HEATMAP_TF_PARAMS.get(timeframe, ("1d", "5d"))
    try:
        resp = await client.get(
            f"{YAHOO_CHART_BASE}/{item['providerSymbol']}",
            params={"interval": interval, "range": y_range},
        )
        resp.raise_for_status()
        res_list = resp.json().get("chart", {}).get("result") or []
        if not res_list:
            return None
        chart_res = res_list[0]
        ymeta = chart_res.get("meta", {})
        qblock = (chart_res.get("indicators", {}).get("quote") or [{}])[0]
        closes = [
            float(c)
            for c in (qblock.get("close") or [])
            if c is not None
        ]
        vols = [float(v) for v in (qblock.get("volume") or []) if v is not None]
        if not closes:
            return None

        latest_price = float(ymeta.get("regularMarketPrice") or closes[-1])
        latest_vol = float(ymeta.get("regularMarketVolume") or (vols[-1] if vols else 0.0))
        if timeframe == "1D":
            base_price = float(ymeta.get("chartPreviousClose") or ymeta.get("previousClose") or (closes[-2] if len(closes) >= 2 else latest_price))
        elif timeframe == "1W":
            base_price = closes[-6] if len(closes) >= 6 else closes[0]
        else:
            base_price = closes[0]

        change = latest_price - base_price
        change_pct = ((change / base_price) * 100) if base_price else 0.0
        status: DataFreshnessStatus = "DELAYED" if is_open else "MARKET_CLOSED"

        out = {
            "symbol": item["symbol"],
            "name": item["name"],
            "sector": item["sector"],
            "exchange": item["exchange"],
            "indices": item["indices"],
            "marketCapCr": item["mcapCr"],
            "price": round(latest_price, 2),
            "volume": latest_vol,
            "change": round(change, 2),
            "changePercent": round(change_pct, 2),
            "status": status,
        }
        market_cache.set(
            cache_key,
            out,
            ttl_seconds=60 if is_open else 240,
            asset_class="STOCK",
            symbol=item["symbol"],
            source="Yahoo Finance",
            persist_sqlite=False,
        )
        return out
    except Exception as exc:
        logger.debug("heatmap_item_failed sym=%s err=%s", item["symbol"], exc)
        stale = market_cache.get_stale(cache_key)
        if stale:
            stale["status"] = "CACHED"
            return stale
        return None


async def get_stocks_heatmap(
    universe: str = "NIFTY50",
    timeframe: str = "1D",
    sector: Optional[str] = None,
    direction: Optional[str] = None,
    sort_by: str = "HIGHEST_MCAP",
) -> Dict[str, Any]:
    u = universe.upper().strip()
    tf = timeframe.upper().strip()
    if tf not in _HEATMAP_TF_PARAMS:
        tf = "1D"

    session_label, is_open = get_indian_market_session()

    candidates = []
    for item in HEATMAP_UNIVERSE:
        if u == "BSE":
            if item["exchange"] != "BSE":
                continue
        elif u == "NSE":
            if item["exchange"] != "NSE":
                continue
        elif u == "NIFTY100":
            if "NIFTY50" not in item["indices"] and "NIFTYNEXT50" not in item["indices"]:
                continue
        elif u in ("NIFTY50", "NIFTYNEXT50", "NIFTYBANK"):
            if u not in item["indices"]:
                continue
        if sector and sector != "ALL" and item["sector"].lower() != sector.lower():
            continue
        candidates.append(item)

    async with httpx.AsyncClient(timeout=10.0, headers=YAHOO_HEADERS) as client:
        results = await asyncio.gather(
            *(_fetch_stock_perf(client, item, tf, is_open) for item in candidates)
        )

    items = [r for r in results if r is not None]
    if direction == "GAINERS":
        items = [it for it in items if it["changePercent"] > 0]
    elif direction == "LOSERS":
        items = [it for it in items if it["changePercent"] < 0]

    sb = sort_by.upper().strip()
    if sb == "TOP_GAINERS":
        items.sort(key=lambda x: x["changePercent"], reverse=True)
    elif sb == "TOP_LOSERS":
        items.sort(key=lambda x: x["changePercent"], reverse=False)
    elif sb == "LOWEST_MCAP":
        items.sort(key=lambda x: x["marketCapCr"], reverse=False)
    elif sb == "HIGHEST_VOLUME":
        items.sort(key=lambda x: x.get("volume", 0.0), reverse=True)
    elif sb == "PCT_CHANGE":
        items.sort(key=lambda x: abs(x["changePercent"]), reverse=True)
    else:
        items.sort(key=lambda x: x["marketCapCr"], reverse=True)
    sectors = sorted({it["sector"] for it in items})
    status: DataFreshnessStatus = "DELAYED" if is_open else "MARKET_CLOSED"
    if items and all(it["status"] == "CACHED" for it in items):
        status = "CACHED"
    elif not items:
        status = "UNAVAILABLE"

    return {
        "universe": u,
        "timeframe": tf,
        "marketSession": session_label,
        "status": status,
        "source": "Yahoo Finance (NSE/BSE Delayed Feed)",
        "retrievedAt": utc_now_iso(),
        "delaySeconds": 900 if is_open else None,
        "sectors": sectors,
        "items": items,
    }
