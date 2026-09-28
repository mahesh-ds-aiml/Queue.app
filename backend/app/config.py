import os
from typing import Set
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PrintQ"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "sqlite:///./printq.db"

    # File storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB
    ALLOWED_EXTENSIONS: Set[str] = {".pdf", ".docx", ".jpg", ".jpeg", ".png"}

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
