from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Set

import websockets
from fastapi import WebSocket

from backend.app.services.providers import get_provider
from backend.app.services.providers.base import utc_now_iso

logger = logging.getLogger("mindmark.stream_manager")

BINANCE_WS_BASE = "wss://stream.binance.com:9443/ws"


class SharedStreamManager:
    """
    Manages shared upstream market data subscriptions across all WebSocket consumers.
    - Deduplicates upstream connections: N clients watching BTCUSDT share 1 Binance WS.
    - Cleans up upstream tasks when the last client disconnects.
    - Coalesces/throttles broadcasts so charts do not rerender on every raw tick.
    """

    def __init__(self):
        self._subscribers: Dict[str, Set[WebSocket]] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        self._last_broadcast: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def _key(asset_class: str, symbol: str) -> str:
        return f"{asset_class.upper()}:{symbol.upper()}"

    async def subscribe(self, asset_class: str, symbol: str, ws: WebSocket) -> None:
        key = self._key(asset_class, symbol)
        async with self._lock:
            subs = self._subscribers.setdefault(key, set())
            subs.add(ws)
            if key not in self._tasks or self._tasks[key].done():
                if asset_class.upper() == "CRYPTO":
                    self._tasks[key] = asyncio.create_task(
                        self._run_crypto_upstream(key, symbol.upper())
                    )
                else:
                    self._tasks[key] = asyncio.create_task(
                        self._run_polled_upstream(key, asset_class.upper(), symbol.upper())
                    )
                logger.info("stream_started key=%s subscribers=%d", key, len(subs))

    async def unsubscribe(self, asset_class: str, symbol: str, ws: WebSocket) -> None:
        key = self._key(asset_class, symbol)
        async with self._lock:
            subs = self._subscribers.get(key)
            if subs and ws in subs:
                subs.discard(ws)
            if not subs:
                self._subscribers.pop(key, None)
                task = self._tasks.pop(key, None)
                if task and not task.done():
                    task.cancel()
                logger.info("stream_stopped key=%s", key)

    async def _broadcast(self, key: str, payload: Dict[str, Any], min_interval: float = 0.5) -> None:
        now = time.monotonic()
        last = self._last_broadcast.get(key, 0.0)
        if now - last < min_interval:
            return
        self._last_broadcast[key] = now

        subs = list(self._subscribers.get(key, set()))
        if not subs:
            return

        dead: list[WebSocket] = []
        message = json.dumps(payload)
        for client in subs:
            try:
                await client.send_text(message)
            except Exception:
                dead.append(client)

        if dead:
            async with self._lock:
                current = self._subscribers.get(key)
                if current:
                    for d in dead:
                        current.discard(d)

    async def _run_crypto_upstream(self, key: str, symbol: str) -> None:
        """Shared Binance WebSocket stream with exponential backoff reconnect."""
        norm = symbol.upper().replace("/", "")
        if not norm.endswith("USDT"):
            norm = f"{norm}USDT"
        stream_url = f"{BINANCE_WS_BASE}/{norm.lower()}@kline_1m"
        backoff = 1.0

        try:
            while key in self._subscribers and len(self._subscribers[key]) > 0:
                try:
                    async with websockets.connect(stream_url, ping_interval=20, ping_timeout=10) as upstream:
                        backoff = 1.0
                        logger.info("binance_ws_connected key=%s", key)
                        async for raw in upstream:
                            if key not in self._subscribers or len(self._subscribers[key]) == 0:
                                break
                            msg = json.loads(raw)
                            k = msg.get("k")
                            if not k:
                                continue
                            event_ms = msg.get("E", int(time.time() * 1000))
                            provider_ts = datetime.fromtimestamp(
                                event_ms / 1000, tz=timezone.utc
                            ).isoformat()
                            payload = {
                                "type": "TICK",
                                "assetClass": "CRYPTO",
                                "symbol": norm,
                                "price": float(k["c"]),
                                "candle": {
                                    "time": int(k["t"] // 1000),
                                    "open": float(k["o"]),
                                    "high": float(k["h"]),
                                    "low": float(k["l"]),
                                    "close": float(k["c"]),
                                    "volume": float(k["v"]),
                                },
                                "isClosed": bool(k.get("x", False)),
                                "source": "Binance WebSocket",
                                "providerTimestamp": provider_ts,
                                "retrievedAt": utc_now_iso(),
                                "status": "LIVE",
                                "delaySeconds": 0,
                            }
                            await self._broadcast(key, payload, min_interval=0.5)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    logger.warning("binance_ws_error key=%s err=%s retry_in=%.1fs", key, exc, backoff)
                    await self._broadcast(
                        key,
                        {
                            "type": "STATUS",
                            "assetClass": "CRYPTO",
                            "symbol": norm,
                            "status": "CACHED",
                            "source": "Binance WebSocket",
                            "retrievedAt": utc_now_iso(),
                            "warning": f"Live stream reconnecting in {int(backoff)}s...",
                        },
                        min_interval=0.0,
                    )
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, 30.0)
        except asyncio.CancelledError:
            logger.info("binance_ws_cancelled key=%s", key)

    async def _run_polled_upstream(self, key: str, asset_class: str, symbol: str) -> None:
        """Honest periodic refresh for delayed/session-bound equity & FX providers."""
        provider = get_provider(asset_class)
        try:
            while key in self._subscribers and len(self._subscribers[key]) > 0:
                quote = await provider.get_quote(symbol)
                payload = {
                    "type": "QUOTE_UPDATE",
                    "assetClass": asset_class,
                    "symbol": quote.symbol,
                    "price": quote.price,
                    "change": quote.change,
                    "changePercent": quote.changePercent,
                    "marketSession": quote.marketSession,
                    "source": quote.source,
                    "providerTimestamp": quote.providerTimestamp,
                    "retrievedAt": quote.retrievedAt,
                    "status": quote.status,
                    "delaySeconds": quote.delaySeconds,
                    "warning": quote.warning,
                }
                await self._broadcast(key, payload, min_interval=0.0)
                interval = 30.0 if quote.status in ("LIVE", "DELAYED") else 60.0
                await asyncio.sleep(interval)
        except asyncio.CancelledError:
            logger.info("polled_stream_cancelled key=%s", key)

    def active_subscriptions(self) -> Dict[str, int]:
        return {k: len(v) for k, v in self._subscribers.items()}


stream_manager = SharedStreamManager()
