from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from backend.app.models import AIBuddyChatRequest, StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.services.ai_buddy_service import ai_buddy_service
from backend.app.services.mentor_engine import (
    build_daily_training_session,
    build_historical_scenario,
    build_weekly_report,
    classify_learning_level,
    evaluate_socratic_response,
    evaluate_trade_risk_4tier,
    generate_random_scenario,
)
from backend.app.config import settings

router = APIRouter(prefix="/api/ai-buddy", tags=["MINDMARK AI Buddy"])


@router.get("/status", response_model=StandardAPIResponse)
def get_ai_buddy_status():
    return StandardAPIResponse(
        success=True,
        data={
            "name": "MINDMARK AI Buddy",
            "is_live": settings.is_ai_live,
            "model_name": settings.GEMINI_MODEL,
            "domain_restriction": "Strict Finance-Only",
        }
    )


@router.post("/chat", response_model=StandardAPIResponse)
def chat_with_buddy(
    req: AIBuddyChatRequest,
    user: dict = Depends(get_current_user_optional),
):
    if not ai_buddy_service.check_rate_limit(user["id"]):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a moment before sending more messages."
        )

    history_dicts = [{"role": h.role, "content": h.content} for h in req.history]
    ctx_dict = req.context.model_dump() if req.context else None

    result = ai_buddy_service.chat(
        message=req.message,
        history=history_dicts,
        user=user,
        req_context=ctx_dict,
    )

    return StandardAPIResponse(success=True, data=result)


class SocraticEvalRequest(BaseModel):
    archetype: str
    selectedChoiceId: str
    userReasoning: str = ""
    attemptNumber: int = 1


@router.get("/mentor/profile", response_model=StandardAPIResponse)
def get_mentor_profile(
    experience_level: Optional[str] = Query(None),
    behavioral_score: int = Query(76),
):
    level = classify_learning_level(experience_level, behavioral_score)
    return StandardAPIResponse(success=True, data={"level": level})


@router.get("/mentor/historical-scenario", response_model=StandardAPIResponse)
async def get_historical_mentor_scenario(
    symbol: str = Query("RELIANCE"),
    asset_class: str = Query("STOCK"),
):
    data = await build_historical_scenario(symbol=symbol, asset_class=asset_class)
    return StandardAPIResponse(success=True, data=data)


@router.get("/mentor/random-scenario", response_model=StandardAPIResponse)
def get_random_mentor_scenario(level: str = Query("ABSOLUTE_BEGINNER")):
    data = generate_random_scenario(level_code=level)
    return StandardAPIResponse(success=True, data=data)


@router.post("/mentor/evaluate-step", response_model=StandardAPIResponse)
def evaluate_mentor_step(req: SocraticEvalRequest):
    data = evaluate_socratic_response(
        archetype=req.archetype,
        selected_choice_id=req.selectedChoiceId,
        user_reasoning=req.userReasoning,
        attempt_number=req.attemptNumber,
    )
    return StandardAPIResponse(success=True, data=data)


@router.post("/mentor/risk-check", response_model=StandardAPIResponse)
def run_4tier_risk_check(payload: Dict[str, Any]):
    data = evaluate_trade_risk_4tier(payload)
    return StandardAPIResponse(success=True, data=data)


@router.get("/mentor/daily-session", response_model=StandardAPIResponse)
def get_daily_mentor_session(level: str = Query("ABSOLUTE_BEGINNER")):
    data = build_daily_training_session(level_code=level)
    return StandardAPIResponse(success=True, data=data)


@router.get("/mentor/weekly-report", response_model=StandardAPIResponse)
def get_mentor_weekly_report(behavioral_score: int = Query(76)):
    data = build_weekly_report(behavioral_score=behavioral_score)
    return StandardAPIResponse(success=True, data=data)
