from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from backend.app.models import StandardAPIResponse
from backend.app.services.providers import (
    RANGE_DEFAULT_TIMEFRAME,
    SUPPORTED_RANGES,
    SUPPORTED_TIMEFRAMES,
    HistoricalRange,
    Timeframe,
    crypto_provider,
    forex_provider,
    get_provider,
    stocks_provider,
)
from backend.app.services.providers.cache_and_limiter import api_rate_limiter
from backend.app.services.heatmap_service import get_stocks_heatmap
from backend.app.services.screener_service import run_stock_screener
from backend.app.services.risk_analytics_service import compute_historical_risk_analytics
from backend.app.services.ml_risk_service import evaluate_ml_risk_intelligence
from backend.app.services.portfolio_risk_service import compute_portfolio_risk
from backend.app.services.providers.indian_vendors import bharatstock_adapter, tejhq_adapter
from backend.app.services.providers.stocks_provider import get_indian_market_session_details
from backend.app.services.stream_manager import stream_manager

logger = logging.getLogger("mindmark.routers.markets")

router = APIRouter(prefix="/api/markets", tags=["Unified Multi-Asset Markets"])


def _enforce_rate_limit(request: Request, scope: str) -> None:
    client_ip = request.client.host if request.client else "unknown"
    allowed, retry_after = api_rate_limiter.check(f"{scope}:{client_ip}")
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Retry after {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )


@router.get("/ticker", response_model=StandardAPIResponse)
async def get_live_market_ticker(request: Request):
    _enforce_rate_limit(request, "ticker")
    indices_syms = ["NIFTY50", "SENSEX", "BANKNIFTY", "INDIAVIX"]
    crypto_syms = ["BTCUSDT", "ETHUSDT"]
    forex_syms = ["USDINR", "EURUSD"]

    idx_q, crp_q, fx_q = await asyncio.gather(
        asyncio.gather(*(stocks_provider.get_quote(s) for s in indices_syms)),
        asyncio.gather(*(crypto_provider.get_quote(s) for s in crypto_syms)),
        asyncio.gather(*(forex_provider.get_quote(s) for s in forex_syms)),
    )

    return StandardAPIResponse(
        success=True,
        data={
            "indices": [q.model_dump() for q in idx_q],
            "crypto": [q.model_dump() for q in crp_q],
            "forex": [q.model_dump() for q in fx_q],
            "indianSession": get_indian_market_session_details(),
        },
    )


@router.get("/overview", response_model=StandardAPIResponse)
async def get_market_overview(request: Request):
    _enforce_rate_limit(request, "overview")

    index_symbols = ["NIFTY50", "BANKNIFTY", "SENSEX"]
    stock_symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "M&M", "LT"]
    crypto_symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOGEUSDT"]
    forex_symbols = ["EURUSD", "GBPUSD", "USDJPY", "USDINR", "AUDUSD", "EURINR"]

    idx_quotes, stk_quotes, crp_quotes, fx_quotes = await asyncio.gather(
        asyncio.gather(*(stocks_provider.get_quote(s) for s in index_symbols)),
        asyncio.gather(*(stocks_provider.get_quote(s) for s in stock_symbols)),
        asyncio.gather(*(crypto_provider.get_quote(s) for s in crypto_symbols)),
        asyncio.gather(*(forex_provider.get_quote(s) for s in forex_symbols)),
    )

    valid_stocks = [q for q in stk_quotes if q.price is not None and q.changePercent is not None]
    top_gainers = sorted(valid_stocks, key=lambda q: q.changePercent or 0.0, reverse=True)[:5]
    top_losers = sorted(valid_stocks, key=lambda q: q.changePercent or 0.0)[:5]
    most_active = sorted(valid_stocks, key=lambda q: q.volume or 0.0, reverse=True)[:5]

    valid_crypto = [q for q in crp_quotes if q.price is not None]
    trending_crypto = sorted(valid_crypto, key=lambda q: abs(q.changePercent or 0.0), reverse=True)[:6]

    return StandardAPIResponse(
        success=True,
        data={
            "indices": [q.model_dump() for q in idx_quotes],
            "stocks": {
                "topGainers": [q.model_dump() for q in top_gainers],
                "topLosers": [q.model_dump() for q in top_losers],
                "mostActive": [q.model_dump() for q in most_active],
                "all": [q.model_dump() for q in stk_quotes],
            },
            "crypto": {
                "trending": [q.model_dump() for q in trending_crypto],
                "all": [q.model_dump() for q in crp_quotes],
            },
            "forex": {
                "popular": [q.model_dump() for q in fx_quotes],
            },
        },
    )


@router.get("/search", response_model=StandardAPIResponse)
async def search_all_markets(
    request: Request,
    q: str = Query("", max_length=80),
    asset_class: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=50),
):
    _enforce_rate_limit(request, "search")
    ac = asset_class.upper().strip() if asset_class else None

    tasks = []
    if ac in (None, "ALL", "STOCK"):
        tasks.append(stocks_provider.search_instruments(q, limit=limit))
    if ac in (None, "ALL", "CRYPTO"):
        tasks.append(crypto_provider.search_instruments(q, limit=limit))
    if ac in (None, "ALL", "FOREX"):
        tasks.append(forex_provider.search_instruments(q, limit=limit))

    results_lists = await asyncio.gather(*tasks)
    combined = [item.model_dump() for sublist in results_lists for item in sublist]
    return StandardAPIResponse(
        success=True,
        data={"results": combined[: limit * 3], "total": len(combined)},
    )


@router.get("/instruments/{asset_class}", response_model=StandardAPIResponse)
async def list_market_instruments(
    request: Request,
    asset_class: str,
    q: Optional[str] = Query(None, max_length=80),
    exchange: Optional[str] = Query(None, max_length=20),
    limit: int = Query(24, ge=1, le=60),
    offset: int = Query(0, ge=0),
    with_quotes: bool = Query(True),
):
    _enforce_rate_limit(request, "instruments")
    try:
        provider = get_provider(asset_class)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if q and q.strip():
        metas = await provider.search_instruments(q.strip(), limit=limit + offset)
        metas = metas[offset : offset + limit]
    else:
        metas = await provider.list_instruments(limit=limit, offset=offset)

    if exchange and exchange.upper() != "ALL":
        metas = [m for m in metas if m.exchange.upper() == exchange.upper()]

    if with_quotes and metas:
        quotes = await asyncio.gather(*(provider.get_quote(m.symbol) for m in metas))
        items = [qt.model_dump() for qt in quotes]
    else:
        items = [m.model_dump() for m in metas]

    return StandardAPIResponse(
        success=True,
        data={
            "assetClass": asset_class.upper(),
            "items": items,
            "count": len(items),
            "offset": offset,
            "limit": limit,
        },
    )


@router.get("/quote/{asset_class}/{symbol}", response_model=StandardAPIResponse)
async def get_instrument_quote(request: Request, asset_class: str, symbol: str):
    _enforce_rate_limit(request, "quote")
    try:
        provider = get_provider(asset_class)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    meta = await provider.get_metadata(symbol)
    quote = await provider.get_quote(symbol)
    return StandardAPIResponse(
        success=True,
        data={
            "metadata": meta.model_dump() if meta else None,
            "quote": quote.model_dump(),
        },
    )


@router.get("/candles/{asset_class}/{symbol}", response_model=StandardAPIResponse)
async def get_instrument_candles(
    request: Request,
    asset_class: str,
    symbol: str,
    timeframe: Optional[str] = Query(None),
    range: Optional[str] = Query(None),
    limit: int = Query(350, ge=10, le=1000),
    before: Optional[int] = Query(None),
):
    _enforce_rate_limit(request, "candles")
    resolved_range: Optional[HistoricalRange] = None
    if range is not None:
        r_up = range.upper().strip()
        if r_up not in SUPPORTED_RANGES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported range '{range}'. Supported: {', '.join(SUPPORTED_RANGES)}",
            )
        resolved_range = r_up  # type: ignore[assignment]

    if timeframe is not None:
        if timeframe not in SUPPORTED_TIMEFRAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported timeframe '{timeframe}'. Supported: {', '.join(SUPPORTED_TIMEFRAMES)}",
            )
        resolved_tf: Timeframe = timeframe  # type: ignore[assignment]
    elif resolved_range is not None:
        resolved_tf = RANGE_DEFAULT_TIMEFRAME[resolved_range]
    else:
        resolved_tf = "1d"

    try:
        provider = get_provider(asset_class)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    series = await provider.get_candles(
        symbol=symbol,
        timeframe=resolved_tf,
        limit=limit,
        before=before,
        range_key=resolved_range,
    )
    return StandardAPIResponse(success=True, data=series.model_dump())


@router.get("/heatmap", response_model=StandardAPIResponse)
async def get_market_heatmap(
    request: Request,
    universe: str = Query("NIFTY50"),
    timeframe: str = Query("1D"),
    sector: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    sort_by: str = Query("HIGHEST_MCAP"),
):
    _enforce_rate_limit(request, "heatmap")
    data = await get_stocks_heatmap(
        universe=universe,
        timeframe=timeframe,
        sector=sector,
        direction=direction,
        sort_by=sort_by,
    )
    return StandardAPIResponse(success=True, data=data)


@router.get("/session", response_model=StandardAPIResponse)
async def get_indian_session():
    return StandardAPIResponse(
        success=True,
        data={
            "indianEquities": get_indian_market_session_details(),
            "crypto": {"state": "OPEN_24_7", "label": "24/7 Continuous", "isOpen": True},
            "providers": {
                "tejhqConfigured": tejhq_adapter.is_configured,
                "bharatstockConfigured": bharatstock_adapter.is_configured,
                "bharatstockRemainingDailyBudget": bharatstock_adapter.remaining_daily_budget(),
            },
        },
    )


@router.get("/screener", response_model=StandardAPIResponse)
async def get_stock_screener(
    request: Request,
    exchange: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    min_mcap_cr: Optional[float] = Query(None),
    max_mcap_cr: Optional[float] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_1m_return: Optional[float] = Query(None),
    min_1y_return: Optional[float] = Query(None),
    min_pe: Optional[float] = Query(None),
    max_pe: Optional[float] = Query(None),
    sort_by: str = Query("marketCapCr"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=50),
):
    _enforce_rate_limit(request, "screener")
    data = await run_stock_screener(
        exchange=exchange,
        sector=sector,
        min_mcap_cr=min_mcap_cr,
        max_mcap_cr=max_mcap_cr,
        min_price=min_price,
        max_price=max_price,
        min_1m_return=min_1m_return,
        min_1y_return=min_1y_return,
        min_pe=min_pe,
        max_pe=max_pe,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )
    return StandardAPIResponse(success=True, data=data)


@router.get("/fundamentals/{symbol}", response_model=StandardAPIResponse)
async def get_stock_fundamentals(request: Request, symbol: str):
    _enforce_rate_limit(request, "fundamentals")
    data = await bharatstock_adapter.get_fundamentals(symbol)
    return StandardAPIResponse(success=True, data=data)


@router.get("/risk/analytics/{asset_class}/{symbol}", response_model=StandardAPIResponse)
async def get_risk_analytics(
    request: Request,
    asset_class: str,
    symbol: str,
    confidence: float = Query(0.95, ge=0.80, le=0.99),
    lookback_days: int = Query(252, ge=30, le=500),
):
    _enforce_rate_limit(request, "risk_analytics")
    try:
        data = await compute_historical_risk_analytics(
            asset_class=asset_class,
            symbol=symbol,
            confidence=confidence,
            lookback_days=lookback_days,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return StandardAPIResponse(success=True, data=data)


@router.get("/risk/ml/{asset_class}/{symbol}", response_model=StandardAPIResponse)
async def get_ml_risk_insights(request: Request, asset_class: str, symbol: str):
    _enforce_rate_limit(request, "risk_ml")
    try:
        data = await evaluate_ml_risk_intelligence(asset_class=asset_class, symbol=symbol)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return StandardAPIResponse(success=True, data=data)


class PortfolioRiskPositionIn(BaseModel):
    symbol: str
    name: Optional[str] = None
    assetClass: str = Field(default="STOCK")
    quantity: float = Field(gt=0)
    entryPrice: float = Field(gt=0)
    currentPrice: Optional[float] = None
    stopLoss: Optional[float] = None
    sector: Optional[str] = None
    currency: Optional[str] = None


class PortfolioRiskRequest(BaseModel):
    positions: List[PortfolioRiskPositionIn] = Field(default_factory=list)
    cashBalance: float = Field(default=0.0, ge=0.0)
    baseCurrency: str = Field(default="INR")
    confidence: float = Field(default=0.95, ge=0.80, le=0.99)
    lookbackDays: int = Field(default=252, ge=30, le=400)


@router.post("/risk/portfolio", response_model=StandardAPIResponse)
async def analyze_portfolio_risk(request: Request, body: PortfolioRiskRequest):
    _enforce_rate_limit(request, "risk_portfolio")
    try:
        data = await compute_portfolio_risk(
            positions=[p.model_dump() for p in body.positions],
            cash_balance=body.cashBalance,
            base_currency=body.baseCurrency,
            confidence=body.confidence,
            lookback_days=body.lookbackDays,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return StandardAPIResponse(success=True, data=data)


@router.get("/health", response_model=StandardAPIResponse)
async def get_markets_health():
    healths = await asyncio.gather(
        stocks_provider.health_check(),
        crypto_provider.health_check(),
        forex_provider.health_check(),
    )
    return StandardAPIResponse(
        success=True,
        data={
            "providers": [h.model_dump() for h in healths],
            "activeStreams": stream_manager.active_subscriptions(),
        },
    )


@router.websocket("/ws/{asset_class}/{symbol}")
async def market_stream_ws(websocket: WebSocket, asset_class: str, symbol: str):
    ac = asset_class.upper().strip()
    if ac not in ("STOCK", "CRYPTO", "FOREX"):
        await websocket.close(code=1008, reason="Unsupported asset class")
        return

    await websocket.accept()
    await stream_manager.subscribe(ac, symbol.upper(), websocket)
    try:
        while True:
            # Keep connection alive and allow client ping/heartbeat
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text('{"type":"PONG"}')
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("ws_closed asset=%s symbol=%s err=%s", ac, symbol, exc)
    finally:
        await stream_manager.unsubscribe(ac, symbol.upper(), websocket)
