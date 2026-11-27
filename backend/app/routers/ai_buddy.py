from fastapi import APIRouter, Depends, HTTPException
from backend.app.models import AIBuddyChatRequest, StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.services.ai_buddy_service import ai_buddy_service
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
