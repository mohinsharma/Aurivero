from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.models import (
    StandardAPIResponse,
    ArenaFriendChallengeCreateRequest,
    ArenaSubmitRequest,
    SocialSquadCreateRequest,
    SocialSquadInviteRequest,
    SocialSquadJoinCodeRequest,
    SocialSquadRoleRequest,
    SocialSquadBattleCreateRequest,
    SocialSquadBattleContributeRequest,
    SocialSquadBattleSubmitRequest,
    SocialDebateCreateRequest,
    SocialDebateSubmitRequest,
    SocialReactionRequest,
    SocialReportRequest,
    SocialCrowdSubmitRequest,
    SocialPostCreateRequest,
    SocialCommentRequest,
    SocialPrivacyPatchRequest,
)
from backend.app.routers.auth_deps import get_current_user_strict
from backend.app.services.social_service import social_service
from backend.app.services.arena_service import arena_service

router = APIRouter(prefix="/api/social", tags=["MINDMARK Social Intelligence"])


@router.get("/dashboard", response_model=StandardAPIResponse)
def get_social_dashboard(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.get_dashboard(user["id"]))


@router.get("/users/search", response_model=StandardAPIResponse)
def search_social_users(q: str = Query(..., min_length=1), user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.search_users_by_username(q))


# --- SQUADS & BATTLES ---
@router.get("/squads", response_model=StandardAPIResponse)
def list_squads(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.list_squads(user["id"]))


@router.post("/squads", response_model=StandardAPIResponse)
def create_squad(req: SocialSquadCreateRequest, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.create_squad(user["id"], req.model_dump()))


@router.get("/squads/{squad_id}", response_model=StandardAPIResponse)
def get_squad(squad_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.get_squad_detail(squad_id, user["id"]))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/squads/{squad_id}/invite", response_model=StandardAPIResponse)
def invite_to_squad(squad_id: str, req: SocialSquadInviteRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.invite_to_squad(squad_id, user["id"], req.invitee_email))
    except PermissionError as e:
        raise HTTPException(status_code=403 if "FORBIDDEN" in str(e) else 409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invitations/{invitation_id}/accept", response_model=StandardAPIResponse)
def accept_squad_invitation(invitation_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.accept_invitation(invitation_id, user["id"]))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/squads/join-code", response_model=StandardAPIResponse)
def join_squad_by_code(req: SocialSquadJoinCodeRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.join_by_code(user["id"], req.invite_code))
    except PermissionError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/squads/{squad_id}/leave", response_model=StandardAPIResponse)
def leave_squad(squad_id: str, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.leave_squad(squad_id, user["id"]))


@router.post("/squads/{squad_id}/roles", response_model=StandardAPIResponse)
def assign_squad_role(squad_id: str, req: SocialSquadRoleRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.assign_role(squad_id, user["id"], req.member_user_id, req.role))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/squads/{squad_id}/battles", response_model=StandardAPIResponse)
def create_squad_battle(squad_id: str, req: SocialSquadBattleCreateRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.create_battle(squad_id, user["id"], req.model_dump()))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/battles/{battle_id}/join/{squad_id}", response_model=StandardAPIResponse)
def join_squad_battle(battle_id: str, squad_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.join_battle(battle_id, squad_id, user["id"]))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/battles/{battle_id}/contribute/{squad_id}", response_model=StandardAPIResponse)
def contribute_squad_battle(battle_id: str, squad_id: str, req: SocialSquadBattleContributeRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.contribute_to_battle(battle_id, squad_id, user["id"], req.analysis))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/battles/{battle_id}/submit/{squad_id}", response_model=StandardAPIResponse)
def submit_squad_battle(battle_id: str, squad_id: str, req: SocialSquadBattleSubmitRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.submit_battle(battle_id, squad_id, user["id"], req.model_dump()))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- FRIEND CHALLENGES (REUSING ARENA_FRIEND_CHALLENGES) ---
@router.post("/friend-challenges", response_model=StandardAPIResponse)
def create_social_friend_challenge(req: ArenaFriendChallengeCreateRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=arena_service.create_friend_challenge(user["id"], req.model_dump()))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/friend-challenges", response_model=StandardAPIResponse)
def list_social_friend_challenges(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=arena_service.list_friend_challenges(user["id"]))


@router.post("/friend-challenges/{challenge_id}/accept", response_model=StandardAPIResponse)
def accept_social_friend_challenge(challenge_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=arena_service.accept_friend_challenge(challenge_id, user["id"]))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/friend-challenges/{challenge_id}/submit", response_model=StandardAPIResponse)
def submit_social_friend_challenge(challenge_id: str, req: ArenaSubmitRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.submit_friend_challenge(challenge_id, user["id"], req.model_dump()))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/friend-challenges/{challenge_id}/results", response_model=StandardAPIResponse)
def get_social_friend_challenge_results(challenge_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.get_friend_challenge_results(challenge_id, user["id"]))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- DECISION DEBATES ---
@router.get("/debates", response_model=StandardAPIResponse)
def list_debates(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.list_debates(user["id"]))


@router.post("/debates", response_model=StandardAPIResponse)
def create_debate(req: SocialDebateCreateRequest, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.create_debate(user["id"], req.model_dump()))


@router.post("/debates/{debate_id}/submissions", response_model=StandardAPIResponse)
def submit_debate(debate_id: str, req: SocialDebateSubmitRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.submit_debate_entry(debate_id, user["id"], req.model_dump()))
    except PermissionError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/debates/{debate_id}/reactions", response_model=StandardAPIResponse)
def react_debate(debate_id: str, submission_id: str = Query(...), req: SocialReactionRequest = ..., user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.react_to_debate(debate_id, submission_id, req.reaction))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/debates/{debate_id}/report", response_model=StandardAPIResponse)
def report_debate(debate_id: str, req: SocialReportRequest, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.report_content(user["id"], "DEBATE", debate_id, req.reason))


# --- CROWD MIRROR ---
@router.get("/crowd-mirror/scenarios", response_model=StandardAPIResponse)
def list_crowd_scenarios(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.list_crowd_scenarios(user["id"]))


@router.post("/crowd-mirror/{scenario_id}/submit", response_model=StandardAPIResponse)
def submit_crowd_mirror(scenario_id: str, req: SocialCrowdSubmitRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.submit_crowd_mirror(scenario_id, user["id"], req.model_dump()))
    except PermissionError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/crowd-mirror/{scenario_id}/results", response_model=StandardAPIResponse)
def get_crowd_results(scenario_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.get_crowd_mirror_results(scenario_id, user["id"]))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- COMMUNITY FEED & MODERATION ---
@router.get("/feed", response_model=StandardAPIResponse)
def get_social_feed(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50), user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.get_feed(user["id"], page=page, limit=limit))


@router.post("/posts", response_model=StandardAPIResponse)
def create_social_post(req: SocialPostCreateRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.create_post(user["id"], req.model_dump()))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/posts/{post_id}/comments", response_model=StandardAPIResponse)
def comment_social_post(post_id: str, req: SocialCommentRequest, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.comment_post(post_id, user["id"], req.content))


@router.post("/posts/{post_id}/reactions", response_model=StandardAPIResponse)
def react_social_post(post_id: str, req: SocialReactionRequest, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.react_post(post_id, req.reaction))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/posts/{post_id}/report", response_model=StandardAPIResponse)
def report_social_post(post_id: str, req: SocialReportRequest, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.report_content(user["id"], "POST", post_id, req.reason))


@router.delete("/posts/{post_id}", response_model=StandardAPIResponse)
def delete_social_post(post_id: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.delete_post(post_id, user["id"]))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/block/{target_user_id}", response_model=StandardAPIResponse)
def block_social_user(target_user_id: str, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.block_user(user["id"], target_user_id))


# --- PROFILES, PRIVACY & NOTIFICATIONS ---
@router.get("/profile/{username}", response_model=StandardAPIResponse)
def get_social_public_profile(username: str, user: dict = Depends(get_current_user_strict)):
    try:
        return StandardAPIResponse(success=True, data=social_service.get_public_profile(username))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/profile/privacy", response_model=StandardAPIResponse)
def patch_social_privacy(req: SocialPrivacyPatchRequest, user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.patch_privacy(user["id"], req.model_dump()))


@router.get("/notifications", response_model=StandardAPIResponse)
def get_social_notifications(user: dict = Depends(get_current_user_strict)):
    return StandardAPIResponse(success=True, data=social_service.get_notifications(user["id"]))
