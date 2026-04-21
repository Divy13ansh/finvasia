from __future__ import annotations

import re
from dataclasses import dataclass


SECTION_PATTERNS = [
    r"^\s*(section|sec\.)\s+([0-9]+(?:\.[0-9]+)*)\b.*$",
    r"^\s*(coverage|exclusions|exclusion|benefits|limits|conditions|claims|claim process|what is covered|what is not covered)\b.*$",
    r"^\s*[A-Z][A-Z\s/&-]{4,}$",
]


@dataclass
class SectionChunk:
    section_id: str
    section_title: str
    page_start: int
    page_end: int
    text: str
    chunk_index: int


def detect_section_title(text: str) -> str | None:
    first_line = text.splitlines()[0].strip() if text.strip() else ""
    for pattern in SECTION_PATTERNS:
        if re.match(pattern, first_line, flags=re.IGNORECASE):
            return first_line[:160]
    return None


def build_section_chunks(pages: list[dict]) -> list[SectionChunk]:
    chunks: list[SectionChunk] = []
    current_title = "document"
    current_pages: list[dict] = []
    chunk_index = 0

    def flush() -> None:
        nonlocal chunk_index, current_pages
        if not current_pages:
            return
        text = "\n\n".join(page["text"].strip() for page in current_pages if page["text"].strip())
        if not text.strip():
            current_pages = []
            return
        chunks.append(
            SectionChunk(
                section_id=f"section_{chunk_index:04d}",
                section_title=current_title,
                page_start=current_pages[0]["page_num"],
                page_end=current_pages[-1]["page_num"],
                text=text,
                chunk_index=chunk_index,
            )
        )
        chunk_index += 1
        current_pages = []

    for page in pages:
        title = detect_section_title(page["text"])
        if title and current_pages:
            flush()
            current_title = title
        elif title:
            current_title = title
        current_pages.append(page)

    flush()
    return chunks
