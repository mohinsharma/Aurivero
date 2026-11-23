from fastapi import APIRouter, Depends
from backend.app.models import StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.services.trade_service import trade_service

router = APIRouter(prefix="/api/portfolio", tags=["Virtual Portfolio"])

@router.get("", response_model=StandardAPIResponse)
def get_portfolio(user: dict = Depends(get_current_user_optional)):
    data = trade_service.get_portfolio(user["id"])
    return StandardAPIResponse(success=True, data=data)

@router.post("/reset", response_model=StandardAPIResponse)
def reset_portfolio(user: dict = Depends(get_current_user_optional)):
    result = trade_service.reset_portfolio(user["id"])
    return StandardAPIResponse(success=True, data=result)
