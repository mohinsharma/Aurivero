from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import (
    StandardAPIResponse,
    ForumThreadCreate,
    ForumPrecheckRequest,
    ForumAcceptAnswerRequest,
    ForumCommentCreate,
    ForumReactionRequest,
    ForumReportRequest,
    ForumAppealCreate,
)
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection
from datetime import datetime
import re
import uuid

router = APIRouter(prefix="/api/forums", tags=["Community Forums"])

# 6 Launch Starter Spaces Taxonomy
FORUM_TAXONOMY = {
    "Money Basics & Personal Finance": [
        "Budgeting & Cash Flow",
        "Emergency Funds & Insurance",
        "Debt & Credit Management",
        "Tax Planning (India/Global)",
    ],
    "Indian Equities & Mutual Funds": [
        "Index Funds & Mutual Funds",
        "Fundamental Analysis",
        "Portfolio Construction",
        "Beginner Questions",
    ],
    "Blockchain": [
        "Smart contracts",
        "Layer 1 and Layer 2",
        "Web3 development",
        "DeFi",
        "Blockchain security",
    ],
    "Cryptocurrency": [
        "Bitcoin",
        "Ethereum",
        "Altcoins",
        "Crypto market analysis",
        "Wallets and exchanges",
    ],
    "Forex": [
        "Currency pairs",
        "Technical analysis",
        "Fundamental analysis",
        "Trading strategies",
        "Risk management",
    ],
    "Scam Alerts & Fraud Watch": [
        "Fake Tipsters & Guaranteed Returns",
        "Phishing & Wallet Drainers",
        "Impersonation Alerts",
        "Regulatory Warnings (SEBI/RBI)",
    ],
}

POST_TYPE_TO_INTENT = {
    "QUESTION": "Question / Help",
    "EXPERIENCE": "Experience Sharing",
    "SCAM_ALERT": "Scam / Fraud Alert",
    "PRODUCT_REVIEW": "Product Review",
    "POLL": "Poll",
    "EDUCATIONAL": "Educational",
    "FEEDBACK": "Product Feedback",
    "DISCUSSION": "Discussion",
}

def scan_content_safety(title: str, content: str) -> Dict[str, Any]:
    """
    Pre-post Trust & Safety scanner.
    Detects PII (account/card numbers, PAN, OTPs, emails, seed phrases),
    guaranteed-return scams, and prohibited referral/Telegram links.
    """
    combined = f"{title}\n{content}"
    lowered = combined.lower()
    blockers: List[Dict[str, str]] = []
    warnings: List[Dict[str, str]] = []

    # 1. PII & Secret Detection
    if re.search(r"\b\d{10,16}\b", combined):
        blockers.append({
            "code": "PII_ACCOUNT_NUMBER",
            "message": "Possible bank account, card, or phone number (10–16 digits) detected. Remove sensitive numbers before posting."
        })
    if re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", combined):
        blockers.append({
            "code": "PII_PAN_DETECTED",
            "message": "Indian PAN identifier pattern detected. Never share government IDs publicly."
        })
    if re.search(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b", combined):
        blockers.append({
            "code": "PII_EMAIL_DETECTED",
            "message": "Email address detected. Keep contact details private to prevent phishing."
        })
    if re.search(r"\b(otp|seed phrase|recovery phrase|private key|pin)\b", lowered) and re.search(r"\b\d{4,8}\b", combined):
        blockers.append({
            "code": "SECRET_OTP_OR_KEY",
            "message": "Possible OTP, PIN, or secret recovery code detected. Never post authentication secrets."
        })

    # 2. Scam / Guaranteed Returns Detection
    scam_phrases = [
        "guaranteed profit", "guaranteed return", "guaranteed returns",
        "100% safe profit", "risk-free return", "double your money",
        "dm for signals", "whatsapp me for tips", "vip signal group"
    ]
    for phrase in scam_phrases:
        if phrase in lowered:
            blockers.append({
                "code": "PROHIBITED_GUARANTEE_OR_TIP",
                "message": f"Prohibited claim detected ('{phrase}'). MINDMARK prohibits guaranteed-return promises and paid signal solicitation."
            })
            break

    # 3. Prohibited Referral / Unverified External Shortlinks
    spam_link_patterns = ["t.me/", "wa.me/", "bit.ly/", "tinyurl.com/", "?ref=", "referral="]
    for pat in spam_link_patterns:
        if pat in lowered:
            blockers.append({
                "code": "PROHIBITED_REFERRAL_OR_LINK",
                "message": f"Prohibited external invite or referral link ('{pat}') detected. Referral spam and unverified chat invites are not allowed."
            })
            break

    # 4. Soft Advisory / Personal Advice Nudge (Non-blocking warning)
    advice_phrases = ["which stock should i buy", "what coin should i buy", "tell me what to buy", "should i invest all my"]
    for phrase in advice_phrases:
        if phrase in lowered:
            warnings.append({
                "code": "PERSONAL_ADVICE_NUDGE",
                "message": "Peers can share frameworks and experiences, not personalized buy/sell calls. Consider asking about risk criteria instead."
            })
            break

    return {
        "safe": len(blockers) == 0,
        "blockers": blockers,
        "warnings": warnings,
    }


def mask_thread_author(d: Dict[str, Any]) -> Dict[str, Any]:
    if d.get("is_anonymous"):
        d["author_name"] = "Anonymous Member"
        d["author_role"] = "Pseudonymous"
        d["user_id"] = "anonymous"
    return d


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


@router.post("/precheck", response_model=StandardAPIResponse)
def precheck_thread(payload: ForumPrecheckRequest):
    """Run live pre-flight PII/scam checks and duplicate-question detection."""
    safety = scan_content_safety(payload.title, payload.content)

    # Duplicate question search using significant keywords from title
    related_threads = []
    words = [w for w in re.findall(r"[a-zA-Z0-9]{4,}", payload.title.lower()) if w not in {"what", "when", "where", "which", "about", "should", "with", "from", "have", "this", "that", "your"}]
    if words:
        conn = get_connection()
        cursor = conn.cursor()
        clauses = " OR ".join(["LOWER(title) LIKE ?" for _ in words[:4]])
        params = [f"%{w}%" for w in words[:4]]
        cursor.execute(f"""
        SELECT id, title, category, replies_count, has_accepted_answer, upvotes_count
        FROM forum_threads
        WHERE status = 'PUBLISHED' AND ({clauses})
        ORDER BY has_accepted_answer DESC, upvotes_count DESC
        LIMIT 3
        """, tuple(params))
        related_threads = [dict(r) for r in cursor.fetchall()]
        conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "safe": safety["safe"],
            "blockers": safety["blockers"],
            "warnings": safety["warnings"],
            "related_threads": related_threads,
        }
    )


@router.get("/threads", response_model=StandardAPIResponse)
def get_threads(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    intent: Optional[str] = None,
    region: Optional[str] = None,
    unanswered: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "latest",
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user_optional)
):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT thread_id FROM thread_reactions WHERE user_id = ? AND thread_id IS NOT NULL", (user["id"],))
    upvoted_thread_ids = {r["thread_id"] for r in cursor.fetchall()}

    cursor.execute("SELECT thread_id FROM thread_bookmarks WHERE user_id = ?", (user["id"],))
    bookmarked_ids = {r["thread_id"] for r in cursor.fetchall()}

    where_clause = "WHERE status = 'PUBLISHED'"
    params: List[Any] = []

    if category and category != "All":
        where_clause += " AND category = ?"
        params.append(category)

    if subcategory and subcategory != "All":
        where_clause += " AND subcategory = ?"
        params.append(subcategory)

    if intent and intent != "All":
        where_clause += " AND intent_badge = ?"
        params.append(intent)

    if region and region != "All":
        where_clause += " AND region = ?"
        params.append(region)

    if unanswered:
        where_clause += " AND has_accepted_answer = 0"

    if search:
        where_clause += " AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    order_clause = "ORDER BY is_pinned DESC, created_at DESC"
    if sort_by == "popular":
        order_clause = "ORDER BY is_pinned DESC, upvotes_count DESC, created_at DESC"
    elif sort_by == "trending":
        order_clause = "ORDER BY is_pinned DESC, (upvotes_count + replies_count * 2) DESC, created_at DESC"

    query = f"SELECT * FROM forum_threads {where_clause} {order_clause} LIMIT ? OFFSET ?"
    cursor.execute(query, tuple(params + [limit, offset]))
    rows = cursor.fetchall()

    threads = []
    for r in rows:
        d = dict(r)
        d["is_pinned"] = bool(d["is_pinned"])
        d["is_locked"] = bool(d["is_locked"])
        d["is_anonymous"] = bool(d.get("is_anonymous", 0))
        d["has_accepted_answer"] = bool(d.get("has_accepted_answer", 0))
        d["has_upvoted"] = d["id"] in upvoted_thread_ids
        d["is_bookmarked"] = d["id"] in bookmarked_ids
        d["tags_list"] = [t.strip() for t in d["tags"].split(",") if t.strip()]
        threads.append(mask_thread_author(d))

    cursor.execute(f"SELECT COUNT(*) FROM forum_threads {where_clause}", tuple(params))
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
    thread["is_anonymous"] = bool(thread.get("is_anonymous", 0))
    thread["has_accepted_answer"] = bool(thread.get("has_accepted_answer", 0))
    thread["tags_list"] = [t.strip() for t in thread["tags"].split(",") if t.strip()]
    thread["is_owner"] = (thread["user_id"] == user["id"]) or (user.get("role") == "ADMIN")

    cursor.execute("SELECT 1 FROM thread_reactions WHERE user_id = ? AND thread_id = ?", (user["id"], thread_id))
    thread["has_upvoted"] = cursor.fetchone() is not None

    cursor.execute("SELECT 1 FROM thread_bookmarks WHERE user_id = ? AND thread_id = ?", (user["id"], thread_id))
    thread["is_bookmarked"] = cursor.fetchone() is not None

    if not thread["is_anonymous"]:
        cursor.execute("SELECT reputation_points, role FROM users WHERE id = ?", (thread["user_id"],))
        author_info = cursor.fetchone()
        if author_info:
            thread["author_reputation"] = author_info["reputation_points"]
            thread["author_role"] = author_info["role"]
    else:
        thread["author_reputation"] = None
        mask_thread_author(thread)

    cursor.execute("""
    SELECT c.*, u.reputation_points as author_reputation, u.role as author_role
    FROM forum_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.thread_id = ?
    ORDER BY c.is_solution DESC, c.created_at ASC
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

    top_level = []
    replies_map: Dict[str, List[Dict[str, Any]]] = {}
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
    # Enforce pre-post safety check on server
    safety = scan_content_safety(payload.title, payload.content)
    if not safety["safe"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "SAFETY_POLICY_VIOLATION",
                "message": safety["blockers"][0]["message"],
                "blockers": safety["blockers"],
            }
        )

    # Restrict anonymous posting to sensitive spaces only
    allowed_anon_categories = {"Money Basics & Personal Finance", "Trading Psychology & Risk Management", "Scam Alerts & Fraud Watch"}
    is_anon = 1 if (payload.is_anonymous and payload.category in allowed_anon_categories) else 0

    intent_badge = payload.intent_badge or POST_TYPE_TO_INTENT.get(payload.post_type, "Discussion")
    user_role = user.get("role", "Learner")
    if user_role == "ADMIN":
        origin_label = "Official MINDMARK"
    elif payload.post_type == "EDUCATIONAL":
        origin_label = "Educational Content"
    elif payload.post_type == "EXPERIENCE" and user.get("reputation_points", 0) >= 300:
        origin_label = "Verified Experience"
    else:
        origin_label = "User Opinion"

    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    thread_id = f"thread-{uuid.uuid4().hex[:8]}"

    cursor.execute("""
    INSERT INTO forum_threads (
        id, user_id, author_name, author_role, category, subcategory,
        post_type, intent_badge, region, origin_label, is_anonymous,
        has_accepted_answer, accepted_comment_id, related_course_id, disclosure_text,
        flags_count, title, content, tags, upvotes_count, replies_count, views_count,
        is_pinned, is_locked, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, 0, ?, ?, ?, 1, 0, 1, 0, 0, 'PUBLISHED', ?, ?)
    """, (
        thread_id,
        user["id"],
        user["full_name"],
        user_role,
        payload.category,
        payload.subcategory,
        payload.post_type,
        intent_badge,
        payload.region,
        origin_label,
        is_anon,
        payload.related_course_id,
        payload.disclosure_text,
        payload.title,
        payload.content,
        payload.tags,
        now,
        now
    ))

    cursor.execute("""
    INSERT OR IGNORE INTO thread_reactions (id, user_id, thread_id, comment_id, reaction_type, created_at)
    VALUES (?, ?, ?, NULL, 'UPVOTE', ?)
    """, (f"{user['id']}-{thread_id}", user["id"], thread_id, now))

    # Anonymous posts do not award public reputation to prevent anonymous karma farming
    rep_award = 0 if is_anon else 15
    if rep_award > 0:
        cursor.execute("UPDATE users SET reputation_points = reputation_points + ? WHERE id = ?", (rep_award, user["id"]))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "thread_id": thread_id,
            "reputation_awarded": rep_award,
            "message": "Discussion published!" if is_anon else "Discussion thread published! +15 Reputation awarded."
        }
    )


@router.post("/threads/{thread_id}/accept-answer", response_model=StandardAPIResponse)
def accept_answer(thread_id: str, payload: ForumAcceptAnswerRequest, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, user_id, accepted_comment_id FROM forum_threads WHERE id = ?", (thread_id,))
    thread = cursor.fetchone()
    if not thread:
        conn.close()
        raise HTTPException(status_code=404, detail="Thread not found")

    if thread["user_id"] != user["id"] and user.get("role") != "ADMIN":
        conn.close()
        raise HTTPException(status_code=403, detail="Only the thread author can mark an Accepted Solution.")

    cursor.execute("SELECT id, user_id FROM forum_comments WHERE id = ? AND thread_id = ?", (payload.comment_id, thread_id))
    comment = cursor.fetchone()
    if not comment:
        conn.close()
        raise HTTPException(status_code=404, detail="Comment not found in this thread")

    # Reset previous accepted solution if changing
    cursor.execute("UPDATE forum_comments SET is_solution = 0 WHERE thread_id = ?", (thread_id,))
    cursor.execute("UPDATE forum_comments SET is_solution = 1 WHERE id = ?", (payload.comment_id,))
    cursor.execute("UPDATE forum_threads SET has_accepted_answer = 1, accepted_comment_id = ? WHERE id = ?", (payload.comment_id, thread_id))

    # Award +25 Helpful Reputation to answer author (unless self-accepting)
    rep_awarded = 0
    if comment["user_id"] != thread["user_id"] or user.get("role") == "ADMIN":
        rep_awarded = 25
        cursor.execute("UPDATE users SET reputation_points = reputation_points + 25 WHERE id = ?", (comment["user_id"],))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "thread_id": thread_id,
            "accepted_comment_id": payload.comment_id,
            "reputation_awarded": rep_awarded,
            "message": "Marked as Accepted Solution! +25 Reputation awarded to the author."
        }
    )


@router.post("/comments", response_model=StandardAPIResponse)
def add_comment(payload: ForumCommentCreate, user: dict = Depends(get_current_user_optional)):
    safety = scan_content_safety("", payload.content)
    if not safety["safe"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "SAFETY_POLICY_VIOLATION",
                "message": safety["blockers"][0]["message"],
                "blockers": safety["blockers"],
            }
        )

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
    has_reacted = False

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

    return StandardAPIResponse(success=True, data={"has_reacted": has_reacted})


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

    lower_reason = payload.reason.lower()
    if any(k in lower_reason for k in ["scam", "phishing", "impersonation"]):
        severity = "CRITICAL"
    elif any(k in lower_reason for k in ["pii", "personal data", "harassment", "advisory", "tips"]):
        severity = "HIGH"
    else:
        severity = "MEDIUM"

    cursor.execute("""
    INSERT INTO content_reports (id, reporter_id, content_type, content_id, reason, severity, details, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    """, (
        report_id,
        user["id"],
        payload.content_type,
        payload.content_id,
        payload.reason,
        severity,
        payload.details,
        now
    ))

    quarantined = False
    if payload.content_type == "THREAD":
        cursor.execute("UPDATE forum_threads SET flags_count = COALESCE(flags_count, 0) + 1 WHERE id = ?", (payload.content_id,))
        cursor.execute("SELECT flags_count FROM forum_threads WHERE id = ?", (payload.content_id,))
        row = cursor.fetchone()
        if row and row["flags_count"] >= 3:
            cursor.execute("UPDATE forum_threads SET status = 'QUARANTINED' WHERE id = ?", (payload.content_id,))
            quarantined = True

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "report_id": report_id,
            "severity": severity,
            "quarantined": quarantined,
            "message": "Report logged. Post auto-quarantined for safety review." if quarantined else f"Thank you for keeping our community safe (Ref #{report_id})."
        }
    )


@router.post("/appeal", response_model=StandardAPIResponse)
def submit_appeal(payload: ForumAppealCreate, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    appeal_id = f"app-{uuid.uuid4().hex[:8]}"

    cursor.execute("""
    INSERT INTO moderation_appeals (id, user_id, content_type, content_id, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
    """, (appeal_id, user["id"], payload.content_type, payload.content_id, payload.reason, now))
    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={"appeal_id": appeal_id, "message": "Appeal submitted for independent moderator review within 48 hours."}
    )
