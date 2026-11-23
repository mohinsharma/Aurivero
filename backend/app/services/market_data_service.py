from typing import List, Dict, Any, Optional

INDIAN_INDICES = [
    {"name": "NIFTY 50", "value": 24842.15, "change": 148.60, "change_percent": 0.60, "status": "Open"},
    {"name": "SENSEX", "value": 81525.40, "change": 485.20, "change_percent": 0.60, "status": "Open"},
    {"name": "BANK NIFTY", "value": 52140.80, "change": -112.45, "change_percent": -0.22, "status": "Open"},
    {"name": "INDIA VIX", "value": 12.85, "change": -0.42, "change_percent": -3.16, "status": "Open"}
]

POPULAR_INDIAN_STOCKS = [
    {
        "symbol": "RELIANCE",
        "name": "Reliance Industries Ltd.",
        "exchange": "NSE",
        "price": 2985.40,
        "change": 32.10,
        "change_percent": 1.09,
        "sector": "Energy & Retail",
        "market_cap": "₹20,18,000 Cr",
        "pe_ratio": 28.4,
        "high_52w": 3024.90,
        "low_52w": 2220.30,
        "description": "India's largest private enterprise with businesses spanning oil-to-chemicals, retail stores, and Jio digital services."
    },
    {
        "symbol": "TCS",
        "name": "Tata Consultancy Services Ltd.",
        "exchange": "NSE",
        "price": 4180.25,
        "change": -18.50,
        "change_percent": -0.44,
        "sector": "Information Technology",
        "market_cap": "₹15,12,000 Cr",
        "pe_ratio": 31.8,
        "high_52w": 4585.90,
        "low_52w": 3313.00,
        "description": "Global flagship IT services company of Tata Group providing cloud, AI, and enterprise technology transformation."
    },
    {
        "symbol": "HDFCBANK",
        "name": "HDFC Bank Ltd.",
        "exchange": "NSE",
        "price": 1642.80,
        "change": 8.40,
        "change_percent": 0.51,
        "sector": "Banking & Financials",
        "market_cap": "₹12,48,000 Cr",
        "pe_ratio": 19.2,
        "high_52w": 1794.00,
        "low_52w": 1363.55,
        "description": "India's premier private banking institution with widespread branch networks across urban and semi-rural regions."
    },
    {
        "symbol": "INFY",
        "name": "Infosys Ltd.",
        "exchange": "NSE",
        "price": 1785.60,
        "change": 14.20,
        "change_percent": 0.80,
        "sector": "Information Technology",
        "market_cap": "₹7,42,000 Cr",
        "pe_ratio": 27.5,
        "high_52w": 1953.90,
        "low_52w": 1358.35,
        "description": "A global leader in next-generation digital services and consulting, serving Fortune 500 clients worldwide."
    },
    {
        "symbol": "ICICIBANK",
        "name": "ICICI Bank Ltd.",
        "exchange": "NSE",
        "price": 1215.30,
        "change": 6.80,
        "change_percent": 0.56,
        "sector": "Banking & Financials",
        "market_cap": "₹8,56,000 Cr",
        "pe_ratio": 17.8,
        "high_52w": 1332.00,
        "low_52w": 905.00,
        "description": "Leading Indian multinational bank offering comprehensive banking and financial services to corporate and retail customers."
    },
    {
        "symbol": "TATAMOTORS",
        "name": "Tata Motors Ltd.",
        "exchange": "NSE",
        "price": 965.70,
        "change": -8.90,
        "change_percent": -0.91,
        "sector": "Automotive",
        "market_cap": "₹3,54,000 Cr",
        "pe_ratio": 16.2,
        "high_52w": 1179.05,
        "low_52w": 653.00,
        "description": "Pioneering Indian automaker leading the electric passenger vehicle revolution and owner of British luxury brand Jaguar Land Rover."
    },
    {
        "symbol": "ITC",
        "name": "ITC Ltd.",
        "exchange": "NSE",
        "price": 492.15,
        "change": 3.45,
        "change_percent": 0.71,
        "sector": "FMCG",
        "market_cap": "₹6,15,000 Cr",
        "pe_ratio": 29.1,
        "high_52w": 528.55,
        "low_52w": 399.30,
        "description": "Diversified consumer conglomerate with dominant positions in cigarettes, branded packaged foods, paperboards, and hotels."
    },
    {
        "symbol": "BHARTIARTL",
        "name": "Bharti Airtel Ltd.",
        "exchange": "NSE",
        "price": 1585.00,
        "change": 18.20,
        "change_percent": 1.16,
        "sector": "Telecommunications",
        "market_cap": "₹9,45,000 Cr",
        "pe_ratio": 62.4,
        "high_52w": 1779.00,
        "low_52w": 961.00,
        "description": "Leading global telecommunications provider with extensive 5G broadband operations across India and 14 African nations."
    }
]

class MarketDataService:
    @staticmethod
    def get_indices() -> List[Dict[str, Any]]:
        return INDIAN_INDICES

    @staticmethod
    def get_stocks(search: Optional[str] = None, sector: Optional[str] = None) -> List[Dict[str, Any]]:
        results = POPULAR_INDIAN_STOCKS
        if search:
            q = search.lower().strip()
            results = [s for s in results if q in s["symbol"].lower() or q in s["name"].lower()]
        if sector and sector != "All":
            results = [s for s in results if s["sector"] == sector]
        return results

    @staticmethod
    def get_stock_by_symbol(symbol: str) -> Optional[Dict[str, Any]]:
        sym = symbol.upper().strip()
        for s in POPULAR_INDIAN_STOCKS:
            if s["symbol"] == sym:
                return s
        return None

market_data_service = MarketDataService()
