from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import (
    StandardAPIResponse,
    ForumThreadCreate,
    ForumCommentCreate,
    ForumReactionRequest,
    ForumReportRequest
)
from backend.app.routers.auth_deps import get_current_user_optional, get_current_user_required
from backend.app.database import get_connection
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/forums", tags=["Community Forums"])

FORUM_TAXONOMY = {
    "Blockchain": [
        "Smart contracts",
        "Layer 1 and Layer 2",
        "Web3 development",
        "DeFi",
        "Blockchain security"
    ],
    "Cryptocurrency": [
        "Bitcoin",
        "Ethereum",
        "Altcoins",
        "Crypto market analysis",
        "Wallets and exchanges"
    ],
    "Forex": [
        "Currency pairs",
        "Technical analysis",
        "Fundamental analysis",
        "Trading strategies",
        "Risk management"
    ]
}

@router.get("/categories", response_model=StandardAPIResponse)
def get_categories():
    conn = get_connection()
    cursor = conn.cursor()

    result = []
    for main_cat, subs in FORUM_TAXONOMY.items():
        cursor.execute("SELECT COUNT(*) FROM forum_threads WHERE category = ? AND status = 'PUBLISHED'", (main_cat,))
        main_count = cursor.fetchone()[0]

        sub_list = []
        for s in subs:
            cursor.execute("SELECT COUNT(*) FROM forum_threads WHERE category = ? AND subcategory = ? AND status = 'PUBLISHED'", (main_cat, s))
            sub_count = cursor.fetchone()[0]
            sub_list.append({"name": s, "thread_count": sub_count})

        result.append({
            "name": main_cat,
            "total_threads": main_count,
            "subcategories": sub_list
        })

    conn.close()
    return StandardAPIResponse(success=True, data={"categories": result})

@router.get("/threads", response_model=StandardAPIResponse)
def get_threads(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "latest",  # latest, popular, trending
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user_optional)
):
    conn = get_connection()
    cursor = conn.cursor()

    # User upvoted threads
    cursor.execute("SELECT thread_id FROM thread_reactions WHERE user_id = ? AND thread_id IS NOT NULL", (user["id"],))
    upvoted_thread_ids = {r["thread_id"] for r in cursor.fetchall()}

    # User bookmarked threads
    cursor.execute("SELECT thread_id FROM thread_bookmarks WHERE user_id = ?", (user["id"],))
    bookmarked_ids = {r["thread_id"] for r in cursor.fetchall()}

    query = "SELECT * FROM forum_threads WHERE status = 'PUBLISHED'"
    params = []

    if category and category != "All":
        query += " AND category = ?"
        params.append(category)

    if subcategory and subcategory != "All":
        query += " AND subcategory = ?"
        params.append(subcategory)

    if search:
        query += " AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    # Sorting
    if sort_by == "popular":
        query += " ORDER BY is_pinned DESC, upvotes_count DESC, created_at DESC"
    elif sort_by == "trending":
        query += " ORDER BY is_pinned DESC, (upvotes_count + replies_count * 2) DESC, created_at DESC"
    else:  # latest
        query += " ORDER BY is_pinned DESC, created_at DESC"

    query += " LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()

    threads = []
    for r in rows:
        d = dict(r)
        d["is_pinned"] = bool(d["is_pinned"])
        d["is_locked"] = bool(d["is_locked"])
        d["has_upvoted"] = d["id"] in upvoted_thread_ids
        d["is_bookmarked"] = d["id"] in bookmarked_ids
        d["tags_list"] = [t.strip() for t in d["tags"].split(",") if t.strip()]
        threads.append(d)

    # Count
    count_query = "SELECT COUNT(*) FROM forum_threads WHERE status = 'PUBLISHED'"
    count_params = []
    if category and category != "All":
        count_query += " AND category = ?"
        count_params.append(category)
    if subcategory and subcategory != "All":
        count_query += " AND subcategory = ?"
        count_params.append(subcategory)
    if search:
        count_query += " AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)"
        count_params.extend([term, term, term])

    cursor.execute(count_query, tuple(count_params))
    total = cursor.fetchone()[0]

    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "threads": threads,
            "total": total,
            "has_more": (offset + len(threads)) < total
        }
    )

@router.get("/threads/{thread_id}", response_model=StandardAPIResponse)
def get_thread_detail(thread_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("UPDATE forum_threads SET views_count = views_count + 1 WHERE id = ?", (thread_id,))
    conn.commit()

    cursor.execute("SELECT * FROM forum_threads WHERE id = ?", (thread_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Thread not found")

    thread = dict(row)
    thread["is_pinned"] = bool(thread["is_pinned"])
    thread["is_locked"] = bool(thread["is_locked"])
    thread["tags_list"] = [t.strip() for t in thread["tags"].split(",") if t.strip()]

    # Reactions & Bookmarks
    cursor.execute("SELECT 1 FROM thread_reactions WHERE user_id = ? AND thread_id = ?", (user["id"], thread_id))
    thread["has_upvoted"] = cursor.fetchone() is not None

    cursor.execute("SELECT 1 FROM thread_bookmarks WHERE user_id = ? AND thread_id = ?", (user["id"], thread_id))
    thread["is_bookmarked"] = cursor.fetchone() is not None

    # Author reputation
    cursor.execute("SELECT reputation_points, role FROM users WHERE id = ?", (thread["user_id"],))
    author_info = cursor.fetchone()
    if author_info:
        thread["author_reputation"] = author_info["reputation_points"]
        thread["author_role"] = author_info["role"]

    # Comments & nested threaded replies
    cursor.execute("""
    SELECT c.*, u.reputation_points as author_reputation, u.role as author_role
    FROM forum_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.thread_id = ?
    ORDER BY c.created_at ASC
    """, (thread_id,))
    comment_rows = cursor.fetchall()

    cursor.execute("SELECT comment_id FROM thread_reactions WHERE user_id = ? AND comment_id IS NOT NULL", (user["id"],))
    upvoted_comment_ids = {r["comment_id"] for r in cursor.fetchall()}

    all_comments = []
    for c in comment_rows:
        cd = dict(c)
        cd["has_upvoted"] = cd["id"] in upvoted_comment_ids
        cd["is_solution"] = bool(cd["is_solution"])
        all_comments.append(cd)

    # Nest replies under parent comments
    top_level = []
    replies_map = {}
    for c in all_comments:
        p_id = c.get("parent_id")
        if p_id:
            replies_map.setdefault(p_id, []).append(c)
        else:
            top_level.append(c)

    for c in top_level:
        c["replies"] = replies_map.get(c["id"], [])

    thread["comments"] = top_level
    thread["comments_count"] = len(all_comments)

    conn.close()
    return StandardAPIResponse(success=True, data=thread)

@router.post("/threads", response_model=StandardAPIResponse)
def create_thread(payload: ForumThreadCreate, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    thread_id = f"thread-{uuid.uuid4().hex[:8]}"

    cursor.execute("""
    INSERT INTO forum_threads (id, user_id, author_name, author_role, category, subcategory, title, content, tags, upvotes_count, replies_count, views_count, is_pinned, is_locked, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1, 0, 0, 'PUBLISHED', ?, ?)
    """, (
        thread_id,
        user["id"],
        user["full_name"],
        user.get("role", "Learner"),
        payload.category,
        payload.subcategory,
        payload.title,
        payload.content,
        payload.tags,
        now,
        now
    ))

    # Creator automatically upvotes their own thread
    cursor.execute("""
    INSERT OR IGNORE INTO thread_reactions (id, user_id, thread_id, comment_id, reaction_type, created_at)
    VALUES (?, ?, ?, NULL, 'UPVOTE', ?)
    """, (f"{user['id']}-{thread_id}", user["id"], thread_id, now))

    # Reward user +15 reputation for initiating high quality discussion
    cursor.execute("UPDATE users SET reputation_points = reputation_points + 15 WHERE id = ?", (user["id"],))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "thread_id": thread_id,
            "message": "Discussion thread published to community! +15 Reputation awarded."
        }
    )

@router.post("/comments", response_model=StandardAPIResponse)
def add_comment(payload: ForumCommentCreate, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, user_id, is_locked, title FROM forum_threads WHERE id = ?", (payload.thread_id,))
    thread = cursor.fetchone()
    if not thread:
        conn.close()
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread["is_locked"]:
        conn.close()
        raise HTTPException(status_code=400, detail="This thread is locked by moderators and cannot receive new replies.")

    now = datetime.utcnow().isoformat()
    comment_id = f"comm-{uuid.uuid4().hex[:8]}"

    cursor.execute("""
    INSERT INTO forum_comments (id, thread_id, parent_id, user_id, author_name, author_role, content, upvotes_count, is_solution, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
    """, (
        comment_id,
        payload.thread_id,
        payload.parent_id,
        user["id"],
        user["full_name"],
        user.get("role", "Learner"),
        payload.content,
        now
    ))

    cursor.execute("UPDATE forum_threads SET replies_count = replies_count + 1, updated_at = ? WHERE id = ?", (now, payload.thread_id))
    cursor.execute("UPDATE users SET reputation_points = reputation_points + 5 WHERE id = ?", (user["id"],))

    # Notify thread author if someone else replied
    if thread["user_id"] != user["id"]:
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO user_notifications (id, user_id, title, message, category, action_url, is_read, created_at)
        VALUES (?, ?, ?, ?, 'COMMUNITY', ?, 0, ?)
        """, (
            notif_id,
            thread["user_id"],
            f"{user['full_name']} replied to your thread",
            f"New reply on: {thread['title'][:50]}...",
            f"/forums?thread={payload.thread_id}",
            now
        ))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "comment_id": comment_id,
            "message": "Reply posted successfully! +5 Reputation awarded."
        }
    )

@router.post("/react", response_model=StandardAPIResponse)
def react_to_content(payload: ForumReactionRequest, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    if payload.thread_id:
        cursor.execute("SELECT id FROM thread_reactions WHERE user_id = ? AND thread_id = ?", (user["id"], payload.thread_id))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("DELETE FROM thread_reactions WHERE user_id = ? AND thread_id = ?", (user["id"], payload.thread_id))
            cursor.execute("UPDATE forum_threads SET upvotes_count = MAX(0, upvotes_count - 1) WHERE id = ?", (payload.thread_id,))
            has_reacted = False
        else:
            cursor.execute("""
            INSERT INTO thread_reactions (id, user_id, thread_id, comment_id, reaction_type, created_at)
            VALUES (?, ?, ?, NULL, ?, ?)
            """, (f"{user['id']}-th-{payload.thread_id}", user["id"], payload.thread_id, payload.reaction_type, now))
            cursor.execute("UPDATE forum_threads SET upvotes_count = upvotes_count + 1 WHERE id = ?", (payload.thread_id,))
            has_reacted = True

    elif payload.comment_id:
        cursor.execute("SELECT id FROM thread_reactions WHERE user_id = ? AND comment_id = ?", (user["id"], payload.comment_id))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("DELETE FROM thread_reactions WHERE user_id = ? AND comment_id = ?", (user["id"], payload.comment_id))
            cursor.execute("UPDATE forum_comments SET upvotes_count = MAX(0, upvotes_count - 1) WHERE id = ?", (payload.comment_id,))
            has_reacted = False
        else:
            cursor.execute("""
            INSERT INTO thread_reactions (id, user_id, thread_id, comment_id, reaction_type, created_at)
            VALUES (?, ?, NULL, ?, ?, ?)
            """, (f"{user['id']}-cm-{payload.comment_id}", user["id"], payload.comment_id, payload.reaction_type, now))
            cursor.execute("UPDATE forum_comments SET upvotes_count = upvotes_count + 1 WHERE id = ?", (payload.comment_id,))
            has_reacted = True

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={"has_reacted": has_reacted}
    )

@router.post("/bookmark", response_model=StandardAPIResponse)
def toggle_thread_bookmark(thread_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM thread_bookmarks WHERE user_id = ? AND thread_id = ?", (user["id"], thread_id))
    existing = cursor.fetchone()
    now = datetime.utcnow().isoformat()

    if existing:
        cursor.execute("DELETE FROM thread_bookmarks WHERE user_id = ? AND thread_id = ?", (user["id"], thread_id))
        is_bookmarked = False
        message = "Thread removed from saved discussions."
    else:
        cursor.execute("INSERT INTO thread_bookmarks (id, user_id, thread_id, created_at) VALUES (?, ?, ?, ?)", (f"{user['id']}-{thread_id}", user["id"], thread_id, now))
        is_bookmarked = True
        message = "Thread saved to your personal discussions list."

    conn.commit()
    conn.close()

    return StandardAPIResponse(success=True, data={"is_bookmarked": is_bookmarked, "message": message})

@router.post("/report", response_model=StandardAPIResponse)
def report_content(payload: ForumReportRequest, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    report_id = f"rep-{uuid.uuid4().hex[:8]}"

    cursor.execute("""
    INSERT INTO content_reports (id, reporter_id, content_type, content_id, reason, details, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    """, (
        report_id,
        user["id"],
        payload.content_type,
        payload.content_id,
        payload.reason,
        payload.details,
        now
    ))
    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "report_id": report_id,
            "message": "Thank you for keeping our community safe. Our moderation team has been notified."
        }
    )
