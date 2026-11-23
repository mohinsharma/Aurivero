from typing import Dict, Any, List
from datetime import datetime
from backend.app.database import get_connection
from backend.app.services.trade_service import trade_service

class BehaviorService:
    @staticmethod
    def analyze_user_behavior(user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        # Fetch trade history
        cursor.execute("SELECT * FROM trades WHERE user_id = ? ORDER BY executed_at DESC", (user_id,))
        trades = cursor.fetchall()
        portfolio = trade_service.get_portfolio(user_id)
        conn.close()

        total_trades = len(trades)
        positions = portfolio["positions"]
        total_portfolio_val = max(portfolio["total_portfolio_value"], 1.0)

        # 1. Concentration Risk Pattern
        max_stock_weight = 0.0
        max_stock_sym = "None"
        for p in positions:
            weight = (p["current_value"] / total_portfolio_val) * 100
            if weight > max_stock_weight:
                max_stock_weight = weight
                max_stock_sym = p["symbol"]

        has_concentration = max_stock_weight > 35.0

        # 2. Overtrading Pattern
        has_overtrading = total_trades > 10

        # 3. Loss Chasing / Revenge Trading Pattern
        has_loss_chasing = False
        for i in range(len(trades) - 1):
            t_cur = trades[i]
            t_prev = trades[i + 1]
            if t_prev["action"] == "SELL" and t_cur["action"] == "BUY" and t_cur["total_value"] > t_prev["total_value"] * 1.3:
                has_loss_chasing = True
                break

        # 4. Stop-loss discipline
        trades_with_sl = sum(1 for t in trades if t["stop_loss"] is not None)
        sl_ratio = (trades_with_sl / total_trades) if total_trades > 0 else 0.8

        # 5-Pillar Scores (0-20 each, Total 0-100)
        div_score = 10 if has_concentration else 18
        risk_score = 10 if not (sl_ratio > 0.5) else 17
        disc_score = 11 if has_loss_chasing else 18
        cons_score = 12 if has_overtrading else 17
        freq_score = 11 if has_overtrading else 18

        overall = div_score + risk_score + disc_score + cons_score + freq_score

        tier = "Disciplined Mind" if overall >= 80 else "Developing Control" if overall >= 60 else "Impulsive Tendencies"

        patterns = [
            {
                "id": "pat-overtrading",
                "pattern_name": "Trade Frequency & Turnover Velocity",
                "severity": "MODERATE_BIAS" if has_overtrading else "POSITIVE_HABIT",
                "category": "Overtrading",
                "detected": has_overtrading,
                "evidence": f"Executed {total_trades} simulated orders in current lifecycle." if has_overtrading else "Maintained controlled, measured trade pacing without churn.",
                "why_it_matters": "High-frequency churning increases simulated slippage and triggers emotional burnout.",
                "concept_to_learn": {
                    "title": "Module 3: The Cost of Friction & Trading Activity Drag",
                    "route": "/learn"
                },
                "practice_exercise": "Limit new entries to maximum 2 high-conviction orders per weekly cycle.",
                "supporting_metrics": [
                    {"label": "Total Executed Trades", "value": str(total_trades), "benchmark": "< 5 per week"},
                    {"label": "Turnover Velocity", "value": "Normal" if not has_overtrading else "High", "benchmark": "Low-to-Medium"}
                ],
                "evaluated_trades_count": total_trades
            },
            {
                "id": "pat-loss-chasing",
                "pattern_name": "Loss Recovery Acceleration (Revenge Trading)",
                "severity": "HIGH_RISK" if has_loss_chasing else "POSITIVE_HABIT",
                "category": "Loss Chasing",
                "detected": has_loss_chasing,
                "evidence": "Increased position sizing immediately following a closed trade." if has_loss_chasing else "Order sizing remained consistent before and after previous trade exits.",
                "why_it_matters": "Attempting to make back lost capital quickly impairs analytical objectivity and leads to compounded drawdowns.",
                "concept_to_learn": {
                    "title": "Module 2: The Psychology of Sunk Cost & Revenge Trading",
                    "route": "/learn"
                },
                "practice_exercise": "Implement a mandatory 15-minute cooling off rule following any negative trade exit.",
                "supporting_metrics": [
                    {"label": "Size Multiplication After Loss", "value": "1.4x" if has_loss_chasing else "1.0x", "benchmark": "<= 1.0x"},
                    {"label": "Emotional Pause Adherence", "value": "Violated" if has_loss_chasing else "Maintained", "benchmark": "Pass"}
                ],
                "evaluated_trades_count": total_trades
            },
            {
                "id": "pat-concentration",
                "pattern_name": "Single Stock & Sector Overexposure",
                "severity": "HIGH_RISK" if has_concentration else "POSITIVE_HABIT",
                "category": "Concentration Risk",
                "detected": has_concentration,
                "evidence": f"Highest individual asset ({max_stock_sym}) holds {max_stock_weight:.1f}% of total portfolio." if has_concentration else f"All open holdings remain within the 35% safe allocation limit (Top holding: {max_stock_weight:.1f}%).",
                "why_it_matters": "Holding more than 35% in a single company makes your portfolio vulnerable to company-specific black swan events.",
                "concept_to_learn": {
                    "title": "Module 1: Modern Portfolio Theory & The Math of Non-Correlated Assets",
                    "route": "/learn"
                },
                "practice_exercise": "Rebalance portfolio so no individual asset commands more than 20% of net worth.",
                "supporting_metrics": [
                    {"label": "Max Single Stock Allocation", "value": f"{max_stock_weight:.1f}%", "benchmark": "< 35.0%"},
                    {"label": "Total Active Positions", "value": str(len(positions)), "benchmark": ">= 3 assets"}
                ],
                "evaluated_trades_count": total_trades
            }
        ]

        return {
            "overall_score": overall,
            "tier_label": tier,
            "diversification_score": div_score,
            "risk_management_score": risk_score,
            "trading_discipline_score": disc_score,
            "consistency_score": cons_score,
            "trade_frequency_score": freq_score,
            "patterns": patterns,
            "evaluated_at": datetime.utcnow().isoformat()
        }

behavior_service = BehaviorService()
