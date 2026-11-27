from fastapi import APIRouter, Depends, HTTPException
from backend.app.models import (
    StandardAPIResponse,
    AICoachChatRequest,
    AICoachDecisionReviewRequest,
)
from backend.app.routers.auth_deps import get_current_user_strict
from backend.app.services.ai_coach_service import ai_coach_service

router = APIRouter(prefix="/api/ai-coach", tags=["MINDMARK AI Coach"])


@router.post("/chat", response_model=StandardAPIResponse)
def chat_with_coach(req: AICoachChatRequest, user: dict = Depends(get_current_user_strict)):
    try:
        data = ai_coach_service.chat(
            user_id=user["id"],
            message=req.message,
            conversation_id=req.conversation_id,
            use_ai=req.use_ai,
        )
        return StandardAPIResponse(success=True, data=data)
    except PermissionError as e:
        code = 429 if "RATE_LIMIT" in str(e) else 403
        raise HTTPException(status_code=code, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/context", response_model=StandardAPIResponse)
def get_coach_context(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=ai_coach_service.get_user_context(user["id"]))


@router.get("/recommendations", response_model=StandardAPIResponse)
def get_coach_recommendations(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=ai_coach_service.get_recommendations(user["id"]))


@router.post("/recommendations/{rec_id}/dismiss", response_model=StandardAPIResponse)
def dismiss_coach_recommendation(rec_id: str, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=ai_coach_service.dismiss_recommendation(user["id"], rec_id))


@router.post("/review-decision", response_model=StandardAPIResponse)
def review_decision(req: AICoachDecisionReviewRequest, user: dict = Depends(get_current_user_strict)):
    try:
        data = ai_coach_service.review_decision(user["id"], req.model_dump())
        return StandardAPIResponse(success=True, data=data)
    except PermissionError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.get("/conversations", response_model=StandardAPIResponse)
def list_coach_conversations(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=ai_coach_service.list_conversations(user["id"]))


@router.get("/conversations/{conversation_id}", response_model=StandardAPIResponse)
def get_coach_conversation(conversation_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=ai_coach_service.get_conversation(conversation_id, user["id"]))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/conversations/{conversation_id}", response_model=StandardAPIResponse)
def delete_coach_conversation(conversation_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=ai_coach_service.delete_conversation(conversation_id, user["id"]))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
