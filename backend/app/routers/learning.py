from fastapi import APIRouter, Depends
from backend.app.models import StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.database import get_connection
from datetime import datetime

COURSE_MODULES = [
    {
        "id": "module-1",
        "title": "Module 1: Market Foundations & Avoiding Retail Pitfalls",
        "description": "Learn what buying a stock actually means, how prices fluctuate, and why compounding beats trading frantically.",
        "difficulty": "Beginner",
        "lessons_count": 4,
        "completed": True,
        "badge": "Market Explorer"
    },
    {
        "id": "module-2",
        "title": "Module 2: Macroeconomics, Central Banks & Liquidity",
        "description": "Demystify repo rates, CPI inflation, crude oil dynamics, and the RBI's influence over Dalal Street.",
        "difficulty": "Intermediate",
        "lessons_count": 4,
        "completed": True,
        "badge": "Macro Navigator"
    },
    {
        "id": "module-3",
        "title": "Module 3: Position Sizing & Capital Preservation Rules",
        "description": "The math of asymmetric drawdowns, setting non-negotiable stop losses, and preventing portfolio wipeout.",
        "difficulty": "Intermediate",
        "lessons_count": 3,
        "completed": False,
        "badge": "Risk Guardian"
    },
    {
        "id": "module-4",
        "title": "Module 4: Reading Financial Statements for Beginners",
        "description": "How to decipher balance sheets, operating profit margins, debt-to-equity ratios, and real free cash flow.",
        "difficulty": "Advanced",
        "lessons_count": 5,
        "completed": False,
        "badge": "Valuation Sleuth"
    }
]

router = APIRouter(prefix="/api/learning", tags=["Learning Curriculum"])

@router.get("/modules", response_model=StandardAPIResponse)
def get_modules():
    return StandardAPIResponse(success=True, data={"modules": COURSE_MODULES, "total": len(COURSE_MODULES)})

@router.post("/complete-lesson", response_model=StandardAPIResponse)
def complete_lesson(lesson_id: str, module_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT OR REPLACE INTO user_lesson_progress (id, user_id, lesson_id, module_id, completed, completed_at)
    VALUES (?, ?, ?, ?, 1, ?)
    """, (f"{user['id']}-{lesson_id}", user["id"], lesson_id, module_id, now))

    # Add XP to user
    cursor.execute("""
    UPDATE users SET total_learning_xp = total_learning_xp + 50 WHERE id = ?
    """, (user["id"],))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "lesson_id": lesson_id,
            "xp_awarded": 50,
            "message": "Lesson completed! +50 XP added to your learning mastery record."
        }
    )
