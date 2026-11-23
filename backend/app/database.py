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
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Create local sqlite tables matching the Supabase schema
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        hashed_password TEXT NOT NULL,
        experience_level TEXT DEFAULT 'BEGINNER',
        learning_streak_days INTEGER DEFAULT 5,
        total_learning_xp INTEGER DEFAULT 1150,
        current_tier_level INTEGER DEFAULT 3,
        created_at TEXT NOT NULL
    );
    """)

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

    conn.commit()

    # Seed demo user and default positions if not present
    seed_demo_user(conn)
    conn.close()

def seed_demo_user(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = 'demo@mindmark.app'")
    existing = cursor.fetchone()
    if not existing:
        demo_user_id = "user-demo-mindmark-001"
        now = datetime.utcnow().isoformat()
        cursor.execute("""
        INSERT INTO users (id, email, full_name, hashed_password, experience_level, learning_streak_days, total_learning_xp, current_tier_level, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (demo_user_id, "demo@mindmark.app", "Arjun Sharma", "demo_hashed_password_123", "INTERMEDIATE", 5, 1150, 3, now))

        portfolio_id = "port-demo-mindmark-001"
        cursor.execute("""
        INSERT INTO virtual_portfolios (id, user_id, starting_cash, current_cash, total_portfolio_value, realized_pnl, unrealized_pnl, reset_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (portfolio_id, demo_user_id, 100000.00, 51300.00, 100867.60, 0.00, 867.60, 0, now))

        # Initial sample holdings
        sample_positions = [
            ("pos-1", portfolio_id, "RELIANCE", "Reliance Industries Ltd.", "Energy & Retail", 10, 2890.00, 2985.40, 2820.00, 3150.00, "Long-term Retail & Telecom 5G monetization", now),
            ("pos-2", portfolio_id, "HDFCBANK", "HDFC Bank Ltd.", "Banking & Financials", 12, 1650.00, 1642.80, 1610.00, 1800.00, "Core compounder banking franchise", now)
        ]

        for p in sample_positions:
            cursor.execute("""
            INSERT INTO portfolio_positions (id, portfolio_id, symbol, name, sector, quantity, average_buy_price, current_price, stop_loss, target_price, trade_reason, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, p)

        # Initial trade history
        cursor.execute("""
        INSERT INTO trades (id, user_id, portfolio_id, symbol, name, action, order_type, product_type, leverage_multiplier, quantity, execution_price, total_value, simulated_charges, reason_tag, learning_moment, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("ord-seed-01", demo_user_id, portfolio_id, "RELIANCE", "Reliance Industries Ltd.", "BUY", "MARKET", "CNC", 1.0, 10, 2890.00, 28900.00, 14.45, "Long-term Fundamental Value", "Your purchase increased your exposure to the Energy & Retail sector. Ensure diversification.", now))

        conn.commit()

init_db()
