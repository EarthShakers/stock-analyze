from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from api.schemas import SessionDetailResponse, SessionListResponse, SessionSummary

from ..deps import delete_session_files, list_sessions, load_session, summarize_session


router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=SessionListResponse)
async def get_sessions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = None,
    q: str | None = None,
):
    sessions = list_sessions()
    if status:
        sessions = [item for item in sessions if item.get("status") == status]
    if q:
        sessions = [item for item in sessions if q.lower() in item.get("user_query", "").lower()]

    summaries = [SessionSummary(**summarize_session(item)) for item in sessions]
    start = (page - 1) * page_size
    end = start + page_size
    return SessionListResponse(
        items=summaries[start:end],
        total=len(summaries),
        page=page,
        page_size=page_size,
    )


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(session_id: str):
    session = load_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="会话不存在")
    return SessionDetailResponse(session=session)


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    session = load_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="会话不存在")
    delete_session_files(session_id)
    return {"status": "deleted", "session_id": session_id}
