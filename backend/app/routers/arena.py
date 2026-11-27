from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import (
    StandardAPIResponse,
    ArenaContestCreateRequest,
    ArenaStartRequest,
    ArenaSubmitRequest,
    ArenaDuelCreateRequest,
    ArenaDuelJoinRequest,
    ArenaUniversityRequest,
    ArenaFriendRequest,
    ArenaProfileUpdateRequest,
    ArenaFriendChallengeCreateRequest,
)
from backend.app.routers.auth_deps import get_current_user_strict
from backend.app.services.arena_service import arena_service

router = APIRouter(prefix="/api/arena", tags=["MINDMARK Arena"])


def _require_arena_admin(user: dict = Depends(get_current_user_strict)) -> dict:
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Admin privileges required.")
    return user


@router.get("/dashboard", response_model=StandardAPIResponse)
@router.get("/contests", response_model=StandardAPIResponse)
def get_arena_dashboard(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=arena_service.get_dashboard(user["id"]))


@router.post("/contests", response_model=StandardAPIResponse)
def create_arena_contest(
    req: ArenaContestCreateRequest,
    admin: dict = Depends(_require_arena_admin),
):
    data = arena_service.create_contest_admin(admin["id"], req.model_dump())
    return StandardAPIResponse(success=True, data=data)


@router.get("/contests/{contest_id}", response_model=StandardAPIResponse)
def get_arena_contest(contest_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        data = arena_service.get_contest_detail(contest_id, user["id"])
        return StandardAPIResponse(success=True, data=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/contests/{contest_id}/register", response_model=StandardAPIResponse)
def register_arena_contest(contest_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        data = arena_service.register_for_contest(contest_id, user["id"])
        return StandardAPIResponse(success=True, data=data)
    except PermissionError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/contests/{contest_id}/start", response_model=StandardAPIResponse)
def start_arena_contest(
    contest_id: str,
    req: ArenaStartRequest = ArenaStartRequest(),
    user: dict = Depends(get_current_user_strict),
):
    try:
        data = arena_service.start_contest(contest_id, user["id"], is_practice=req.is_practice)
        return StandardAPIResponse(success=True, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/contests/{contest_id}/submit", response_model=StandardAPIResponse)
def submit_arena_contest(
    contest_id: str,
    req: ArenaSubmitRequest,
    user: dict = Depends(get_current_user_strict),
):
    try:
        data = arena_service.submit_contest(contest_id, user["id"], req.model_dump())
        return StandardAPIResponse(success=True, data=data)
    except PermissionError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/contests/{contest_id}/results", response_model=StandardAPIResponse)
def get_arena_contest_results(contest_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        data = arena_service.get_contest_results(contest_id, user["id"])
        return StandardAPIResponse(success=True, data=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/duels/create", response_model=StandardAPIResponse)
def create_arena_duel(
    req: ArenaDuelCreateRequest,
    user: dict = Depends(get_current_user_strict),
):
    try:
        data = arena_service.create_duel(user["id"], req.model_dump())
        return StandardAPIResponse(success=True, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/duels/{duel_id}/join", response_model=StandardAPIResponse)
def join_arena_duel(
    duel_id: str,
    req: ArenaDuelJoinRequest,
    user: dict = Depends(get_current_user_strict),
):
    try:
        data = arena_service.join_duel(duel_id, user["id"], req.model_dump())
        return StandardAPIResponse(success=True, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/leaderboard", response_model=StandardAPIResponse)
@router.get("/leaderboards", response_model=StandardAPIResponse)
def get_arena_leaderboard(
    scope: str = Query("global", pattern="^(global|weekly|monthly|university|friends|contest)$"),
    university: Optional[str] = None,
    contest_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user_strict),
):
    data = arena_service.get_leaderboard(
        user["id"], scope=scope, university=university, contest_id=contest_id, page=page, limit=limit
    )
    return StandardAPIResponse(success=True, data=data)


@router.get("/leaderboards/{lb_type}", response_model=StandardAPIResponse)
def get_arena_leaderboard_by_type(
    lb_type: str,
    university: Optional[str] = None,
    contest_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user_strict),
):
    if lb_type not in ("global", "weekly", "monthly", "university", "friends", "contest"):
        raise HTTPException(status_code=400, detail="Invalid leaderboard type")
    data = arena_service.get_leaderboard(
        user["id"], scope=lb_type, university=university, contest_id=contest_id, page=page, limit=limit
    )
    return StandardAPIResponse(success=True, data=data)


@router.post("/friend-challenges", response_model=StandardAPIResponse)
def create_friend_challenge(
    req: ArenaFriendChallengeCreateRequest,
    user: dict = Depends(get_current_user_strict),
):
    try:
        data = arena_service.create_friend_challenge(user["id"], req.model_dump())
        return StandardAPIResponse(success=True, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/friend-challenges", response_model=StandardAPIResponse)
def list_friend_challenges(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=arena_service.list_friend_challenges(user["id"]))


@router.post("/friend-challenges/{challenge_id}/accept", response_model=StandardAPIResponse)
def accept_friend_challenge(challenge_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        data = arena_service.accept_friend_challenge(challenge_id, user["id"])
        return StandardAPIResponse(success=True, data=data)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/university-league", response_model=StandardAPIResponse)
def get_university_league(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=arena_service.get_university_league(user["id"]))


@router.get("/profile", response_model=StandardAPIResponse)
def get_arena_profile(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=arena_service.get_profile(user["id"]))


@router.put("/profile", response_model=StandardAPIResponse)
def update_arena_profile(
    req: ArenaProfileUpdateRequest,
    user: dict = Depends(get_current_user_strict),
):
    return StandardAPIResponse(success=True, data=arena_service.update_profile(user["id"], req.model_dump()))


@router.post("/university", response_model=StandardAPIResponse)
def set_arena_university(
    req: ArenaUniversityRequest,
    user: dict = Depends(get_current_user_strict),
):
    data = arena_service.set_university(user["id"], req.university_name)
    return StandardAPIResponse(success=True, data=data)


@router.post("/friends", response_model=StandardAPIResponse)
def add_arena_friend(
    req: ArenaFriendRequest,
    user: dict = Depends(get_current_user_strict),
):
    try:
        data = arena_service.add_friend(user["id"], req.friend_email)
        return StandardAPIResponse(success=True, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
