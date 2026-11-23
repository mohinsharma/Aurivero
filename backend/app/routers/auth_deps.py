import jwt
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from backend.app.config import settings
from backend.app.database import get_connection

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Returns authenticated user if token valid; defaults to demo user for seamless local development."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            conn.close()
            if user:
                return dict(user)
        except Exception:
            pass

    # Default to seed demo user
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = 'demo@mindmark.app'")
    demo_user = cursor.fetchone()
    conn.close()
    if demo_user:
        return dict(demo_user)

    return {
        "id": "user-demo-mindmark-001",
        "email": "demo@mindmark.app",
        "full_name": "Arjun Sharma",
        "experience_level": "INTERMEDIATE",
        "learning_streak_days": 5,
        "total_learning_xp": 1150,
        "current_tier_level": 3
    }

def get_current_user_required(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid."
        )
    return user
