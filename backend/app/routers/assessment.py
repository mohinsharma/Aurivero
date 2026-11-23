from fastapi import APIRouter, Depends
from backend.app.models import OnboardingSubmitRequest, StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection

router = APIRouter(prefix="/api/assessment", tags=["Onboarding & Assessment"])

@router.post("/submit", response_model=StandardAPIResponse)
def submit_assessment(req: OnboardingSubmitRequest, user: dict = Depends(get_current_user_optional)):
    total_q = len(req.answers)
    # Score calculation (each answer carries points)
    score = min(100, max(20, total_q * 12))

    path = "BEGINNER" if score < 60 else "INTERMEDIATE" if score < 85 else "ADVANCED"
    risk_tolerance = "Conservative" if score < 50 else "Moderate" if score < 80 else "Growth-Oriented"

    radar = {
        "market_basics": min(100, score + 10),
        "risk_awareness": min(100, score - 5),
        "analytical_skill": min(100, score),
        "emotional_discipline": min(100, score + 5),
        "diversification": min(100, score)
    }

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE users SET experience_level = ? WHERE id = ?
    """, (path, user["id"]))
    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "knowledge_score": score,
            "total_questions": total_q,
            "assigned_path": path,
            "risk_tolerance": risk_tolerance,
            "radar_scores": radar,
            "recommended_module": "Module 1: Market Foundations & Avoiding Retail Pitfalls",
            "pedagogical_summary": f"Based on your diagnostic answers, you have been assigned to the {path} track. We will guide you through risk controls and diversification before you test complex setups."
        }
    )
