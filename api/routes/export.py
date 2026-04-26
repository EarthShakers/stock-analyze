from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from src.dumptools.json_to_markdown import JSONToMarkdownConverter
from src.dumptools.md2docx import MarkdownToDocxConverter
from src.dumptools.md2pdf import MarkdownToPDFConverter

from ..deps import BASE_DIR, session_path


router = APIRouter(prefix="/api/export", tags=["export"])


def ensure_session_file(session_id: str) -> Path:
    path = session_path(session_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="会话不存在")
    return path


@router.get("/{session_id}/markdown")
async def export_markdown(session_id: str):
    json_path = ensure_session_file(session_id)
    output = JSONToMarkdownConverter().convert_json_to_markdown(str(json_path))
    if not output:
        raise HTTPException(status_code=500, detail="Markdown 导出失败")
    return FileResponse(output, media_type="text/markdown", filename=Path(output).name)


@router.get("/{session_id}/pdf")
async def export_pdf(session_id: str):
    json_path = ensure_session_file(session_id)
    output = MarkdownToPDFConverter().convert_json_to_pdf_via_markdown(str(json_path))
    if not output:
        raise HTTPException(status_code=500, detail="PDF 导出失败")
    return FileResponse(output, media_type="application/pdf", filename=Path(output).name)


@router.get("/{session_id}/docx")
async def export_docx(session_id: str):
    json_path = ensure_session_file(session_id)
    output = MarkdownToDocxConverter().convert_json_to_docx_via_markdown(str(json_path))
    if not output:
        raise HTTPException(status_code=500, detail="DOCX 导出失败")
    return FileResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=Path(output).name,
    )
