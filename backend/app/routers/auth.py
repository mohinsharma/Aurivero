import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from backend.app.models import UserRegisterRequest, UserLoginRequest, TokenResponse, StandardAPIResponse
from backend.app.database import get_connection
from backend.app.routers.auth_deps import create_access_token, get_current_user_optional

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=StandardAPIResponse)
def register(req: UserRegisterRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_id = f"user-{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT INTO users (id, email, full_name, hashed_password, experience_level, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, req.email, req.full_name, req.password, req.experience_level or "BEGINNER", now))

    portfolio_id = f"port-{uuid.uuid4().hex[:12]}"
    cursor.execute("""
    INSERT INTO virtual_portfolios (id, user_id, starting_cash, current_cash, total_portfolio_value, realized_pnl, unrealized_pnl, reset_count, updated_at)
    VALUES (?, ?, 100000.00, 100000.00, 100000.00, 0.00, 0.00, 0, ?)
    """, (portfolio_id, user_id, now))

    conn.commit()
    conn.close()

    token = create_access_token(user_id, req.email)
    return StandardAPIResponse(
        success=True,
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": req.email,
                "full_name": req.full_name,
                "experience_level": req.experience_level
            }
        }
    )

@router.post("/login", response_model=StandardAPIResponse)
def login(req: UserLoginRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()

    if not user or user["hashed_password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user["id"], user["email"])
    return StandardAPIResponse(
        success=True,
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "experience_level": user["experience_level"]
            }
        }
    )

@router.post("/demo-login", response_model=StandardAPIResponse)
def demo_login():
    """Provides 1-click sandbox login for quick evaluation without sign-up friction."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = 'demo@mindmark.app'")
    user = cursor.fetchone()
    conn.close()

    token = create_access_token(user["id"], user["email"])
    return StandardAPIResponse(
        success=True,
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "experience_level": user["experience_level"],
                "is_demo": True
            }
        }
    )

@router.get("/me", response_model=StandardAPIResponse)
def get_me(user: dict = Depends(get_current_user_optional)):
    return StandardAPIResponse(
        success=True,
        data={
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "experience_level": user["experience_level"],
            "learning_streak_days": user["learning_streak_days"],
            "total_learning_xp": user["total_learning_xp"],
            "current_tier_level": user["current_tier_level"]
        }
    )
