from fastapi import APIRouter, Depends, HTTPException
from backend.app.models import TradeOrderRequest, StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_optional
from backend.app.services.trade_service import trade_service
from backend.app.database import get_connection

router = APIRouter(prefix="/api/trades", tags=["Trades & Execution"])

@router.post("/execute", response_model=StandardAPIResponse)
def execute_trade(req: TradeOrderRequest, user: dict = Depends(get_current_user_optional)):
    result = trade_service.execute_order(user["id"], req.model_dump())
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return StandardAPIResponse(success=True, data=result)

@router.get("/history", response_model=StandardAPIResponse)
def get_order_history(user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM trades WHERE user_id = ? ORDER BY executed_at DESC LIMIT 50
    """, (user["id"],))
    rows = cursor.fetchall()
    conn.close()

    history = [dict(r) for r in rows]
    return StandardAPIResponse(success=True, data={"trades": history, "total": len(history)})
