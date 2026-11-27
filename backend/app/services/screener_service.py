from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

from backend.app.services.heatmap_service import HEATMAP_UNIVERSE
from backend.app.services.providers.base import DataFreshnessStatus, utc_now_iso
from backend.app.services.providers.cache_and_limiter import market_cache
from backend.app.services.providers.indian_vendors import bharatstock_adapter
from backend.app.services.providers.stocks_provider import (
    YAHOO_CHART_BASE,
    YAHOO_HEADERS,
    get_indian_market_session_details,
)

logger = logging.getLogger("mindmark.services.screener")


async def _fetch_screener_row(
    client: httpx.AsyncClient,
    item: Dict[str, Any],
    is_open: bool,
) -> Optional[Dict[str, Any]]:
    cache_key = f"screener:row:{item['symbol']}"
    fresh = market_cache.get_fresh(cache_key)
    if fresh is not None:
        return fresh

    try:
        resp = await client.get(
            f"{YAHOO_CHART_BASE}/{item['providerSymbol']}",
            params={"interval": "1d", "range": "1y"},
        )
        resp.raise_for_status()
        res_list = resp.json().get("chart", {}).get("result") or []
        if not res_list:
            return None
        chart_res = res_list[0]
        ymeta = chart_res.get("meta", {})
        qblock = (chart_res.get("indicators", {}).get("quote") or [{}])[0]
        closes = [float(c) for c in (qblock.get("close") or []) if c is not None]
        vols = [float(v) for v in (qblock.get("volume") or []) if v is not None]
        if not closes:
            return None

        price = float(ymeta.get("regularMarketPrice") or closes[-1])
        prev_close = float(
            ymeta.get("chartPreviousClose")
            or ymeta.get("previousClose")
            or (closes[-2] if len(closes) >= 2 else price)
        )
        change_1d = round(((price - prev_close) / prev_close) * 100, 2) if prev_close else 0.0

        def _ret(trading_days: int) -> Optional[float]:
            if len(closes) <= trading_days:
                return None
            base = closes[-trading_days - 1]
            return round(((price - base) / base) * 100, 2) if base else None

        ret_1m = _ret(21)
        ret_3m = _ret(63)
        ret_6m = _ret(126)
        ret_1y = round(((price - closes[0]) / closes[0]) * 100, 2) if closes[0] else None

        volume = float(ymeta.get("regularMarketVolume") or (vols[-1] if vols else 0.0))
        high_52w = ymeta.get("fiftyTwoWeekHigh")
        low_52w = ymeta.get("fiftyTwoWeekLow")

        # Enrich with BharatStock fundamentals ONLY if configured & cached/within budget
        ratios: Dict[str, Any] = {}
        if bharatstock_adapter.is_configured:
            fund = await bharatstock_adapter.get_fundamentals(item["symbol"])
            if fund.get("available"):
                ratios = fund.get("ratios") or {}

        status: DataFreshnessStatus = "DELAYED" if is_open else "MARKET_CLOSED"

        row = {
            "symbol": item["symbol"],
            "name": item["name"],
            "exchange": item["exchange"],
            "sector": item["sector"],
            "indices": item["indices"],
            "marketCapCr": item["mcapCr"],
            "price": round(price, 2),
            "change1D": change_1d,
            "volume": volume,
            "high52w": round(float(high_52w), 2) if high_52w else None,
            "low52w": round(float(low_52w), 2) if low_52w else None,
            "return1M": ret_1m,
            "return3M": ret_3m,
            "return6M": ret_6m,
            "return1Y": ret_1y,
            # Genuine fundamental ratios if provided by BharatStock, else None (UI renders N/A)
            "peRatio": ratios.get("pe_ratio") or ratios.get("pe"),
            "pbRatio": ratios.get("pb_ratio") or ratios.get("pb"),
            "roe": ratios.get("roe"),
            "roce": ratios.get("roce"),
            "dividendYield": ratios.get("dividend_yield"),
            "status": status,
        }
        market_cache.set(
            cache_key,
            row,
            ttl_seconds=120 if is_open else 300,
            asset_class="STOCK",
            symbol=item["symbol"],
            source="Yahoo Finance + BharatStock",
            persist_sqlite=False,
        )
        return row
    except Exception as exc:
        logger.debug("screener_row_failed sym=%s err=%s", item["symbol"], exc)
        stale = market_cache.get_stale(cache_key)
        if stale:
            stale["status"] = "CACHED"
            return stale
        return None


async def run_stock_screener(
    exchange: Optional[str] = None,
    sector: Optional[str] = None,
    min_mcap_cr: Optional[float] = None,
    max_mcap_cr: Optional[float] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_1m_return: Optional[float] = None,
    min_1y_return: Optional[float] = None,
    min_pe: Optional[float] = None,
    max_pe: Optional[float] = None,
    sort_by: str = "marketCapCr",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 25,
) -> Dict[str, Any]:
    session = get_indian_market_session_details()
    is_open = bool(session["isOpen"])

    candidates = HEATMAP_UNIVERSE
    if exchange and exchange.upper() != "ALL":
        candidates = [c for c in candidates if c["exchange"].upper() == exchange.upper()]
    if sector and sector.upper() != "ALL":
        candidates = [c for c in candidates if c["sector"].lower() == sector.lower()]

    async with httpx.AsyncClient(timeout=12.0, headers=YAHOO_HEADERS) as client:
        rows = await asyncio.gather(*(_fetch_screener_row(client, item, is_open) for item in candidates))

    filtered: List[Dict[str, Any]] = []
    for r in rows:
        if r is None:
            continue
        if min_mcap_cr is not None and r["marketCapCr"] < min_mcap_cr:
            continue
        if max_mcap_cr is not None and r["marketCapCr"] > max_mcap_cr:
            continue
        if min_price is not None and r["price"] < min_price:
            continue
        if max_price is not None and r["price"] > max_price:
            continue
        if min_1m_return is not None and (r["return1M"] is None or r["return1M"] < min_1m_return):
            continue
        if min_1y_return is not None and (r["return1Y"] is None or r["return1Y"] < min_1y_return):
            continue
        if min_pe is not None and (r["peRatio"] is None or r["peRatio"] < min_pe):
            continue
        if max_pe is not None and (r["peRatio"] is None or r["peRatio"] > max_pe):
            continue
        filtered.append(r)

    valid_sort_keys = {
        "marketCapCr",
        "price",
        "change1D",
        "volume",
        "return1M",
        "return3M",
        "return6M",
        "return1Y",
        "peRatio",
    }
    s_key = sort_by if sort_by in valid_sort_keys else "marketCapCr"
    reverse = sort_dir.lower() != "asc"
    filtered.sort(
        key=lambda x: (x.get(s_key) is not None, x.get(s_key) or 0.0),
        reverse=reverse,
    )

    total = len(filtered)
    start = max(0, (page - 1) * page_size)
    end = start + page_size

    return {
        "items": filtered[start:end],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "session": session,
        "bharatstockConfigured": bharatstock_adapter.is_configured,
        "source": "Yahoo Finance (Price/Returns) + BharatStock (Fundamentals)"
        if bharatstock_adapter.is_configured
        else "Yahoo Finance (NSE/BSE Delayed Feed)",
        "retrievedAt": utc_now_iso(),
    }
