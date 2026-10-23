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

    # Model Routing
    PRIMARY_LLM_MODEL: str = "gemini-3.5-flash"
    VISION_MODEL: str = "gemini-3.5-flash"
    FAST_INLINE_MODEL: str = "gemini-3.5-flash-lite"
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


settings = Settings()