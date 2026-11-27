from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from datetime import timedelta

import httpx

from backend.app.services.providers.base import utc_now_iso
from backend.app.services.providers.cache_and_limiter import market_cache

logger = logging.getLogger("mindmark.services.financial_news")

try:
    IST = ZoneInfo("Asia/Kolkata")
except ZoneInfoNotFoundError:
    IST = timezone(timedelta(hours=5, minutes=30))

RSS_FEEDS: List[Dict[str, str]] = [
    {"source": "Moneycontrol", "category": "Indian Stock Market", "url": "https://www.moneycontrol.com/rss/latestnews.xml"},
    {"source": "Moneycontrol", "category": "NIFTY & SENSEX", "url": "https://www.moneycontrol.com/rss/marketreports.xml"},
    {"source": "Moneycontrol", "category": "Economy", "url": "https://www.moneycontrol.com/rss/economy.xml"},
    {"source": "Moneycontrol", "category": "IPOs", "url": "https://www.moneycontrol.com/rss/iponews.xml"},
    {"source": "Moneycontrol", "category": "Company Announcements", "url": "https://www.moneycontrol.com/rss/buzzingstocks.xml"},
    {"source": "Economic Times", "category": "Indian Stock Market", "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"},
    {"source": "LiveMint", "category": "Indian Stock Market", "url": "https://www.livemint.com/rss/markets"},
    {"source": "Business Standard", "category": "Indian Stock Market", "url": "https://www.business-standard.com/rss/markets-106.rss"},
    {"source": "RBI", "category": "RBI & Monetary Policy", "url": "https://rbi.org.in/pressreleases_rss.xml"},
]

_HTML_TAG_RE = re.compile(r"<[^>]+>")

# Explicit company/asset keyword patterns (word-boundary safe!)
INSTRUMENT_ALIASES: Dict[str, List[str]] = {
    "RELIANCE": ["Reliance Industries", "Reliance", "RIL", "Jio"],
    "TCS": ["Tata Consultancy Services", "TCS"],
    "INFY": ["Infosys", "INFY"],
    "HDFCBANK": ["HDFC Bank", "HDFCBANK"],
    "ICICIBANK": ["ICICI Bank", "ICICIBANK"],
    "SBIN": ["State Bank of India", "SBI"],
    "BHARTIARTL": ["Bharti Airtel", "Airtel"],
    "ITC": ["ITC Ltd", "ITC"],
    "M&M": ["Mahindra & Mahindra", "Mahindra"],
    "SUNPHARMA": ["Sun Pharma", "Sun Pharmaceutical"],
    "BAJFINANCE": ["Bajaj Finance"],
    "TATASTEEL": ["Tata Steel"],
    "BTCUSDT": ["Bitcoin", "BTC"],
    "ETHUSDT": ["Ethereum", "ETH"],
    "SOLUSDT": ["Solana", "SOL"],
    "XRPUSDT": ["Ripple", "XRP"],
    "USDINR": ["USD/INR", "Rupee", "RBI", "Dollar"],
    "EURUSD": ["EUR/USD", "Euro", "ECB"],
}


def _clean_text(raw: Optional[str]) -> str:
    if not raw:
        return ""
    text = _HTML_TAG_RE.sub(" ", raw)
    return re.sub(r"\s+", " ", text).strip()


def _parse_pub_date(raw: Optional[str]) -> datetime:
    if not raw:
        return datetime.now(timezone.utc)
    try:
        dt = parsedate_to_datetime(raw.strip())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def _classify_category(title: str, summary: str, default_cat: str) -> str:
    blob = f"{title} {summary}".lower()
    if any(k in blob for k in ("rbi", "reserve bank", "repo rate", "monetary policy", "mpc")):
        return "RBI & Monetary Policy"
    if any(k in blob for k in ("nifty", "sensex", "bank nifty")):
        return "NIFTY & SENSEX"
    if any(k in blob for k in ("ipo", "listing", "allotment", "gmp")):
        return "IPOs"
    if any(k in blob for k in ("bitcoin", "crypto", "ethereum", "solana", "blockchain", "btc")):
        return "Cryptocurrency"
    if any(k in blob for k in ("rupee", "usd/inr", "forex", "dollar", "currency", "fed")):
        return "Forex"
    if any(k in blob for k in ("q1", "q2", "q3", "q4", "quarterly", "earnings", "profit", "revenue")):
        return "Corporate Earnings"
    if any(k in blob for k in ("merger", "acquisition", "stake", "buyout")):
        return "Mergers & Acquisitions"
    if any(k in blob for k in ("gold", "silver", "crude", "brent", "commodity", "oil")):
        return "Commodities"
    if any(k in blob for k in ("bank", "nbfc", "lending", "credit")):
        return "Banking"
    if any(k in blob for k in ("gdp", "inflation", "cpi", "economy", "fiscal")):
        return "Economy"
    if any(k in blob for k in ("nasdaq", "dow", "s&p", "wall street", "global")):
        return "Global Markets"
    return default_cat


async def _fetch_feed(client: httpx.AsyncClient, feed: Dict[str, str]) -> List[Dict[str, Any]]:
    try:
        resp = await client.get(feed["url"])
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        items = root.findall(".//item")
        parsed: List[Dict[str, Any]] = []
        for item in items[:25]:
            title = _clean_text(item.findtext("title"))
            link = (item.findtext("link") or "").strip()
            if not title or not link:
                continue
            desc = _clean_text(item.findtext("description"))
            if len(desc) > 260:
                desc = desc[:257].rstrip() + "..."
            pub_utc = _parse_pub_date(item.findtext("pubDate"))
            pub_ist = pub_utc.astimezone(IST)
            cat = _classify_category(title, desc, feed["category"])
            art_id = hashlib.sha256(link.encode("utf-8")).hexdigest()[:16]
            parsed.append(
                {
                    "id": f"fn-{art_id}",
                    "title": title,
                    "summary": desc,
                    "source": feed["source"],
                    "category": cat,
                    "url": link,
                    "publishedAtUtc": pub_utc.isoformat(),
                    "publishedAtIst": pub_ist.strftime("%d %b %Y, %I:%M %p IST"),
                    "timestamp": int(pub_utc.timestamp()),
                }
            )
        return parsed
    except Exception as exc:
        logger.debug("rss_feed_failed source=%s url=%s err=%s", feed["source"], feed["url"], exc)
        return []


async def get_financial_news(
    category: Optional[str] = None,
    source: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    cache_key = "financial_news:all_rss"
    articles: Optional[List[Dict[str, Any]]] = market_cache.get_fresh(cache_key)

    if articles is None:
        async def _fetch_all() -> List[Dict[str, Any]]:
            async with httpx.AsyncClient(
                timeout=8.0,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0"},
            ) as client:
                batches = await asyncio.gather(*(_fetch_feed(client, f) for f in RSS_FEEDS))
            seen_urls = set()
            merged: List[Dict[str, Any]] = []
            for batch in batches:
                for art in batch:
                    if art["url"] not in seen_urls:
                        seen_urls.add(art["url"])
                        merged.append(art)
            merged.sort(key=lambda a: a["timestamp"], reverse=True)
            if merged:
                market_cache.set(
                    cache_key,
                    merged,
                    ttl_seconds=300,
                    asset_class="NEWS",
                    symbol="RSS",
                    source="Official Financial RSS Feeds",
                    persist_sqlite=False,
                )
            return merged

        try:
            articles = await market_cache.deduplicated(cache_key, _fetch_all)
        except Exception:
            articles = market_cache.get_stale(cache_key) or []

    filtered = list(articles)
    if category and category != "All":
        filtered = [a for a in filtered if a["category"].lower() == category.lower()]
    if source and source != "All":
        filtered = [a for a in filtered if a["source"].lower() == source.lower()]
    if q and q.strip():
        ql = q.strip().lower()
        filtered = [
            a
            for a in filtered
            if ql in a["title"].lower() or ql in a["summary"].lower() or ql in a["category"].lower()
        ]

    total = len(filtered)
    start = max(0, (page - 1) * page_size)
    end = start + page_size

    return {
        "articles": filtered[start:end],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "categories": sorted({a["category"] for a in articles}),
        "sources": sorted({a["source"] for a in articles}),
        "retrievedAt": utc_now_iso(),
    }


async def get_instrument_news(
    asset_class: str,
    symbol: str,
    name: Optional[str] = None,
    limit: int = 8,
) -> List[Dict[str, Any]]:
    data = await get_financial_news(page=1, page_size=120)
    articles = data["articles"]
    sym_up = symbol.upper().replace(".NS", "").replace(".BO", "")

    terms = list(INSTRUMENT_ALIASES.get(sym_up, []))
    if sym_up not in terms and len(sym_up) >= 3:
        terms.append(sym_up)
    if name:
        clean_name = re.sub(r"\b(Ltd\.?|Limited|Inc\.?|Corp\.?)\b", "", name, flags=re.IGNORECASE).strip()
        if clean_name and clean_name not in terms:
            terms.append(clean_name)

    patterns = [re.compile(rf"\b{re.escape(t)}\b", re.IGNORECASE) for t in terms if len(t) >= 2]
    matched: List[Dict[str, Any]] = []
    for art in articles:
        blob = f"{art['title']} {art['summary']}"
        if any(p.search(blob) for p in patterns):
            matched.append(art)
            if len(matched) >= limit:
                break

    # Fallback to asset-class macro news if no exact company match (e.g. Crypto/Forex)
    if not matched:
        if asset_class.upper() == "CRYPTO":
            matched = [a for a in articles if a["category"] == "Cryptocurrency"][:limit]
        elif asset_class.upper() == "FOREX":
            matched = [a for a in articles if a["category"] in ("Forex", "RBI & Monetary Policy", "Economy")][:limit]

    return matched
