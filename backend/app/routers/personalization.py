from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from backend.app.models import StandardAPIResponse, WatchlistAddRequest
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/personalization", tags=["User Personalization & Notifications"])

@router.get("/hub", response_model=StandardAPIResponse)
def get_personal_hub(user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    # 1. User Profile & Reputation
    cursor.execute("SELECT id, email, full_name, experience_level, role, reputation_points, learning_streak_days, total_learning_xp, current_tier_level, bio FROM users WHERE id = ?", (user["id"],))
    u_row = cursor.fetchone()
    profile = dict(u_row) if u_row else user

    # 2. Saved News Articles
    cursor.execute("""
    SELECT h.id, h.title, h.summary, h.source, h.read_time_minutes, h.image_url, h.category, b.created_at as saved_at
    FROM news_bookmarks b
    JOIN hot_topics h ON b.article_id = h.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT 6
    """, (user["id"],))
    saved_articles = [dict(r) for r in cursor.fetchall()]

    # 3. Saved Forum Discussions
    cursor.execute("""
    SELECT t.id, t.title, t.category, t.subcategory, t.author_name, t.upvotes_count, t.replies_count, b.created_at as saved_at
    FROM thread_bookmarks b
    JOIN forum_threads t ON b.thread_id = t.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT 6
    """, (user["id"],))
    saved_threads = [dict(r) for r in cursor.fetchall()]

    # 4. Enrolled & In-Progress Courses
    cursor.execute("""
    SELECT c.id, c.title, c.track, c.level, c.lessons_count, c.thumbnail_url,
           COUNT(p.lesson_id) as completed_lessons
    FROM user_academy_progress p
    JOIN academy_courses c ON p.course_id = c.id
    WHERE p.user_id = ?
    GROUP BY c.id
    LIMIT 4
    """, (user["id"],))
    courses = []
    for cr in cursor.fetchall():
        cd = dict(cr)
        cd["progress_percent"] = round((cd["completed_lessons"] / max(1, cd["lessons_count"])) * 100)
        courses.append(cd)

    # 5. Custom Watchlists
    cursor.execute("SELECT * FROM user_watchlists WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
    watchlists = [dict(r) for r in cursor.fetchall()]

    # 6. Notifications
    cursor.execute("SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 8", (user["id"],))
    notifications = [dict(r) for r in cursor.fetchall()]

    # 7. Followed Topics
    cursor.execute("SELECT topic FROM user_followed_topics WHERE user_id = ?", (user["id"],))
    followed_topics = [r["topic"] for r in cursor.fetchall()]
    if not followed_topics:
        followed_topics = ["Bitcoin", "Layer 2", "Forex Macro", "Risk Management"]

    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "profile": profile,
            "saved_articles": saved_articles,
            "saved_threads": saved_threads,
            "active_courses": courses,
            "watchlists": watchlists,
            "notifications": notifications,
            "followed_topics": followed_topics
        }
    )

@router.get("/notifications", response_model=StandardAPIResponse)
def get_notifications(user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", (user["id"],))
    notifications = [dict(r) for r in cursor.fetchall()]
    unread_count = sum(1 for n in notifications if not n["is_read"])
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "notifications": notifications,
            "unread_count": unread_count
        }
    )

@router.post("/notifications/{notif_id}/read", response_model=StandardAPIResponse)
def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notif_id, user["id"]))
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"message": "Notification marked as read"})

@router.post("/watchlists", response_model=StandardAPIResponse)
def add_to_watchlist(payload: WatchlistAddRequest, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    wl_id = f"wl-{uuid.uuid4().hex[:8]}"

    cursor.execute("""
    INSERT OR REPLACE INTO user_watchlists (id, user_id, asset_type, symbol, name, target_price, alert_enabled, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        wl_id,
        user["id"],
        payload.asset_type,
        payload.symbol.upper(),
        payload.name,
        payload.target_price,
        1 if payload.alert_enabled else 0,
        payload.notes,
        now
    ))
    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={"symbol": payload.symbol.upper(), "message": f"{payload.symbol} added to personal watchlist!"}
    )

@router.delete("/watchlists/{symbol}", response_model=StandardAPIResponse)
def remove_from_watchlist(symbol: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_watchlists WHERE user_id = ? AND symbol = ?", (user["id"], symbol.upper()))
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"symbol": symbol.upper(), "message": "Asset removed from watchlist."})

@router.post("/follow-topic", response_model=StandardAPIResponse)
def toggle_follow_topic(topic: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM user_followed_topics WHERE user_id = ? AND topic = ?", (user["id"], topic))
    existing = cursor.fetchone()
    now = datetime.utcnow().isoformat()

    if existing:
        cursor.execute("DELETE FROM user_followed_topics WHERE user_id = ? AND topic = ?", (user["id"], topic))
        is_following = False
        msg = f"Unfollowed {topic}"
    else:
        cursor.execute("INSERT INTO user_followed_topics (id, user_id, topic, created_at) VALUES (?, ?, ?, ?)", (f"{user['id']}-{topic}", user["id"], topic, now))
        is_following = True
        msg = f"Now following {topic}! Articles and discussions will be prioritized in your feed."

    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"topic": topic, "is_following": is_following, "message": msg})
