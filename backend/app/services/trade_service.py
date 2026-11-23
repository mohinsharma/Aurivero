import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.app.database import get_connection
from backend.app.services.market_data_service import market_data_service

class TradeService:
    @staticmethod
    def get_portfolio(user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM virtual_portfolios WHERE user_id = ?", (user_id,))
        portfolio = cursor.fetchone()
        if not portfolio:
            # Create if missing
            portfolio_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            cursor.execute("""
            INSERT INTO virtual_portfolios (id, user_id, starting_cash, current_cash, total_portfolio_value, realized_pnl, unrealized_pnl, reset_count, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (portfolio_id, user_id, 100000.00, 100000.00, 100000.00, 0.00, 0.00, 0, now))
            conn.commit()
            cursor.execute("SELECT * FROM virtual_portfolios WHERE id = ?", (portfolio_id,))
            portfolio = cursor.fetchone()

        portfolio_id = portfolio["id"]

        # Fetch open positions and refresh current prices
        cursor.execute("SELECT * FROM portfolio_positions WHERE portfolio_id = ?", (portfolio_id,))
        rows = cursor.fetchall()

        positions = []
        total_invested = 0.0
        total_holdings_value = 0.0

        for r in rows:
            sym = r["symbol"]
            stock = market_data_service.get_stock_by_symbol(sym)
            cur_price = stock["price"] if stock else r["current_price"]
            qty = r["quantity"]
            cost = r["average_buy_price"] * qty
            cur_val = cur_price * qty
            unrealized = cur_val - cost
            unrealized_pct = (unrealized / cost) * 100 if cost > 0 else 0.0

            total_invested += cost
            total_holdings_value += cur_val

            positions.append({
                "id": r["id"],
                "symbol": r["symbol"],
                "name": r["name"],
                "sector": r["sector"],
                "quantity": qty,
                "average_buy_price": r["average_buy_price"],
                "current_price": cur_price,
                "total_cost": cost,
                "current_value": cur_val,
                "unrealized_pnl": unrealized,
                "unrealized_pnl_percent": unrealized_pct,
                "stop_loss": r["stop_loss"],
                "target_price": r["target_price"],
                "trade_reason": r["trade_reason"]
            })

        current_cash = portfolio["current_cash"]
        total_portfolio_value = current_cash + total_holdings_value
        unrealized_pnl = total_holdings_value - total_invested
        unrealized_pnl_percent = (unrealized_pnl / total_invested) * 100 if total_invested > 0 else 0.0

        # Update portfolio summary
        cursor.execute("""
        UPDATE virtual_portfolios
        SET total_portfolio_value = ?, unrealized_pnl = ?, updated_at = ?
        WHERE id = ?
        """, (total_portfolio_value, unrealized_pnl, datetime.utcnow().isoformat(), portfolio_id))
        conn.commit()
        conn.close()

        return {
            "id": portfolio_id,
            "starting_cash": portfolio["starting_cash"],
            "current_cash": current_cash,
            "total_invested": total_invested,
            "total_holdings_value": total_holdings_value,
            "total_portfolio_value": total_portfolio_value,
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_percent": unrealized_pnl_percent,
            "realized_pnl": portfolio["realized_pnl"],
            "positions": positions,
            "is_simulated": True
        }

    @staticmethod
    def execute_order(user_id: str, order_data: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        portfolio = TradeService.get_portfolio(user_id)
        portfolio_id = portfolio["id"]
        current_cash = portfolio["current_cash"]
        total_portfolio_value = portfolio["total_portfolio_value"]

        symbol = order_data["symbol"].upper().strip()
        stock = market_data_service.get_stock_by_symbol(symbol)
        if not stock:
            conn.close()
            return {"success": False, "message": f"Stock ticker {symbol} not recognized on simulated exchange."}

        action = order_data["type"]
        quantity = order_data["quantity"]
        order_type = order_data.get("order_type", "MARKET")
        product_type = order_data.get("product_type", "CNC")
        leverage_multiplier = order_data.get("leverage_multiplier", 1.0)
        limit_price = order_data.get("limit_price")

        execution_price = limit_price if (order_type == "LIMIT" and limit_price and limit_price > 0) else stock["price"]
        gross_value = execution_price * quantity
        margin_required = (gross_value / leverage_multiplier) if (product_type == "MIS_LEVERAGED" and leverage_multiplier > 1) else gross_value
        charges = max(5.0, round(gross_value * 0.0005, 2))
        total_required_capital = margin_required + charges

        # Risk check evaluation
        risk_triggers = []
        if (gross_value / total_portfolio_value) > 0.25:
            risk_triggers.append("LARGE_POSITION_SIZE")
        if product_type != "CNC":
            risk_triggers.append("LEVERAGED_EXPOSURE")

        # BUY order
        if action == "BUY":
            if total_required_capital > current_cash:
                conn.close()
                return {
                    "success": False,
                    "message": f"Insufficient virtual funds. Required: ₹{total_required_capital:,.2f}, Available: ₹{current_cash:,.2f}"
                }

            new_cash = current_cash - total_required_capital

            cursor.execute("SELECT * FROM portfolio_positions WHERE portfolio_id = ? AND symbol = ?", (portfolio_id, symbol))
            existing_pos = cursor.fetchone()

            now = datetime.utcnow().isoformat()
            if existing_pos:
                old_qty = existing_pos["quantity"]
                old_cost = old_qty * existing_pos["average_buy_price"]
                new_qty = old_qty + quantity
                new_avg = (old_cost + gross_value) / new_qty
                cursor.execute("""
                UPDATE portfolio_positions
                SET quantity = ?, average_buy_price = ?, current_price = ?, updated_at = ?
                WHERE id = ?
                """, (new_qty, new_avg, execution_price, now, existing_pos["id"]))
            else:
                pos_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO portfolio_positions (id, portfolio_id, symbol, name, sector, quantity, average_buy_price, current_price, stop_loss, target_price, trade_reason, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (pos_id, portfolio_id, symbol, stock["name"], stock["sector"], quantity, execution_price, execution_price, order_data.get("stop_loss"), order_data.get("target_price"), order_data.get("reason_tag"), now))

            cursor.execute("""
            UPDATE virtual_portfolios SET current_cash = ?, updated_at = ? WHERE id = ?
            """, (new_cash, now, portfolio_id))

        # SELL order
        elif action == "SELL":
            cursor.execute("SELECT * FROM portfolio_positions WHERE portfolio_id = ? AND symbol = ?", (portfolio_id, symbol))
            existing_pos = cursor.fetchone()

            if not existing_pos or existing_pos["quantity"] < quantity:
                conn.close()
                owned = existing_pos["quantity"] if existing_pos else 0
                return {
                    "success": False,
                    "message": f"Cannot sell {quantity} shares of {symbol}. You currently own {owned} shares."
                }

            proceeds = gross_value - charges
            new_cash = current_cash + proceeds
            now = datetime.utcnow().isoformat()

            if existing_pos["quantity"] == quantity:
                cursor.execute("DELETE FROM portfolio_positions WHERE id = ?", (existing_pos["id"],))
            else:
                rem_qty = existing_pos["quantity"] - quantity
                cursor.execute("""
                UPDATE portfolio_positions SET quantity = ?, current_price = ?, updated_at = ? WHERE id = ?
                """, (rem_qty, execution_price, now, existing_pos["id"]))

            cursor.execute("""
            UPDATE virtual_portfolios SET current_cash = ?, updated_at = ? WHERE id = ?
            """, (new_cash, now, portfolio_id))

        # Log trade record
        order_id = f"ord-{uuid.uuid4().hex[:8]}"
        now_time = datetime.utcnow().isoformat()

        learning_moment = f"Simulated {action} order executed for {quantity} shares of {symbol} at ₹{executionPrice:,.2f}." if 'executionPrice' in locals() else f"Simulated {action} order executed for {quantity} shares of {symbol} at ₹{execution_price:,.2f}."

        cursor.execute("""
        INSERT INTO trades (id, user_id, portfolio_id, symbol, name, action, order_type, product_type, leverage_multiplier, quantity, execution_price, total_value, simulated_charges, stop_loss, target_price, reason_tag, learning_moment, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (order_id, user_id, portfolio_id, symbol, stock["name"], action, order_type, product_type, leverage_multiplier, quantity, execution_price, gross_value, charges, order_data.get("stop_loss"), order_data.get("target_price"), order_data.get("reason_tag"), learning_moment, now_time))

        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": f"Successfully executed virtual {action} of {quantity} shares of {symbol} at ₹{execution_price:,.2f} (Simulated fees: ₹{charges:,.2f})",
            "order_id": order_id,
            "executed_price": execution_price,
            "simulated_charges": charges,
            "learning_moment": learning_moment,
            "risk_checks_triggered": risk_triggers
        }

    @staticmethod
    def reset_portfolio(user_id: str) -> Dict[str, Any]:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM virtual_portfolios WHERE user_id = ?", (user_id,))
        p = cursor.fetchone()
        if p:
            pid = p["id"]
            cursor.execute("DELETE FROM portfolio_positions WHERE portfolio_id = ?", (pid,))
            cursor.execute("""
            UPDATE virtual_portfolios
            SET current_cash = 100000.00, starting_cash = 100000.00, total_portfolio_value = 100000.00,
                realized_pnl = 0.00, unrealized_pnl = 0.00, reset_count = reset_count + 1, updated_at = ?
            WHERE id = ?
            """, (datetime.utcnow().isoformat(), pid))
            conn.commit()
        conn.close()
        return {"success": True, "message": "Virtual portfolio restored to ₹1,00,000.00."}

trade_service = TradeService()
