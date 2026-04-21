from qdrant_client import QdrantClient
from app.core.config import get_settings

def get_client() -> QdrantClient:
    settings = get_settings()
    print("QDRANT_URL =", repr(settings.qdrant_url))
    return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)

client = get_client()

print(client.get_collections())

settings = get_settings()
print("URL:", repr(settings.qdrant_url))
print("API KEY:", repr(settings.qdrant_api_key))

client.delete_collection(settings.qdrant_collection)