import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8005
    SECRET_KEY: str = "mindmark_super_secret_jwt_key_dalal_street_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Supabase / Database
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./mindmark.db"

    # Market Data
    MARKET_DATA_PROVIDER: str = "multi_adapter"
    ENABLE_LIVE_DATA_REFRESH: bool = True
    TWELVE_DATA_API_KEY: str = ""
    UPSTOX_ACCESS_TOKEN: str = ""
    COINGECKO_API_KEY: str = ""
    TEJHQ_API_KEY: str = ""
    BHARATSTOCK_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_ai_live(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())

    @property
    def is_supabase_live(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_KEY and self.SUPABASE_URL.strip())

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
