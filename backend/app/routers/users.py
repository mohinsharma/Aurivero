from fastapi import APIRouter, Depends
from backend.app.models import StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/profile", response_model=StandardAPIResponse)
def get_profile(user: dict = Depends(get_current_user_optional)):
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

@router.patch("/experience-level", response_model=StandardAPIResponse)
def update_experience(level: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET experience_level = ? WHERE id = ?", (level.upper(), user["id"]))
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"experience_level": level.upper()})
