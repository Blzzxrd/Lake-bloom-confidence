from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Lake Bloom Confidence"
    api_prefix: str = ""
    database_url: str = "postgresql+psycopg://lakebloom:lakebloom@db:5432/lakebloom"
    test_database_url: str = "sqlite+pysqlite:///:memory:"
    seed_demo_data: bool = True
    scheduler_enabled: bool = False
    model_version: str = "mvp-placeholder-0.1.0"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="LBC_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
