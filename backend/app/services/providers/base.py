from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
import math
from typing import Any, Dict, List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

DataFreshnessStatus = Literal[
    "LIVE",
    "DELAYED",
    "POLLING",
    "CACHED",
    "MARKET_CLOSED",
    "HISTORICAL",
    "CONNECTION_LOST",
    "UNAVAILABLE",
]
AssetClass = Literal["STOCK", "CRYPTO", "FOREX"]
Timeframe = Literal["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w", "1M"]
HistoricalRange = Literal["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"]

SUPPORTED_TIMEFRAMES: List[Timeframe] = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w", "1M"]
SUPPORTED_RANGES: List[HistoricalRange] = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"]

RANGE_DEFAULT_TIMEFRAME: Dict[HistoricalRange, Timeframe] = {
    "1D": "5m",
    "1W": "15m",
    "1M": "1h",
    "3M": "4h",
    "6M": "1d",
    "YTD": "1d",
    "1Y": "1d",
    "3Y": "1w",
    "5Y": "1w",
    "ALL": "1w",
}


def compute_range_window(range_key: HistoricalRange, now_utc: Optional[datetime] = None) -> Tuple[int, int]:
    """Returns (start_unix_sec, end_unix_sec) for a Groww-style historical range."""
    end_dt = now_utc or datetime.now(timezone.utc)
    end_ts = int(end_dt.timestamp())
    if range_key == "1D":
        start_dt = end_dt - timedelta(days=2)  # 2 days ensures full last trading session even on weekends/pre-open
    elif range_key == "1W":
        start_dt = end_dt - timedelta(days=7)
    elif range_key == "1M":
        start_dt = end_dt - timedelta(days=30)
    elif range_key == "3M":
        start_dt = end_dt - timedelta(days=90)
    elif range_key == "6M":
        start_dt = end_dt - timedelta(days=180)
    elif range_key == "YTD":
        start_dt = datetime(end_dt.year, 1, 1, tzinfo=timezone.utc)
    elif range_key == "1Y":
        start_dt = end_dt - timedelta(days=365)
    elif range_key == "3Y":
        start_dt = end_dt - timedelta(days=365 * 3)
    elif range_key == "5Y":
        start_dt = end_dt - timedelta(days=365 * 5)
    else:  # ALL
        start_dt = datetime(2005, 1, 1, tzinfo=timezone.utc)
    return int(start_dt.timestamp()), end_ts


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class FreshnessMetadata(BaseModel):
    source: str
    retrievedAt: str = Field(default_factory=utc_now_iso)
    providerTimestamp: Optional[str] = None
    status: DataFreshnessStatus
    delaySeconds: Optional[int] = None
    warning: Optional[str] = None


class InstrumentMeta(BaseModel):
    symbol: str
    displaySymbol: str
    name: str
    assetClass: AssetClass
    exchange: str
    currency: str
    sectorOrCategory: Optional[str] = None
    isIndex: bool = False
    providerSymbol: str
    description: Optional[str] = None
    extra: Dict[str, Any] = Field(default_factory=dict)


class NormalizedQuote(BaseModel):
    symbol: str
    displaySymbol: str
    name: str
    assetClass: AssetClass
    exchange: str
    currency: str
    price: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    previousClose: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    volume: Optional[float] = None
    marketCap: Optional[float] = None
    high52w: Optional[float] = None
    low52w: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    pipMovement: Optional[float] = None
    marketSession: Optional[str] = None
    sparkline: List[float] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)

    # Data Freshness Contract
    source: str
    retrievedAt: str
    providerTimestamp: Optional[str] = None
    status: DataFreshnessStatus
    delaySeconds: Optional[int] = None
    warning: Optional[str] = None


class NormalizedCandle(BaseModel):
    time: int  # Unix timestamp in seconds (UTC)
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


class CandleSeriesResponse(BaseModel):
    symbol: str
    assetClass: AssetClass
    timeframe: Timeframe
    range: Optional[HistoricalRange] = None
    rangeReturnPercent: Optional[float] = None
    exchange: str
    currency: str
    candles: List[NormalizedCandle]
    hasMore: bool = False
    oldestTimestamp: Optional[int] = None

    # Data Freshness Contract
    source: str
    retrievedAt: str
    providerTimestamp: Optional[str] = None
    status: DataFreshnessStatus
    delaySeconds: Optional[int] = None
    warning: Optional[str] = None


def validate_and_normalize_candles(candles: List[NormalizedCandle]) -> List[NormalizedCandle]:
    """Rejects malformed OHLC candles, deduplicates by timestamp, and sorts chronologically."""
    dedup: Dict[int, NormalizedCandle] = {}
    for c in candles:
        if c.time <= 0:
            continue
        vals = (c.open, c.high, c.low, c.close, c.volume)
        if any(math.isnan(v) or math.isinf(v) for v in vals):
            continue
        if c.high < c.low:
            continue
        if c.open < c.low or c.open > c.high or c.close < c.low or c.close > c.high:
            continue
        dedup[c.time] = c
    return [dedup[t] for t in sorted(dedup.keys())]


class ProviderHealth(BaseModel):
    provider: str
    assetClass: AssetClass
    healthy: bool
    latencyMs: Optional[float] = None
    circuitState: Literal["CLOSED", "OPEN", "HALF_OPEN"] = "CLOSED"
    lastError: Optional[str] = None
    supportsStreaming: bool = False
    checkedAt: str = Field(default_factory=utc_now_iso)


class BaseMarketProvider(ABC):
    provider_name: str
    asset_class: AssetClass
    supports_streaming: bool = False

    @abstractmethod
    async def search_instruments(self, query: str, limit: int = 20) -> List[InstrumentMeta]:
        ...

    @abstractmethod
    async def list_instruments(self, limit: int = 50, offset: int = 0) -> List[InstrumentMeta]:
        ...

    @abstractmethod
    async def get_metadata(self, symbol: str) -> Optional[InstrumentMeta]:
        ...

    @abstractmethod
    async def get_quote(self, symbol: str) -> NormalizedQuote:
        ...

    @abstractmethod
    async def get_candles(
        self,
        symbol: str,
        timeframe: Timeframe = "1d",
        limit: int = 200,
        before: Optional[int] = None,
        range_key: Optional[HistoricalRange] = None,
    ) -> CandleSeriesResponse:
        ...

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        ...
