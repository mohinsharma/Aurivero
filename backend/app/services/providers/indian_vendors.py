from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from backend.app.config import settings
from backend.app.services.providers.base import NormalizedCandle, utc_now_iso
from backend.app.services.providers.cache_and_limiter import market_cache

logger = logging.getLogger("mindmark.providers.indian_vendors")

TEJHQ_BASE = "https://api.tejhq.dev/v1"
BHARATSTOCK_BASE = "https://bharatstockapi.com/v1"

# Daily budget guard for BharatStock free tier (60 calls/day)
_BHARATSTOCK_DAILY_LIMIT = 55
_bharatstock_calls: Dict[str, int] = {}


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _can_call_bharatstock() -> bool:
    day = _today_key()
    return _bharatstock_calls.get(day, 0) < _BHARATSTOCK_DAILY_LIMIT


def _record_bharatstock_call() -> None:
    day = _today_key()
    _bharatstock_calls[day] = _bharatstock_calls.get(day, 0) + 1


class TejHQAdapter:
    """
    TejHQ EOD historical OHLCV & corporate actions adapter.
    Strictly End-of-Day (END_OF_DAY) — never labeled LIVE.
    """

    @property
    def is_configured(self) -> bool:
        return bool(settings.TEJHQ_API_KEY and settings.TEJHQ_API_KEY.strip())

    async def get_eod_history(
        self,
        symbol: str,
        exchange: str = "NSE",
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.is_configured:
            return {
                "available": False,
                "source": "TejHQ EOD",
                "status": "UNAVAILABLE",
                "reason": "TEJHQ_API_KEY not configured",
                "candles": [],
            }

        clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "")
        cache_key = f"tejhq:eod:{exchange}:{clean_sym}:{from_date or 'auto'}:{to_date or 'auto'}"
        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return fresh

        headers = {"X-API-Key": settings.TEJHQ_API_KEY.strip()}
        params: Dict[str, Any] = {"exchange": exchange.upper()}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date

        try:
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                resp = await client.get(f"{TEJHQ_BASE}/equity/{clean_sym}/ohlcv", params=params)
                resp.raise_for_status()
                body = resp.json()

            rows = body.get("data") or body.get("candles") or []
            candles: List[Dict[str, Any]] = []
            for r in rows:
                ts_val = r.get("timestamp") or r.get("date")
                if isinstance(ts_val, str):
                    dt = datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
                    ts = int(dt.timestamp())
                else:
                    ts = int(ts_val)
                candles.append(
                    NormalizedCandle(
                        time=ts,
                        open=float(r["open"]),
                        high=float(r["high"]),
                        low=float(r["low"]),
                        close=float(r["close"]),
                        volume=float(r.get("volume", 0) or 0),
                    ).model_dump()
                )
            out = {
                "available": True,
                "source": "TejHQ EOD",
                "status": "END_OF_DAY",
                "retrievedAt": utc_now_iso(),
                "candles": candles,
            }
            market_cache.set(
                cache_key,
                out,
                ttl_seconds=3600,
                asset_class="STOCK",
                symbol=clean_sym,
                source="TejHQ EOD",
            )
            return out
        except Exception as exc:
            logger.warning("tejhq_eod_failed sym=%s err=%s", clean_sym, exc)
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                return stale
            return {
                "available": False,
                "source": "TejHQ EOD",
                "status": "UNAVAILABLE",
                "reason": str(exc),
                "candles": [],
            }


class BharatStockAdapter:
    """
    BharatStock fundamentals, financial ratios, and screener adapter.
    Respects the 60 calls/day free-tier limit with 3600s caching and a 55-call/day guard.
    """

    @property
    def is_configured(self) -> bool:
        return bool(settings.BHARATSTOCK_API_KEY and settings.BHARATSTOCK_API_KEY.strip())

    def remaining_daily_budget(self) -> int:
        used = _bharatstock_calls.get(_today_key(), 0)
        return max(0, _BHARATSTOCK_DAILY_LIMIT - used)

    async def get_fundamentals(self, symbol: str) -> Dict[str, Any]:
        clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "")
        if not self.is_configured:
            return {
                "available": False,
                "source": "BharatStock API",
                "status": "UNAVAILABLE",
                "reason": "BHARATSTOCK_API_KEY not configured",
                "ratios": {},
            }

        cache_key = f"bharatstock:ratios:{clean_sym}"
        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return fresh

        if not _can_call_bharatstock():
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                return stale
            return {
                "available": False,
                "source": "BharatStock API",
                "status": "UNAVAILABLE",
                "reason": "Daily free-tier API budget reached (55/day guard)",
                "ratios": {},
            }

        headers = {"Authorization": f"Bearer {settings.BHARATSTOCK_API_KEY.strip()}"}
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                _record_bharatstock_call()
                resp = await client.get(f"{BHARATSTOCK_BASE}/stocks/{clean_sym}/ratios")
                resp.raise_for_status()
                data = resp.json()

            out = {
                "available": True,
                "source": "BharatStock API",
                "status": "END_OF_DAY",
                "retrievedAt": utc_now_iso(),
                "ratios": data.get("data") or data,
            }
            market_cache.set(
                cache_key,
                out,
                ttl_seconds=3600,
                asset_class="STOCK",
                symbol=clean_sym,
                source="BharatStock API",
            )
            return out
        except Exception as exc:
            logger.warning("bharatstock_ratios_failed sym=%s err=%s", clean_sym, exc)
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                return stale
            return {
                "available": False,
                "source": "BharatStock API",
                "status": "UNAVAILABLE",
                "reason": str(exc),
                "ratios": {},
            }


tejhq_adapter = TejHQAdapter()
bharatstock_adapter = BharatStockAdapter()
