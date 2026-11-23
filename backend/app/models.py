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
