from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from .deps import build_progress_payload, get_runtime, load_session


router = APIRouter()


@router.get("/api/analysis/progress/{session_id}")
async def stream_progress(session_id: str):
    runtime = get_runtime()

    async def event_generator():
        while True:
            session = load_session(session_id)
            payload = build_progress_payload(session, running=runtime.is_running(session_id))
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            if payload["status"] in {"completed", "cancelled", "error"} and not runtime.is_running(session_id):
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
