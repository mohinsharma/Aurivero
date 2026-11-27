from typing import Dict, List
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import DecisionEventCreateRequest, StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_required
from backend.app.services.bie_service import bie_service

router = APIRouter(prefix="/api/behavior", tags=["Behavioral Intelligence Engine"])

_rate_buckets: Dict[str, List[float]] = defaultdict(list)

def _check_rate_limit(user_id: str, max_per_min: int = 60):
    now = time.time()
    recent = [t for t in _rate_buckets[user_id] if t > now - 60.0]
    if len(recent) >= max_per_min:
        raise HTTPException(status_code=429, detail="Too many behavioral requests. Please slow down.")
    recent.append(now)
    _rate_buckets[user_id] = recent


@router.post("/events", response_model=StandardAPIResponse)
def create_decision_event(
    payload: DecisionEventCreateRequest,
    user: dict = Depends(get_current_user_required),
):
    _check_rate_limit(user["id"])
    res = bie_service.record_decision_event(user["id"], payload.model_dump())
    if res.get("duplicate"):
        raise HTTPException(status_code=409, detail=res["message"])
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Invalid decision event"))
    return StandardAPIResponse(success=True, data=res)


@router.get("/profile", response_model=StandardAPIResponse)
def get_behavior_profile(user: dict = Depends(get_current_user_required)):
    data = bie_service.get_full_profile(user["id"])
    return StandardAPIResponse(success=True, data=data)


@router.get("/scores", response_model=StandardAPIResponse)
def get_behavior_scores(user: dict = Depends(get_current_user_required)):
    profile = bie_service.get_full_profile(user["id"])
    return StandardAPIResponse(
        success=True,
        data={
            "overall_score": profile["overall_score"],
            "is_insufficient_data": profile["is_insufficient_data"],
            "events_count": profile["events_count"],
            "disclaimer": profile["disclaimer"],
            "scores": profile["scores"],
        },
    )


@router.get("/patterns", response_model=StandardAPIResponse)
def get_behavior_patterns(user: dict = Depends(get_current_user_required)):
    profile = bie_service.get_full_profile(user["id"])
    return StandardAPIResponse(
        success=True,
        data={
            "events_count": profile["events_count"],
            "is_insufficient_data": profile["is_insufficient_data"],
            "patterns": profile["patterns"],
        },
    )


@router.get("/diagnostics", response_model=StandardAPIResponse)
def get_behavior_diagnostics(user: dict = Depends(get_current_user_required)):
    profile = bie_service.get_full_profile(user["id"])
    return StandardAPIResponse(
        success=True,
        data={
            "events_count": profile["events_count"],
            "is_insufficient_data": profile["is_insufficient_data"],
            "overall_score": profile["overall_score"],
            "disclaimer": profile["disclaimer"],
            "features": profile["features"],
            "patterns": profile["patterns"],
            "declared_vs_observed": profile["declared_vs_observed"],
            "training_assignments": profile["training_assignments"],
        },
    )


@router.get("/timeline", response_model=StandardAPIResponse)
def get_behavior_timeline(
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user_required),
):
    data = bie_service.get_timeline(user["id"], limit=limit, offset=offset)
    return StandardAPIResponse(success=True, data=data)


@router.post("/recalculate", response_model=StandardAPIResponse)
def recalculate_behavior(user: dict = Depends(get_current_user_required)):
    _check_rate_limit(user["id"], max_per_min=20)
    data = bie_service.recalculate_user_behavior(user["id"])
    return StandardAPIResponse(success=True, data=data)


@router.get("/recommendations", response_model=StandardAPIResponse)
def get_behavior_recommendations(
    use_ai: bool = Query(True),
    user: dict = Depends(get_current_user_required),
):
    data = bie_service.get_recommendations(user["id"], use_ai=use_ai)
    return StandardAPIResponse(success=True, data=data)
