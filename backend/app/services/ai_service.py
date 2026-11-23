import os
import json
from typing import Dict, Any, Optional
from backend.app.config import settings

class AIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.is_live = False

        if self.api_key and len(self.api_key.strip()) > 10:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel(self.model_name)
                self.is_live = True
            except Exception as e:
                print(f"[AIService] Warning: Failed to initialize Gemini API client: {e}. Falling back to deterministic pedagogical engine.")
                self.is_live = False

    def explain_concept(self, concept_name: str, user_context: Optional[str] = None) -> Dict[str, Any]:
        """Explains financial concepts using structured plain-English pedagogy."""
        prompt = f"""
You are MINDMARK AI, an educational financial tutor for beginners in India.
Explain the financial concept: '{concept_name}'.
User Context: {user_context or 'Beginner retail investor in India'}

Provide your response in strict JSON format with the following keys:
- "concept_name": string
- "definition": 2-3 simple sentences without jargon
- "why_it_matters": explanation for an individual investor
- "real_world_example": everyday Indian scenario (e.g. groceries, bank fixed deposits, buying a scooter)
- "common_misconception": one big mistake beginners make
- "key_takeaway": 1 memorable sentence
"""
        if self.is_live:
            try:
                response = self.client.generate_content(prompt)
                text = response.text.strip()
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()
                parsed = json.loads(text)
                parsed["is_live_gemini"] = True
                return parsed
            except Exception as e:
                print(f"[AIService] Gemini API error: {e}. Using rule-based fallback.")

        # Deterministic Grounded Fallback
        return {
            "concept_name": concept_name,
            "definition": f"{concept_name} describes a fundamental financial relationship that dictates how asset prices, purchasing power, and capital returns evolve over time.",
            "why_it_matters": "Understanding this mechanism prevents emotional decision-making, protects your hard-earned savings from hidden erosion, and helps you evaluate risk realistically.",
            "real_world_example": "If a ₹100 grocery item costs ₹107 next year due to 7% inflation, your bank savings must yield more than 7% after taxes just to keep your real wealth intact.",
            "common_misconception": "Believing that short-term market price fluctuations represent permanent changes in a business's intrinsic underlying value.",
            "key_takeaway": "Discipline, asset diversification, and patience beat trying to predict day-to-day market timing.",
            "is_live_gemini": False
        }

    def explain_news(self, headline: str, source: str, published_at: str, sector: str, article_body: Optional[str] = None) -> Dict[str, Any]:
        """Transforms a financial news event into a 5-part educational deconstruction."""
        prompt = f"""
You are MINDMARK AI. Deconstruct this Indian financial news article for a beginner retail investor:
Headline: "{headline}"
Source: {source} ({published_at})
Sector: {sector}
Body Summary: {article_body or 'Not provided'}

Provide output in strict JSON format:
- "what_happened": 2-3 simple sentences
- "why_did_it_happen": root cause without unnecessary jargon
- "what_does_it_mean": market and sector implications
- "core_concept": {{ "name": string, "definition": string, "key_takeaway": string }}
- "understand_the_risk": why this event does NOT guarantee future stock price trajectory
- "knowledge_check": {{ "question": string, "options": [string, string, string, string], "correct_index": 0, "explanation": string }}
"""
        if self.is_live:
            try:
                response = self.client.generate_content(prompt)
                text = response.text.strip()
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()
                parsed = json.loads(text)
                parsed["is_live_gemini"] = True
                return parsed
            except Exception as e:
                print(f"[AIService] Gemini API error on news explain: {e}")

        # Deterministic Grounded Fallback
        return {
            "what_happened": f"A major development occurred in the {sector} sector: {headline}. Financial markets reacted as institutional and retail investors adjusted their near-term projections.",
            "why_did_it_happen": "Changes in economic policy, corporate operational numbers, or global macroeconomic factors shifted underlying supply-demand dynamics for affected companies.",
            "what_does_it_mean": f"Companies operating in {sector} may experience adjustments to revenue realization and operating margins, influencing forward earnings multiples.",
            "core_concept": {
                "name": "Market Discounting Mechanism",
                "definition": "The stock market continually discounts future expected corporate earnings rather than reacting solely to past events.",
                "key_takeaway": "Stock prices often move before news becomes public; good news can trigger sell-offs if expectations were already excessively high."
            },
            "understand_the_risk": "Even positive announcements can be followed by share price declines if the news was already 'priced in' by institutional traders.",
            "knowledge_check": {
                "question": f"When a significant news event impacts {sector}, why might share prices not rise despite good news?",
                "options": [
                    "Future growth was already anticipated and priced in by institutional investors.",
                    "The stock exchange automatically freezes prices for 30 days.",
                    "Companies are legally banned from earning profits after news announcements.",
                    "Interest rates automatically jump to 50%."
                ],
                "correct_index": 0,
                "explanation": "Markets are forward-looking discounting engines. When good news is already widely expected, investors often 'sell the news' to lock in past paper gains."
            },
            "is_live_gemini": False
        }

    def debrief_trade(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """Provides pedagogical behavioral feedback on a virtual trade decision."""
        symbol = trade_data.get("symbol", "N/A")
        action = trade_data.get("action", "BUY")
        weight = trade_data.get("portfolio_weight_percent", 0.0)
        has_stop_loss = trade_data.get("has_stop_loss", False)
        is_after_loss = trade_data.get("is_after_loss", False)

        prompt = f"""
You are MINDMARK AI Behavioral Coach.
A user placed a simulated {action} trade on {symbol}.
Portfolio Weight of this trade: {weight:.1f}%
Has Pre-set Stop Loss: {has_stop_loss}
Is trade executed right after a losing exit: {is_after_loss}

Analyze this decision. Respond in strict JSON:
- "behavioral_diagnosis": string
- "risk_rating": "LOW" | "MODERATE" | "HIGH"
- "why_it_matters": string
- "actionable_tip": string
- "recommended_curriculum_topic": string
"""
        if self.is_live:
            try:
                response = self.client.generate_content(prompt)
                text = response.text.strip()
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()
                parsed = json.loads(text)
                parsed["is_live_gemini"] = True
                return parsed
            except Exception as e:
                print(f"[AIService] Gemini debrief trade error: {e}")

        # Deterministic Grounded Fallback
        if is_after_loss and weight > 25:
            diagnosis = "Revenge Trading & Position Sizing Bias Detected"
            risk = "HIGH"
            tip = "Enforce a mandatory 15-minute cooling off pause after losing trades. Never increase position size to recover capital hurriedly."
        elif not has_stop_loss:
            diagnosis = "Unhedged Exposure Warning"
            risk = "MODERATE"
            tip = "Always define your maximum acceptable downside before entering a trade. Pre-committing an exit boundary prevents emotional paralysis."
        elif weight > 35:
            diagnosis = "Concentration Risk Alert"
            risk = "HIGH"
            tip = "Holding more than 35% of capital in a single ticker makes your portfolio vulnerable to company-specific shocks."
        else:
            diagnosis = "Disciplined Execution"
            risk = "LOW"
            tip = "Well-controlled position sizing aligned with disciplined asset allocation principles."

        return {
            "behavioral_diagnosis": diagnosis,
            "risk_rating": risk,
            "why_it_matters": "Consistent execution discipline preserves psychological stamina and prevents catastrophic portfolio drawdowns.",
            "actionable_tip": tip,
            "recommended_curriculum_topic": "Module 3: Position Sizing & Capital Preservation Rules",
            "is_live_gemini": False
        }

ai_service = AIService()
