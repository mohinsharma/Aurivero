from typing import Literal
from fastapi import APIRouter, Depends, Query
from backend.app.models import StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_strict
from backend.app.services.fingerprint_service import fingerprint_service

router = APIRouter(prefix="/api/fingerprint", tags=["Investor Decision Fingerprint"])


@router.get("", response_model=StandardAPIResponse)
def get_fingerprint(user: dict = Depends(get_current_user_strict)):
    data = fingerprint_service.get_fingerprint(user["id"])
    return StandardAPIResponse(success=True, data=data)


@router.get("/history", response_model=StandardAPIResponse)
def get_fingerprint_history(
    period: Literal["7d", "30d", "90d", "all"] = Query("all"),
    user: dict = Depends(get_current_user_strict),
):
    data = fingerprint_service.get_improvement_timeline(user["id"], period=period)
    return StandardAPIResponse(success=True, data=data)


@router.get("/archetype", response_model=StandardAPIResponse)
def get_fingerprint_archetype(user: dict = Depends(get_current_user_strict)):
    data = fingerprint_service.generate_archetype(user["id"])
    return StandardAPIResponse(success=True, data=data)


@router.get("/declared-observed", response_model=StandardAPIResponse)
def get_fingerprint_declared_observed(user: dict = Depends(get_current_user_strict)):
    data = fingerprint_service.get_declared_vs_observed(user["id"])
    return StandardAPIResponse(success=True, data=data)


@router.get("/recommendations", response_model=StandardAPIResponse)
def get_fingerprint_recommendations(
    use_ai: bool = Query(True),
    user: dict = Depends(get_current_user_strict),
):
    data = fingerprint_service.get_recommendations(user["id"], use_ai=use_ai)
    return StandardAPIResponse(success=True, data=data)
