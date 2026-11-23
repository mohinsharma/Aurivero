from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.config import settings

# Router imports
from backend.app.routers.auth import router as auth_router
from backend.app.routers.users import router as users_router
from backend.app.routers.assessment import router as assessment_router
from backend.app.routers.learning import router as learning_router
from backend.app.routers.portfolio import router as portfolio_router
from backend.app.routers.trades import router as trades_router
from backend.app.routers.analytics import router as analytics_router
from backend.app.routers.insights import router as insights_router
from backend.app.routers.replay import router as replay_router
from backend.app.routers.news import router as news_router
from backend.app.routers.challenges import router as challenges_router
from backend.app.routers.ai import router as ai_router

app = FastAPI(
    title="MINDMARK API — AI Financial Market Learning Simulator",
    description="Backend architecture for paper trading simulation, behavioral pattern audits, historical market replays, and Gemini AI pedagogical explainers.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
                "path": str(request.url.path)
            }
        }
    )

# Register All Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(assessment_router)
app.include_router(learning_router)
app.include_router(portfolio_router)
app.include_router(trades_router)
app.include_router(analytics_router)
app.include_router(insights_router)
app.include_router(replay_router)
app.include_router(news_router)
app.include_router(challenges_router)
app.include_router(ai_router)

@app.get("/")
def root():
    return {
        "service": "MINDMARK API",
        "tagline": "Learn the market. Train your decisions. Protect your future.",
        "status": "online",
        "version": "1.0.0",
        "database": "Supabase / SQLite Local Engine",
        "ai_status": "Google Gemini 1.5 Flash" if settings.is_ai_live else "Local Pedagogical Engine"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "is_ai_live": settings.is_ai_live,
        "is_supabase_live": settings.is_supabase_live
    }
