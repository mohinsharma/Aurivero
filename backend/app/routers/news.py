from typing import Optional
from fastapi import APIRouter
from backend.app.models import StandardAPIResponse

MARKET_NEWS = [
    {
        "id": "news-1",
        "headline": "RBI Monetary Policy: Repo Rate Kept Unchanged at 6.50% with Neutral Stance",
        "source": "Reserve Bank of India Bulletin",
        "published_at": "2 hours ago",
        "category": "RBI Policy",
        "sector": "Banking & Real Estate",
        "sentiment": "Bullish",
        "what_happened": "The Reserve Bank of India’s MPC voted to keep the policy repo rate unchanged at 6.50%, highlighting resilient domestic economic growth.",
        "why_did_it_happen": "Retail inflation showed softening, but unpredictable weather and vegetable prices continue to present upside risks, counseling stability.",
        "what_does_it_mean": "Home loan EMIs, vehicle loan rates, and fixed deposit interest rates will remain steady for consumers and commercial banking spreads.",
        "concept": "Repo Rate & Cost of Capital",
        "risk_warning": "An unchanged repo rate does not guarantee banking stocks will rally if bond yields rise globally."
    },
    {
        "id": "news-2",
        "headline": "India CPI Inflation Cools to 4.85% in March as Food Prices Moderate",
        "source": "Ministry of Statistics / Mint",
        "published_at": "4 hours ago",
        "category": "Inflation & Rates",
        "sector": "FMCG & Consumer Durables",
        "sentiment": "Bullish",
        "what_happened": "India’s annual retail inflation declined to a five-month low of 4.85% in March, driven by declining pulses and edible oil costs.",
        "why_did_it_happen": "A sustained winter agricultural harvest relieved grocery bills and reduced packaging input expenses.",
        "what_does_it_mean": "Households have more disposable income left over for discretionary purchases like clothing, packaged goods, and electronics.",
        "concept": "Inflation & Real Purchasing Power",
        "risk_warning": "Lower headline inflation does not guarantee profits will surge if rural wage growth remains weak."
    },
    {
        "id": "news-3",
        "headline": "TCS Q4 Net Profit Climbs 9% to ₹12,434 Cr on Record $13.2 Billion Deal Wins",
        "source": "The Economic Times",
        "published_at": "5 hours ago",
        "category": "Quarterly Results",
        "sector": "Information Technology",
        "sentiment": "Bullish",
        "what_happened": "Tata Consultancy Services posted a 9.1% year-on-year increase in quarterly net profit and expanded operating margins to 26%.",
        "why_did_it_happen": "Global enterprises consolidated cloud contracts into multi-year digital transformation partnerships.",
        "what_does_it_mean": "Strong deal signings signal enterprise tech spending resilience, providing foundational support to Indian IT indices.",
        "concept": "Operating Margin & Order Book (TCV)",
        "risk_warning": "Large contract signings take multiple quarters to convert into realized balance-sheet revenues."
    }
]

router = APIRouter(prefix="/api/news", tags=["Market News Explainer"])

@router.get("", response_model=StandardAPIResponse)
def get_news(category: Optional[str] = None):
    articles = MARKET_NEWS
    if category and category != "All":
        articles = [a for a in articles if a["category"] == category]
    return StandardAPIResponse(success=True, data={"articles": articles, "total": len(articles)})

@router.get("/{news_id}", response_model=StandardAPIResponse)
def get_single_news(news_id: str):
    for a in MARKET_NEWS:
        if a["id"] == news_id:
            return StandardAPIResponse(success=True, data=a)
    return StandardAPIResponse(success=False, error={"code": "NOT_FOUND", "message": "Article not found"})
