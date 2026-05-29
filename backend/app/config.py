from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./claim_review.db"
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o-mini"

    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    UPLOAD_DIR: str = "./uploads"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str = "claim-review-uploads"

    JWT_SECRET: str = "change-this-in-production-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"
    MAX_FILE_SIZE_MB: int = 25

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
