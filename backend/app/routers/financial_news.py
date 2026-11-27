from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from backend.app.database import get_connection
from backend.app.models import StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional, get_current_user_required
from backend.app.services.financial_news_service import (
    get_financial_news,
    get_instrument_news,
)

router = APIRouter(prefix="/api/financial-news", tags=["Financial News (RSS & Attribution)"])


class FinancialNewsBookmarkReq(BaseModel):
    article_id: str
    title: str
    url: str
    source: str
    category: str
    published_at_ist: str


@router.get("", response_model=StandardAPIResponse)
async def list_financial_news(
    category: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    user: dict = Depends(get_current_user_optional),
):
    data = await get_financial_news(
        category=category,
        source=source,
        q=q,
        page=page,
        page_size=page_size,
    )
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT article_id FROM financial_news_bookmarks WHERE user_id = ?",
        (user["id"],),
    )
    bookmarked_ids = {r["article_id"] for r in cursor.fetchall()}
    conn.close()

    for art in data["articles"]:
        art["isBookmarked"] = art["id"] in bookmarked_ids

    return StandardAPIResponse(success=True, data=data)


@router.get("/instrument/{asset_class}/{symbol}", response_model=StandardAPIResponse)
async def list_instrument_news(
    asset_class: str,
    symbol: str,
    name: Optional[str] = Query(None),
    limit: int = Query(8, ge=1, le=20),
):
    articles = await get_instrument_news(
        asset_class=asset_class,
        symbol=symbol,
        name=name,
        limit=limit,
    )
    return StandardAPIResponse(success=True, data={"articles": articles})


@router.get("/bookmarks", response_model=StandardAPIResponse)
def get_financial_news_bookmarks(user: dict = Depends(get_current_user_required)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM financial_news_bookmarks WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],),
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return StandardAPIResponse(success=True, data={"bookmarks": rows})


@router.post("/bookmarks", response_model=StandardAPIResponse)
def toggle_financial_news_bookmark(
    payload: FinancialNewsBookmarkReq,
    user: dict = Depends(get_current_user_required),
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM financial_news_bookmarks WHERE user_id = ? AND article_id = ?",
        (user["id"], payload.article_id),
    )
    existing = cursor.fetchone()
    if existing:
        cursor.execute(
            "DELETE FROM financial_news_bookmarks WHERE user_id = ? AND article_id = ?",
            (user["id"], payload.article_id),
        )
        bookmarked = False
    else:
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO financial_news_bookmarks
            (id, user_id, article_id, title, url, source, category, published_at_ist, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"fnb-{user['id'][:8]}-{payload.article_id[:10]}",
                user["id"],
                payload.article_id,
                payload.title,
                payload.url,
                payload.source,
                payload.category,
                payload.published_at_ist,
                now,
            ),
        )
        bookmarked = True
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"bookmarked": bookmarked, "article_id": payload.article_id})
