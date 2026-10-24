import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db, engine, redis_client
from app.api.v1 import api_v1_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("inkloom_api")


async def auto_seed_default_brand() -> None:
    """Seeds the initial Blinkit demo brand profile and loads the Blinkit pack from manifest on a fresh database."""
    from app.core.database import AsyncSessionLocal
    from app.models.brand import BrandProfile
    from app.services.pack_service import PackService
    from sqlalchemy import select, func

    try:
        async with AsyncSessionLocal() as session:
            stmt = select(BrandProfile).where(BrandProfile.name == "Blinkit")
            blinkit = (await session.execute(stmt)).scalar_one_or_none()
            if not blinkit:
                logger.info("Auto-seeding default Blinkit brand profile from premade pack manifest...")
                blinkit = BrandProfile(
                    name="Blinkit",
                    tenant_id="tenant_default",
                    industry="Quick Commerce",
                    tone_persona="Energetic, witty, helpful, culturally relevant, reliable quick commerce voice.",
                    approved_hex_palette=[],
                    banned_terms=[],
                    preferred_terminology={},
                    approved_facts=[],
                    visual_guidelines_summary="Official quick-commerce brand governance guidelines and design system.",
                    min_wcag_contrast=4.5,
                )
                session.add(blinkit)
                await session.commit()
                await session.refresh(blinkit)

                await PackService.load_pack("blinkit", brand_id=blinkit.id, session=session)
                logger.info("Blinkit profile and premade pack seeded successfully from manifest.")
    except Exception as seed_err:
        logger.warning(f"Auto-seed completed or skipped: {seed_err}")


async def auto_seed_demo_accounts() -> None:
    """Seeds demo accounts (admin, judge, creator) if not present in user_accounts table."""
    from app.core.database import AsyncSessionLocal
    from app.models.user import UserAccount
    from app.core.security import DEMO_ACCOUNTS
    from sqlalchemy import select

    try:
        async with AsyncSessionLocal() as session:
            for email, demo_data in DEMO_ACCOUNTS.items():
                stmt = select(UserAccount).where(UserAccount.email == email)
                exists = (await session.execute(stmt)).scalar_one_or_none()
                if not exists:
                    user = UserAccount(
                        email=email,
                        full_name=demo_data["user_name"],
                        hashed_password=demo_data["password_hash"],
                        role=demo_data["role"].value,
                        tenant_id=demo_data.get("tenant_id", "tenant_default"),
                        is_active=True,
                    )
                    session.add(user)
            await session.commit()
            logger.info("Demo accounts seeded successfully.")
    except Exception as e:
        logger.warning(f"Demo user auto-seed skipped: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and graceful shutdown."""
    logger.info("Initializing Inkloom AI database and vector extensions...")
    try:
        await init_db()
        logger.info("Database and pgvector initialized successfully.")
        await auto_seed_default_brand()
        await auto_seed_demo_accounts()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    if redis_client:
        try:
            await redis_client.ping()
            logger.info("Redis cache client connected successfully.")
        except Exception as e:
            logger.warning(f"Redis cache connection unavailable: {e}")
    else:
        logger.info("Redis cache not configured (running in direct DB mode).")

    # Startup model catalog validation check
    from app.services.gemini_service import gemini_service
    if gemini_service.is_available:
        try:
            await gemini_service.verify_configured_models()
            logger.info("Gemini configured models verified during startup.")
        except Exception as e:
            logger.error(f"Error during Gemini startup model verification: {e}")

    yield

    logger.info("Shutting down Inkloom AI services...")
    if redis_client:
        try:
            await redis_client.aclose()
        except Exception as e:
            logger.warning(f"Error closing Redis client: {e}")

    try:
        await engine.dispose()
    except Exception as e:
        logger.warning(f"Error disposing database engine: {e}")
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Brand Identity Governance, Document Auditing & Guidelines RAG Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS configuration supporting localhost, Vercel deployments, and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Safe global exception handler preventing stack traces and internal secrets leakage."""
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred while processing your request.",
            "error_type": type(exc).__name__,
        },
    )


from fastapi.staticfiles import StaticFiles

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.upload_path), name="uploads")

# Mount API V1 routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
# Mount without prefix as well so direct calls to /brands, /submissions, /health work transparently
app.include_router(api_v1_router)


@app.get("/", tags=["Root"])
async def root_endpoint():
    """Root landing endpoint with system status and documentation links."""
    return {
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "api_v1": settings.API_V1_STR,
    }
