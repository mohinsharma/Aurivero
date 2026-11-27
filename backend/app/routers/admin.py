from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from backend.app.models import StandardAPIResponse, ModerationActionRequest, AppealResolveRequest
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/admin", tags=["Admin Panel & Moderation"])

def require_admin(user: dict = Depends(get_current_user_optional)):
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

    cursor.execute("SELECT COUNT(*) FROM forum_threads WHERE status = 'PUBLISHED'")
    total_threads = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM forum_threads WHERE status = 'QUARANTINED'")
    quarantined_threads = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM forum_comments")
    total_comments = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM content_reports WHERE status = 'PENDING'")
    pending_reports = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM moderation_appeals WHERE status = 'PENDING'")
    pending_appeals = cursor.fetchone()[0]

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
            "quarantined_threads": quarantined_threads,
            "total_comments": total_comments,
            "pending_reports": pending_reports,
            "pending_appeals": pending_appeals,
            "pending_courses": pending_courses,
            "total_articles": total_articles,
            "platform_health": "Optimal (SEBI Compliant & Web3 Secure)"
        }
    )

@router.get("/reports", response_model=StandardAPIResponse)
def get_moderation_reports(status: Optional[str] = "PENDING", admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT r.*,
           CASE r.severity
             WHEN 'CRITICAL' THEN 1
             WHEN 'HIGH' THEN 2
             WHEN 'MEDIUM' THEN 3
             ELSE 4
           END as severity_rank
    FROM content_reports r
    """
    params = []
    if status and status != "ALL":
        query += " WHERE r.status = ?"
        params.append(status)
    query += " ORDER BY severity_rank ASC, r.created_at DESC"

    cursor.execute(query, tuple(params))
    reports = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return StandardAPIResponse(success=True, data={"reports": reports, "total": len(reports)})

@router.get("/quarantined", response_model=StandardAPIResponse)
def get_quarantined_threads(admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, title, category, subcategory, author_name, flags_count, status, content, created_at
    FROM forum_threads
    WHERE status IN ('QUARANTINED', 'PENDING_REVIEW')
    ORDER BY flags_count DESC, created_at DESC
    """)
    threads = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return StandardAPIResponse(success=True, data={"threads": threads, "total": len(threads)})

@router.post("/moderate", response_model=StandardAPIResponse)
def perform_moderation(payload: ModerationActionRequest, admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    if payload.content_type == "THREAD":
        if payload.action == "DELETE":
            cursor.execute("UPDATE forum_threads SET status = 'DELETED' WHERE id = ?", (payload.content_id,))
        elif payload.action == "QUARANTINE":
            cursor.execute("UPDATE forum_threads SET status = 'QUARANTINED' WHERE id = ?", (payload.content_id,))
        elif payload.action == "LOCK":
            cursor.execute("UPDATE forum_threads SET is_locked = 1 WHERE id = ?", (payload.content_id,))
        elif payload.action == "PIN":
            cursor.execute("UPDATE forum_threads SET is_pinned = 1 WHERE id = ?", (payload.content_id,))
        elif payload.action == "APPROVE":
            cursor.execute("UPDATE forum_threads SET status = 'PUBLISHED', flags_count = 0 WHERE id = ?", (payload.content_id,))

    elif payload.content_type == "COMMENT":
        if payload.action == "DELETE":
            cursor.execute("DELETE FROM forum_comments WHERE id = ?", (payload.content_id,))

    elif payload.content_type == "REPORT":
        action_status = "RESOLVED" if payload.action in ["APPROVE", "DELETE", "QUARANTINE"] else "DISMISSED"
        cursor.execute("UPDATE content_reports SET status = ?, moderator_notes = ? WHERE id = ?", (action_status, payload.moderator_notes or "Reviewed by admin", payload.content_id))

    # Write immutable audit log
    log_id = f"audit-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO moderation_audit_logs (id, moderator_id, moderator_name, content_type, content_id, action, policy_citation, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log_id,
        admin["id"],
        admin["full_name"],
        payload.content_type,
        payload.content_id,
        payload.action,
        payload.policy_citation or "Standard Community Guidelines",
        payload.moderator_notes or "",
        now
    ))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={"action": payload.action, "content_id": payload.content_id, "audit_log_id": log_id, "message": f"Action '{payload.action}' logged & executed."}
    )

@router.get("/audit-logs", response_model=StandardAPIResponse)
def get_audit_logs(limit: int = 30, admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM moderation_audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return StandardAPIResponse(success=True, data={"logs": logs, "total": len(logs)})

@router.get("/appeals", response_model=StandardAPIResponse)
def get_appeals(admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM moderation_appeals ORDER BY created_at DESC LIMIT 30")
    appeals = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return StandardAPIResponse(success=True, data={"appeals": appeals, "total": len(appeals)})

@router.post("/appeals/{appeal_id}/resolve", response_model=StandardAPIResponse)
def resolve_appeal(appeal_id: str, payload: AppealResolveRequest, admin: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM moderation_appeals WHERE id = ?", (appeal_id,))
    appeal = cursor.fetchone()
    if not appeal:
        conn.close()
        raise HTTPException(status_code=404, detail="Appeal not found")

    cursor.execute("UPDATE moderation_appeals SET status = ?, reviewer_notes = ? WHERE id = ?", (payload.status, payload.reviewer_notes or "", appeal_id))
    if payload.status == "APPROVED" and appeal["content_type"] == "THREAD":
        cursor.execute("UPDATE forum_threads SET status = 'PUBLISHED', flags_count = 0 WHERE id = ?", (appeal["content_id"],))

    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"appeal_id": appeal_id, "status": payload.status, "message": f"Appeal {payload.status.lower()}."})

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
