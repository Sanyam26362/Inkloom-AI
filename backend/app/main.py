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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and graceful shutdown."""
    logger.info("Initializing Inkloom AI database and vector extensions...")
    try:
        await init_db()
        logger.info("Database and pgvector initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    try:
        await redis_client.ping()
        logger.info("Redis cache client connected successfully.")
    except Exception as e:
        logger.warning(f"Redis cache connection unavailable: {e}")

    yield

    logger.info("Shutting down Inkloom AI services...")
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

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
