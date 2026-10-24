from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Inkloom AI - Brand Governance Platform"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database & Redis (Port 5433)
    DATABASE_URL: str = "postgresql+asyncpg://inkloom:inkloom_password@localhost:5433/inkloom_db"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://inkloom:inkloom_password@localhost:5433/inkloom_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Keys
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Cloudinary media storage
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_FOLDER: str = "inkloom/submissions"
    # Public origin used when the local-storage fallback serves files through FastAPI.
    MEDIA_PUBLIC_BASE_URL: str = "http://127.0.0.1:8000"

    # Model Routing
    PRIMARY_LLM_MODEL: str = "gemini-3.8-flash"
    VISION_MODEL: str = "gemini-3.8-flash"
    FAST_INLINE_MODEL: str = "gemini-3.8-flash-lite"
    EMBEDDING_MODEL: str = "gemini-embedding-2"
    EMBEDDING_DIMENSIONS: int = 768

    # Governance Constants
    DEFAULT_MIN_WCAG_CONTRAST: float = 4.5
    AMBIGUITY_OVERRIDE_THRESHOLD: float = 0.40
    UPLOAD_DIR: str = "uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def upload_path(self) -> Path:
        path = Path(self.UPLOAD_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def async_database_url(self) -> str:
        """Normalizes DATABASE_URL for SQLAlchemy asyncpg across cloud providers (Neon, Supabase, Render)."""
        from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

        raw_url = self.DATABASE_URL.strip() if self.DATABASE_URL else ""
        if not raw_url:
            return raw_url

        url = raw_url
        if url.startswith("postgres://"):
            url = "postgresql+asyncpg://" + url[len("postgres://"):]
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]

        parts = urlsplit(url)
        allowed_query_keys = {
            "ssl",
            "command_timeout",
            "statement_cache_size",
            "max_cached_statement_lifetime",
            "max_cacheable_statement_size",
            "server_settings",
            "target_session_attrs",
        }
        filtered_queries = []
        for k, v in parse_qsl(parts.query):
            if k == "sslmode":
                # asyncpg uses ssl instead of sslmode
                filtered_queries.append(("ssl", v))
            elif k in allowed_query_keys:
                filtered_queries.append((k, v))
        new_query = urlencode(filtered_queries)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))

    @property
    def sync_database_url(self) -> str:
        """Normalizes SYNC_DATABASE_URL for psycopg2/Alembic."""
        raw_url = (self.SYNC_DATABASE_URL or self.DATABASE_URL or "").strip()
        if not raw_url:
            return raw_url

        url = raw_url
        if url.startswith("postgres://"):
            url = "postgresql+psycopg2://" + url[len("postgres://"):]
        elif url.startswith("postgresql+asyncpg://"):
            url = "postgresql+psycopg2://" + url[len("postgresql+asyncpg://"):]
        elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
            url = "postgresql+psycopg2://" + url[len("postgresql://"):]
        return url

    @property
    def cloudinary_configured(self) -> bool:
        return all(
            (
                self.CLOUDINARY_CLOUD_NAME,
                self.CLOUDINARY_API_KEY,
                self.CLOUDINARY_API_SECRET,
            )
        )

    @property
    def cloudinary_partially_configured(self) -> bool:
        values = (
            self.CLOUDINARY_CLOUD_NAME,
            self.CLOUDINARY_API_KEY,
            self.CLOUDINARY_API_SECRET,
        )
        return any(values) and not all(values)


settings = Settings()
