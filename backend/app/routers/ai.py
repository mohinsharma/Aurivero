from fastapi import APIRouter
from backend.app.models import (
    AIExplainConceptRequest,
    AINewsExplainRequest,
    AITradeDebriefRequest,
    StandardAPIResponse
)
from backend.app.services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Explainer & Tutor"])

@router.get("/status", response_model=StandardAPIResponse)
def get_ai_status():
    return StandardAPIResponse(
        success=True,
        data={
            "is_live_gemini": ai_service.is_live,
            "model_name": ai_service.model_name,
            "engine": "Google Gemini 1.5 Flash" if ai_service.is_live else "MINDMARK Local Pedagogical Engine",
            "compliance_notice": "AI responses are data-grounded and do not provide personalized investment advice."
        }
    )

@router.post("/explain-concept", response_model=StandardAPIResponse)
def explain_concept(req: AIExplainConceptRequest):
    data = ai_service.explain_concept(req.concept_name, req.user_context)
    return StandardAPIResponse(success=True, data=data)

@router.post("/explain-news", response_model=StandardAPIResponse)
def explain_news(req: AINewsExplainRequest):
    data = ai_service.explain_news(
        headline=req.headline,
        source=req.source,
        published_at=req.published_at,
        sector=req.sector,
        article_body=req.article_body
    )
    return StandardAPIResponse(success=True, data=data)

@router.post("/debrief-trade", response_model=StandardAPIResponse)
def debrief_trade(req: AITradeDebriefRequest):
    data = ai_service.debrief_trade(req.model_dump())
    return StandardAPIResponse(success=True, data=data)
