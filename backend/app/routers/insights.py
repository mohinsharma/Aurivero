from fastapi import APIRouter, Depends
from backend.app.models import StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.services.behavior_service import behavior_service

router = APIRouter(prefix="/api/insights", tags=["Behavioral Intelligence"])

@router.get("", response_model=StandardAPIResponse)
def get_behavioral_insights(user: dict = Depends(get_current_user_optional)):
    data = behavior_service.analyze_user_behavior(user["id"])
    return StandardAPIResponse(success=True, data=data)
