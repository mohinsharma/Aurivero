from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.app.services.providers.base import (
    BaseMarketProvider,
    CandleSeriesResponse,
    DataFreshnessStatus,
    HistoricalRange,
    InstrumentMeta,
    NormalizedCandle,
    NormalizedQuote,
    ProviderHealth,
    Timeframe,
    compute_range_window,
    utc_now_iso,
    validate_and_normalize_candles,
)
from backend.app.services.providers.cache_and_limiter import CircuitBreaker, market_cache
from backend.app.services.providers.stocks_provider import (
    YAHOO_CHART_BASE,
    YAHOO_HEADERS,
    _YAHOO_TF_CONFIG,
    _resample_4h,
    _resample_candles,
)

logger = logging.getLogger("mindmark.providers.forex")

FRANKFURTER_BASE = "https://api.frankfurter.app"

FOREX_DIRECTORY: List[Dict[str, Any]] = [
    {"symbol": "EURUSD", "displaySymbol": "EUR/USD", "base": "EUR", "quote": "USD", "name": "Euro / US Dollar", "category": "Major", "providerSymbol": "EURUSD=X", "pipSize": 0.0001, "decimals": 4},
    {"symbol": "GBPUSD", "displaySymbol": "GBP/USD", "base": "GBP", "quote": "USD", "name": "British Pound / US Dollar", "category": "Major", "providerSymbol": "GBPUSD=X", "pipSize": 0.0001, "decimals": 4},
    {"symbol": "USDJPY", "displaySymbol": "USD/JPY", "base": "USD", "quote": "JPY", "name": "US Dollar / Japanese Yen", "category": "Major", "providerSymbol": "USDJPY=X", "pipSize": 0.01, "decimals": 2},
    {"symbol": "USDINR", "displaySymbol": "USD/INR", "base": "USD", "quote": "INR", "name": "US Dollar / Indian Rupee", "category": "Major / Emerging", "providerSymbol": "USDINR=X", "pipSize": 0.01, "decimals": 4},
    {"symbol": "AUDUSD", "displaySymbol": "AUD/USD", "base": "AUD", "quote": "USD", "name": "Australian Dollar / US Dollar", "category": "Major", "providerSymbol": "AUDUSD=X", "pipSize": 0.0001, "decimals": 4},
    {"symbol": "USDCAD", "displaySymbol": "USD/CAD", "base": "USD", "quote": "CAD", "name": "US Dollar / Canadian Dollar", "category": "Major", "providerSymbol": "USDCAD=X", "pipSize": 0.0001, "decimals": 4},
    {"symbol": "USDCHF", "displaySymbol": "USD/CHF", "base": "USD", "quote": "CHF", "name": "US Dollar / Swiss Franc", "category": "Major", "providerSymbol": "USDCHF=X", "pipSize": 0.0001, "decimals": 4},
    {"symbol": "NZDUSD", "displaySymbol": "NZD/USD", "base": "NZD", "quote": "USD", "name": "New Zealand Dollar / US Dollar", "category": "Major", "providerSymbol": "NZDUSD=X", "pipSize": 0.0001, "decimals": 4},
    {"symbol": "EURINR", "displaySymbol": "EUR/INR", "base": "EUR", "quote": "INR", "name": "Euro / Indian Rupee", "category": "Cross / Emerging", "providerSymbol": "EURINR=X", "pipSize": 0.01, "decimals": 4},
    {"symbol": "GBPINR", "displaySymbol": "GBP/INR", "base": "GBP", "quote": "INR", "name": "British Pound / Indian Rupee", "category": "Cross / Emerging", "providerSymbol": "GBPINR=X", "pipSize": 0.01, "decimals": 4},
    {"symbol": "EURGBP", "displaySymbol": "EUR/GBP", "base": "EUR", "quote": "GBP", "name": "Euro / British Pound", "category": "Minor Cross", "providerSymbol": "EURGBP=X", "pipSize": 0.0001, "decimals": 4},
    {"symbol": "EURJPY", "displaySymbol": "EUR/JPY", "base": "EUR", "quote": "JPY", "name": "Euro / Japanese Yen", "category": "Minor Cross", "providerSymbol": "EURJPY=X", "pipSize": 0.01, "decimals": 2},
]


def get_forex_session_info(now_utc: Optional[datetime] = None) -> Tuple[str, bool]:
    """Returns (session_label, is_market_open) for global FX."""
    now = now_utc or datetime.now(timezone.utc)
    wd = now.weekday()  # Mon=0 .. Sun=6
    hr = now.hour

    # Global FX closes Friday 22:00 UTC and reopens Sunday 22:00 UTC
    if (wd == 4 and hr >= 22) or wd == 5 or (wd == 6 and hr < 22):
        return "Weekend Closed (Reopens Sun 22:00 UTC)", False

    active = []
    if hr >= 22 or hr < 7:
        active.append("Sydney")
    if 0 <= hr < 9:
        active.append("Tokyo")
    if 8 <= hr < 17:
        active.append("London")
    if 13 <= hr < 22:
        active.append("New York")

    label = " / ".join(active) + " Session" if active else "Global Interbank Session"
    return label, True


class ForexMarketProvider(BaseMarketProvider):
    provider_name = "yahoo_fx_frankfurter"
    asset_class = "FOREX"
    supports_streaming = False

    def __init__(self):
        self.breaker = CircuitBreaker("yahoo_forex", failure_threshold=4, recovery_seconds=45)

    def _entry_to_meta(self, item: Dict[str, Any]) -> InstrumentMeta:
        return InstrumentMeta(
            symbol=item["symbol"],
            displaySymbol=item["displaySymbol"],
            name=item["name"],
            assetClass="FOREX",
            exchange="FX",
            currency=item["quote"],
            sectorOrCategory=item["category"],
            providerSymbol=item["providerSymbol"],
            extra={
                "base": item["base"],
                "quote": item["quote"],
                "pipSize": item["pipSize"],
                "decimals": item["decimals"],
            },
        )

    async def search_instruments(self, query: str, limit: int = 20) -> List[InstrumentMeta]:
        q = query.strip().lower().replace("/", "")
        matches = [
            self._entry_to_meta(item)
            for item in FOREX_DIRECTORY
            if not q
            or q in item["symbol"].lower()
            or q in item["name"].lower()
            or q in item["category"].lower()
        ]
        return matches[:limit]

    async def list_instruments(self, limit: int = 50, offset: int = 0) -> List[InstrumentMeta]:
        return [self._entry_to_meta(item) for item in FOREX_DIRECTORY[offset : offset + limit]]

    async def get_metadata(self, symbol: str) -> Optional[InstrumentMeta]:
        clean = symbol.upper().strip().replace("/", "").replace("=X", "")
        for item in FOREX_DIRECTORY:
            if item["symbol"] == clean:
                return self._entry_to_meta(item)
        if len(clean) == 6 and clean.isalpha():
            base, quote = clean[:3], clean[3:]
            pip_size = 0.01 if quote in ("JPY", "INR") else 0.0001
            return InstrumentMeta(
                symbol=clean,
                displaySymbol=f"{base}/{quote}",
                name=f"{base} / {quote}",
                assetClass="FOREX",
                exchange="FX",
                currency=quote,
                sectorOrCategory="Custom Pair",
                providerSymbol=f"{clean}=X",
                extra={"base": base, "quote": quote, "pipSize": pip_size, "decimals": 4},
            )
        return None

    async def _fallback_frankfurter_rate(self, base: str, quote: str) -> Optional[Tuple[float, str]]:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(f"{FRANKFURTER_BASE}/latest", params={"from": base, "to": quote})
                resp.raise_for_status()
                data = resp.json()
                rate = data.get("rates", {}).get(quote)
                if rate is not None:
                    return float(rate), data.get("date", utc_now_iso())
        except Exception as exc:
            logger.debug("frankfurter_fallback_failed pair=%s/%s err=%s", base, quote, exc)
        return None

    async def get_quote(self, symbol: str) -> NormalizedQuote:
        meta = await self.get_metadata(symbol)
        if meta is None:
            return NormalizedQuote(
                symbol=symbol.upper(),
                displaySymbol=symbol.upper(),
                name=symbol.upper(),
                assetClass="FOREX",
                exchange="FX",
                currency="USD",
                source="Yahoo Finance FX",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning=f"Unknown forex pair: {symbol}",
            )

        cache_key = f"forex:quote:{meta.symbol}"
        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return NormalizedQuote(**fresh)

        session_label, is_open = get_forex_session_info()
        pip_size = float(meta.extra.get("pipSize", 0.0001))
        decimals = int(meta.extra.get("decimals", 4))

        if not self.breaker.allow_request():
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["marketSession"] = session_label
                stale["warning"] = "Provider circuit open; serving cached FX quote."
                return NormalizedQuote(**stale)

        async def _fetch() -> Dict[str, Any]:
            async with httpx.AsyncClient(timeout=10.0, headers=YAHOO_HEADERS) as client:
                resp = await client.get(
                    f"{YAHOO_CHART_BASE}/{meta.providerSymbol}",
                    params={"interval": "1d", "range": "5d"},
                )
                resp.raise_for_status()
                payload = resp.json()

            result_list = payload.get("chart", {}).get("result") or []
            if not result_list:
                raise ValueError(f"Empty Yahoo FX result for {meta.providerSymbol}")

            chart_res = result_list[0]
            ymeta = chart_res.get("meta", {})
            qblock = (chart_res.get("indicators", {}).get("quote") or [{}])[0]
            closes = [c for c in (qblock.get("close") or []) if c is not None]
            highs = [h for h in (qblock.get("high") or []) if h is not None]
            lows = [l for l in (qblock.get("low") or []) if l is not None]
            opens = [o for o in (qblock.get("open") or []) if o is not None]

            price = ymeta.get("regularMarketPrice") or (closes[-1] if closes else None)
            prev_close = ymeta.get("chartPreviousClose") or ymeta.get("previousClose") or (
                closes[-2] if len(closes) >= 2 else price
            )
            if price is None:
                raise ValueError(f"No FX price for {meta.providerSymbol}")

            price_f = float(price)
            prev_f = float(prev_close) if prev_close else price_f
            change = price_f - prev_f
            change_pct = (change / prev_f) * 100 if prev_f else 0.0
            pip_move = round(change / pip_size, 1)

            reg_time = ymeta.get("regularMarketTime")
            provider_ts = (
                datetime.fromtimestamp(int(reg_time), tz=timezone.utc).isoformat()
                if reg_time
                else None
            )
            status: DataFreshnessStatus = "DELAYED" if is_open else "MARKET_CLOSED"

            quote = NormalizedQuote(
                symbol=meta.symbol,
                displaySymbol=meta.displaySymbol,
                name=meta.name,
                assetClass="FOREX",
                exchange="FX",
                currency=meta.currency,
                price=round(price_f, decimals),
                open=round(float(opens[-1]), decimals) if opens else None,
                high=round(float(ymeta.get("regularMarketDayHigh") or (highs[-1] if highs else price_f)), decimals),
                low=round(float(ymeta.get("regularMarketDayLow") or (lows[-1] if lows else price_f)), decimals),
                previousClose=round(prev_f, decimals),
                change=round(change, decimals),
                changePercent=round(change_pct, 2),
                pipMovement=pip_move,
                bid=round(float(ymeta["bid"]), decimals) if ymeta.get("bid") else None,
                ask=round(float(ymeta["ask"]), decimals) if ymeta.get("ask") else None,
                marketSession=session_label,
                sparkline=[round(float(c), decimals) for c in closes[-7:]],
                extra={
                    "category": meta.sectorOrCategory,
                    "base": meta.extra.get("base"),
                    "quote": meta.extra.get("quote"),
                    "pipSize": pip_size,
                    "decimals": decimals,
                },
                source="Yahoo Finance FX (Delayed Feed)",
                retrievedAt=utc_now_iso(),
                providerTimestamp=provider_ts,
                status=status,
                delaySeconds=300 if is_open else None,
            ).model_dump()

            self.breaker.record_success()
            market_cache.set(
                cache_key,
                quote,
                ttl_seconds=30 if is_open else 180,
                asset_class="FOREX",
                symbol=meta.symbol,
                source="Yahoo Finance FX (Delayed Feed)",
                provider_timestamp=provider_ts,
            )
            return quote

        try:
            data = await market_cache.deduplicated(cache_key, _fetch)
            return NormalizedQuote(**data)
        except Exception as exc:
            self.breaker.record_failure(str(exc))
            logger.warning("yahoo_fx_quote_failed symbol=%s error=%s", meta.symbol, exc)
            # Try Frankfurter spot fallback before cache
            base = meta.extra.get("base", meta.symbol[:3])
            quote_curr = meta.extra.get("quote", meta.symbol[3:])
            ff = await self._fallback_frankfurter_rate(base, quote_curr)
            if ff is not None:
                rate, date_str = ff
                return NormalizedQuote(
                    symbol=meta.symbol,
                    displaySymbol=meta.displaySymbol,
                    name=meta.name,
                    assetClass="FOREX",
                    exchange="FX",
                    currency=meta.currency,
                    price=round(rate, decimals),
                    marketSession=session_label,
                    extra={"category": meta.sectorOrCategory, "decimals": decimals},
                    source="Frankfurter ECB Reference Rate",
                    retrievedAt=utc_now_iso(),
                    providerTimestamp=date_str,
                    status="DELAYED" if is_open else "MARKET_CLOSED",
                    delaySeconds=86400,
                    warning="Using daily ECB reference rate fallback.",
                )

            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["marketSession"] = session_label
                stale["warning"] = "Upstream FX feed unreachable; showing last cached quote."
                return NormalizedQuote(**stale)

            return NormalizedQuote(
                symbol=meta.symbol,
                displaySymbol=meta.displaySymbol,
                name=meta.name,
                assetClass="FOREX",
                exchange="FX",
                currency=meta.currency,
                marketSession=session_label,
                source="Yahoo Finance FX",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Unable to reach FX data providers and no cached quote is available.",
            )

    async def get_candles(
        self,
        symbol: str,
        timeframe: Timeframe = "1d",
        limit: int = 200,
        before: Optional[int] = None,
        range_key: Optional[HistoricalRange] = None,
    ) -> CandleSeriesResponse:
        meta = await self.get_metadata(symbol)
        if meta is None:
            return CandleSeriesResponse(
                symbol=symbol.upper(),
                assetClass="FOREX",
                timeframe=timeframe,
                range=range_key,
                exchange="FX",
                currency="USD",
                candles=[],
                source="Yahoo Finance FX",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning=f"Unknown forex pair: {symbol}",
            )

        y_interval, y_range = _YAHOO_TF_CONFIG.get(timeframe, ("1d", "2y"))
        range_warning: Optional[str] = None
        if range_key in ("3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL") and timeframe in ("1m", "3m", "5m", "15m", "30m"):
            y_interval = "1d"
            range_warning = f"Provider limits {timeframe} intraday history; showing daily (1d) candles for {range_key} range."
        elif range_key in ("3Y", "5Y", "ALL") and timeframe in ("1h", "2h", "4h"):
            y_interval = "1wk"
            range_warning = f"Provider limits {timeframe} intraday history; showing weekly (1w) candles for {range_key} range."

        safe_limit = max(1, min(limit, 1000))
        decimals = int(meta.extra.get("decimals", 4))
        cache_key = f"forex:candles:{meta.symbol}:{timeframe}:{y_interval}:{range_key or 'default'}:{safe_limit}:{before or 'latest'}"

        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return CandleSeriesResponse(**fresh)

        _, is_open = get_forex_session_info()

        async def _fetch() -> Dict[str, Any]:
            params: Dict[str, Any] = {"interval": y_interval}
            if before is not None:
                span_days = 7 if timeframe in ("1m", "5m") else 30 if timeframe in ("15m", "30m") else 180 if timeframe in ("1h", "4h") else 730
                period2 = before - 1
                period1 = max(0, period2 - span_days * 86400)
                params["period1"] = period1
                params["period2"] = period2
            elif range_key is not None:
                if range_key == "ALL":
                    params["range"] = "max"
                else:
                    p1, p2 = compute_range_window(range_key)
                    params["period1"] = p1
                    params["period2"] = p2
            else:
                params["range"] = y_range

            async with httpx.AsyncClient(timeout=12.0, headers=YAHOO_HEADERS) as client:
                resp = await client.get(f"{YAHOO_CHART_BASE}/{meta.providerSymbol}", params=params)
                resp.raise_for_status()
                payload = resp.json()

            result_list = payload.get("chart", {}).get("result") or []
            if not result_list:
                raise ValueError(f"Empty Yahoo FX candles for {meta.providerSymbol}")

            chart_res = result_list[0]
            timestamps = chart_res.get("timestamp") or []
            qblock = (chart_res.get("indicators", {}).get("quote") or [{}])[0]
            opens = qblock.get("open") or []
            highs = qblock.get("high") or []
            lows = qblock.get("low") or []
            closes = qblock.get("close") or []
            volumes = qblock.get("volume") or []

            candles: List[NormalizedCandle] = []
            for i, ts in enumerate(timestamps):
                o = opens[i] if i < len(opens) else None
                h = highs[i] if i < len(highs) else None
                l = lows[i] if i < len(lows) else None
                c = closes[i] if i < len(closes) else None
                v = volumes[i] if i < len(volumes) else 0
                if None in (o, h, l, c):
                    continue
                candles.append(
                    NormalizedCandle(
                        time=int(ts),
                        open=round(float(o), decimals),
                        high=round(float(h), decimals),
                        low=round(float(l), decimals),
                        close=round(float(c), decimals),
                        volume=float(v or 0),
                    )
                )

            if timeframe == "3m":
                candles = _resample_candles(candles, 180)
            elif timeframe == "2h":
                candles = _resample_candles(candles, 7200)
            elif timeframe == "4h":
                candles = _resample_4h(candles)

            candles = validate_and_normalize_candles(candles)
            if len(candles) > safe_limit:
                candles = candles[-safe_limit:]

            range_return = None
            if len(candles) >= 2 and candles[0].open > 0:
                range_return = round(((candles[-1].close - candles[0].open) / candles[0].open) * 100, 2)

            oldest = candles[0].time if candles else None
            latest_ts = (
                datetime.fromtimestamp(candles[-1].time, tz=timezone.utc).isoformat()
                if candles
                else None
            )
            status: DataFreshnessStatus = "DELAYED" if is_open else "MARKET_CLOSED"

            resp_obj = CandleSeriesResponse(
                symbol=meta.symbol,
                assetClass="FOREX",
                timeframe=timeframe,
                range=range_key,
                rangeReturnPercent=range_return,
                exchange="FX",
                currency=meta.currency,
                candles=candles,
                hasMore=len(candles) >= 20,
                oldestTimestamp=oldest,
                source="Yahoo Finance FX (Delayed Feed)",
                retrievedAt=utc_now_iso(),
                providerTimestamp=latest_ts,
                status=status,
                delaySeconds=300 if is_open else None,
                warning=range_warning,
            ).model_dump()

            self.breaker.record_success()
            market_cache.set(
                cache_key,
                resp_obj,
                ttl_seconds=60 if is_open else 300,
                asset_class="FOREX",
                symbol=meta.symbol,
                source="Yahoo Finance FX (Delayed Feed)",
                provider_timestamp=latest_ts,
            )
            return resp_obj

        try:
            data = await market_cache.deduplicated(cache_key, _fetch)
            return CandleSeriesResponse(**data)
        except Exception as exc:
            self.breaker.record_failure(str(exc))
            logger.warning("yahoo_fx_candles_failed symbol=%s tf=%s error=%s", meta.symbol, timeframe, exc)
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["warning"] = "Upstream FX feed unreachable; showing last cached candles."
                return CandleSeriesResponse(**stale)
            return CandleSeriesResponse(
                symbol=meta.symbol,
                assetClass="FOREX",
                timeframe=timeframe,
                exchange="FX",
                currency=meta.currency,
                candles=[],
                source="Yahoo Finance FX (Delayed Feed)",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Unable to load forex historical candles.",
            )

    async def health_check(self) -> ProviderHealth:
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0, headers=YAHOO_HEADERS) as client:
                resp = await client.get(f"{YAHOO_CHART_BASE}/EURUSD=X", params={"interval": "1d", "range": "1d"})
                resp.raise_for_status()
            latency = round((time.perf_counter() - started) * 1000, 1)
            return ProviderHealth(
                provider=self.provider_name,
                assetClass="FOREX",
                healthy=True,
                latencyMs=latency,
                circuitState=self.breaker.state,  # type: ignore[arg-type]
                supportsStreaming=False,
            )
        except Exception as exc:
            return ProviderHealth(
                provider=self.provider_name,
                assetClass="FOREX",
                healthy=False,
                circuitState=self.breaker.state,  # type: ignore[arg-type]
                lastError=str(exc),
                supportsStreaming=False,
            )
