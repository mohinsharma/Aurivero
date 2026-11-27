from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.database import get_connection
from backend.app.models import StandardAPIResponse
from backend.app.routers.auth_deps import get_current_user_required

router = APIRouter(prefix="/api/charts", tags=["Chart Drawings, Layouts & Custom Indicators"])


class DrawingPoint(BaseModel):
    time: int
    price: float


class ChartDrawingCreate(BaseModel):
    asset_class: Literal["STOCK", "CRYPTO", "FOREX"]
    symbol: str = Field(..., min_length=1, max_length=32)
    tool_type: Literal[
        "TRENDLINE",
        "HORIZONTAL",
        "VERTICAL",
        "RAY",
        "RECTANGLE",
        "FIBONACCI",
        "PRICE_LABEL",
    ]
    points: List[DrawingPoint] = Field(..., min_length=1, max_length=4)
    style: Optional[Dict[str, Any]] = None
    label: Optional[str] = Field(None, max_length=80)


class ChartLayoutCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    layout: Dict[str, Any]


class CustomIndicatorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    expression: str = Field(..., min_length=1, max_length=240)
    color: str = Field("#F5B942", max_length=24)
    pane: Literal["OVERLAY", "SEPARATE"] = "OVERLAY"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Drawings
# ---------------------------------------------------------------------------
@router.get("/drawings", response_model=StandardAPIResponse)
def list_drawings(
    asset_class: str = Query(...),
    symbol: str = Query(...),
    user: dict = Depends(get_current_user_required),
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT * FROM chart_drawings
        WHERE user_id = ? AND asset_class = ? AND symbol = ?
        ORDER BY created_at ASC
        """,
        (user["id"], asset_class.upper(), symbol.upper()),
    )
    rows = []
    for r in cursor.fetchall():
        d = dict(r)
        d["points"] = json.loads(d.pop("points_json"))
        d["style"] = json.loads(d.pop("style_json")) if d.get("style_json") else {}
        rows.append(d)
    conn.close()
    return StandardAPIResponse(success=True, data={"drawings": rows})


@router.post("/drawings", response_model=StandardAPIResponse)
def create_drawing(
    payload: ChartDrawingCreate,
    user: dict = Depends(get_current_user_required),
):
    conn = get_connection()
    cursor = conn.cursor()
    did = f"drw-{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    cursor.execute(
        """
        INSERT INTO chart_drawings
        (id, user_id, asset_class, symbol, tool_type, points_json, style_json, label, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            did,
            user["id"],
            payload.asset_class,
            payload.symbol.upper(),
            payload.tool_type,
            json.dumps([p.model_dump() for p in payload.points]),
            json.dumps(payload.style or {}),
            payload.label,
            now,
            now,
        ),
    )
    conn.commit()
    conn.close()
    return StandardAPIResponse(
        success=True,
        data={
            "drawing": {
                "id": did,
                "user_id": user["id"],
                "asset_class": payload.asset_class,
                "symbol": payload.symbol.upper(),
                "tool_type": payload.tool_type,
                "points": [p.model_dump() for p in payload.points],
                "style": payload.style or {},
                "label": payload.label,
                "created_at": now,
                "updated_at": now,
            }
        },
    )


@router.delete("/drawings/{drawing_id}", response_model=StandardAPIResponse)
def delete_drawing(drawing_id: str, user: dict = Depends(get_current_user_required)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM chart_drawings WHERE id = ?", (drawing_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Drawing not found.")
    if row["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to delete this drawing.")
    cursor.execute("DELETE FROM chart_drawings WHERE id = ? AND user_id = ?", (drawing_id, user["id"]))
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"deleted": True, "id": drawing_id})


# ---------------------------------------------------------------------------
# Chart Layouts
# ---------------------------------------------------------------------------
@router.get("/layouts", response_model=StandardAPIResponse)
def list_layouts(user: dict = Depends(get_current_user_required)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM chart_layouts WHERE user_id = ? ORDER BY updated_at DESC",
        (user["id"],),
    )
    rows = []
    for r in cursor.fetchall():
        d = dict(r)
        d["layout"] = json.loads(d.pop("layout_json"))
        rows.append(d)
    conn.close()
    return StandardAPIResponse(success=True, data={"layouts": rows})


@router.post("/layouts", response_model=StandardAPIResponse)
def save_layout(payload: ChartLayoutCreate, user: dict = Depends(get_current_user_required)):
    conn = get_connection()
    cursor = conn.cursor()
    lid = f"lay-{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    cursor.execute(
        """
        INSERT INTO chart_layouts (id, user_id, name, layout_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (lid, user["id"], payload.name.strip(), json.dumps(payload.layout), now, now),
    )
    conn.commit()
    conn.close()
    return StandardAPIResponse(
        success=True,
        data={
            "layout": {
                "id": lid,
                "user_id": user["id"],
                "name": payload.name.strip(),
                "layout": payload.layout,
                "created_at": now,
                "updated_at": now,
            }
        },
    )


@router.delete("/layouts/{layout_id}", response_model=StandardAPIResponse)
def delete_layout(layout_id: str, user: dict = Depends(get_current_user_required)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM chart_layouts WHERE id = ?", (layout_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Layout not found.")
    if row["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to delete this layout.")
    cursor.execute("DELETE FROM chart_layouts WHERE id = ? AND user_id = ?", (layout_id, user["id"]))
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"deleted": True, "id": layout_id})


# ---------------------------------------------------------------------------
# Custom Indicators
# ---------------------------------------------------------------------------
@router.get("/custom-indicators", response_model=StandardAPIResponse)
def list_custom_indicators(user: dict = Depends(get_current_user_required)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM custom_indicators WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],),
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return StandardAPIResponse(success=True, data={"indicators": rows})


@router.post("/custom-indicators", response_model=StandardAPIResponse)
def create_custom_indicator(
    payload: CustomIndicatorCreate,
    user: dict = Depends(get_current_user_required),
):
    conn = get_connection()
    cursor = conn.cursor()
    cid = f"ind-{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    cursor.execute(
        """
        INSERT INTO custom_indicators (id, user_id, name, expression, color, pane, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (cid, user["id"], payload.name.strip(), payload.expression.strip(), payload.color, payload.pane, now, now),
    )
    conn.commit()
    conn.close()
    return StandardAPIResponse(
        success=True,
        data={
            "indicator": {
                "id": cid,
                "user_id": user["id"],
                "name": payload.name.strip(),
                "expression": payload.expression.strip(),
                "color": payload.color,
                "pane": payload.pane,
                "created_at": now,
                "updated_at": now,
            }
        },
    )


@router.delete("/custom-indicators/{indicator_id}", response_model=StandardAPIResponse)
def delete_custom_indicator(indicator_id: str, user: dict = Depends(get_current_user_required)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM custom_indicators WHERE id = ?", (indicator_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Custom indicator not found.")
    if row["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to delete this indicator.")
    cursor.execute("DELETE FROM custom_indicators WHERE id = ? AND user_id = ?", (indicator_id, user["id"]))
    conn.commit()
    conn.close()
    return StandardAPIResponse(success=True, data={"deleted": True, "id": indicator_id})
