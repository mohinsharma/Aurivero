from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import StandardAPIResponse, BookmarkToggleRequest
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/hot-topics", tags=["Hot Topics & News"])

CATEGORIES = [
    "All",
    "Cryptocurrency",
    "Blockchain",
    "Bitcoin & Ethereum",
    "Altcoins",
    "DeFi",
    "Web3",
    "NFTs",
    "Forex",
    "Global Markets",
    "Trading & Regulations"
]

@router.get("/categories", response_model=StandardAPIResponse)
def get_categories():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category, COUNT(*) as count FROM hot_topics GROUP BY category")
    counts = {row["category"]: row["count"] for row in cursor.fetchall()}
    conn.close()

    result = []
    for cat in CATEGORIES:
        result.append({
            "name": cat,
            "count": sum(counts.values()) if cat == "All" else counts.get(cat, 0)
        })

    return StandardAPIResponse(success=True, data={"categories": result})

@router.get("", response_model=StandardAPIResponse)
def get_articles(
    category: Optional[str] = "All",
    search: Optional[str] = None,
    trending: Optional[bool] = None,
    breaking: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user_optional)
):
    conn = get_connection()
    cursor = conn.cursor()

    # Get bookmarks for this user
    cursor.execute("SELECT article_id FROM news_bookmarks WHERE user_id = ?", (user["id"],))
    bookmarked_ids = {r["article_id"] for r in cursor.fetchall()}

    query = "SELECT * FROM hot_topics WHERE 1=1"
    params = []

    if category and category != "All":
        query += " AND (category = ? OR subcategory = ?)"
        params.extend([category, category])

    if search:
        query += " AND (title LIKE ? OR summary LIKE ? OR related_assets LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    if trending:
        query += " AND is_trending = 1"

    if breaking:
        query += " AND is_breaking = 1"

    query += " ORDER BY is_breaking DESC, is_trending DESC, published_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()

    articles = []
    for r in rows:
        d = dict(r)
        d["is_breaking"] = bool(d["is_breaking"])
        d["is_trending"] = bool(d["is_trending"])
        d["is_bookmarked"] = d["id"] in bookmarked_ids
        articles.append(d)

    # Total count
    count_query = "SELECT COUNT(*) FROM hot_topics WHERE 1=1"
    count_params = []
    if category and category != "All":
        count_query += " AND (category = ? OR subcategory = ?)"
        count_params.extend([category, category])
    if search:
        count_query += " AND (title LIKE ? OR summary LIKE ? OR related_assets LIKE ?)"
        count_params.extend([term, term, term])
    cursor.execute(count_query, tuple(count_params))
    total = cursor.fetchone()[0]

    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "articles": articles,
            "total": total,
            "has_more": (offset + len(articles)) < total
        }
    )

@router.get("/{article_id}", response_model=StandardAPIResponse)
def get_article_detail(article_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    # Increment view count
    cursor.execute("UPDATE hot_topics SET views_count = views_count + 1 WHERE id = ?", (article_id,))
    conn.commit()

    cursor.execute("SELECT * FROM hot_topics WHERE id = ?", (article_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Article not found")

    article = dict(row)
    article["is_breaking"] = bool(article["is_breaking"])
    article["is_trending"] = bool(article["is_trending"])

    # Check bookmark
    cursor.execute("SELECT 1 FROM news_bookmarks WHERE user_id = ? AND article_id = ?", (user["id"], article_id))
    article["is_bookmarked"] = cursor.fetchone() is not None

    # Related articles
    cursor.execute("SELECT id, title, source, read_time_minutes, image_url, category FROM hot_topics WHERE id != ? AND (category = ? OR related_assets = ?) LIMIT 3", (article_id, article["category"], article.get("related_assets", "")))
    article["related_articles"] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return StandardAPIResponse(success=True, data=article)

@router.post("/{article_id}/bookmark", response_model=StandardAPIResponse)
def toggle_bookmark(article_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM news_bookmarks WHERE user_id = ? AND article_id = ?", (user["id"], article_id))
    existing = cursor.fetchone()

    now = datetime.utcnow().isoformat()
    if existing:
        cursor.execute("DELETE FROM news_bookmarks WHERE user_id = ? AND article_id = ?", (user["id"], article_id))
        cursor.execute("UPDATE hot_topics SET bookmarks_count = MAX(0, bookmarks_count - 1) WHERE id = ?", (article_id,))
        is_bookmarked = False
        message = "Article removed from bookmarks."
    else:
        cursor.execute("INSERT INTO news_bookmarks (id, user_id, article_id, created_at) VALUES (?, ?, ?, ?)", (f"{user['id']}-{article_id}", user["id"], article_id, now))
        cursor.execute("UPDATE hot_topics SET bookmarks_count = bookmarks_count + 1 WHERE id = ?", (article_id,))
        is_bookmarked = True
        message = "Article saved to your personal reading list!"

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "article_id": article_id,
            "is_bookmarked": is_bookmarked,
            "message": message
        }
    )
