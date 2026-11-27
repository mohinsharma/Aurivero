from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from backend.app.database import get_connection
from backend.app.models import StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_required
from backend.app.services.providers import get_provider
from backend.app.services.providers.cache_and_limiter import api_rate_limiter

router = APIRouter(prefix="/api/watchlists", tags=["Multi-Watchlist Management"])


class WatchlistCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    description: Optional[str] = Field(None, max_length=200)


class WatchlistUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    description: Optional[str] = Field(None, max_length=200)
    sort_order: Optional[int] = None


class WatchlistItemAddRequest(BaseModel):
    asset_class: str = Field(..., pattern="^(STOCK|CRYPTO|FOREX)$")
    symbol: str = Field(..., min_length=1, max_length=24)
    exchange: Optional[str] = Field(None, max_length=20)
    name: Optional[str] = Field(None, max_length=100)
    target_price: Optional[float] = None
    alert_enabled: bool = False
    notes: Optional[str] = Field(None, max_length=300)


class WatchlistReorderRequest(BaseModel):
    item_ids: List[str] = Field(..., min_length=1)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _enforce_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    ok, retry = api_rate_limiter.check(f"watchlists:{ip}")
    if not ok:
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Retry after {retry}s.")


def _assert_watchlist_owner(cursor, watchlist_id: str, user_id: str):
    cursor.execute("SELECT * FROM watchlists WHERE id = ?", (watchlist_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Watchlist not found.")
    if row["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this watchlist.")
    return dict(row)


@router.get("", response_model=StandardAPIResponse)
async def get_user_watchlists(
    request: Request,
    include_quotes: bool = True,
    user: dict = Depends(get_current_user_required),
):
    _enforce_limit(request)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM watchlists WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC",
        (user["id"],),
    )
    lists = [dict(r) for r in cursor.fetchall()]

    # Auto-create a default watchlist for newly registered users
    if not lists:
        now = _now_iso()
        wl_id = f"wl-{uuid.uuid4().hex[:10]}"
        cursor.execute(
            """
            INSERT INTO watchlists (id, user_id, name, description, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
            """,
            (wl_id, user["id"], "My Watchlist", "Default personal watchlist", now, now),
        )
        conn.commit()
        cursor.execute("SELECT * FROM watchlists WHERE id = ?", (wl_id,))
        lists = [dict(r) for r in cursor.fetchall()]

    all_items = []
    for wl in lists:
        cursor.execute(
            "SELECT * FROM watchlist_items WHERE watchlist_id = ? ORDER BY sort_order ASC, created_at ASC",
            (wl["id"],),
        )
        wl["items"] = [dict(i) for i in cursor.fetchall()]
        all_items.extend(wl["items"])
    conn.close()

    if include_quotes and all_items:
        unique_keys = {(it["asset_class"], it["symbol"]) for it in all_items}

        async def _fetch_one(ac: str, sym: str):
            try:
                q = await get_provider(ac).get_quote(sym)
                return (ac, sym), q.model_dump()
            except Exception:
                return (ac, sym), None

        pairs = await asyncio.gather(*(_fetch_one(ac, sym) for ac, sym in unique_keys))
        quote_map = dict(pairs)
        for wl in lists:
            for it in wl["items"]:
                it["quote"] = quote_map.get((it["asset_class"], it["symbol"]))

    return StandardAPIResponse(success=True, data={"watchlists": lists})


@router.post("", response_model=StandardAPIResponse)
def create_watchlist(
    request: Request,
    payload: WatchlistCreateRequest,
    user: dict = Depends(get_current_user_required),
):
    _enforce_limit(request)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM watchlists WHERE user_id = ?", (user["id"],))
    next_order = cursor.fetchone()[0]
    now = _now_iso()
    wl_id = f"wl-{uuid.uuid4().hex[:10]}"
    cursor.execute(
        """
        INSERT INTO watchlists (id, user_id, name, description, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (wl_id, user["id"], payload.name.strip(), payload.description, next_order, now, now),
    )
    conn.commit()
    cursor.execute("SELECT * FROM watchlists WHERE id = ?", (wl_id,))
    created = dict(cursor.fetchone())
    created["items"] = []
    conn.close()
    return StandardAPIResponse(success=True, data={"watchlist": created})


@router.patch("/{watchlist_id}", response_model=StandardAPIResponse)
def update_watchlist(
    request: Request,
    watchlist_id: str,
    payload: WatchlistUpdateRequest,
    user: dict = Depends(get_current_user_required),
):
    _enforce_limit(request)
    conn = get_connection()
    cursor = conn.cursor()
    existing = _assert_watchlist_owner(cursor, watchlist_id, user["id"])

    new_name = payload.name.strip() if payload.name is not None else existing["name"]
    new_desc = payload.description if payload.description is not None else existing["description"]
    new_order = payload.sort_order if payload.sort_order is not None else existing["sort_order"]
    now = _now_iso()

    cursor.execute(
        """
        UPDATE watchlists SET name = ?, description = ?, sort_order = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
        """,
        (new_name, new_desc, new_order, now, watchlist_id, user["id"]),
    )
    conn.commit()
    cursor.execute("SELECT * FROM watchlists WHERE id = ?", (watchlist_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return StandardAPIResponse(success=True, data={"watchlist": updated})


@router.delete("/{watchlist_id}", response_model=StandardAPIResponse)
def delete_watchlist(
    request: Request,
    watchlist_id: str,
    user: dict = Depends(get_current_user_required),
):
    _enforce_limit(request)
    conn = get_connection()
    cursor = conn.cursor()
    _assert_watchlist_owner(cursor, watchlist_id, user["id"])
    cursor.execute("DELETE FROM watchlists WHERE id = ? AND user_id = ?", (watchlist_id, user["id"]))
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"deleted": True, "id": watchlist_id})


@router.post("/{watchlist_id}/items", response_model=StandardAPIResponse)
async def add_watchlist_item(
    request: Request,
    watchlist_id: str,
    payload: WatchlistItemAddRequest,
    user: dict = Depends(get_current_user_required),
):
    _enforce_limit(request)
    ac = payload.asset_class.upper().strip()
    sym = payload.symbol.upper().strip().replace("/", "")
    provider = get_provider(ac)
    meta = await provider.get_metadata(sym)
    resolved_sym = meta.symbol if meta else sym
    resolved_exchange = payload.exchange or (meta.exchange if meta else ac)
    resolved_name = payload.name or (meta.name if meta else resolved_sym)

    conn = get_connection()
    cursor = conn.cursor()
    _assert_watchlist_owner(cursor, watchlist_id, user["id"])

    cursor.execute(
        "SELECT id FROM watchlist_items WHERE watchlist_id = ? AND asset_class = ? AND symbol = ?",
        (watchlist_id, ac, resolved_sym),
    )
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail=f"{resolved_sym} is already in this watchlist.")

    cursor.execute(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM watchlist_items WHERE watchlist_id = ?",
        (watchlist_id,),
    )
    next_order = cursor.fetchone()[0]
    item_id = f"wli-{uuid.uuid4().hex[:10]}"
    now = _now_iso()

    cursor.execute(
        """
        INSERT INTO watchlist_items (id, watchlist_id, asset_class, symbol, exchange, name, sort_order, target_price, alert_enabled, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            item_id,
            watchlist_id,
            ac,
            resolved_sym,
            resolved_exchange,
            resolved_name,
            next_order,
            payload.target_price,
            1 if payload.alert_enabled else 0,
            payload.notes,
            now,
        ),
    )
    cursor.execute("UPDATE watchlists SET updated_at = ? WHERE id = ?", (now, watchlist_id))
    conn.commit()
    cursor.execute("SELECT * FROM watchlist_items WHERE id = ?", (item_id,))
    created_item = dict(cursor.fetchone())
    conn.close()
    return StandardAPIResponse(success=True, data={"item": created_item})


@router.delete("/{watchlist_id}/items/{item_id}", response_model=StandardAPIResponse)
def remove_watchlist_item(
    request: Request,
    watchlist_id: str,
    item_id: str,
    user: dict = Depends(get_current_user_required),
):
    _enforce_limit(request)
    conn = get_connection()
    cursor = conn.cursor()
    _assert_watchlist_owner(cursor, watchlist_id, user["id"])
    cursor.execute(
        "DELETE FROM watchlist_items WHERE id = ? AND watchlist_id = ?",
        (item_id, watchlist_id),
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Watchlist item not found.")
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"deleted": True, "item_id": item_id})


@router.patch("/{watchlist_id}/reorder", response_model=StandardAPIResponse)
def reorder_watchlist_items(
    request: Request,
    watchlist_id: str,
    payload: WatchlistReorderRequest,
    user: dict = Depends(get_current_user_required),
):
    _enforce_limit(request)
    conn = get_connection()
    cursor = conn.cursor()
    _assert_watchlist_owner(cursor, watchlist_id, user["id"])
    for idx, item_id in enumerate(payload.item_ids):
        cursor.execute(
            "UPDATE watchlist_items SET sort_order = ? WHERE id = ? AND watchlist_id = ?",
            (idx, item_id, watchlist_id),
        )
    cursor.execute("UPDATE watchlists SET updated_at = ? WHERE id = ?", (_now_iso(), watchlist_id))
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"reordered": True})
