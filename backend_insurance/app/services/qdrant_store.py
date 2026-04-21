from qdrant_client import QdrantClient
from qdrant_client.http import models as rest
# import httpx
from app.core.config import get_settings


def get_client() -> QdrantClient:
    settings = get_settings()
    return QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        timeout=60.0,
        check_compatibility=False,
        # httpx_client=httpx.Client(http2=False),  # 👈 stability fix
    )


def ensure_collection(vector_size: int) -> None:
    settings = get_settings()
    client = get_client()

    collections = {c.name for c in client.get_collections().collections}

    # Create collection if it doesn't exist
    if settings.qdrant_collection not in collections:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=rest.VectorParams(
                size=vector_size,
                distance=rest.Distance.COSINE,
            ),
        )

    # 👇 Always ensure indexes exist
    for field in ["document_id", "section_type", "section_title", "chunk_type", "kind"]:
        client.create_payload_index(
            collection_name=settings.qdrant_collection,
            field_name=field,
            field_schema=rest.PayloadSchemaType.KEYWORD,
        )
