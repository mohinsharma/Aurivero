from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import (
    StandardAPIResponse,
    GamificationMissionCompleteRequest,
    GamificationSkillCompleteRequest,
)
from backend.app.routers.auth_deps import get_current_user_strict
from backend.app.services.gamification_service import (
    gamification_service,
    LEVEL_TITLES,
    xp_threshold_for_level,
    XP_REWARDS,
)

router = APIRouter(prefix="/api/gamification", tags=["Gamification & Progression"])


@router.get("/profile", response_model=StandardAPIResponse)
def get_gamification_profile(
    use_ai: bool = Query(True),
    user: dict = Depends(get_current_user_strict),
):
    return StandardAPIResponse(success=True, data=gamification_service.get_profile(user["id"], use_ai=use_ai))


@router.get("/xp-history", response_model=StandardAPIResponse)
@router.get("/rewards", response_model=StandardAPIResponse)
def get_xp_history(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user_strict),
):
    return StandardAPIResponse(success=True, data=gamification_service.get_xp_history(user["id"], page=page, limit=limit))


@router.get("/levels", response_model=StandardAPIResponse)
def get_levels(user: dict = Depends(get_current_user_strict)):
    levels = [
        {"level": i + 1, "title": title, "xp_required": xp_threshold_for_level(i + 1)}
        for i, title in enumerate(LEVEL_TITLES)
    ]
    return StandardAPIResponse(success=True, data={"levels": levels, "xp_rewards": XP_REWARDS})


@router.get("/missions", response_model=StandardAPIResponse)
def get_missions(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=gamification_service.get_missions(user["id"]))


@router.post("/missions/{mission_id}/complete", response_model=StandardAPIResponse)
def complete_mission(
    mission_id: str,
    req: GamificationMissionCompleteRequest = GamificationMissionCompleteRequest(),
    user: dict = Depends(get_current_user_strict),
):
    try:
        return StandardAPIResponse(success=True, data=gamification_service.complete_mission(user["id"], mission_id))
    except PermissionError as e:
        code = 403 if "FORBIDDEN" in str(e) else 409
        raise HTTPException(status_code=code, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/missions/{mission_id}/skip", response_model=StandardAPIResponse)
def skip_mission(mission_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=gamification_service.update_mission_status(user["id"], mission_id, "SKIPPED"))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/missions/{mission_id}/dismiss", response_model=StandardAPIResponse)
def dismiss_mission(mission_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=gamification_service.update_mission_status(user["id"], mission_id, "DISMISSED"))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/skill-tree", response_model=StandardAPIResponse)
def get_skill_tree(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=gamification_service.get_skill_tree(user["id"]))


@router.post("/skills/{skill_id}/complete", response_model=StandardAPIResponse)
def complete_skill(
    skill_id: str,
    req: GamificationSkillCompleteRequest = GamificationSkillCompleteRequest(),
    user: dict = Depends(get_current_user_strict),
):
    try:
        data = gamification_service.complete_skill(user["id"], skill_id, exercise_answer=req.exercise_answer)
        return StandardAPIResponse(success=True, data=data)
    except PermissionError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/badges", response_model=StandardAPIResponse)
def get_badges(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=gamification_service.get_badges(user["id"]))


@router.get("/streak", response_model=StandardAPIResponse)
def get_streak(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=gamification_service.get_streak(user["id"]))


@router.get("/seasons", response_model=StandardAPIResponse)
def get_seasons(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=gamification_service.get_seasons(user["id"]))
