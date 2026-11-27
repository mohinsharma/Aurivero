from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from backend.app.services.providers.base import (
    BaseMarketProvider,
    CandleSeriesResponse,
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

logger = logging.getLogger("mindmark.providers.crypto")

BINANCE_BASE = "https://api.binance.com/api/v3"
COINGECKO_BASE = "https://api.coingecko.com/api/v3"

CRYPTO_DIRECTORY: List[Dict[str, Any]] = [
    {
        "symbol": "BTCUSDT",
        "displaySymbol": "BTC/USDT",
        "base": "BTC",
        "name": "Bitcoin",
        "coingeckoId": "bitcoin",
        "category": "Layer 1 / Store of Value",
        "description": "Decentralized peer-to-peer digital currency with a capped 21 million supply.",
    },
    {
        "symbol": "ETHUSDT",
        "displaySymbol": "ETH/USDT",
        "base": "ETH",
        "name": "Ethereum",
        "coingeckoId": "ethereum",
        "category": "Smart Contracts / Layer 1",
        "description": "Global decentralized smart-contract platform powering DeFi and Layer-2 rollups.",
    },
    {
        "symbol": "SOLUSDT",
        "displaySymbol": "SOL/USDT",
        "base": "SOL",
        "name": "Solana",
        "coingeckoId": "solana",
        "category": "High-Throughput Layer 1",
        "description": "High-throughput monolithic Layer-1 blockchain optimized for low-latency settlement.",
    },
    {
        "symbol": "BNBUSDT",
        "displaySymbol": "BNB/USDT",
        "base": "BNB",
        "name": "BNB",
        "coingeckoId": "binancecoin",
        "category": "Exchange / BNB Chain",
        "description": "Native utility and gas token of the BNB Smart Chain ecosystem.",
    },
    {
        "symbol": "XRPUSDT",
        "displaySymbol": "XRP/USDT",
        "base": "XRP",
        "name": "XRP",
        "coingeckoId": "ripple",
        "category": "Cross-Border Payments",
        "description": "Digital settlement asset built for fast international payments and liquidity.",
    },
    {
        "symbol": "ADAUSDT",
        "displaySymbol": "ADA/USDT",
        "base": "ADA",
        "name": "Cardano",
        "coingeckoId": "cardano",
        "category": "Proof of Stake Layer 1",
        "description": "Peer-reviewed proof-of-stake smart contract platform.",
    },
    {
        "symbol": "AVAXUSDT",
        "displaySymbol": "AVAX/USDT",
        "base": "AVAX",
        "name": "Avalanche",
        "coingeckoId": "avalanche-2",
        "category": "Subnets / Layer 1",
        "description": "Smart contract platform featuring customizable subnets and fast finality.",
    },
    {
        "symbol": "DOGEUSDT",
        "displaySymbol": "DOGE/USDT",
        "base": "DOGE",
        "name": "Dogecoin",
        "coingeckoId": "dogecoin",
        "category": "Payments / Meme",
        "description": "Open-source peer-to-peer digital currency.",
    },
    {
        "symbol": "LINKUSDT",
        "displaySymbol": "LINK/USDT",
        "base": "LINK",
        "name": "Chainlink",
        "coingeckoId": "chainlink",
        "category": "Oracle Infrastructure",
        "description": "Decentralized oracle network connecting smart contracts to real-world data.",
    },
    {
        "symbol": "DOTUSDT",
        "displaySymbol": "DOT/USDT",
        "base": "DOT",
        "name": "Polkadot",
        "coingeckoId": "polkadot",
        "category": "Interoperability / Layer 0",
        "description": "Multi-chain interoperability protocol connecting specialized blockchains.",
    },
    {
        "symbol": "LTCUSDT",
        "displaySymbol": "LTC/USDT",
        "base": "LTC",
        "name": "Litecoin",
        "coingeckoId": "litecoin",
        "category": "Payments",
        "description": "Lightweight peer-to-peer cryptocurrency with fast block confirmation.",
    },
    {
        "symbol": "POLUSDT",
        "displaySymbol": "POL/USDT",
        "base": "POL",
        "name": "Polygon (POL)",
        "coingeckoId": "polygon-ecosystem-token",
        "category": "Layer 2 / AggLayer",
        "description": "Ethereum scaling ecosystem utilizing zero-knowledge proofs and AggLayer.",
    },
]

_TIMEFRAME_MAP: Dict[Timeframe, str] = {
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "1d": "1d",
    "1w": "1w",
    "1M": "1M",
}


def _normalize_crypto_symbol(symbol: str) -> str:
    s = symbol.upper().strip().replace("/", "").replace("-", "")
    if not s.endswith("USDT") and not s.endswith("USD"):
        s = f"{s}USDT"
    if s.endswith("USD") and not s.endswith("USDT"):
        s = f"{s}T"
    return s


class CryptoMarketProvider(BaseMarketProvider):
    provider_name = "binance_coingecko"
    asset_class = "CRYPTO"
    supports_streaming = True

    def __init__(self):
        self.breaker = CircuitBreaker("binance_crypto", failure_threshold=4, recovery_seconds=30)
        self.cg_breaker = CircuitBreaker("coingecko_meta", failure_threshold=3, recovery_seconds=120)

    def _entry_to_meta(self, item: Dict[str, Any]) -> InstrumentMeta:
        return InstrumentMeta(
            symbol=item["symbol"],
            displaySymbol=item["displaySymbol"],
            name=item["name"],
            assetClass="CRYPTO",
            exchange="BINANCE",
            currency="USDT",
            sectorOrCategory=item["category"],
            providerSymbol=item["symbol"],
            description=item["description"],
            extra={"base": item["base"], "coingeckoId": item["coingeckoId"]},
        )

    async def _get_binance_usdt_symbols(self) -> List[Dict[str, str]]:
        cache_key = "crypto:binance:exchange_info_usdt"
        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return fresh
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{BINANCE_BASE}/exchangeInfo", params={"permissions": "SPOT"})
                resp.raise_for_status()
                symbols = resp.json().get("symbols") or []
                usdt_pairs = [
                    {
                        "symbol": s["symbol"],
                        "base": s["baseAsset"],
                        "quote": s["quoteAsset"],
                    }
                    for s in symbols
                    if s.get("status") == "TRADING" and s.get("quoteAsset") == "USDT"
                ]
                market_cache.set(
                    cache_key,
                    usdt_pairs,
                    ttl_seconds=3600,
                    asset_class="CRYPTO",
                    symbol="EXCHANGE_INFO",
                    source="Binance ExchangeInfo",
                    persist_sqlite=False,
                )
                return usdt_pairs
        except Exception as exc:
            logger.debug("binance_exchange_info_failed err=%s", exc)
            return market_cache.get_stale(cache_key) or []

    async def search_instruments(self, query: str, limit: int = 20) -> List[InstrumentMeta]:
        q = query.strip().lower().replace("/", "").replace("-", "")
        local_matches = [
            self._entry_to_meta(item)
            for item in CRYPTO_DIRECTORY
            if not q
            or q in item["symbol"].lower()
            or q in item["displaySymbol"].lower()
            or q in item["base"].lower()
            or q in item["name"].lower()
            or q in item["category"].lower()
        ]
        if not q:
            return local_matches[:limit]

        all_usdt = await self._get_binance_usdt_symbols()
        seen = {m.symbol for m in local_matches}
        merged = list(local_matches)
        for pair in all_usdt:
            sym = pair["symbol"]
            base = pair["base"]
            if sym in seen:
                continue
            if q in sym.lower() or q in base.lower():
                merged.append(
                    InstrumentMeta(
                        symbol=sym,
                        displaySymbol=f"{base}/USDT",
                        name=base,
                        assetClass="CRYPTO",
                        exchange="BINANCE",
                        currency="USDT",
                        sectorOrCategory="Spot Pair",
                        providerSymbol=sym,
                        extra={"base": base},
                    )
                )
                seen.add(sym)
                if len(merged) >= limit:
                    break
        return merged[:limit]

    async def list_instruments(self, limit: int = 50, offset: int = 0) -> List[InstrumentMeta]:
        return [self._entry_to_meta(item) for item in CRYPTO_DIRECTORY[offset : offset + limit]]

    async def get_metadata(self, symbol: str) -> Optional[InstrumentMeta]:
        norm = _normalize_crypto_symbol(symbol)
        for item in CRYPTO_DIRECTORY:
            if item["symbol"] == norm or item["base"] == symbol.upper().strip():
                return self._entry_to_meta(item)
        # Allow arbitrary Binance USDT pair if user queries one directly
        if norm.endswith("USDT") and len(norm) >= 6:
            base = norm[:-4]
            return InstrumentMeta(
                symbol=norm,
                displaySymbol=f"{base}/USDT",
                name=base,
                assetClass="CRYPTO",
                exchange="BINANCE",
                currency="USDT",
                providerSymbol=norm,
                extra={"base": base},
            )
        return None

    async def _fetch_coingecko_caps(self) -> Dict[str, Dict[str, Any]]:
        cache_key = "crypto:coingecko:caps"
        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return fresh
        if not self.cg_breaker.allow_request():
            return market_cache.get_stale(cache_key) or {}

        ids = ",".join(item["coingeckoId"] for item in CRYPTO_DIRECTORY if item.get("coingeckoId"))

        async def _do_fetch() -> Dict[str, Dict[str, Any]]:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{COINGECKO_BASE}/coins/markets",
                    params={
                        "vs_currency": "usd",
                        "ids": ids,
                        "order": "market_cap_desc",
                        "per_page": 50,
                        "page": 1,
                        "sparkline": "false",
                    },
                )
                resp.raise_for_status()
                rows = resp.json()
                mapping: Dict[str, Dict[str, Any]] = {}
                for r in rows:
                    mapping[r["id"]] = {
                        "market_cap": r.get("market_cap"),
                        "circulating_supply": r.get("circulating_supply"),
                        "market_cap_rank": r.get("market_cap_rank"),
                    }
                self.cg_breaker.record_success()
                market_cache.set(
                    cache_key,
                    mapping,
                    ttl_seconds=300,
                    asset_class="CRYPTO",
                    symbol="GLOBAL_CAPS",
                    source="CoinGecko",
                )
                return mapping

        try:
            return await market_cache.deduplicated(cache_key, _do_fetch)
        except Exception as exc:
            self.cg_breaker.record_failure(str(exc))
            logger.warning("coingecko_caps_failed error=%s", exc)
            return market_cache.get_stale(cache_key) or {}

    async def get_quote(self, symbol: str) -> NormalizedQuote:
        meta = await self.get_metadata(symbol)
        if meta is None:
            return NormalizedQuote(
                symbol=symbol.upper(),
                displaySymbol=symbol.upper(),
                name=symbol.upper(),
                assetClass="CRYPTO",
                exchange="BINANCE",
                currency="USDT",
                source="Binance",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning=f"Unknown crypto instrument: {symbol}",
            )

        norm = meta.symbol
        cache_key = f"crypto:quote:{norm}"
        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return NormalizedQuote(**fresh)

        if not self.breaker.allow_request():
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["warning"] = "Provider circuit open; serving cached quote."
                return NormalizedQuote(**stale)
            return NormalizedQuote(
                symbol=norm,
                displaySymbol=meta.displaySymbol,
                name=meta.name,
                assetClass="CRYPTO",
                exchange="BINANCE",
                currency="USDT",
                source="Binance",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Crypto data provider temporarily unavailable.",
            )

        async def _fetch() -> Dict[str, Any]:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{BINANCE_BASE}/ticker/24hr", params={"symbol": norm})
                resp.raise_for_status()
                ticker = resp.json()

            caps = await self._fetch_coingecko_caps()
            cg_info = caps.get(meta.extra.get("coingeckoId", ""), {})

            last_price = float(ticker["lastPrice"])
            open_price = float(ticker["openPrice"])
            high_price = float(ticker["highPrice"])
            low_price = float(ticker["lowPrice"])
            prev_close = float(ticker["prevClosePrice"])
            price_change = float(ticker["priceChange"])
            pct_change = float(ticker["priceChangePercent"])
            quote_vol = float(ticker.get("quoteVolume", 0.0))
            close_time_ms = int(ticker.get("closeTime", int(time.time() * 1000)))
            provider_ts = datetime.fromtimestamp(close_time_ms / 1000, tz=timezone.utc).isoformat()

            quote = NormalizedQuote(
                symbol=norm,
                displaySymbol=meta.displaySymbol,
                name=meta.name,
                assetClass="CRYPTO",
                exchange="BINANCE",
                currency="USDT",
                price=last_price,
                open=open_price,
                high=high_price,
                low=low_price,
                previousClose=prev_close,
                change=price_change,
                changePercent=pct_change,
                volume=quote_vol,
                marketCap=cg_info.get("market_cap"),
                bid=float(ticker["bidPrice"]) if ticker.get("bidPrice") else None,
                ask=float(ticker["askPrice"]) if ticker.get("askPrice") else None,
                marketSession="24/7 Continuous",
                extra={
                    "category": meta.sectorOrCategory,
                    "circulatingSupply": cg_info.get("circulating_supply"),
                    "marketCapRank": cg_info.get("market_cap_rank"),
                    "baseAsset": meta.extra.get("base"),
                },
                source="Binance Spot REST",
                retrievedAt=utc_now_iso(),
                providerTimestamp=provider_ts,
                status="LIVE",
                delaySeconds=0,
            ).model_dump()

            self.breaker.record_success()
            market_cache.set(
                cache_key,
                quote,
                ttl_seconds=5,
                asset_class="CRYPTO",
                symbol=norm,
                source="Binance Spot REST",
                provider_timestamp=provider_ts,
            )
            return quote

        try:
            data = await market_cache.deduplicated(cache_key, _fetch)
            return NormalizedQuote(**data)
        except Exception as exc:
            self.breaker.record_failure(str(exc))
            logger.warning("binance_quote_failed symbol=%s error=%s", norm, exc)
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["warning"] = "Live upstream unreachable; showing last cached quote."
                return NormalizedQuote(**stale)
            return NormalizedQuote(
                symbol=norm,
                displaySymbol=meta.displaySymbol,
                name=meta.name,
                assetClass="CRYPTO",
                exchange="BINANCE",
                currency="USDT",
                source="Binance Spot REST",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Unable to reach Binance API and no cached quote is available.",
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
                assetClass="CRYPTO",
                timeframe=timeframe,
                range=range_key,
                exchange="BINANCE",
                currency="USDT",
                candles=[],
                source="Binance Spot REST",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning=f"Unknown crypto symbol: {symbol}",
            )

        norm = meta.symbol
        interval = _TIMEFRAME_MAP.get(timeframe, "1d")
        safe_limit = max(1, min(limit, 500))
        cache_key = f"crypto:candles:{norm}:{interval}:{range_key or 'default'}:{safe_limit}:{before or 'latest'}"

        fresh = market_cache.get_fresh(cache_key)
        if fresh is not None:
            return CandleSeriesResponse(**fresh)

        if not self.breaker.allow_request():
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["warning"] = "Provider circuit open; serving cached candles."
                return CandleSeriesResponse(**stale)
            return CandleSeriesResponse(
                symbol=norm,
                assetClass="CRYPTO",
                timeframe=timeframe,
                range=range_key,
                exchange="BINANCE",
                currency="USDT",
                candles=[],
                source="Binance Spot REST",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Crypto candle provider temporarily unavailable.",
            )

        async def _fetch() -> Dict[str, Any]:
            params: Dict[str, Any] = {
                "symbol": norm,
                "interval": interval,
                "limit": safe_limit,
            }
            if before is not None:
                params["endTime"] = (before - 1) * 1000
            elif range_key is not None and range_key != "ALL":
                start_s, end_s = compute_range_window(range_key)
                params["startTime"] = start_s * 1000
                params["endTime"] = end_s * 1000

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{BINANCE_BASE}/klines", params=params)
                resp.raise_for_status()
                raw_klines = resp.json()

            candles = validate_and_normalize_candles([
                NormalizedCandle(
                    time=int(k[0] // 1000),
                    open=float(k[1]),
                    high=float(k[2]),
                    low=float(k[3]),
                    close=float(k[4]),
                    volume=float(k[5]),
                )
                for k in raw_klines
            ])
            range_return = None
            if len(candles) >= 2 and candles[0].open > 0:
                range_return = round(((candles[-1].close - candles[0].open) / candles[0].open) * 100, 2)
            oldest = candles[0].time if candles else None
            latest_ts = (
                datetime.fromtimestamp(candles[-1].time, tz=timezone.utc).isoformat()
                if candles
                else None
            )

            ttl = 10 if timeframe in ("1m", "5m", "15m") else 60
            payload = CandleSeriesResponse(
                symbol=norm,
                assetClass="CRYPTO",
                timeframe=timeframe,
                range=range_key,
                rangeReturnPercent=range_return,
                exchange="BINANCE",
                currency="USDT",
                candles=candles,
                hasMore=len(candles) >= safe_limit,
                oldestTimestamp=oldest,
                source="Binance Klines API",
                retrievedAt=utc_now_iso(),
                providerTimestamp=latest_ts,
                status="LIVE",
                delaySeconds=0,
            ).model_dump()

            self.breaker.record_success()
            market_cache.set(
                cache_key,
                payload,
                ttl_seconds=ttl,
                asset_class="CRYPTO",
                symbol=norm,
                source="Binance Klines API",
                provider_timestamp=latest_ts,
            )
            return payload

        try:
            data = await market_cache.deduplicated(cache_key, _fetch)
            return CandleSeriesResponse(**data)
        except Exception as exc:
            self.breaker.record_failure(str(exc))
            logger.warning("binance_candles_failed symbol=%s tf=%s error=%s", norm, timeframe, exc)
            stale = market_cache.get_stale(cache_key)
            if stale:
                stale["status"] = "CACHED"
                stale["retrievedAt"] = utc_now_iso()
                stale["warning"] = "Live upstream unreachable; showing last cached candles."
                return CandleSeriesResponse(**stale)
            return CandleSeriesResponse(
                symbol=norm,
                assetClass="CRYPTO",
                timeframe=timeframe,
                exchange="BINANCE",
                currency="USDT",
                candles=[],
                source="Binance Klines API",
                retrievedAt=utc_now_iso(),
                status="UNAVAILABLE",
                warning="Unable to load historical candles from Binance.",
            )

    async def health_check(self) -> ProviderHealth:
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{BINANCE_BASE}/ping")
                resp.raise_for_status()
            latency = round((time.perf_counter() - started) * 1000, 1)
            return ProviderHealth(
                provider=self.provider_name,
                assetClass="CRYPTO",
                healthy=True,
                latencyMs=latency,
                circuitState=self.breaker.state,  # type: ignore[arg-type]
                supportsStreaming=True,
            )
        except Exception as exc:
            return ProviderHealth(
                provider=self.provider_name,
                assetClass="CRYPTO",
                healthy=False,
                circuitState=self.breaker.state,  # type: ignore[arg-type]
                lastError=str(exc),
                supportsStreaming=True,
            )
