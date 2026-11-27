import sqlite3
import json
import uuid
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.app.config import settings

DB_FILE = "mindmark.db"

def get_connection():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Core user & trading tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        hashed_password TEXT NOT NULL,
        experience_level TEXT DEFAULT 'BEGINNER',
        role TEXT DEFAULT 'USER',
        reputation_points INTEGER DEFAULT 120,
        learning_streak_days INTEGER DEFAULT 5,
        total_learning_xp INTEGER DEFAULT 1150,
        current_tier_level INTEGER DEFAULT 3,
        avatar_url TEXT,
        bio TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Try to add role column and reputation if table already existed without them
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN reputation_points INTEGER DEFAULT 120;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN bio TEXT;")
    except Exception:
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS virtual_portfolios (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        starting_cash REAL DEFAULT 100000.00,
        current_cash REAL DEFAULT 51300.00,
        total_portfolio_value REAL DEFAULT 100000.00,
        realized_pnl REAL DEFAULT 0.00,
        unrealized_pnl REAL DEFAULT 867.60,
        reset_count INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS portfolio_positions (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        sector TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        average_buy_price REAL NOT NULL,
        current_price REAL NOT NULL,
        stop_loss REAL,
        target_price REAL,
        trade_reason TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (portfolio_id) REFERENCES virtual_portfolios (id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        portfolio_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        action TEXT NOT NULL,
        order_type TEXT NOT NULL,
        product_type TEXT DEFAULT 'CNC',
        leverage_multiplier REAL DEFAULT 1.0,
        quantity INTEGER NOT NULL,
        execution_price REAL NOT NULL,
        total_value REAL NOT NULL,
        simulated_charges REAL DEFAULT 0.00,
        stop_loss REAL,
        target_price REAL,
        reason_tag TEXT,
        learning_moment TEXT,
        risk_checks_triggered TEXT,
        executed_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_lesson_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        completed INTEGER DEFAULT 1,
        completed_at TEXT NOT NULL,
        UNIQUE (user_id, lesson_id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_quest_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        current_progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        claimed_at TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE (user_id, quest_id)
    );
    """)

    # --------------------------------------------------------------------------
    # 1. HOT TOPICS & NEWS ECOSYSTEM
    # --------------------------------------------------------------------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hot_topics (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        source TEXT NOT NULL,
        source_url TEXT NOT NULL,
        image_url TEXT,
        read_time_minutes INTEGER DEFAULT 4,
        sentiment TEXT DEFAULT 'Neutral',
        related_assets TEXT,
        related_course_id TEXT,
        related_forum_tag TEXT,
        views_count INTEGER DEFAULT 0,
        bookmarks_count INTEGER DEFAULT 0,
        is_breaking INTEGER DEFAULT 0,
        is_trending INTEGER DEFAULT 0,
        published_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS news_bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        article_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, article_id)
    );
    """)

    # --------------------------------------------------------------------------
    # 2. COMMUNITY FORUMS
    # --------------------------------------------------------------------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forum_threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT DEFAULT 'Learner',
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        upvotes_count INTEGER DEFAULT 0,
        replies_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        is_pinned INTEGER DEFAULT 0,
        is_locked INTEGER DEFAULT 0,
        status TEXT DEFAULT 'PUBLISHED',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forum_comments (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        parent_id TEXT,
        user_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT DEFAULT 'Learner',
        content TEXT NOT NULL,
        upvotes_count INTEGER DEFAULT 0,
        is_solution INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES forum_threads (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS thread_reactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        thread_id TEXT,
        comment_id TEXT,
        reaction_type TEXT DEFAULT 'UPVOTE',
        created_at TEXT NOT NULL,
        UNIQUE (user_id, thread_id, comment_id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS thread_bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, thread_id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS content_reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        status TEXT DEFAULT 'PENDING',
        moderator_notes TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # --------------------------------------------------------------------------
    # 3. LEARN & TEACH ACADEMY
    # --------------------------------------------------------------------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS academy_courses (
        id TEXT PRIMARY KEY,
        track TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        level TEXT NOT NULL,
        instructor_id TEXT NOT NULL,
        instructor_name TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        lessons_count INTEGER NOT NULL,
        students_enrolled INTEGER DEFAULT 0,
        rating REAL DEFAULT 4.9,
        is_featured INTEGER DEFAULT 0,
        is_approved INTEGER DEFAULT 1,
        thumbnail_url TEXT,
        prerequisites TEXT,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS academy_lessons (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        lesson_order INTEGER NOT NULL,
        content_type TEXT DEFAULT 'ARTICLE',
        content_markdown TEXT NOT NULL,
        video_url TEXT,
        resource_url TEXT,
        FOREIGN KEY (course_id) REFERENCES academy_courses (id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS academy_quizzes (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        lesson_id TEXT,
        title TEXT NOT NULL,
        passing_score INTEGER DEFAULT 80,
        questions_json TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES academy_courses (id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS academy_quiz_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        quiz_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        answers_json TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_academy_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        completed INTEGER DEFAULT 1,
        completed_at TEXT NOT NULL,
        UNIQUE (user_id, course_id, lesson_id)
    );
    """)

    # --------------------------------------------------------------------------
    # 4. MARKET INTELLIGENCE & PERSONALIZATION
    # --------------------------------------------------------------------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_watchlists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        target_price REAL,
        alert_enabled INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, symbol)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT DEFAULT 'SYSTEM',
        action_url TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_followed_topics (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, topic)
    );
    """)

    conn.commit()

    # Seed initial datasets if tables empty
    seed_demo_user(conn)
    seed_ecosystem_data(conn)
    conn.close()

def seed_demo_user(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = 'demo@mindmark.app'")
    existing = cursor.fetchone()
    now = datetime.utcnow().isoformat()
    if not existing:
        demo_user_id = "user-demo-mindmark-001"
        cursor.execute("""
        INSERT INTO users (id, email, full_name, hashed_password, experience_level, role, reputation_points, learning_streak_days, total_learning_xp, current_tier_level, bio, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (demo_user_id, "demo@mindmark.app", "Arjun Sharma", "demo_hashed_password_123", "INTERMEDIATE", "ADMIN", 450, 7, 2450, 4, "Fintech & Web3 enthusiast exploring crypto tokenomics and forex liquidity models.", now))

        portfolio_id = "port-demo-mindmark-001"
        cursor.execute("""
        INSERT INTO virtual_portfolios (id, user_id, starting_cash, current_cash, total_portfolio_value, realized_pnl, unrealized_pnl, reset_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (portfolio_id, demo_user_id, 100000.00, 51300.00, 100867.60, 0.00, 867.60, 0, now))

        sample_positions = [
            ("pos-1", portfolio_id, "RELIANCE", "Reliance Industries Ltd.", "Energy & Retail", 10, 2890.00, 2985.40, 2820.00, 3150.00, "Long-term Retail & Telecom 5G monetization", now),
            ("pos-2", portfolio_id, "HDFCBANK", "HDFC Bank Ltd.", "Banking & Financials", 12, 1650.00, 1642.80, 1610.00, 1800.00, "Core compounder banking franchise", now)
        ]

        for p in sample_positions:
            cursor.execute("""
            INSERT INTO portfolio_positions (id, portfolio_id, symbol, name, sector, quantity, average_buy_price, current_price, stop_loss, target_price, trade_reason, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, p)

        cursor.execute("""
        INSERT INTO trades (id, user_id, portfolio_id, symbol, name, action, order_type, product_type, leverage_multiplier, quantity, execution_price, total_value, simulated_charges, reason_tag, learning_moment, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("ord-seed-01", demo_user_id, portfolio_id, "RELIANCE", "Reliance Industries Ltd.", "BUY", "MARKET", "CNC", 1.0, 10, 2890.00, 28900.00, 14.45, "Long-term Fundamental Value", "Your purchase increased your exposure to the Energy & Retail sector. Ensure diversification.", now))
    else:
        # Ensure demo user has admin role
        cursor.execute("UPDATE users SET role = 'ADMIN' WHERE email = 'demo@mindmark.app'")
    conn.commit()

def seed_ecosystem_data(conn):
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    demo_user_id = "user-demo-mindmark-001"

    # 1. Hot Topics & News Seeds
    cursor.execute("SELECT COUNT(*) FROM hot_topics")
    if cursor.fetchone()[0] == 0:
        articles = [
            (
                "news-btc-etf",
                "Bitcoin Inflows Cross $2.1B as Institutional Reserves Expand",
                "Spot Bitcoin ETFs witnessed their third-largest single-day inflow record this week, anchored by pension and sovereign allocations.",
                "Institutional capital inflow into Bitcoin spot ETFs reached new historic milestones this quarter, with aggregate net assets under management topping $65 Billion globally. Traditional asset managers cite portfolio diversification and non-correlated asset dynamics. Regulators maintain stringent surveillance on custodian liquidity and redemption mechanics.",
                "Cryptocurrency",
                "Bitcoin & Ethereum",
                "Bloomberg Crypto",
                "https://www.bloomberg.com/crypto",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
                5,
                "Bullish",
                "BTC,ETH",
                "course-crypto-101",
                "bitcoin-halving",
                1420,
                88,
                1,
                1,
                now
            ),
            (
                "news-eth-dencun",
                "Ethereum Layer 2 Gas Fees Plummet 90% Following Blobspace Adoption",
                "Data availability improvements via EIP-4844 dramatically reduce roll-up operational costs across Arbitrum, Optimism, and Base.",
                "The rollout of Proto-Danksharding (EIP-4844) has successfully enabled modular rollups to post transaction data to blobs rather than calldata. As a direct result, end-user swap and transfer costs on major Layer 2 networks plummeted from $0.45 down to fractions of a cent, accelerating decentralized application adoption.",
                "Blockchain",
                "Layer 1 and Layer 2",
                "CoinDesk Tech",
                "https://www.coindesk.com",
                "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800&auto=format&fit=crop",
                4,
                "Bullish",
                "ETH,ARB,OP",
                "course-blockchain-101",
                "layer-2-scaling",
                980,
                64,
                0,
                1,
                now
            ),
            (
                "news-forex-dxy",
                "US Dollar Index Tests 104.20 Resistance as Fed Signals Cautious Rate Trajectory",
                "The greenback strengthened across major currency pairs as persistent core inflation figures lowered market odds of near-term rate cuts.",
                "The DXY index advanced toward three-month highs after Federal Reserve policymakers reiterated that interest rates will remain restrictive until inflation convincingly approaches the 2.0% target. The Japanese Yen touched multi-decade intervention thresholds at 154.50, prompting ministry cautions.",
                "Forex",
                "Global Markets",
                "Reuters Markets",
                "https://www.reuters.com/markets/currencies",
                "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop",
                4,
                "Neutral",
                "USD,EUR,JPY,INR",
                "course-forex-101",
                "forex-macro-interest-rates",
                1130,
                42,
                0,
                1,
                now
            ),
            (
                "news-defi-aave",
                "DeFi Total Value Locked Surpasses $100 Billion Amid Lending Protocol Innovation",
                "Decentralized money markets and liquid staking protocols experience renewed liquidity depth with institutional permissioned pools.",
                "Decentralized Finance (DeFi) protocols have registered steady TVL expansion over the last two quarters. Protocols like Aave and Compound are deploying isolated risk pools to facilitate tokenized real-world assets (RWAs), bridging private credit directly into on-chain liquidity rails.",
                "DeFi",
                "Decentralized Finance",
                "The Block",
                "https://www.theblock.co",
                "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop",
                6,
                "Bullish",
                "AAVE,MKR,UNI",
                "course-blockchain-101",
                "defi-lending-mechanics",
                740,
                31,
                0,
                0,
                now
            ),
            (
                "news-inr-rbi",
                "Rupee Demonstrates Low Volatility Against Greenback Backed by $650B Forex Reserves",
                "RBI foreign exchange reserves hit record peaks, dampening speculative currency swings in USD/INR spot forwards.",
                "The Indian Rupee traded within a tightly controlled 83.20 - 83.55 corridor against the US Dollar. The Reserve Bank of India’s aggressive two-way intervention and record $650+ billion reserve buffers shielded Dalal Street equities and corporate dollar debtors from global currency volatility.",
                "Forex",
                "Trading & Regulations",
                "Mint Currency",
                "https://www.livemint.com",
                "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
                3,
                "Neutral",
                "USDINR",
                "course-forex-101",
                "forex-risk-management",
                890,
                55,
                0,
                0,
                now
            ),
            (
                "news-solana-tps",
                "Solana Network Throughput Reaches 2,800 TPS with Firedancer Validator Progress",
                "Jump Crypto’s independent C++ validator client enters public testnet, offering redundancy and enhanced fault tolerance.",
                "Solana’s validator ecosystem is progressing toward true multi-client diversity. Firedancer, developed by Jump Crypto, aims to address throughput bottlenecks and software monoculture, paving the way for low-latency decentralized orderbooks and high-frequency settlement.",
                "Altcoins",
                "Web3",
                "Decrypt",
                "https://decrypt.co",
                "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&auto=format&fit=crop",
                4,
                "Bullish",
                "SOL",
                "course-crypto-101",
                "solana-architecture",
                820,
                48,
                0,
                0,
                now
            )
        ]

        cursor.executemany("""
        INSERT INTO hot_topics (id, title, summary, content, category, subcategory, source, source_url, image_url, read_time_minutes, sentiment, related_assets, related_course_id, related_forum_tag, views_count, bookmarks_count, is_breaking, is_trending, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, articles)

    # 2. Academy Courses Seeds
    cursor.execute("SELECT COUNT(*) FROM academy_courses")
    if cursor.fetchone()[0] == 0:
        courses = [
            (
                "course-blockchain-101",
                "BLOCKCHAIN",
                "Blockchain Architecture & Smart Contract Foundations",
                "From cryptographic hashing and Byzantine Fault Tolerance to EVM smart contracts and Layer 2 rollups.",
                "Beginner",
                demo_user_id,
                "Dr. Priya Venkat (Web3 Architect)",
                120,
                5,
                420,
                4.95,
                1,
                1,
                "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop",
                "Basic understanding of digital technology",
                now
            ),
            (
                "course-crypto-101",
                "CRYPTO",
                "Cryptocurrency Fundamentals & Tokenomics Engineering",
                "Understand Bitcoin halving economics, wallet security, DeFi liquidity pools, and on-chain metrics.",
                "Beginner",
                demo_user_id,
                "Arjun Sharma (Fintech Lead)",
                95,
                4,
                680,
                4.92,
                1,
                1,
                "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
                "None",
                now
            ),
            (
                "course-forex-101",
                "FOREX",
                "Forex Currency Mechanics & Risk Mitigation Strategy",
                "Master pips, lot sizing, currency pairs, central bank interest rate differentials, and disciplined leverage controls.",
                "Intermediate",
                demo_user_id,
                "Vikram Malhotra (FX Strategist)",
                110,
                5,
                510,
                4.88,
                1,
                1,
                "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop",
                "Basic algebra and risk awareness",
                now
            ),
            (
                "course-defi-201",
                "BLOCKCHAIN",
                "DeFi Protocols: Automated Market Makers & Lending Pools",
                "Deep dive into Uniswap constant product formulas (x*y=k), impermanent loss, and flash loans.",
                "Advanced",
                demo_user_id,
                "Dr. Priya Venkat (Web3 Architect)",
                140,
                4,
                290,
                4.97,
                0,
                1,
                "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800&auto=format&fit=crop",
                "Completion of Blockchain Architecture 101",
                now
            ),
            (
                "course-forex-ta-201",
                "FOREX",
                "Technical Analysis & Order Flow in FX Markets",
                "Multi-timeframe analysis, fair value gaps, liquidity sweeps, and managing drawdown in high-volatility sessions.",
                "Advanced",
                demo_user_id,
                "Vikram Malhotra (FX Strategist)",
                130,
                4,
                340,
                4.91,
                0,
                1,
                "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
                "Completion of Forex Currency Mechanics 101",
                now
            )
        ]

        cursor.executemany("""
        INSERT INTO academy_courses (id, track, title, description, level, instructor_id, instructor_name, duration_minutes, lessons_count, students_enrolled, rating, is_featured, is_approved, thumbnail_url, prerequisites, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, courses)

        # Lessons for Blockchain 101
        lessons = [
            (
                "les-bc-1",
                "course-blockchain-101",
                "What is Blockchain? The Distributed Ledger Revolution",
                "Understand why peer-to-peer decentralized state machines solve the double-spending problem without central banks.",
                20,
                1,
                "ARTICLE",
                "### The Core Problem: Trust and Double-Spending\n\nIn traditional digital systems, sending money is analogous to sending a copy of a file. If Alice sends Bob a PDF document, Alice still has the original file. To prevent Alice from spending the same digital balance twice, traditional finance introduced trusted intermediaries (central banks, clearing corporations, payment gateways).\n\n### The Blockchain Innovation\n\nA blockchain is a cryptographically secured, append-only, distributed ledger. Instead of a single bank server recording transactions, thousands of independent nodes maintain synchronized copies using consensus algorithms.",
                None,
                "https://mindmark.app/resources/blockchain-101-whitepaper.pdf"
            ),
            (
                "les-bc-2",
                "course-blockchain-101",
                "Consensus Mechanisms: Proof of Work vs Proof of Stake",
                "Compare energy-intensive cryptographic puzzles with economic stake validation and slashing penalties.",
                25,
                2,
                "ARTICLE",
                "### Proof of Work (PoW)\n\nIn PoW (used by Bitcoin), miners expend computational electricity to compute a cryptographic SHA-256 hash below a designated target difficulty. The work cannot be faked, creating thermodynamic security.\n\n### Proof of Stake (PoS)\n\nIn PoS (used by Ethereum 2.0), validators lock capital (32 ETH) into a smart contract as collateral. If a validator proposes or attests to a malicious block, their deposited stake is mathematically destroyed ('slashed'). PoS reduces energy consumption by over 99.95%.",
                None,
                "https://mindmark.app/resources/consensus-comparison.pdf"
            ),
            (
                "les-bc-3",
                "course-blockchain-101",
                "Smart Contracts: Programmable Autonomous Logic",
                "How Turing-complete virtual machines (EVM) execute immutable, self-enforcing code.",
                30,
                3,
                "ARTICLE",
                "### Code is Law — With Caveats\n\nA smart contract is code deployed to a blockchain address. When triggered by a transaction with sufficient gas, the contract executes predetermined functions deterministically across all validating nodes.",
                None,
                None
            ),
            (
                "les-crypto-1",
                "course-crypto-101",
                "Bitcoin Mechanics, Halving & Digital Scarcity",
                "The 21 million hard cap, 10-minute block targets, and 4-year block reward halving cycle.",
                25,
                1,
                "ARTICLE",
                "### Absolute Scarcity in a Digital World\n\nBitcoin introduces mathematically unforgeable scarcity. The issuance schedule decreases by 50% every 210,000 blocks (roughly every 4 years). This programmatic disinflation contrasts sharply with fiat currency expansion.",
                None,
                None
            ),
            (
                "les-forex-1",
                "course-forex-101",
                "Understanding Currency Pairs, Base & Quote",
                "EUR/USD, USD/INR, bid-ask spreads, and how quotes reflect macroeconomic purchasing parity.",
                20,
                1,
                "ARTICLE",
                "### The Structure of FX Quotes\n\nEvery forex transaction involves simultaneously buying one currency while selling another. In EUR/USD = 1.0850:\n- **EUR** is the Base Currency (always 1 unit).\n- **USD** is the Quote Currency (how much USD is needed to buy 1 EUR).\n\nIf the quote rises to 1.0900, the Euro has strengthened against the Dollar.",
                None,
                None
            )
        ]

        cursor.executemany("""
        INSERT INTO academy_lessons (id, course_id, title, description, duration_minutes, lesson_order, content_type, content_markdown, video_url, resource_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, lessons)

        # Seed Quiz for Blockchain 101
        quiz_questions = [
            {
                "id": 1,
                "question": "What primary problem does a decentralized blockchain ledger solve?",
                "options": [
                    "High internet latency",
                    "The double-spending problem without central authorities",
                    "Preventing computer viruses",
                    "Eliminating hardware wear and tear"
                ],
                "correct_option": 1,
                "explanation": "Blockchain uses distributed consensus to guarantee that digital money cannot be copied and spent simultaneously by the sender."
            },
            {
                "id": 2,
                "question": "In Proof of Stake, what happens to a validator who acts maliciously or proposes double-blocks?",
                "options": [
                    "They receive a warning email",
                    "Their electricity is shut off",
                    "A portion of their deposited collateral is permanently destroyed ('slashed')",
                    "Their CPU speed is throttled"
                ],
                "correct_option": 2,
                "explanation": "Slashing imposes direct financial loss on bad actors, enforcing economic security without computational brute-force."
            },
            {
                "id": 3,
                "question": "What is the hard-coded maximum supply limit of Bitcoin?",
                "options": [
                    "100 Million",
                    "21 Million",
                    "Infinite with 2% annual inflation",
                    "18.5 Million"
                ],
                "correct_option": 1,
                "explanation": "Bitcoin's consensus rules cap the total issuance at 21,000,000 BTC."
            }
        ]

        cursor.execute("""
        INSERT INTO academy_quizzes (id, course_id, lesson_id, title, passing_score, questions_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "quiz-bc-101",
            "course-blockchain-101",
            "les-bc-1",
            "Blockchain Architecture Readiness Check",
            75,
            json.dumps(quiz_questions)
        ))

    # 3. Community Forums Seeds
    cursor.execute("SELECT COUNT(*) FROM forum_threads")
    if cursor.fetchone()[0] == 0:
        threads = [
            (
                "thread-1",
                demo_user_id,
                "Arjun Sharma",
                "Fintech Architect",
                "Blockchain",
                "Layer 1 and Layer 2",
                "How EIP-4844 Blobspace is Changing Rollup Economics for Developers",
                "Now that proto-danksharding is live, gas costs on Arbitrum and Optimism have cratered by 90%+. What does this mean for high-frequency on-chain orderbooks? Are we finally close to matching centralized exchange latency on-chain?",
                "ethereum,layer2,gas-fees,scaling",
                28,
                3,
                340,
                1,
                0,
                "PUBLISHED",
                now,
                now
            ),
            (
                "thread-2",
                demo_user_id,
                "Rohan Joshi",
                "Crypto Trader",
                "Cryptocurrency",
                "Crypto market analysis",
                "Managing Downside Risk During Bitcoin Consolidations: Spot vs Futures",
                "Many beginners enter crypto futures with 20x leverage thinking it's an easy way to multiply modest capital, only to get liquidated on a 5% wick. What position sizing rules do you enforce in your own portfolio?",
                "bitcoin,risk-management,leverage,spot",
                45,
                4,
                512,
                0,
                0,
                "PUBLISHED",
                now,
                now
            ),
            (
                "thread-3",
                demo_user_id,
                "Pooja Mehta",
                "FX Analyst",
                "Forex",
                "Currency pairs",
                "USD/INR Key Levels Ahead of RBI Monetary Policy & Fed Commentary",
                "USD/INR has been hovering near the 83.35 - 83.50 band. With crude oil holding steady near $85/bbl and RBI forex reserves exceeding $650B, what is your outlook for carry trades over the next quarter?",
                "usdinr,rbi,forex,macro",
                32,
                2,
                290,
                0,
                0,
                "PUBLISHED",
                now,
                now
            ),
            (
                "thread-4",
                demo_user_id,
                "Aman Gupta",
                "Web3 Dev",
                "Blockchain",
                "Smart contracts",
                "Reentrancy Attacks in 2026: Why Checks-Effects-Interactions Still Matters",
                "Even with modern Solidity compilers having overflow checks built in by default (0.8+), reentrancy remains one of the top vulnerability vectors in DeFi audits. Here is a breakdown of why CEI and OpenZeppelin ReentrancyGuard are mandatory.",
                "solidity,security,audit,smart-contracts",
                39,
                1,
                410,
                0,
                0,
                "PUBLISHED",
                now,
                now
            )
        ]

        cursor.executemany("""
        INSERT INTO forum_threads (id, user_id, author_name, author_role, category, subcategory, title, content, tags, upvotes_count, replies_count, views_count, is_pinned, is_locked, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, threads)

        # Comments
        comments = [
            (
                "comm-1-1",
                "thread-1",
                None,
                demo_user_id,
                "Dr. Priya Venkat",
                "Web3 Architect",
                "The throughput improvement is genuine, but block time remains the upper bound. Rollups with centralized sequencers can offer sub-second soft confirmations, but state finality still depends on Ethereum L1 posting.",
                14,
                1,
                now
            ),
            (
                "comm-1-2",
                "thread-1",
                "comm-1-1",
                demo_user_id,
                "Arjun Sharma",
                "Fintech Architect",
                "Spot on! Shared sequencers like Espresso or Radius will be crucial to avoid single-sequencer downtime or censorship.",
                6,
                0,
                now
            ),
            (
                "comm-2-1",
                "thread-2",
                None,
                demo_user_id,
                "Vikram Malhotra",
                "FX Strategist",
                "My golden rule: never risk more than 1.5% of total portfolio value on any single speculative trade, regardless of conviction. High leverage is simply gambling without edge.",
                22,
                1,
                now
            )
        ]

        cursor.executemany("""
        INSERT INTO forum_comments (id, thread_id, parent_id, user_id, author_name, author_role, content, upvotes_count, is_solution, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, comments)

    # 4. Watchlist Seeds
    cursor.execute("SELECT COUNT(*) FROM user_watchlists")
    if cursor.fetchone()[0] == 0:
        watchlists = [
            ("wl-1", demo_user_id, "CRYPTO", "BTC", "Bitcoin", 68500.00, 1, "Core digital store of value", now),
            ("wl-2", demo_user_id, "CRYPTO", "ETH", "Ethereum", 3650.00, 1, "Smart contract platform leader", now),
            ("wl-3", demo_user_id, "CRYPTO", "SOL", "Solana", 175.00, 0, "High-throughput monolithic L1", now),
            ("wl-4", demo_user_id, "FOREX", "USDINR", "USD / INR", 83.45, 1, "Domestic currency baseline", now),
            ("wl-5", demo_user_id, "FOREX", "EURUSD", "EUR / USD", 1.0850, 0, "Global macro trade benchmark", now)
        ]
        cursor.executemany("""
        INSERT INTO user_watchlists (id, user_id, asset_type, symbol, name, target_price, alert_enabled, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, watchlists)

    # --------------------------------------------------------------------------
    # 6. MULTI-ASSET MARKETS, WATCHLISTS & CACHE TABLES
    # --------------------------------------------------------------------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_instruments (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        display_symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        asset_class TEXT NOT NULL,
        exchange TEXT NOT NULL,
        currency TEXT NOT NULL,
        sector_or_category TEXT,
        metadata_json TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE (asset_class, symbol)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_market_instruments_class_sym ON market_instruments(asset_class, symbol);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS watchlists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS watchlist_items (
        id TEXT PRIMARY KEY,
        watchlist_id TEXT NOT NULL,
        asset_class TEXT NOT NULL,
        symbol TEXT NOT NULL,
        exchange TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        target_price REAL,
        alert_enabled INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (watchlist_id) REFERENCES watchlists (id) ON DELETE CASCADE,
        UNIQUE (watchlist_id, asset_class, symbol)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_watchlist_items_wl_id ON watchlist_items(watchlist_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_data_cache (
        cache_key TEXT PRIMARY KEY,
        asset_class TEXT NOT NULL,
        symbol TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        source TEXT NOT NULL,
        provider_timestamp TEXT,
        retrieved_at TEXT NOT NULL,
        expires_at REAL NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_market_data_cache_sym ON market_data_cache(asset_class, symbol);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chart_drawings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        asset_class TEXT NOT NULL,
        symbol TEXT NOT NULL,
        tool_type TEXT NOT NULL,
        points_json TEXT NOT NULL,
        style_json TEXT,
        label TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chart_drawings_user_sym ON chart_drawings(user_id, asset_class, symbol);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chart_layouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        layout_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chart_layouts_user ON chart_layouts(user_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS custom_indicators (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        expression TEXT NOT NULL,
        color TEXT DEFAULT '#F5B942',
        pane TEXT DEFAULT 'OVERLAY',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_custom_indicators_user ON custom_indicators(user_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS financial_news_bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        article_id TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        published_at_ist TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE (user_id, article_id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_fin_news_bookmarks_user ON financial_news_bookmarks(user_id);")

    # 5. User Notifications Seeds
    cursor.execute("SELECT COUNT(*) FROM user_notifications")
    if cursor.fetchone()[0] == 0:
        notifications = [
            ("notif-1", demo_user_id, "Welcome to the Blockchain & Crypto Hub", "MINDMARK now features deep market intelligence and community forums across Web3 and Forex.", "SYSTEM", "/market-intelligence", 0, now),
            ("notif-2", demo_user_id, "Dr. Priya Venkat replied to your thread", "Your thread on 'EIP-4844 Blobspace' received an expert reply.", "COMMUNITY", "/forums", 0, now),
            ("notif-3", demo_user_id, "Academy Course Available", "New interactive course: 'Forex Currency Mechanics & Risk Mitigation Strategy' is now open for enrollment.", "ACADEMY", "/academy", 0, now)
        ]
        cursor.executemany("""
        INSERT INTO user_notifications (id, user_id, title, message, category, action_url, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, notifications)

    # 6. Multi-Watchlist Seeds for Demo User
    cursor.execute("SELECT COUNT(*) FROM watchlists WHERE user_id = ?", (demo_user_id,))
    if cursor.fetchone()[0] == 0:
        default_wl_id = "wl-core-001"
        cursor.execute("""
        INSERT INTO watchlists (id, user_id, name, description, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
        """, (default_wl_id, demo_user_id, "Core Multi-Asset", "Indian blue-chips, major crypto, and benchmark FX", now, now))
        seed_items = [
            ("wli-1", default_wl_id, "STOCK", "RELIANCE", "NSE", "Reliance Industries Ltd.", 0, None, 0, None, now),
            ("wli-2", default_wl_id, "STOCK", "TCS", "NSE", "Tata Consultancy Services Ltd.", 1, None, 0, None, now),
            ("wli-3", default_wl_id, "CRYPTO", "BTCUSDT", "BINANCE", "Bitcoin", 2, None, 0, None, now),
            ("wli-4", default_wl_id, "CRYPTO", "ETHUSDT", "BINANCE", "Ethereum", 3, None, 0, None, now),
            ("wli-5", default_wl_id, "FOREX", "USDINR", "FX", "US Dollar / Indian Rupee", 4, None, 0, None, now),
        ]
        cursor.executemany("""
        INSERT INTO watchlist_items (id, watchlist_id, asset_class, symbol, exchange, name, sort_order, target_price, alert_enabled, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_items)

    conn.commit()

init_db()
