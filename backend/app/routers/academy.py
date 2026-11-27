from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import (
    StandardAPIResponse,
    CourseCreateRequest,
    LessonCreateRequest,
    QuizSubmitRequest
)
from backend.app.routers.auth_deps import get_current_user_optional, get_current_user_required
from backend.app.database import get_connection
from datetime import datetime
import json
import uuid

router = APIRouter(prefix="/api/academy", tags=["Learn & Teach Academy"])

TRACKS_METADATA = [
    {
        "id": "BLOCKCHAIN",
        "title": "Blockchain Academy",
        "tagline": "Architecting Decentralized State Machines & Cryptographic Consensus",
        "icon": "Blocks",
        "color": "from-teal-500 to-emerald-600",
        "topics": [
            "Distributed Ledgers",
            "Proof of Work & Proof of Stake",
            "Smart Contracts (Solidity & EVM)",
            "Layer 2 Rollups & Data Availability",
            "DeFi Protocols & AMMs"
        ]
    },
    {
        "id": "CRYPTO",
        "title": "Cryptocurrency Academy",
        "tagline": "Tokenomics, Digital Scarcity & On-Chain Risk Management",
        "icon": "Coins",
        "color": "from-amber-500 to-orange-600",
        "topics": [
            "Bitcoin Halving Dynamics",
            "Ethereum Smart Contract Gas",
            "Cold Storage & Seed Security",
            "DEX vs CEX Liquidity",
            "On-Chain Valuation Metrics"
        ]
    },
    {
        "id": "FOREX",
        "title": "Forex Academy",
        "tagline": "Global Currency Markets, Macroeconomics & Order Flow",
        "icon": "Globe",
        "color": "from-blue-500 to-indigo-600",
        "topics": [
            "Currency Pairs & Pip Calculations",
            "Central Bank Interest Differentials",
            "Leverage & Margin Call Discipline",
            "Candlestick & Technical Analysis",
            "Carry Trades & Hedging"
        ]
    }
]

@router.get("/tracks", response_model=StandardAPIResponse)
def get_tracks():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT track, COUNT(*) as count FROM academy_courses WHERE is_approved = 1 GROUP BY track")
    counts = {r["track"]: r["count"] for r in cursor.fetchall()}
    conn.close()

    tracks_with_counts = []
    for t in TRACKS_METADATA:
        td = dict(t)
        td["courses_count"] = counts.get(t["id"], 0)
        tracks_with_counts.append(td)

    return StandardAPIResponse(success=True, data={"tracks": tracks_with_counts})

@router.get("/courses", response_model=StandardAPIResponse)
def get_courses(
    track: Optional[str] = None,
    level: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user_optional)
):
    conn = get_connection()
    cursor = conn.cursor()

    # User completed lessons
    cursor.execute("SELECT course_id, COUNT(*) as completed_count FROM user_academy_progress WHERE user_id = ? GROUP BY course_id", (user["id"],))
    user_progress_map = {r["course_id"]: r["completed_count"] for r in cursor.fetchall()}

    query = "SELECT * FROM academy_courses WHERE is_approved = 1"
    params = []

    if track and track != "ALL":
        query += " AND track = ?"
        params.append(track)

    if level and level != "All":
        query += " AND level = ?"
        params.append(level)

    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])

    query += " ORDER BY is_featured DESC, rating DESC, created_at DESC"

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()

    courses = []
    for r in rows:
        d = dict(r)
        d["is_featured"] = bool(d["is_featured"])
        d["is_approved"] = bool(d["is_approved"])
        completed_lessons = user_progress_map.get(d["id"], 0)
        d["completed_lessons_count"] = completed_lessons
        d["progress_percent"] = round((completed_lessons / max(1, d["lessons_count"])) * 100)
        courses.append(d)

    conn.close()
    return StandardAPIResponse(success=True, data={"courses": courses, "total": len(courses)})

@router.get("/courses/{course_id}", response_model=StandardAPIResponse)
def get_course_detail(course_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM academy_courses WHERE id = ?", (course_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    course = dict(row)
    course["is_featured"] = bool(course["is_featured"])

    # Fetch lessons
    cursor.execute("""
    SELECT l.*,
           (SELECT 1 FROM user_academy_progress p WHERE p.user_id = ? AND p.lesson_id = l.id) as is_completed
    FROM academy_lessons l
    WHERE l.course_id = ?
    ORDER BY l.lesson_order ASC
    """, (user["id"], course_id))

    lessons = []
    for lr in cursor.fetchall():
        ld = dict(lr)
        ld["is_completed"] = bool(ld.get("is_completed"))
        lessons.append(ld)

    course["lessons"] = lessons

    # Fetch quiz if exists
    cursor.execute("SELECT id, title, passing_score FROM academy_quizzes WHERE course_id = ?", (course_id,))
    quiz_row = cursor.fetchone()
    if quiz_row:
        qd = dict(quiz_row)
        cursor.execute("SELECT score, passed, completed_at FROM academy_quiz_attempts WHERE user_id = ? AND quiz_id = ? ORDER BY completed_at DESC LIMIT 1", (user["id"], qd["id"]))
        attempt = cursor.fetchone()
        if attempt:
            qd["user_best_score"] = attempt["score"]
            qd["user_passed"] = bool(attempt["passed"])
        course["quiz"] = qd
    else:
        course["quiz"] = None

    conn.close()
    return StandardAPIResponse(success=True, data=course)

@router.get("/lessons/{lesson_id}", response_model=StandardAPIResponse)
def get_lesson_detail(lesson_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM academy_lessons WHERE id = ?", (lesson_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Lesson not found")

    lesson = dict(row)

    # Check completed
    cursor.execute("SELECT 1 FROM user_academy_progress WHERE user_id = ? AND lesson_id = ?", (user["id"], lesson_id))
    lesson["is_completed"] = cursor.fetchone() is not None

    # Get course title
    cursor.execute("SELECT title, track FROM academy_courses WHERE id = ?", (lesson["course_id"],))
    c_info = cursor.fetchone()
    if c_info:
        lesson["course_title"] = c_info["title"]
        lesson["course_track"] = c_info["track"]

    # Next & prev lesson
    cursor.execute("SELECT id, title FROM academy_lessons WHERE course_id = ? AND lesson_order = ?", (lesson["course_id"], lesson["lesson_order"] + 1))
    next_l = cursor.fetchone()
    lesson["next_lesson"] = dict(next_l) if next_l else None

    cursor.execute("SELECT id, title FROM academy_lessons WHERE course_id = ? AND lesson_order = ?", (lesson["course_id"], lesson["lesson_order"] - 1))
    prev_l = cursor.fetchone()
    lesson["prev_lesson"] = dict(prev_l) if prev_l else None

    conn.close()
    return StandardAPIResponse(success=True, data=lesson)

@router.post("/progress", response_model=StandardAPIResponse)
def mark_lesson_progress(lesson_id: str, course_id: str, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    cursor.execute("""
    INSERT OR REPLACE INTO user_academy_progress (id, user_id, course_id, lesson_id, completed, completed_at)
    VALUES (?, ?, ?, ?, 1, ?)
    """, (f"{user['id']}-{lesson_id}", user["id"], course_id, lesson_id, now))

    # Award user XP and update streak
    cursor.execute("UPDATE users SET total_learning_xp = total_learning_xp + 75, reputation_points = reputation_points + 10 WHERE id = ?", (user["id"],))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "lesson_id": lesson_id,
            "xp_awarded": 75,
            "message": "Lesson completed! +75 XP and +10 Reputation awarded to your learner profile."
        }
    )

@router.get("/quizzes/{quiz_id}", response_model=StandardAPIResponse)
def get_quiz_questions(quiz_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM academy_quizzes WHERE id = ?", (quiz_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz = dict(row)
    raw_questions = json.loads(quiz["questions_json"])
    # Strip correct option for student test mode
    student_questions = []
    for q in raw_questions:
        student_questions.append({
            "id": q["id"],
            "question": q["question"],
            "options": q["options"]
        })

    quiz["questions"] = student_questions
    del quiz["questions_json"]

    conn.close()
    return StandardAPIResponse(success=True, data=quiz)

@router.post("/quizzes/{quiz_id}/submit", response_model=StandardAPIResponse)
def submit_quiz_attempt(quiz_id: str, payload: QuizSubmitRequest, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM academy_quizzes WHERE id = ?", (quiz_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz = dict(row)
    raw_questions = json.loads(quiz["questions_json"])
    total_q = len(raw_questions)
    correct_count = 0
    feedback = []

    for q in raw_questions:
        q_id = q["id"]
        selected = payload.answers.get(q_id)
        is_correct = selected == q["correct_option"]
        if is_correct:
            correct_count += 1
        feedback.append({
            "question_id": q_id,
            "question": q["question"],
            "user_selection": selected,
            "correct_option": q["correct_option"],
            "is_correct": is_correct,
            "explanation": q.get("explanation", "")
        })

    score_pct = round((correct_count / max(1, total_q)) * 100)
    passed = score_pct >= quiz["passing_score"]

    now = datetime.utcnow().isoformat()
    attempt_id = f"attempt-{uuid.uuid4().hex[:8]}"

    cursor.execute("""
    INSERT INTO academy_quiz_attempts (id, user_id, quiz_id, score, passed, answers_json, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        attempt_id,
        user["id"],
        quiz_id,
        score_pct,
        1 if passed else 0,
        json.dumps(payload.answers),
        now
    ))

    # Reward XP if passed
    awarded_xp = 150 if passed else 25
    cursor.execute("UPDATE users SET total_learning_xp = total_learning_xp + ?, reputation_points = reputation_points + ? WHERE id = ?", (awarded_xp, 25 if passed else 5, user["id"]))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "score": score_pct,
            "passed": passed,
            "passing_score": quiz["passing_score"],
            "correct_count": correct_count,
            "total_questions": total_q,
            "awarded_xp": awarded_xp,
            "feedback": feedback,
            "certificate_eligible": passed and score_pct >= 90
        }
    )

# Teaching & Course Creation Endpoint (For Instructors & Admins)
@router.post("/courses", response_model=StandardAPIResponse)
def create_course(payload: CourseCreateRequest, user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    course_id = f"course-{uuid.uuid4().hex[:8]}"

    # Auto-approve for demo/admin, pending for standard user
    is_admin = user.get("role") in ["ADMIN", "INSTRUCTOR"]
    is_approved = 1 if is_admin else 0

    cursor.execute("""
    INSERT INTO academy_courses (id, track, title, description, level, instructor_id, instructor_name, duration_minutes, lessons_count, students_enrolled, rating, is_featured, is_approved, thumbnail_url, prerequisites, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 5.0, 0, ?, ?, ?, ?)
    """, (
        course_id,
        payload.track,
        payload.title,
        payload.description,
        payload.level,
        user["id"],
        user["full_name"],
        payload.duration_minutes,
        is_approved,
        payload.thumbnail_url or "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop",
        payload.prerequisites or "None",
        now
    ))

    # Create intro lesson
    lesson_id = f"les-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO academy_lessons (id, course_id, title, description, duration_minutes, lesson_order, content_type, content_markdown)
    VALUES (?, ?, ?, ?, 15, 1, 'ARTICLE', ?)
    """, (
        lesson_id,
        course_id,
        "Introduction & Core Framework",
        "Overview of foundational concepts and learning objectives.",
        f"# {payload.title}\n\nWelcome to this masterclass on {payload.track.capitalize()}. In this course, you will learn structured decision models without gambling or emotional bias."
    ))

    conn.commit()
    conn.close()

    return StandardAPIResponse(
        success=True,
        data={
            "course_id": course_id,
            "is_approved": bool(is_approved),
            "message": "Course created successfully!" if is_approved else "Course submitted for administrative review."
        }
    )
