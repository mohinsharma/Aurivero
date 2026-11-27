from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

DataFreshnessStatus = Literal["LIVE", "DELAYED", "CACHED", "MARKET_CLOSED", "UNAVAILABLE"]
AssetClass = Literal["STOCK", "CRYPTO", "FOREX"]
Timeframe = Literal["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]

SUPPORTED_TIMEFRAMES: List[Timeframe] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]


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
    ) -> CandleSeriesResponse:
        ...

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        ...
