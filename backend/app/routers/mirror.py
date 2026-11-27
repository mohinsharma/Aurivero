from fastapi import APIRouter, Depends, HTTPException
from backend.app.models import (
    MirrorStartRequest,
    MirrorDecisionRequest,
    MirrorCompleteRequest,
    StandardAPIResponse,
)
from backend.app.routers.auth_deps import get_current_user_strict
from backend.app.services.mirror_service import mirror_service

router = APIRouter(prefix="/api/mirror", tags=["Mirror Mode"])


@router.get("/challenges", response_model=StandardAPIResponse)
def get_mirror_challenges(user: dict = Depends(get_current_user_strict)):
    data = mirror_service.get_challenges_dashboard(user["id"])
    return StandardAPIResponse(success=True, data=data)


@router.post("/challenges/start", response_model=StandardAPIResponse)
def start_mirror_challenge(
    req: MirrorStartRequest,
    user: dict = Depends(get_current_user_strict),
):
    res = mirror_service.start_challenge(
        user_id=user["id"],
        challenge_id=req.challenge_id,
        is_practice=req.is_practice,
        declared_strategy=req.declared_strategy,
    )
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("message", "Challenge not found"))
    return StandardAPIResponse(success=True, data=res)


@router.get("/challenges/{challenge_id}", response_model=StandardAPIResponse)
def get_mirror_challenge_detail(
    challenge_id: str,
    user: dict = Depends(get_current_user_strict),
):
    data = mirror_service.get_challenge_detail(challenge_id, user["id"])
    if not data:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return StandardAPIResponse(success=True, data=data)


@router.post("/challenges/{challenge_id}/decision", response_model=StandardAPIResponse)
def submit_mirror_decision(
    challenge_id: str,
    req: MirrorDecisionRequest,
    user: dict = Depends(get_current_user_strict),
):
    res = mirror_service.submit_decision(user["id"], challenge_id, req.model_dump())
    if not res.get("success"):
        raise HTTPException(status_code=res.get("status_code", 400), detail=res.get("message", "Invalid decision"))
    return StandardAPIResponse(success=True, data=res)


@router.post("/challenges/{challenge_id}/complete", response_model=StandardAPIResponse)
def complete_mirror_challenge(
    challenge_id: str,
    req: MirrorCompleteRequest,
    user: dict = Depends(get_current_user_strict),
):
    res = mirror_service.complete_challenge(
        user_id=user["id"],
        challenge_id=challenge_id,
        session_id=req.session_id,
        reflection_text=req.reflection_text or "",
        use_ai=req.use_ai,
    )
    if not res.get("success"):
        raise HTTPException(status_code=res.get("status_code", 400), detail=res.get("message", "Could not complete challenge"))
    return StandardAPIResponse(success=True, data=res)


@router.post("/challenges/{challenge_id}/skip", response_model=StandardAPIResponse)
def skip_mirror_challenge(
    challenge_id: str,
    user: dict = Depends(get_current_user_strict),
):
    res = mirror_service.skip_challenge(user["id"], challenge_id)
    return StandardAPIResponse(success=True, data=res)


@router.get("/history", response_model=StandardAPIResponse)
def get_mirror_history(user: dict = Depends(get_current_user_strict)):
    data = mirror_service.get_history(user["id"])
    return StandardAPIResponse(success=True, data=data)


@router.get("/recommendations", response_model=StandardAPIResponse)
def get_mirror_recommendations(user: dict = Depends(get_current_user_strict)):
    dash = mirror_service.get_challenges_dashboard(user["id"])
    return StandardAPIResponse(
        success=True,
        data={
            "has_sufficient_personalization_data": dash["has_sufficient_personalization_data"],
            "recommendations": dash["personalized_recommendations"],
        },
    )
