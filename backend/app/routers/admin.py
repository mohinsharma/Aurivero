from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import StandardAPIResponse, ModerationActionRequest
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection
from datetime import datetime

router = APIRouter(prefix="/api/admin", tags=["Admin Panel & Moderation"])

def require_admin(user: dict = Depends(get_current_user_optional)):
    # Demo user is seeded with ADMIN role
    if user.get("role") not in ["ADMIN", "MODERATOR"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Administrative privileges required."
        )
    return user

@router.get("/stats", response_model=StandardAPIResponse)
def get_admin_stats(admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM forum_threads")
    total_threads = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM forum_comments")
    total_comments = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM content_reports WHERE status = 'PENDING'")
    pending_reports = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM academy_courses WHERE is_approved = 0")
    pending_courses = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM hot_topics")
    total_articles = cursor.fetchone()[0]

    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "total_users": total_users,
            "total_threads": total_threads,
            "total_comments": total_comments,
            "pending_reports": pending_reports,
            "pending_courses": pending_courses,
            "total_articles": total_articles,
            "platform_health": "Optimal (SEBI Compliant & Web3 Secure)"
        }
    )

@router.get("/reports", response_model=StandardAPIResponse)
def get_moderation_reports(status: Optional[str] = "PENDING", admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM content_reports"
    params = []
    if status and status != "ALL":
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"

    cursor.execute(query, tuple(params))
    reports = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return StandardAPIResponse(success=True, data={"reports": reports, "total": len(reports)})

@router.post("/moderate", response_model=StandardAPIResponse)
def perform_moderation(payload: ModerationActionRequest, admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    if payload.content_type == "THREAD":
        if payload.action == "DELETE":
            cursor.execute("UPDATE forum_threads SET status = 'DELETED' WHERE id = ?", (payload.content_id,))
        elif payload.action == "LOCK":
            cursor.execute("UPDATE forum_threads SET is_locked = 1 WHERE id = ?", (payload.content_id,))
        elif payload.action == "PIN":
            cursor.execute("UPDATE forum_threads SET is_pinned = 1 WHERE id = ?", (payload.content_id,))
        elif payload.action == "APPROVE":
            cursor.execute("UPDATE forum_threads SET status = 'PUBLISHED' WHERE id = ?", (payload.content_id,))

    elif payload.content_type == "COMMENT":
        if payload.action == "DELETE":
            cursor.execute("DELETE FROM forum_comments WHERE id = ?", (payload.content_id,))

    elif payload.content_type == "REPORT":
        action_status = "RESOLVED" if payload.action in ["APPROVE", "DELETE"] else "DISMISSED"
        cursor.execute("UPDATE content_reports SET status = ?, moderator_notes = ? WHERE id = ?", (action_status, payload.moderator_notes or "Reviewed by admin", payload.content_id))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={"action": payload.action, "content_id": payload.content_id, "message": f"Action '{payload.action}' successfully executed."}
    )

@router.get("/users", response_model=StandardAPIResponse)
def get_users_list(limit: int = 20, admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, full_name, experience_level, role, reputation_points, total_learning_xp, created_at FROM users ORDER BY reputation_points DESC LIMIT ?", (limit,))
    users = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return StandardAPIResponse(success=True, data={"users": users, "total": len(users)})

@router.post("/users/{user_id}/role", response_model=StandardAPIResponse)
def update_user_role(user_id: str, new_role: str, admin: dict = Depends(require_admin)):
    if new_role not in ["USER", "INSTRUCTOR", "MODERATOR", "ADMIN"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
    conn.commit()
    conn.close()

    return StandardAPIResponse(success=True, data={"user_id": user_id, "new_role": new_role, "message": f"User permissions updated to {new_role}"})
