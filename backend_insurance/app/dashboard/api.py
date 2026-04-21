from fastapi import APIRouter

from app.dashboard.schemas import DashboardResponse, DashboardSearchResponse
from app.dashboard.service import build_dashboard, search_dashboard
from app.dashboard.repository import fetch_unique_policies


router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


@router.get("/policies")
async def list_policies() -> list[dict]:
    return fetch_unique_policies()


@router.get("/{document_id}", response_model=DashboardResponse)
async def get_dashboard(document_id: str) -> DashboardResponse:
    return build_dashboard(document_id)


@router.get("/{document_id}/search", response_model=DashboardSearchResponse)
async def get_dashboard_search(document_id: str, q: str, top_k: int = 8) -> DashboardSearchResponse:
    return search_dashboard(document_id=document_id, query=q, top_k=top_k)
