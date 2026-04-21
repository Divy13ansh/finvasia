from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


def should_use_ocr(extracted_text: str) -> bool:
    return len(extracted_text.strip()) < 40


async def azure_vision_ocr(image_bytes: bytes) -> str:
    settings = get_settings()
    if not settings.azure_vision_endpoint or not settings.azure_vision_api_key:
        raise RuntimeError("Azure Vision is not configured")

    url = (
        f"{settings.azure_vision_endpoint}/computervision/imageanalysis:analyze"
        f"?api-version={settings.azure_vision_api_version}&features=read"
    )
    headers = {
        "Ocp-Apim-Subscription-Key": settings.azure_vision_api_key,
        "Content-Type": "application/octet-stream",
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, headers=headers, content=image_bytes)
        response.raise_for_status()
        payload: dict[str, Any] = response.json()

    read_result = payload.get("readResult") or payload.get("read_result") or payload.get("analyzeResult", {})
    lines: list[str] = []
    if isinstance(read_result, dict):
        for block in read_result.get("blocks", []):
            for line in block.get("lines", []):
                text = line.get("text")
                if text:
                    lines.append(text)
        for page in read_result.get("pages", []):
            for line in page.get("lines", []):
                text = line.get("content") or line.get("text")
                if text:
                    lines.append(text)
    return "\n".join(lines)
