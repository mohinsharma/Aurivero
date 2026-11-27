from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import defaultdict, deque
from typing import Any, Awaitable, Callable, Deque, Dict, Optional, Tuple, TypeVar

from backend.app.database import get_connection
from backend.app.services.providers.base import utc_now_iso

logger = logging.getLogger("mindmark.market_data")

T = TypeVar("T")


class CircuitBreaker:
    """Simple per-provider circuit breaker to avoid hammering failing upstreams."""

    def __init__(self, name: str, failure_threshold: int = 4, recovery_seconds: int = 45):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_seconds = recovery_seconds
        self.failures = 0
        self.opened_at: Optional[float] = None
        self.last_error: Optional[str] = None

    @property
    def state(self) -> str:
        if self.opened_at is None:
            return "CLOSED"
        if time.monotonic() - self.opened_at >= self.recovery_seconds:
            return "HALF_OPEN"
        return "OPEN"

    def allow_request(self) -> bool:
        return self.state != "OPEN"

    def record_success(self) -> None:
        self.failures = 0
        self.opened_at = None
        self.last_error = None

    def record_failure(self, error: str) -> None:
        self.failures += 1
        self.last_error = error
        if self.failures >= self.failure_threshold:
            self.opened_at = time.monotonic()
            logger.warning(
                "circuit_breaker_opened",
                extra={"provider": self.name, "failures": self.failures, "error": error},
            )


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter for API routes."""

    def __init__(self, max_requests: int = 120, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def check(self, key: str) -> Tuple[bool, int]:
        now = time.monotonic()
        dq = self._hits[key]
        cutoff = now - self.window_seconds
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= self.max_requests:
            retry_after = max(1, int(self.window_seconds - (now - dq[0])))
            return False, retry_after
        dq.append(now)
        return True, 0


class MarketDataCache:
    """Two-tier cache (in-memory TTL + SQLite fallback) with request deduplication."""

    def __init__(self):
        self._mem: Dict[str, Tuple[float, Any]] = {}
        self._stale: Dict[str, Any] = {}
        self._inflight: Dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()

    def get_fresh(self, key: str) -> Optional[Any]:
        entry = self._mem.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() < expires_at:
            return value
        return None

    def get_stale(self, key: str) -> Optional[Any]:
        if key in self._stale:
            return self._stale[key]
        # Fallback to SQLite market_data_cache if present
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT payload_json FROM market_data_cache WHERE cache_key = ?",
                (key,),
            )
            row = cursor.fetchone()
            conn.close()
            if row:
                return json.loads(row["payload_json"])
        except Exception as exc:
            logger.debug("sqlite_cache_read_error key=%s err=%s", key, exc)
        return None

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: int,
        asset_class: str = "STOCK",
        symbol: str = "",
        source: str = "",
        provider_timestamp: Optional[str] = None,
        persist_sqlite: bool = True,
    ) -> None:
        self._mem[key] = (time.monotonic() + ttl_seconds, value)
        self._stale[key] = value
        if persist_sqlite:
            try:
                now_iso = utc_now_iso()
                expires_epoch = time.time() + ttl_seconds
                payload_json = json.dumps(value)
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO market_data_cache
                    (cache_key, asset_class, symbol, payload_json, source, provider_timestamp, retrieved_at, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        key,
                        asset_class,
                        symbol,
                        payload_json,
                        source,
                        provider_timestamp,
                        now_iso,
                        expires_epoch,
                    ),
                )
                conn.commit()
                conn.close()
            except Exception as exc:
                logger.debug("sqlite_cache_write_error key=%s err=%s", key, exc)

    async def deduplicated(self, key: str, coro_factory: Callable[[], Awaitable[T]]) -> T:
        """Coalesces concurrent identical upstream requests into a single call."""
        async with self._lock:
            existing = self._inflight.get(key)
            if existing is not None and not existing.done():
                fut = existing
                is_owner = False
            else:
                loop = asyncio.get_running_loop()
                fut = loop.create_future()
                fut.add_done_callback(lambda f: f.exception() if not f.cancelled() else None)
                self._inflight[key] = fut
                is_owner = True

        if not is_owner:
            return await fut

        try:
            result = await coro_factory()
            if not fut.done():
                fut.set_result(result)
            return result
        except Exception as exc:
            if not fut.done():
                fut.set_exception(exc)
            raise
        finally:
            async with self._lock:
                if self._inflight.get(key) is fut:
                    self._inflight.pop(key, None)


market_cache = MarketDataCache()
api_rate_limiter = SlidingWindowRateLimiter(max_requests=180, window_seconds=60)
