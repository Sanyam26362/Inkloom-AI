from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.brands import router as brands_router
from app.api.v1.guidelines import router as guidelines_router
from app.api.v1.submissions import router as submissions_router
from app.api.v1.analytics import router as analytics_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(brands_router)
api_v1_router.include_router(guidelines_router)
api_v1_router.include_router(submissions_router)
api_v1_router.include_router(analytics_router)

__all__ = ["api_v1_router"]
