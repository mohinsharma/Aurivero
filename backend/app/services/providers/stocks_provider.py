from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import httpx

from backend.app.services.providers.base import (
    BaseMarketProvider,
    CandleSeriesResponse,
    DataFreshnessStatus,
    InstrumentMeta,
    NormalizedCandle,
    NormalizedQuote,
    ProviderHealth,
    Timeframe,
    utc_now_iso,
)
from backend.app.services.providers.cache_and_limiter import CircuitBreaker, market_cache

logger = logging.getLogger("mindmark.providers.stocks")

IST = ZoneInfo("Asia/Kolkata")
YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# Major NSE & BSE Holiday calendar (YYYY-MM-DD, IST)
INDIAN_MARKET_HOLIDAYS = {
    "2026-01-26",
    "2026-03-03",
    "2026-03-26",
    "2026-03-31",
    "2026-04-03",
    "2026-04-14",
    "2026-05-01",
    "2026-08-15",
    "2026-10-02",
    "2026-10-21",
    "2026-11-09",
    "2026-11-24",
    "2026-12-25",
}

INDIAN_STOCK_DIRECTORY: List[Dict[str, Any]] = [
    # Indices
    {"symbol": "NIFTY50", "displaySymbol": "NIFTY 50", "name": "NIFTY 50 Index", "exchange": "NSE", "providerSymbol": "^NSEI", "sector": "Index", "isIndex": True, "description": "Benchmark Indian equity index representing the weighted average of 50 of the largest Indian companies on NSE."},
    {"symbol": "BANKNIFTY", "displaySymbol": "BANK NIFTY", "name": "NIFTY Bank Index", "exchange": "NSE", "providerSymbol": "^NSEBANK", "sector": "Index", "isIndex": True, "description": "Index comprising the most liquid and large-capitalized Indian banking stocks on NSE."},
    {"symbol": "SENSEX", "displaySymbol": "SENSEX", "name": "BSE SENSEX Index", "exchange": "BSE", "providerSymbol": "^BSESN", "sector": "Index", "isIndex": True, "description": "Free-float market-weighted stock market index of 30 well-established companies listed on the Bombay Stock Exchange."},
    # NSE Equities
    {"symbol": "RELIANCE", "displaySymbol": "RELIANCE", "name": "Reliance Industries Ltd.", "exchange": "NSE", "providerSymbol": "RELIANCE.NS", "sector": "Energy & Retail", "isIndex": False, "description": "India's largest private-sector enterprise across energy, petrochemicals, retail, and Jio digital services."},
    {"symbol": "TCS", "displaySymbol": "TCS", "name": "Tata Consultancy Services Ltd.", "exchange": "NSE", "providerSymbol": "TCS.NS", "sector": "Information Technology", "isIndex": False, "description": "Flagship IT services, consulting, and enterprise solutions leader of the Tata Group."},
    {"symbol": "HDFCBANK", "displaySymbol": "HDFCBANK", "name": "HDFC Bank Ltd.", "exchange": "NSE", "providerSymbol": "HDFCBANK.NS", "sector": "Banking & Financials", "isIndex": False, "description": "India's largest private sector bank by assets and market capitalization."},
    {"symbol": "INFY", "displaySymbol": "INFY", "name": "Infosys Ltd.", "exchange": "NSE", "providerSymbol": "INFY.NS", "sector": "Information Technology", "isIndex": False, "description": "Global leader in next-generation digital services and consulting."},
    {"symbol": "ICICIBANK", "displaySymbol": "ICICIBANK", "name": "ICICI Bank Ltd.", "exchange": "NSE", "providerSymbol": "ICICIBANK.NS", "sector": "Banking & Financials", "isIndex": False, "description": "Leading Indian private sector bank offering retail, corporate, and treasury services."},
    {"symbol": "SBIN", "displaySymbol": "SBIN", "name": "State Bank of India", "exchange": "NSE", "providerSymbol": "SBIN.NS", "sector": "Banking & Financials", "isIndex": False, "description": "India's largest public sector banking and financial services institution."},
    {"symbol": "BHARTIARTL", "displaySymbol": "BHARTIARTL", "name": "Bharti Airtel Ltd.", "exchange": "NSE", "providerSymbol": "BHARTIARTL.NS", "sector": "Telecommunications", "isIndex": False, "description": "Multinational telecommunications company operating 5G/4G networks across India and Africa."},
    {"symbol": "ITC", "displaySymbol": "ITC", "name": "ITC Ltd.", "exchange": "NSE", "providerSymbol": "ITC.NS", "sector": "FMCG", "isIndex": False, "description": "Diversified conglomerate spanning FMCG, hotels, paperboards, and agribusiness."},
    {"symbol": "LT", "displaySymbol": "LT", "name": "Larsen & Toubro Ltd.", "exchange": "NSE", "providerSymbol": "LT.NS", "sector": "Infrastructure & Engineering", "isIndex": False, "description": "Indian multinational conglomerate engaged in EPC projects, hi-tech manufacturing, and services."},
    {"symbol": "M&M", "displaySymbol": "M&M", "name": "Mahindra & Mahindra Ltd.", "exchange": "NSE", "providerSymbol": "M&M.NS", "sector": "Automotive", "isIndex": False, "description": "Leading Indian multinational automotive and farm equipment manufacturer."},
    {"symbol": "AXISBANK", "displaySymbol": "AXISBANK", "name": "Axis Bank Ltd.", "exchange": "NSE", "providerSymbol": "AXISBANK.NS", "sector": "Banking & Financials", "isIndex": False, "description": "Major Indian private sector bank serving retail, SME, and corporate clients."},
    {"symbol": "KOTAKBANK", "displaySymbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd.", "exchange": "NSE", "providerSymbol": "KOTAKBANK.NS", "sector": "Banking & Financials", "isIndex": False, "description": "Indian banking and financial services company headquartered in Mumbai."},
    {"symbol": "HINDUNILVR", "displaySymbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd.", "exchange": "NSE", "providerSymbol": "HINDUNILVR.NS", "sector": "FMCG", "isIndex": False, "description": "India's largest fast-moving consumer goods company."},
    {"symbol": "BAJFINANCE", "displaySymbol": "BAJFINANCE", "name": "Bajaj Finance Ltd.", "exchange": "NSE", "providerSymbol": "BAJFINANCE.NS", "sector": "Banking & Financials", "isIndex": False, "description": "Leading Indian non-banking financial company focused on consumer and SME lending."},
    {"symbol": "MARUTI", "displaySymbol": "MARUTI", "name": "Maruti Suzuki India Ltd.", "exchange": "NSE", "providerSymbol": "MARUTI.NS", "sector": "Automotive", "isIndex": False, "description": "India's largest passenger vehicle manufacturer."},
    {"symbol": "SUNPHARMA", "displaySymbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries Ltd.", "exchange": "NSE", "providerSymbol": "SUNPHARMA.NS", "sector": "Healthcare & Pharma", "isIndex": False, "description": "India's largest pharmaceutical company by market capitalization."},
    {"symbol": "TITAN", "displaySymbol": "TITAN", "name": "Titan Company Ltd.", "exchange": "NSE", "providerSymbol": "TITAN.NS", "sector": "Consumer Discretionary", "isIndex": False, "description": "Tata Group luxury and lifestyle company known for Tanishq, Titan watches, and eyewear."},
    {"symbol": "WIPRO", "displaySymbol": "WIPRO", "name": "Wipro Ltd.", "exchange": "NSE", "providerSymbol": "WIPRO.NS", "sector": "Information Technology", "isIndex": False, "description": "Global information technology, consulting, and business process services company."},
    {"symbol": "HCLTECH", "displaySymbol": "HCLTECH", "name": "HCL Technologies Ltd.", "exchange": "NSE", "providerSymbol": "HCLTECH.NS", "sector": "Information Technology", "isIndex": False, "description": "Multinational IT services and engineering company."},
    {"symbol": "NTPC", "displaySymbol": "NTPC", "name": "NTPC Ltd.", "exchange": "NSE", "providerSymbol": "NTPC.NS", "sector": "Utilities & Power", "isIndex": False, "description": "India's largest power generation utility."},
    # BSE Listed Examples
    {"symbol": "RELIANCE.BO", "displaySymbol": "RELIANCE (BSE)", "name": "Reliance Industries Ltd. (BSE)", "exchange": "BSE", "providerSymbol": "RELIANCE.BO", "sector": "Energy & Retail", "isIndex": False, "description": "Reliance Industries listed on the Bombay Stock Exchange."},
    {"symbol": "TCS.BO", "displaySymbol": "TCS (BSE)", "name": "Tata Consultancy Services Ltd. (BSE)", "exchange": "BSE", "providerSymbol": "TCS.BO", "sector": "Information Technology", "isIndex": False, "description": "TCS listed on the Bombay Stock Exchange."},
    {"symbol": "HDFCBANK.BO", "displaySymbol": "HDFCBANK (BSE)", "name": "HDFC Bank Ltd. (BSE)", "exchange": "BSE", "providerSymbol": "HDFCBANK.BO", "sector": "Banking & Financials", "isIndex": False, "description": "HDFC Bank listed on the Bombay Stock Exchange."},
]


def get_indian_market_session(now_utc: Optional[datetime] = None) -> Tuple[str, bool]:
    """Returns (session_label, is_regular_open) in IST."""
    now_ist = (now_utc or datetime.now(timezone.utc)).astimezone(IST)
    date_str = now_ist.strftime("%Y-%m-%d")
    if now_ist.weekday() >= 5:
        return "Closed (Weekend)", False
    if date_str in INDIAN_MARKET_HOLIDAYS:
        return "Closed (Exchange Holiday)", False

    minutes = now_ist.hour * 60 + now_ist.minute
    if 9 * 60 <= minutes < 9 * 60 + 15:
        return "Pre-Open Session (09:00–09:15 IST)", False
    if 9 * 60 + 15 <= minutes <= 15 * 60 + 30:
        return "Regular Session Open (09:15–15:30 IST)", True
    return "Closed (After Hours)", False


_YAHOO_TF_CONFIG: Dict[Timeframe, Tuple[str, str]] = {
    "1m": ("1m", "5d"),
    "5m": ("5m", "1mo"),
    "15m": ("15m", "1mo"),
    "30m": ("30m", "1mo"),
    "1h": ("60m", "3mo"),
    "4h": ("60m", "6mo"),  # Resampled to 4h
    "1d": ("1d", "2y"),
    "1w": ("1wk", "5y"),
}


def _resample_4h(candles: List[NormalizedCandle]) -> List[NormalizedCandle]:
    if not candles:
        return []
    buckets: Dict[int, List[NormalizedCandle]] = {}
    for c in candles:
        bucket = (c.time // 14400) * 14400
        buckets.setdefault(bucket, []).append(c)
    result: List[NormalizedCandle] = []
    for bucket_ts in sorted(buckets.keys()):
        group = buckets[bucket_ts]
        result.append(
            NormalizedCandle(
                time=bucket_ts,
                open=group[0].open,
                high=max(g.high for g in group),
                low=min(g.low for g in group),
                close=group[-1].close,
                volume=sum(g.volume for g in group),
            )
        )
    return result


class IndianStocksProvider(BaseMarketProvider):
    provider_name = "yahoo_nse_bse"
    asset_class = "STOCK"
    supports_streaming = False

    def __init__(self):
        self.breaker = CircuitBreaker("yahoo_stocks", failure_threshold=4, recovery_seconds=60)

    def _entry_to_meta(self, item: Dict[str, Any]) -> InstrumentMeta:
        return InstrumentMeta(
            symbol=item["symbol"],
            displaySymbol=item["displaySymbol"],
            name=item["name"],
            assetClass="STOCK",
            exchange=item["exchange"],
            currency="INR",
            sectorOrCategory=item["sector"],
            isIndex=item.get("isIndex", False),
            providerSymbol=item["providerSymbol"],
            description=item.get("description"),
        )

    async def search_instruments(self, query: str, limit: int = 20) -> List[InstrumentMeta]:
        q = query.strip().lower()
        matches = [
            self._entry_to_meta(item)
            for item in INDIAN_STOCK_DIRECTORY
            if not q
            or q in item["symbol"].lower()
            or q in item["displaySymbol"].lower()
            or q in item["name"].lower()
            or q in item["sector"].lower()
        ]
        return matches[:limit]

    async def list_instruments(self, limit: int = 50, offset: int = 0) -> List[InstrumentMeta]:
        return [self._entry_to_meta(item) for item in INDIAN_STOCK_DIRECTORY[offset : offset + limit]]

    async def get_metadata(self, symbol: str) -> Optional[InstrumentMeta]:
        clean = symbol.upper().strip().replace(" ", "")
        aliases = {
            "NIFTY50": "NIFTY50",
            "NIFTY 50": "NIFTY50",
            "^NSEI": "NIFTY50",
            "BANKNIFTY": "BANKNIFTY",
            "^NSEBANK": "BANKNIFTY",
            "SENSEX": "SENSEX",
            "^BSESN": "SENSEX",
        }
        target = aliases.get(clean, clean)
        for item in INDIAN_STOCK_DIRECTORY:
            if item["symbol"] == target or item["providerSymbol"].upper() == clean:
                return self._entry_to_meta(item)
        # Allow arbitrary NSE/BSE ticker lookup (e.g., ZOMATO or ZOMATO.NS or ZOMATO.BO)
        if clean:
            if clean.endswith(".BO"):
                return InstrumentMeta(
                    symbol=clean,
                    displaySymbol=clean.replace(".BO", " (BSE)"),
                    name=clean.replace(".BO", ""),
                    assetClass="STOCK",
                    exchange="BSE",
                    currency="INR",
                    providerSymbol=clean,
                )
            base = clean.replace(".NS", "")
            return InstrumentMeta(
                symbol=base,
                displaySymbol=base,
                name=base,
                assetClass="STOCK",
                exchange="NSE",
                currency="INR",
                providerSymbol=f"{base}.NS",
            )
        return None

    async def get_quote(self, symbol: str) -> NormalizedQuote:
        meta = await self.get_metadata(symbol)
        if meta is None:
            return NormalizedQuote(
                symbol=symbol.upper(),
                displaySymbol=symbol.upper(),
                name=symbol.upper(),
                assetClass="STOCK",
                exchange="NSE",
                currency="INR",
                source="Yahoo Finance NSE/BSE",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning=f"Unknown equity symbol: {symbol}",
            )

        cache_key = f"stock:quote:{meta.symbol}"
        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return NormalizedQuote(**fresh)

        session_label, is_open = get_indian_market_session()

        if not self.breaker.allow_request():
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["marketSession"] = session_label
                stale["warning"] = "Provider circuit open; serving cached quote."
                return NormalizedQuote(**stale)
            return NormalizedQuote(
                symbol=meta.symbol,
                displaySymbol=meta.displaySymbol,
                name=meta.name,
                assetClass="STOCK",
                exchange=meta.exchange,
                currency="INR",
                marketSession=session_label,
                source="Yahoo Finance NSE/BSE",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Indian equity data provider temporarily unavailable.",
            )

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
                raise ValueError(f"Empty Yahoo result for {meta.providerSymbol}")

            chart_res = result_list[0]
            ymeta = chart_res.get("meta", {})
            quote_block = (chart_res.get("indicators", {}).get("quote") or [{}])[0]

            closes = [c for c in (quote_block.get("close") or []) if c is not None]
            opens = [o for o in (quote_block.get("open") or []) if o is not None]
            highs = [h for h in (quote_block.get("high") or []) if h is not None]
            lows = [l for l in (quote_block.get("low") or []) if l is not None]
            vols = [v for v in (quote_block.get("volume") or []) if v is not None]

            price = ymeta.get("regularMarketPrice") or (closes[-1] if closes else None)
            prev_close = ymeta.get("chartPreviousClose") or ymeta.get("previousClose") or (
                closes[-2] if len(closes) >= 2 else price
            )
            if price is None:
                raise ValueError(f"No market price in response for {meta.providerSymbol}")

            change = round(float(price) - float(prev_close), 2) if prev_close else 0.0
            change_pct = round((change / float(prev_close)) * 100, 2) if prev_close else 0.0
            reg_time = ymeta.get("regularMarketTime")
            provider_ts = (
                datetime.fromtimestamp(int(reg_time), tz=timezone.utc).isoformat()
                if reg_time
                else None
            )

            # Honest status: Yahoo Finance NSE/BSE free feed is ~15m delayed during market hours,
            # and MARKET_CLOSED outside IST 09:15-15:30 Mon-Fri / holidays.
            status: DataFreshnessStatus = "DELAYED" if is_open else "MARKET_CLOSED"
            delay_seconds = 900 if is_open else None

            quote = NormalizedQuote(
                symbol=meta.symbol,
                displaySymbol=meta.displaySymbol,
                name=meta.name,
                assetClass="STOCK",
                exchange=meta.exchange,
                currency=ymeta.get("currency", "INR"),
                price=round(float(price), 2),
                open=round(float(opens[-1]), 2) if opens else None,
                high=round(float(ymeta.get("regularMarketDayHigh") or (highs[-1] if highs else price)), 2),
                low=round(float(ymeta.get("regularMarketDayLow") or (lows[-1] if lows else price)), 2),
                previousClose=round(float(prev_close), 2) if prev_close else None,
                change=change,
                changePercent=change_pct,
                volume=float(ymeta.get("regularMarketVolume") or (vols[-1] if vols else 0)),
                high52w=ymeta.get("fiftyTwoWeekHigh"),
                low52w=ymeta.get("fiftyTwoWeekLow"),
                marketSession=session_label,
                sparkline=[round(float(c), 2) for c in closes[-7:]],
                extra={
                    "sector": meta.sectorOrCategory,
                    "isIndex": meta.isIndex,
                    "description": meta.description,
                },
                source="Yahoo Finance (NSE/BSE Delayed Feed)",
                retrievedAt=utc_now_iso(),
                providerTimestamp=provider_ts,
                status=status,
                delaySeconds=delay_seconds,
            ).model_dump()

            self.breaker.record_success()
            market_cache.set(
                cache_key,
                quote,
                ttl_seconds=30 if is_open else 180,
                asset_class="STOCK",
                symbol=meta.symbol,
                source="Yahoo Finance (NSE/BSE Delayed Feed)",
                provider_timestamp=provider_ts,
            )
            return quote

        try:
            data = await market_cache.deduplicated(cache_key, _fetch)
            return NormalizedQuote(**data)
        except Exception as exc:
            self.breaker.record_failure(str(exc))
            logger.warning("yahoo_stock_quote_failed symbol=%s error=%s", meta.symbol, exc)
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["marketSession"] = session_label
                stale["warning"] = "Upstream equity feed unreachable; showing last cached quote."
                return NormalizedQuote(**stale)
            return NormalizedQuote(
                symbol=meta.symbol,
                displaySymbol=meta.displaySymbol,
                name=meta.name,
                assetClass="STOCK",
                exchange=meta.exchange,
                currency="INR",
                marketSession=session_label,
                source="Yahoo Finance (NSE/BSE Delayed Feed)",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Unable to reach equity data provider and no cached quote is available.",
            )

    async def get_candles(
        self,
        symbol: str,
        timeframe: Timeframe = "1d",
        limit: int = 200,
        before: Optional[int] = None,
    ) -> CandleSeriesResponse:
        meta = await self.get_metadata(symbol)
        if meta is None:
            return CandleSeriesResponse(
                symbol=symbol.upper(),
                assetClass="STOCK",
                timeframe=timeframe,
                exchange="NSE",
                currency="INR",
                candles=[],
                source="Yahoo Finance (NSE/BSE Delayed Feed)",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning=f"Unknown stock symbol: {symbol}",
            )

        y_interval, y_range = _YAHOO_TF_CONFIG.get(timeframe, ("1d", "2y"))
        safe_limit = max(1, min(limit, 500))
        cache_key = f"stock:candles:{meta.symbol}:{timeframe}:{safe_limit}:{before or 'latest'}"

        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return CandleSeriesResponse(**fresh)

        _, is_open = get_indian_market_session()

        if not self.breaker.allow_request():
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["warning"] = "Provider circuit open; serving cached candles."
                return CandleSeriesResponse(**stale)
            return CandleSeriesResponse(
                symbol=meta.symbol,
                assetClass="STOCK",
                timeframe=timeframe,
                exchange=meta.exchange,
                currency="INR",
                candles=[],
                source="Yahoo Finance (NSE/BSE Delayed Feed)",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Equity candle provider temporarily unavailable.",
            )

        async def _fetch() -> Dict[str, Any]:
            params: Dict[str, Any] = {"interval": y_interval}
            if before is not None:
                # Fetch window ending at `before`
                span_days = 7 if timeframe in ("1m", "5m") else 30 if timeframe in ("15m", "30m") else 180 if timeframe in ("1h", "4h") else 730
                period2 = before - 1
                period1 = max(0, period2 - span_days * 86400)
                params["period1"] = period1
                params["period2"] = period2
            else:
                params["range"] = y_range

            async with httpx.AsyncClient(timeout=12.0, headers=YAHOO_HEADERS) as client:
                resp = await client.get(
                    f"{YAHOO_CHART_BASE}/{meta.providerSymbol}",
                    params=params,
                )
                resp.raise_for_status()
                payload = resp.json()

            result_list = payload.get("chart", {}).get("result") or []
            if not result_list:
                raise ValueError(f"Empty candle result for {meta.providerSymbol}")

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
                        open=round(float(o), 2),
                        high=round(float(h), 2),
                        low=round(float(l), 2),
                        close=round(float(c), 2),
                        volume=float(v or 0),
                    )
                )

            if timeframe == "4h":
                candles = _resample_4h(candles)

            candles.sort(key=lambda c: c.time)
            if len(candles) > safe_limit:
                candles = candles[-safe_limit:]

            oldest = candles[0].time if candles else None
            latest_ts = (
                datetime.fromtimestamp(candles[-1].time, tz=timezone.utc).isoformat()
                if candles
                else None
            )
            status: DataFreshnessStatus = "DELAYED" if is_open else "MARKET_CLOSED"

            resp_obj = CandleSeriesResponse(
                symbol=meta.symbol,
                assetClass="STOCK",
                timeframe=timeframe,
                exchange=meta.exchange,
                currency="INR",
                candles=candles,
                hasMore=len(candles) >= 20,
                oldestTimestamp=oldest,
                source="Yahoo Finance (NSE/BSE Delayed Feed)",
                retrievedAt=utc_now_iso(),
                providerTimestamp=latest_ts,
                status=status,
                delaySeconds=900 if is_open else None,
            ).model_dump()

            self.breaker.record_success()
            market_cache.set(
                cache_key,
                resp_obj,
                ttl_seconds=60 if is_open else 300,
                asset_class="STOCK",
                symbol=meta.symbol,
                source="Yahoo Finance (NSE/BSE Delayed Feed)",
                provider_timestamp=latest_ts,
            )
            return resp_obj

        try:
            data = await market_cache.deduplicated(cache_key, _fetch)
            return CandleSeriesResponse(**data)
        except Exception as exc:
            self.breaker.record_failure(str(exc))
            logger.warning("yahoo_stock_candles_failed symbol=%s tf=%s error=%s", meta.symbol, timeframe, exc)
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["warning"] = "Upstream equity feed unreachable; showing last cached candles."
                return CandleSeriesResponse(**stale)
            return CandleSeriesResponse(
                symbol=meta.symbol,
                assetClass="STOCK",
                timeframe=timeframe,
                exchange=meta.exchange,
                currency="INR",
                candles=[],
                source="Yahoo Finance (NSE/BSE Delayed Feed)",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Unable to load equity historical candles.",
            )

    async def health_check(self) -> ProviderHealth:
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0, headers=YAHOO_HEADERS) as client:
                resp = await client.get(f"{YAHOO_CHART_BASE}/^NSEI", params={"interval": "1d", "range": "1d"})
                resp.raise_for_status()
            latency = round((time.perf_counter() - started) * 1000, 1)
            return ProviderHealth(
                provider=self.provider_name,
                assetClass="STOCK",
                healthy=True,
                latencyMs=latency,
                circuitState=self.breaker.state,  # type: ignore[arg-type]
                supportsStreaming=False,
            )
        except Exception as exc:
            return ProviderHealth(
                provider=self.provider_name,
                assetClass="STOCK",
                healthy=False,
                circuitState=self.breaker.state,  # type: ignore[arg-type]
                lastError=str(exc),
                supportsStreaming=False,
            )
