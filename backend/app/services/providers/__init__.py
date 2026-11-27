from backend.app.services.providers.base import (
    AssetClass,
    BaseMarketProvider,
    CandleSeriesResponse,
    DataFreshnessStatus,
    InstrumentMeta,
    NormalizedCandle,
    NormalizedQuote,
    ProviderHealth,
    SUPPORTED_TIMEFRAMES,
    Timeframe,
)
from backend.app.services.providers.crypto_provider import CryptoMarketProvider
from backend.app.services.providers.forex_provider import ForexMarketProvider
from backend.app.services.providers.stocks_provider import IndianStocksProvider

stocks_provider = IndianStocksProvider()
crypto_provider = CryptoMarketProvider()
forex_provider = ForexMarketProvider()


def get_provider(asset_class: str) -> BaseMarketProvider:
    ac = asset_class.upper().strip()
    if ac == "STOCK":
        return stocks_provider
    if ac == "CRYPTO":
        return crypto_provider
    if ac == "FOREX":
        return forex_provider
    raise ValueError(f"Unsupported asset class: {asset_class}")


__all__ = [
    "AssetClass",
    "BaseMarketProvider",
    "CandleSeriesResponse",
    "DataFreshnessStatus",
    "InstrumentMeta",
    "NormalizedCandle",
    "NormalizedQuote",
    "ProviderHealth",
    "SUPPORTED_TIMEFRAMES",
    "Timeframe",
    "stocks_provider",
    "crypto_provider",
    "forex_provider",
    "get_provider",
]
