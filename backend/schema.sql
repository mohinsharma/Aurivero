-- =============================================================================
-- MINDMARK — DATABASE SCHEMA (PostgreSQL / Supabase)
-- Premium AI-Powered Financial Market Learning & Paper-Trading Simulator
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USERS & PROFILES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    experience_level VARCHAR(50) DEFAULT 'BEGINNER',
    learning_streak_days INTEGER DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    total_learning_xp INTEGER DEFAULT 0,
    current_tier_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. ONBOARDING ASSESSMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    experience_level VARCHAR(50) NOT NULL,
    knowledge_score INTEGER NOT NULL,
    risk_tolerance VARCHAR(50) NOT NULL,
    assigned_path VARCHAR(50) NOT NULL,
    radar_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    answers_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. VIRTUAL PORTFOLIOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.virtual_portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    starting_cash NUMERIC(15, 2) DEFAULT 100000.00 NOT NULL,
    current_cash NUMERIC(15, 2) DEFAULT 100000.00 NOT NULL,
    total_portfolio_value NUMERIC(15, 2) DEFAULT 100000.00 NOT NULL,
    realized_pnl NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    unrealized_pnl NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    reset_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 4. PORTFOLIO POSITIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES public.virtual_portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    average_buy_price NUMERIC(12, 2) NOT NULL,
    current_price NUMERIC(12, 2) NOT NULL,
    stop_loss NUMERIC(12, 2),
    target_price NUMERIC(12, 2),
    trade_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_portfolio_symbol UNIQUE (portfolio_id, symbol)
);

-- -----------------------------------------------------------------------------
-- 5. TRADES & ORDER LEDGER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES public.virtual_portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT')),
    product_type VARCHAR(30) DEFAULT 'CNC' CHECK (product_type IN ('CNC', 'MIS_LEVERAGED', 'OPTIONS')),
    leverage_multiplier NUMERIC(5, 2) DEFAULT 1.0,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    execution_price NUMERIC(12, 2) NOT NULL,
    total_value NUMERIC(15, 2) NOT NULL,
    simulated_charges NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    stop_loss NUMERIC(12, 2),
    target_price NUMERIC(12, 2),
    reason_tag VARCHAR(255) NOT NULL,
    learning_moment TEXT,
    risk_checks_triggered JSONB DEFAULT '[]'::jsonb,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 6. BEHAVIORAL INSIGHTS & DISCIPLINE AUDITS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.behavioral_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    insight_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL CHECK (severity IN ('HIGH_RISK', 'MODERATE_BIAS', 'POSITIVE_HABIT', 'INSUFFICIENT_DATA')),
    evidence TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    concept_to_learn JSONB NOT NULL DEFAULT '{}'::jsonb,
    practice_exercise TEXT NOT NULL,
    supporting_metrics JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 7. HISTORICAL REPLAY SESSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.replay_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    scenario_id VARCHAR(100) NOT NULL,
    current_checkpoint INTEGER DEFAULT 0 NOT NULL,
    final_portfolio_value NUMERIC(15, 2),
    user_return_percent NUMERIC(8, 2),
    benchmark_return_percent NUMERIC(8, 2),
    max_drawdown NUMERIC(8, 2),
    ai_reflection JSONB,
    decisions_payload JSONB DEFAULT '[]'::jsonb,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- 8. LESSONS & PROGRESS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_modules (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(30) NOT NULL,
    estimated_time VARCHAR(50) NOT NULL,
    badge_reward VARCHAR(100) NOT NULL,
    sequence_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(100) NOT NULL,
    module_id VARCHAR(50) NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    quiz_score INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_lesson UNIQUE (user_id, lesson_id)
);

-- -----------------------------------------------------------------------------
-- 9. CHALLENGES & ETHICAL PROGRESSION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenge_quests (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    frequency VARCHAR(30) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MILESTONE')),
    reward_xp INTEGER NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    max_progress INTEGER NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_quest_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    quest_id VARCHAR(100) REFERENCES public.challenge_quests(id) ON DELETE CASCADE,
    current_progress INTEGER DEFAULT 0 NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    claimed BOOLEAN DEFAULT FALSE NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_quest UNIQUE (user_id, quest_id)
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

-- Users may only view and mutate their own records
CREATE POLICY "Users can only read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own portfolio" ON public.virtual_portfolios
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view and trade own positions" ON public.portfolio_positions
    FOR ALL USING (
        portfolio_id IN (SELECT id FROM public.virtual_portfolios WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view own trade history" ON public.trades
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own behavioral insights" ON public.behavioral_insights
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own replay sessions" ON public.replay_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own lesson progress" ON public.user_lesson_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own quest progress" ON public.user_quest_progress
    FOR ALL USING (auth.uid() = user_id);
