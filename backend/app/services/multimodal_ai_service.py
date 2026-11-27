from __future__ import annotations

import base64
import json
import logging
import re
import shutil
import subprocess
import tempfile
import zlib
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.app.config import settings
from backend.app.services.ai_buddy_service import (
    FINANCE_KEYWORDS,
    INJECTION_PATTERNS,
    OFF_TOPIC_PATTERNS,
    ai_buddy_service,
)

logger = logging.getLogger("mindmark.multimodal_ai")

STRICT_GUARDRAIL_REFUSAL = (
    "I'm MINDMARK, your finance-only AI mentor. I can help with investing, Indian markets, "
    "trading education, financial analysis and risk management. Please ask me something related to finance."
)

ALLOWED_UPLOAD_MIMES = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/webp": "WEBP",
    "application/pdf": "PDF",
}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB

EXTRA_OFF_TOPIC_PATTERNS = [
    r"\b(symptom|diagnosis|prescription|medicine|tablet|doctor|medical\s+advice|fever|headache)\b",
    r"\b(election|political\s+party|prime\s+minister|president\s+speech|vote\s+for)\b",
    r"\b(selfie|vacation|sunset|cat\s+photo|dog\s+photo|meme|wedding\s+photo|food\s+plate)\b",
]


class FinancialDomainGuardrail:
    """Shared backend guardrail applied across chat, voice, OCR, image analysis, scenarios, and training."""

    @staticmethod
    def sanitize_untrusted_text(raw: str) -> str:
        """Strips prompt-injection directives embedded in OCR text, documents, or transcripts."""
        if not raw:
            return ""
        cleaned_lines: List[str] = []
        for line in raw.splitlines():
            low = line.lower()
            if any(re.search(pat, low) for pat in INJECTION_PATTERNS):
                continue
            if re.search(r"\b(system\s*prompt|developer\s*instruction|ignore\s+rules|override\s+guardrail)\b", low):
                continue
            cleaned_lines.append(line)
        return "\n".join(cleaned_lines).strip()

    @staticmethod
    def validate(
        user_text: str,
        extracted_text: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        prompt = (user_text or "").strip()
        ocr_clean = FinancialDomainGuardrail.sanitize_untrusted_text(extracted_text or "")

        # Check injection in prompt first
        for pat in INJECTION_PATTERNS:
            if re.search(pat, prompt.lower()):
                return {"allowed": False, "category": "off_topic", "message": STRICT_GUARDRAIL_REFUSAL}

        # Check explicit extra off-topic patterns (medical, politics, non-finance photos)
        combined_for_offtopic = prompt.lower()
        if any(re.search(pat, combined_for_offtopic) for pat in EXTRA_OFF_TOPIC_PATTERNS):
            # Allow only if explicitly tied to financial/market impact (e.g. "election impact on NIFTY")
            has_fin = any(kw in combined_for_offtopic for kw in ("nifty", "sensex", "market", "stock", "sector", "rbi", "inflation", "pharma", "portfolio"))
            if not has_fin:
                return {"allowed": False, "category": "off_topic", "message": STRICT_GUARDRAIL_REFUSAL}

        # Standard AIBuddyService domain classifier on user prompt
        cat = ai_buddy_service.classify_domain(prompt, history=history)
        if cat == "off_topic":
            return {"allowed": False, "category": "off_topic", "message": STRICT_GUARDRAIL_REFUSAL}

        # If prompt is generic ("explain this screenshot") and OCR text is present, verify OCR text has finance content
        if cat == "finance_ambiguous":
            if ocr_clean:
                ocr_cat = ai_buddy_service.classify_domain(ocr_clean)
                if ocr_cat == "off_topic":
                    return {"allowed": False, "category": "off_topic", "message": STRICT_GUARDRAIL_REFUSAL}
                if ocr_cat == "finance_allowed":
                    return {"allowed": True, "category": "finance_allowed", "sanitizedOcrText": ocr_clean}
            # Allow short generic image-analysis asks only when financial context exists
            if any(w in prompt.lower() for w in ("chart", "rsi", "macd", "candlestick", "portfolio", "stock", "price", "p&l", "balance sheet", "report")):
                return {"allowed": True, "category": "finance_allowed", "sanitizedOcrText": ocr_clean}
            return {"allowed": False, "category": "off_topic", "message": STRICT_GUARDRAIL_REFUSAL}

        return {"allowed": True, "category": "finance_allowed", "sanitizedOcrText": ocr_clean}


class FinancialEntityExtractor:
    """Extracts structured financial fields with confidence ratings; never invents missing values."""

    KNOWN_TICKERS = [
        "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "ITC", "BHARTIARTL",
        "TATAMOTORS", "LT", "AXISBANK", "KOTAKBANK", "MARUTI", "SUNPHARMA", "WIPRO",
        "NIFTY 50", "NIFTY50", "SENSEX", "BANKNIFTY", "BANK NIFTY", "INDIAVIX",
        "BTCUSDT", "ETHUSDT", "SOLUSDT", "USDINR", "EURUSD", "AAPL", "MSFT", "NVDA",
    ]

    @staticmethod
    def _field(value: Any, confidence: str, snippet: str = "") -> Dict[str, Any]:
        return {"value": value, "confidence": confidence, "sourceSnippet": snippet}

    @classmethod
    def extract(cls, raw_text: str) -> Dict[str, Any]:
        text = FinancialDomainGuardrail.sanitize_untrusted_text(raw_text)
        upper = text.upper()
        fields: Dict[str, Dict[str, Any]] = {}

        # Instrument detection
        found_sym = None
        for tk in cls.KNOWN_TICKERS:
            if re.search(rf"\b{re.escape(tk)}\b", upper):
                found_sym = tk.replace(" ", "")
                break
        if found_sym:
            fields["symbol"] = cls._field(found_sym, "HIGH", found_sym)
        else:
            fields["symbol"] = cls._field("UNKNOWN", "UNKNOWN")

        if "NSE" in upper or "BSE" in upper:
            exch = "NSE" if "NSE" in upper else "BSE"
            fields["exchange"] = cls._field(exch, "HIGH", exch)
        elif "BINANCE" in upper or "USDT" in upper:
            fields["exchange"] = cls._field("Binance", "HIGH", "BINANCE/USDT")
        else:
            fields["exchange"] = cls._field("UNKNOWN", "UNKNOWN")

        # Price & P&L extraction
        price_match = re.search(r"(?:LTP|PRICE|CMP|CLOSE|₹|INR|\$)\s*[:=]?\s*([0-9,]+\.?[0-9]{0,4})", upper)
        if price_match:
            fields["currentPrice"] = cls._field(price_match.group(1).replace(",", ""), "MEDIUM", price_match.group(0))
        else:
            fields["currentPrice"] = cls._field("UNKNOWN", "UNKNOWN")

        sl_match = re.search(r"(?:STOP\s*LOSS|SL)\s*[:=]?\s*₹?\$?\s*([0-9,]+\.?[0-9]{0,2})", upper)
        fields["stopLoss"] = cls._field(sl_match.group(1).replace(",", ""), "MEDIUM", sl_match.group(0)) if sl_match else cls._field("UNKNOWN", "UNKNOWN")

        tgt_match = re.search(r"(?:TARGET|TGT)\s*[:=]?\s*₹?\$?\s*([0-9,]+\.?[0-9]{0,2})", upper)
        fields["targetPrice"] = cls._field(tgt_match.group(1).replace(",", ""), "MEDIUM", tgt_match.group(0)) if tgt_match else cls._field("UNKNOWN", "UNKNOWN")

        pct_match = re.search(r"([+-]?\d{1,3}\.\d{1,2})\s*%", upper)
        fields["changePercent"] = cls._field(pct_match.group(1) + "%", "MEDIUM", pct_match.group(0)) if pct_match else cls._field("UNKNOWN", "UNKNOWN")

        # Technicals
        rsi_match = re.search(r"RSI(?:\s*\(14\))?\s*[:=]?\s*(\d{1,2}(?:\.\d{1,2})?)", upper)
        fields["rsi"] = cls._field(rsi_match.group(1), "MEDIUM", rsi_match.group(0)) if rsi_match else cls._field("UNKNOWN", "UNKNOWN")

        tf_match = re.search(r"\b(1M|3M|5M|15M|30M|1H|4H|1D|1W)\b", upper)
        fields["timeframe"] = cls._field(tf_match.group(1), "HIGH", tf_match.group(0)) if tf_match else cls._field("UNKNOWN", "UNKNOWN")

        # Portfolio / Statement fields
        qty_match = re.search(r"(?:QTY|QUANTITY|SHARES)\s*[:=]?\s*(\d+(?:\.\d+)?)", upper)
        fields["quantity"] = cls._field(qty_match.group(1), "MEDIUM", qty_match.group(0)) if qty_match else cls._field("UNKNOWN", "UNKNOWN")

        pe_match = re.search(r"(?:P/E|PE\s*RATIO)\s*[:=]?\s*(\d+(?:\.\d+)?)", upper)
        fields["peRatio"] = cls._field(pe_match.group(1), "MEDIUM", pe_match.group(0)) if pe_match else cls._field("UNKNOWN", "UNKNOWN")

        eps_match = re.search(r"\bEPS\s*[:=]?\s*₹?\s*(\d+(?:\.\d+)?)", upper)
        fields["eps"] = cls._field(eps_match.group(1), "MEDIUM", eps_match.group(0)) if eps_match else cls._field("UNKNOWN", "UNKNOWN")

        rev_match = re.search(r"(?:REVENUE|SALES|INCOME)\s*[:=]?\s*₹?\s*([0-9,]+(?:\.[0-9]+)?\s*(?:CR|CRORE|L|LAKH|M|B)?)", upper)
        fields["revenue"] = cls._field(rev_match.group(1), "LOW", rev_match.group(0)) if rev_match else cls._field("UNKNOWN", "UNKNOWN")

        uncertain_fields = [k for k, v in fields.items() if v["confidence"] in ("LOW", "MEDIUM")]
        return {
            "sanitizedText": text,
            "fields": fields,
            "uncertainFields": uncertain_fields,
            "priceFreshnessWarning": "Extracted screenshot values are static point-in-time figures, NOT verified live market prices.",
        }


def validate_upload_bytes(content: bytes, content_type: str, filename: str) -> Tuple[str, str]:
    if not content:
        raise ValueError("Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise ValueError("File exceeds maximum allowed size of 8 MB.")

    mime = (content_type or "").lower().split(";")[0].strip()
    if mime not in ALLOWED_UPLOAD_MIMES:
        raise ValueError("Unsupported file format. Allowed: PNG, JPG/JPEG, WebP, PDF.")

    # Verify magic bytes so renamed scripts/executables are rejected
    if mime == "image/png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Invalid PNG file signature.")
    if mime in ("image/jpeg", "image/jpg") and not content.startswith(b"\xff\xd8\xff"):
        raise ValueError("Invalid JPEG file signature.")
    if mime == "image/webp" and not (content.startswith(b"RIFF") and content[8:12] == b"WEBP"):
        raise ValueError("Invalid WebP file signature.")
    if mime == "application/pdf" and not content.startswith(b"%PDF-"):
        raise ValueError("Invalid PDF file signature.")

    return mime, ALLOWED_UPLOAD_MIMES[mime]


def _extract_pdf_basic_text(content: bytes) -> str:
    """Lightweight pure-Python PDF text stream fallback when pypdf is not installed."""
    chunks: List[str] = []
    for match in re.finditer(rb"stream[\r\n]+(.*?)[\r\n]+endstream", content, re.DOTALL):
        raw_stream = match.group(1)
        try:
            decompressed = zlib.decompress(raw_stream)
        except Exception:
            decompressed = raw_stream
        txt = re.findall(rb"\(([^()]{1,200})\)", decompressed)
        for t in txt:
            decoded = t.decode("latin-1", errors="ignore").strip()
            if decoded:
                chunks.append(decoded)
    return " ".join(chunks)[:4000]


def _run_local_tesseract(content: bytes, ext: str) -> Optional[str]:
    exe = shutil.which("tesseract")
    if not exe:
        return None
    try:
        with tempfile.NamedTemporaryFile(suffix=f".{ext.lower()}", delete=True) as tmp:
            tmp.write(content)
            tmp.flush()
            proc = subprocess.run([exe, tmp.name, "stdout"], capture_output=True, text=True, timeout=12)
            if proc.returncode == 0 and proc.stdout.strip():
                return proc.stdout.strip()
    except Exception:
        return None
    return None


async def extract_financial_ocr(
    content: bytes,
    content_type: str,
    filename: str,
    user_hint_text: str = "",
) -> Dict[str, Any]:
    mime, fmt = validate_upload_bytes(content, content_type, filename)

    raw_text = ""
    visual_summary = ""
    ocr_provider = "LOCAL_ENTITY_EXTRACTOR"
    gemini_fields: Optional[Dict[str, Any]] = None

    # 1. Gemini Vision Multimodal OCR when GEMINI_API_KEY is configured
    if settings.is_ai_live:
        try:
            b64 = base64.b64encode(content).decode("ascii")
            prompt = (
                "You are a financial OCR extractor. Extract ONLY clearly visible text and financial data from this image/PDF. "
                "Do NOT invent missing numbers. Return JSON with keys: "
                "is_financial (bool), raw_text (str), visual_summary (str), "
                "symbol (str or UNKNOWN), exchange (str or UNKNOWN), currentPrice (str or UNKNOWN), "
                "rsi (str or UNKNOWN), timeframe (str or UNKNOWN), quantity (str or UNKNOWN), unrealizedPnl (str or UNKNOWN)."
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {"inline_data": {"mime_type": mime, "data": b64}},
                        ]
                    }
                ]
            }
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    j = resp.json()
                    cand_text = j.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    cleaned = cand_text.strip().strip("`")
                    if cleaned.startswith("json"):
                        cleaned = cleaned[4:].strip()
                    parsed = json.loads(cleaned)
                    if parsed.get("is_financial") is False:
                        return {
                            "allowed": False,
                            "guardrailMessage": STRICT_GUARDRAIL_REFUSAL,
                            "ocrProvider": "GEMINI_VISION",
                        }
                    raw_text = str(parsed.get("raw_text") or "")
                    visual_summary = str(parsed.get("visual_summary") or "")
                    gemini_fields = parsed
                    ocr_provider = "GEMINI_VISION"
        except Exception as exc:
            logger.warning("gemini_vision_ocr_fallback err=%s", exc)

    # 2. Local Tesseract / PDF text fallback
    if not raw_text:
        if fmt == "PDF":
            raw_text = _extract_pdf_basic_text(content)
            if raw_text:
                ocr_provider = "LOCAL_PDF_TEXT"
        else:
            tess = _run_local_tesseract(content, fmt)
            if tess:
                raw_text = tess
                ocr_provider = "TESSERACT_LOCAL"

    combined_text = "\n".join(p for p in [raw_text, user_hint_text] if p).strip()
    extracted = FinancialEntityExtractor.extract(combined_text)

    if gemini_fields:
        for k in ("symbol", "exchange", "currentPrice", "rsi", "timeframe", "quantity", "unrealizedPnl"):
            val = gemini_fields.get(k)
            if val and str(val).upper() != "UNKNOWN":
                extracted["fields"][k] = {"value": str(val), "confidence": "HIGH", "sourceSnippet": "Gemini Vision"}

    return {
        "allowed": True,
        "filename": filename,
        "format": fmt,
        "sizeBytes": len(content),
        "ocrProvider": ocr_provider,
        "requiresVerification": ocr_provider == "LOCAL_ENTITY_EXTRACTOR" or len(extracted["uncertainFields"]) > 0,
        "visualSummary": visual_summary or None,
        **extracted,
    }


def analyze_confirmed_multimodal_payload(
    question: str,
    confirmed_fields: Dict[str, Any],
    sanitized_ocr_text: str,
    user: Dict[str, Any],
    learning_level: str = "BEGINNER",
    allow_portfolio_access: bool = False,
) -> Dict[str, Any]:
    guard = FinancialDomainGuardrail.validate(question, extracted_text=sanitized_ocr_text)
    if not guard["allowed"]:
        return {
            "status": "rejected_off_topic",
            "answer": guard["message"],
            "suggested_followups": [
                "Explain RSI using an example",
                "How do I read support and resistance on a chart?",
            ],
        }

    # Construct isolated structured context (never treating OCR text as system instructions)
    field_summary = ", ".join(
        f"{k}: {v.get('value') if isinstance(v, dict) else v}"
        for k, v in (confirmed_fields or {}).items()
        if (v.get("value") if isinstance(v, dict) else v) not in (None, "", "UNKNOWN")
    )
    enriched_prompt = (
        f"[USER_QUESTION]: {question}\n"
        f"[VERIFIED_SCREENSHOT_FIELDS - NOT LIVE DATA]: {field_summary or 'None confirmed'}\n"
        f"[SANITIZED_OCR_EXCERPT]: {(guard.get('sanitizedOcrText') or '')[:800]}"
    )

    return ai_buddy_service.chat(
        message=enriched_prompt,
        history=[],
        user=user,
        req_context={
            "current_page": "/ai-buddy/multimodal",
            "learning_level": learning_level,
            "allow_portfolio_access": allow_portfolio_access,
        },
    )
