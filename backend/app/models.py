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
    title: str = Field(..., min_length=5, max_length=180)
    content: str = Field(..., min_length=10)
    tags: str = "general"

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
    action: Literal["APPROVE", "DELETE", "LOCK", "PIN", "DISMISS"]
    moderator_notes: Optional[str] = None

