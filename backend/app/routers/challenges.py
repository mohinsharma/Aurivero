from fastapi import APIRouter, Depends
from backend.app.models import QuestClaimRequest, StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection

QUEST_REWARDS = {
    "quest-daily-1": 50,
    "quest-daily-2": 60,
    "quest-weekly-1": 150,
    "quest-weekly-2": 200,
    "quest-milestone-1": 250,
    "quest-milestone-2": 400
}

router = APIRouter(prefix="/api/challenges", tags=["Challenges & Quests"])

@router.get("", response_model=StandardAPIResponse)
def get_challenges(user: dict = Depends(get_current_user_optional)):
    return StandardAPIResponse(
        success=True,
        data={
            "user_xp": user["total_learning_xp"],
            "current_tier": user["current_tier_level"],
            "streak_days": user["learning_streak_days"],
            "daily_active_quests": 3,
            "weekly_active_quests": 3
        }
    )

@router.post("/claim", response_model=StandardAPIResponse)
def claim_quest_reward(req: QuestClaimRequest, user: dict = Depends(get_current_user_optional)):
    reward = QUEST_REWARDS.get(req.quest_id, 50)

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE users SET total_learning_xp = total_learning_xp + ? WHERE id = ?
    """, (reward, user["id"]))

    cursor.execute("SELECT total_learning_xp, current_tier_level FROM users WHERE id = ?", (user["id"],))
    updated = cursor.fetchone()
    conn.commit()
    conn.close()

    new_xp = updated["total_learning_xp"]
    new_tier = 4 if new_xp >= 1200 else 3 if new_xp >= 650 else 2

    return StandardAPIResponse(
        success=True,
        data={
            "quest_id": req.quest_id,
            "awarded_xp": reward,
            "new_total_xp": new_xp,
            "new_tier_level": new_tier,
            "message": f"Successfully claimed +{reward} XP! Keep building disciplined habits."
        }
    )
