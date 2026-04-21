from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    azure_openai_endpoint: str
    azure_openai_api_key: str
    azure_openai_api_version: str = "2024-10-21"
    azure_openai_chat_deployment: str = "gpt-4.1-mini"
    azure_openai_embedding_deployment: str = "text-embedding-3-small"

    qdrant_url: str
    qdrant_api_key: Optional[str] = None
    qdrant_collection: str = "insurance_policy_sections"

    azure_vision_endpoint: Optional[str] = None
    azure_vision_api_key: Optional[str] = None
    azure_vision_api_version: str = "2023-02-01-preview"


@lru_cache
def get_settings() -> Settings:
    return Settings()
