from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# AUTH & USER MODELS
# -----------------------------------------------------------------------------
class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    full_name: str
    password: str
    experience_level: Optional[str] = "BEGINNER"

class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    experience_level: str
    learning_streak_days: int
    total_learning_xp: int
    current_tier_level: int
    created_at: str

# -----------------------------------------------------------------------------
# ONBOARDING & ASSESSMENT
# -----------------------------------------------------------------------------
class AssessmentQuestionAnswer(BaseModel):
    question_id: int
    selected_option: int

class OnboardingSubmitRequest(BaseModel):
    experience_level: str
    answers: List[AssessmentQuestionAnswer]
    behavioral_choices: Optional[Dict[str, Any]] = None

class AssessmentResultResponse(BaseModel):
    knowledge_score: int
    total_questions: int
    assigned_path: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED"]
    risk_tolerance: str
    radar_scores: Dict[str, int]
    recommended_module: str
    pedagogical_summary: str

# -----------------------------------------------------------------------------
# TRADING & PORTFOLIO
# -----------------------------------------------------------------------------
class PreDecisionContractInput(BaseModel):
    why_making_decision: str = Field(..., min_length=2, max_length=300)
    biggest_risk: str = Field(..., min_length=2, max_length=300)
    what_proves_wrong: str = Field(..., min_length=2, max_length=300)
    planned_exposure_pct: float = Field(..., ge=0.0, le=100.0)
    confidence_level: int = Field(..., ge=1, le=5)
    short_explanation: Optional[str] = Field(None, max_length=500)

class DecisionEventCreateRequest(BaseModel):
    client_event_id: Optional[str] = Field(None, max_length=120)
    scenario_id: Optional[str] = None
    symbol: str = Field(..., min_length=1, max_length=30)
    sector: Optional[str] = None
    action: Literal["BUY", "SELL", "HOLD", "REDUCE"]
    execution_price: Optional[float] = Field(None, gt=0)
    quantity: float = Field(..., gt=0)
    portfolio_value_before: Optional[float] = Field(None, ge=0)
    portfolio_value_after: Optional[float] = Field(None, ge=0)
    cash_before: Optional[float] = Field(None, ge=0)
    cash_after: Optional[float] = Field(None, ge=0)
    stock_exposure_pct: Optional[float] = Field(None, ge=0, le=100)
    sector_exposure_pct: Optional[float] = Field(None, ge=0, le=100)
    market_change_pct: Optional[float] = None
    recent_drawdown_pct: Optional[float] = Field(0.0, ge=0)
    realized_pnl_delta: Optional[float] = 0.0
    stated_reason: Optional[str] = Field(None, max_length=300)
    confidence_level: Optional[int] = Field(None, ge=1, le=5)
    viewed_info: List[str] = Field(default_factory=list)
    decision_duration_sec: Optional[int] = Field(None, ge=0)
    pre_decision_contract: Optional[PreDecisionContractInput] = None

class TradeOrderRequest(BaseModel):
    symbol: str
    type: Literal["BUY", "SELL"]
    quantity: int = Field(gt=0, description="Quantity must be at least 1")
    order_type: Literal["MARKET", "LIMIT"] = "MARKET"
    product_type: Literal["CNC", "MIS_LEVERAGED", "OPTIONS"] = "CNC"
    leverage_multiplier: float = 1.0
    limit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    target_price: Optional[float] = None
    reason_tag: str = "Discretionary setup"
    client_event_id: Optional[str] = None
    viewed_info: List[str] = Field(default_factory=list)
    decision_duration_sec: Optional[int] = None
    pre_decision_contract: Optional[PreDecisionContractInput] = None

class PortfolioPositionModel(BaseModel):
    id: str
    symbol: str
    name: str
    quantity: int
    average_buy_price: float
    current_price: float
    total_cost: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    sector: str
    stop_loss: Optional[float] = None
    target_price: Optional[float] = None
    trade_reason: Optional[str] = None

class PortfolioSummaryResponse(BaseModel):
    starting_cash: float
    current_cash: float
    total_invested: float
    total_holdings_value: float
    total_portfolio_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    realized_pnl: float
    positions: List[PortfolioPositionModel]
    is_simulated: bool = True

class TradeOrderResponse(BaseModel):
    success: bool
    message: str
    order_id: Optional[str] = None
    executed_price: Optional[float] = None
    simulated_charges: Optional[float] = None
    learning_moment: Optional[str] = None
    risk_checks_triggered: Optional[List[str]] = None

# -----------------------------------------------------------------------------
# BEHAVIORAL INSIGHTS
# -----------------------------------------------------------------------------
class DetectedPatternModel(BaseModel):
    id: str
    pattern_name: str
    severity: Literal["HIGH_RISK", "MODERATE_BIAS", "POSITIVE_HABIT", "INSUFFICIENT_DATA"]
    category: str
    detected: bool
    evidence: str
    why_it_matters: str
    concept_to_learn: Dict[str, str]
    practice_exercise: str
    supporting_metrics: List[Dict[str, Any]]
    evaluated_trades_count: int

class BehavioralScoreResponse(BaseModel):
    overall_score: int
    tier_label: str
    diversification_score: int
    risk_management_score: int
    trading_discipline_score: int
    consistency_score: int
    trade_frequency_score: int
    patterns: List[DetectedPatternModel]
    evaluated_at: str

# -----------------------------------------------------------------------------
# HISTORICAL MARKET REPLAY
# -----------------------------------------------------------------------------
class ReplayDecisionRequest(BaseModel):
    scenario_id: str
    checkpoint_index: int
    action_id: Literal["AGGRESSIVE_BUY", "MODERATE_BUY", "HOLD", "REDUCE_EXPOSURE", "PANIC_EXIT"]
    reasoning: Optional[str] = None
    user_cash: float
    user_units: float

class ReplayDecisionResponse(BaseModel):
    next_checkpoint_index: int
    what_happened_next: str
    new_nifty_price: float
    updated_cash: float
    updated_units: float
    updated_portfolio_value: float
    is_scenario_complete: bool
    ai_reflection: Optional[Dict[str, Any]] = None

# -----------------------------------------------------------------------------
# CHALLENGES & GAMIFICATION
# -----------------------------------------------------------------------------
class QuestClaimRequest(BaseModel):
    quest_id: str

class QuestClaimResponse(BaseModel):
    success: bool
    awarded_xp: int
    new_total_xp: int
    new_tier_level: int
    message: str

# -----------------------------------------------------------------------------
# AI EXPLAINER & TUTOR
# -----------------------------------------------------------------------------
class AIExplainConceptRequest(BaseModel):
    concept_name: str
    user_context: Optional[str] = None

class AINewsExplainRequest(BaseModel):
    headline: str
    article_body: Optional[str] = None
    source: str
    published_at: str
    sector: str

class AITradeDebriefRequest(BaseModel):
    symbol: str
    action: str
    quantity: int
    price: float
    reason_tag: str
    portfolio_weight_percent: float
    has_stop_loss: bool
    is_after_loss: bool

# -----------------------------------------------------------------------------
# MINDMARK AI BUDDY — FINANCE-ONLY CHATBOT
# -----------------------------------------------------------------------------
class AIBuddyHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)

class AIBuddyContext(BaseModel):
    current_page: Optional[str] = None
    learning_level: Optional[str] = None
    completed_topics: Optional[List[str]] = None
    selected_stock: Optional[str] = None
    selected_stock_data: Optional[Dict[str, Any]] = None
    replay_scenario: Optional[str] = None
    replay_checkpoint: Optional[str] = None
    allow_portfolio_access: bool = True

class AIBuddyChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[AIBuddyHistoryItem] = Field(default_factory=list, max_length=20)
    context: Optional[AIBuddyContext] = None

# -----------------------------------------------------------------------------
# PHASE 3 — MIRROR MODE MODELS
# -----------------------------------------------------------------------------
class MirrorStartRequest(BaseModel):
    challenge_id: str
    is_practice: bool = False
    declared_strategy: Optional[str] = "Risk-controlled disciplined execution (max 25% single asset)"

class MirrorDecisionRequest(BaseModel):
    session_id: str
    stage_index: int = Field(..., ge=0)
    client_decision_id: Optional[str] = Field(None, max_length=120)
    action: str = Field(..., min_length=1, max_length=60)
    allocation: Optional[Dict[str, float]] = None
    reasoning: str = Field(..., min_length=3, max_length=1000)
    confidence_level: int = Field(..., ge=1, le=5)
    invalidation_trigger: Optional[str] = Field(None, max_length=300)
    reviewed_info: List[str] = Field(default_factory=list)

class MirrorCompleteRequest(BaseModel):
    session_id: str
    reflection_text: Optional[str] = Field("", max_length=1000)
    use_ai: bool = True

# -----------------------------------------------------------------------------
# PHASE 4 — MINDMARK ARENA MODELS
# -----------------------------------------------------------------------------
class ArenaStageDecision(BaseModel):
    stage_index: int = Field(..., ge=0)
    action: str = Field(..., min_length=1, max_length=60)
    reasoning: str = Field(..., min_length=3, max_length=1200)
    reviewed_info: List[str] = Field(default_factory=list)
    confidence_level: int = Field(default=3, ge=1, le=5)

class ArenaSubmitRequest(BaseModel):
    started_at: Optional[str] = None
    duration_sec: int = Field(default=60, ge=0, le=7200)
    is_practice: bool = False
    stage_decisions: List[ArenaStageDecision] = Field(default_factory=list)
    allocation: Optional[Dict[str, float]] = None
    selected_bias: Optional[str] = Field(None, max_length=120)
    mitigation_plan: Optional[str] = Field(None, max_length=1200)
    argument: Optional[str] = Field(None, max_length=2000)
    evidence: Optional[str] = Field(None, max_length=1500)
    risks: Optional[str] = Field(None, max_length=1500)
    reasoning: Optional[str] = Field(None, max_length=1500)
    reflection_text: Optional[str] = Field("", max_length=1200)
    reviewed_info: List[str] = Field(default_factory=list)
    use_ai: bool = True

class ArenaContestCreateRequest(BaseModel):
    contest_type: str = Field(..., pattern="^(CRASH_SURVIVOR|FOMO_TRAP|PORTFOLIO_ARCHITECT|DECISION_PRESSURE|ANALYST_DUEL|BIAS_BUSTER)$")
    title: str = Field(..., min_length=4, max_length=140)
    description: str = Field(..., min_length=10, max_length=800)
    difficulty: str = Field(default="Intermediate", pattern="^(Beginner|Intermediate|Advanced)$")
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    duration_minutes: int = Field(default=15, ge=2, le=180)
    time_window_sec: int = Field(default=180, ge=30, le=3600)
    league_scope: str = Field(default="GLOBAL", pattern="^(GLOBAL|UNIVERSITY|FRIENDS)$")
    university_name: Optional[str] = None
    rubric_version: str = Field(default="v1.0-arena", max_length=40)
    scenario: Dict[str, Any] = Field(default_factory=dict)

class ArenaStartRequest(BaseModel):
    is_practice: bool = False

class ArenaProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=2, max_length=80)
    public_leaderboard_opt_in: Optional[bool] = None
    share_university: Optional[bool] = None
    university_name: Optional[str] = Field(None, min_length=2, max_length=120)

class ArenaFriendChallengeCreateRequest(BaseModel):
    contest_id: str
    opponent_email: Optional[str] = None
    share_reasoning: bool = True
    expires_hours: int = Field(default=48, ge=1, le=168)

class ArenaFriendChallengeSubmitRequest(BaseModel):
    submission: ArenaSubmitRequest

# -----------------------------------------------------------------------------
# PHASE 5 — ADVANCED GAMIFICATION & PROGRESSION MODELS
# -----------------------------------------------------------------------------
class GamificationMissionCompleteRequest(BaseModel):
    reflection_note: Optional[str] = Field(None, max_length=600)

class GamificationSkillCompleteRequest(BaseModel):
    exercise_answer: Optional[str] = Field(None, max_length=800)
    use_ai: bool = True

# -----------------------------------------------------------------------------
# PHASE 6 — SOCIAL INTELLIGENCE MODELS
# -----------------------------------------------------------------------------
class SocialSquadCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=80)
    description: Optional[str] = Field("", max_length=300)
    avatar: Optional[str] = Field("Shield", max_length=40)
    university_name: Optional[str] = Field(None, max_length=120)

class SocialSquadInviteRequest(BaseModel):
    invitee_email: str = Field(..., min_length=3, max_length=180)

class SocialSquadJoinCodeRequest(BaseModel):
    invite_code: str = Field(..., min_length=4, max_length=32)

class SocialSquadRoleRequest(BaseModel):
    member_user_id: str
    role: str = Field(..., pattern="^(Market Analyst|Risk Officer|Portfolio Manager|Strategist|Researcher)$")

class SocialSquadBattleCreateRequest(BaseModel):
    title: str = Field(..., min_length=4, max_length=140)
    scenario_id: str = Field(default="sb-macro-shock")

class SocialSquadBattleContributeRequest(BaseModel):
    analysis: str = Field(..., min_length=10, max_length=1200)

class SocialSquadBattleSubmitRequest(BaseModel):
    decision_action: str = Field(..., min_length=2, max_length=60)
    team_reasoning: str = Field(..., min_length=10, max_length=1500)
    risk_plan: str = Field(..., min_length=10, max_length=1000)
    evidence_summary: str = Field(..., min_length=10, max_length=1000)
    final_reflection: Optional[str] = Field("", max_length=800)

class SocialDebateCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=160)
    case_text: str = Field(..., min_length=15, max_length=1500)
    format: str = Field(default="OPEN", pattern="^(1v1|OPEN|WEEKLY_FEATURED|UNIVERSITY)$")
    university_name: Optional[str] = None

class SocialDebateSubmitRequest(BaseModel):
    interpretation: str = Field(..., min_length=10, max_length=1500)
    evidence: str = Field(..., min_length=10, max_length=1200)
    risks: str = Field(..., min_length=10, max_length=1200)
    counterarguments: str = Field(..., min_length=10, max_length=1200)
    invalidation_info: str = Field(..., min_length=5, max_length=800)
    use_ai: bool = True

class SocialReactionRequest(BaseModel):
    reaction: str = Field(..., min_length=2, max_length=40)

class SocialReportRequest(BaseModel):
    reason: str = Field(..., min_length=4, max_length=400)

class SocialCrowdSubmitRequest(BaseModel):
    action: str = Field(..., min_length=2, max_length=60)
    risk_category: str = Field(..., pattern="^(Conservative|Balanced|Aggressive|Wait & Research)$")
    reasoning: str = Field(..., min_length=10, max_length=1200)
    reflection_text: Optional[str] = Field("", max_length=800)
    is_practice: bool = False

class SocialPostCreateRequest(BaseModel):
    post_type: str = Field(..., pattern="^(LESSON|BADGE|ARENA_RESULT|SQUAD_VICTORY|DEBATE|INSIGHT|MILESTONE)$")
    title: str = Field(..., min_length=3, max_length=140)
    content: str = Field(..., min_length=5, max_length=1500)
    shared_ref_id: Optional[str] = None

class SocialCommentRequest(BaseModel):
    content: str = Field(..., min_length=2, max_length=600)

class SocialPrivacyPatchRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=40)
    show_university: Optional[bool] = None
    show_squads: Optional[bool] = None
    show_achievements: Optional[bool] = None
    show_arena_rank: Optional[bool] = None
    notify_squads: Optional[bool] = None
    notify_challenges: Optional[bool] = None
    notify_debates: Optional[bool] = None

# -----------------------------------------------------------------------------
# PHASE 7 — PERSONALIZED GEMINI AI COACH MODELS
# -----------------------------------------------------------------------------
class AICoachChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    include_live_market: bool = True
    use_ai: bool = True

class AICoachDecisionReviewRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=30)
    action: str = Field(..., min_length=2, max_length=30)
    stated_reasoning: str = Field(..., min_length=3, max_length=1500)
    declared_strategy: Optional[str] = Field("Long-term risk-controlled allocation", max_length=400)
    position_size_pct: float = Field(default=10.0, ge=0.0, le=100.0)
    risk_limit_pct: float = Field(default=20.0, ge=1.0, le=100.0)
    market_context_at_time: Optional[str] = Field("", max_length=1000)
    contract_id: Optional[str] = None
    scenario_context: Optional[str] = Field("", max_length=800)
    use_ai: bool = True

class ArenaDuelCreateRequest(BaseModel):
    contest_id: str
    argument: str = Field(..., min_length=10, max_length=2000)
    evidence: str = Field(..., min_length=10, max_length=1500)
    risks: str = Field(..., min_length=10, max_length=1500)
    auto_match_benchmark: bool = True
    use_ai: bool = True

class ArenaDuelJoinRequest(BaseModel):
    argument: str = Field(..., min_length=10, max_length=2000)
    evidence: str = Field(..., min_length=10, max_length=1500)
    risks: str = Field(..., min_length=10, max_length=1500)
    use_ai: bool = True

class ArenaUniversityRequest(BaseModel):
    university_name: str = Field(..., min_length=2, max_length=120)

class ArenaFriendRequest(BaseModel):
    friend_email: str = Field(..., min_length=3, max_length=180)

class StandardAPIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None

# =============================================================================
# BLOCKCHAIN, CRYPTO & FOREX ECOSYSTEM MODELS
# =============================================================================

# 1. Hot Topics & News
class HotTopicArticleModel(BaseModel):
    id: str
    title: str
    summary: str
    content: str
    category: str
    subcategory: Optional[str] = None
    source: str
    source_url: str
    image_url: Optional[str] = None
    read_time_minutes: int = 4
    sentiment: str = "Neutral"
    related_assets: Optional[str] = None
    related_course_id: Optional[str] = None
    related_forum_tag: Optional[str] = None
    views_count: int = 0
    bookmarks_count: int = 0
    is_breaking: bool = False
    is_trending: bool = False
    is_bookmarked: bool = False
    published_at: str

class BookmarkToggleRequest(BaseModel):
    article_id: str

# 2. Community Forums
class ForumThreadCreate(BaseModel):
    category: str
    subcategory: str
    post_type: Literal[
        "QUESTION", "EXPERIENCE", "SCAM_ALERT", "PRODUCT_REVIEW",
        "POLL", "EDUCATIONAL", "FEEDBACK", "DISCUSSION"
    ] = "QUESTION"
    intent_badge: Optional[str] = None
    region: str = "India / INR"
    is_anonymous: bool = False
    related_course_id: Optional[str] = None
    disclosure_text: Optional[str] = None
    title: str = Field(..., min_length=5, max_length=180)
    content: str = Field(..., min_length=10)
    tags: str = "general"

class ForumPrecheckRequest(BaseModel):
    title: str = ""
    content: str = ""
    category: Optional[str] = None

class ForumAcceptAnswerRequest(BaseModel):
    comment_id: str

class ForumCommentCreate(BaseModel):
    thread_id: str
    parent_id: Optional[str] = None
    content: str = Field(..., min_length=2)

class ForumReactionRequest(BaseModel):
    thread_id: Optional[str] = None
    comment_id: Optional[str] = None
    reaction_type: Literal["UPVOTE", "LIKE"] = "UPVOTE"

class ForumReportRequest(BaseModel):
    content_type: Literal["THREAD", "COMMENT"]
    content_id: str
    reason: str
    details: Optional[str] = None

class ForumAppealCreate(BaseModel):
    content_type: Literal["THREAD", "COMMENT"]
    content_id: str
    reason: str = Field(..., min_length=10, max_length=500)

# 3. Academy
class CourseCreateRequest(BaseModel):
    track: Literal["BLOCKCHAIN", "CRYPTO", "FOREX", "FINANCE"]
    title: str
    description: str
    level: Literal["Beginner", "Intermediate", "Advanced"]
    duration_minutes: int = 60
    prerequisites: Optional[str] = None
    thumbnail_url: Optional[str] = None

class LessonCreateRequest(BaseModel):
    course_id: str
    title: str
    description: str
    duration_minutes: int = 15
    content_type: Literal["ARTICLE", "VIDEO", "INTERACTIVE"] = "ARTICLE"
    content_markdown: str
    video_url: Optional[str] = None
    resource_url: Optional[str] = None

class QuizSubmitRequest(BaseModel):
    quiz_id: str
    answers: Dict[int, int]  # question_id -> selected_option

# 4. Market Intelligence
class CurrencyConvertRequest(BaseModel):
    from_currency: str
    to_currency: str
    amount: float

class WatchlistAddRequest(BaseModel):
    asset_type: Literal["CRYPTO", "FOREX", "STOCK"]
    symbol: str
    name: str
    target_price: Optional[float] = None
    alert_enabled: bool = False
    notes: Optional[str] = None

# 5. Admin Panel
class ModerationActionRequest(BaseModel):
    content_type: Literal["THREAD", "COMMENT", "REPORT"]
    content_id: str
    action: Literal["APPROVE", "DELETE", "LOCK", "PIN", "DISMISS", "QUARANTINE"]
    policy_citation: Optional[str] = None
    moderator_notes: Optional[str] = None

class AppealResolveRequest(BaseModel):
    status: Literal["APPROVED", "REJECTED"]
    reviewer_notes: Optional[str] = None

