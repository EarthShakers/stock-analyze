from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.schemas import AnalysisStartRequest, AnalysisStartResponse, AnalysisStopResponse

from ..deps import get_runtime, load_session


router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/start", response_model=AnalysisStartResponse)
async def start_analysis(payload: AnalysisStartRequest):
    runtime = get_runtime()
    session_id = await runtime.start_analysis(
        user_query=payload.user_query,
        active_agents=payload.active_agents,
        investment_rounds=payload.investment_debate_rounds,
        risk_rounds=payload.risk_debate_rounds,
    )
    return AnalysisStartResponse(session_id=session_id, status="started")


@router.post("/stop/{session_id}", response_model=AnalysisStopResponse)
async def stop_analysis(session_id: str):
    runtime = get_runtime()
    exists = load_session(session_id) is not None or runtime.is_running(session_id)
    if not exists:
        raise HTTPException(status_code=404, detail="会话不存在")
    await runtime.stop_analysis(session_id)
    return AnalysisStopResponse(
        session_id=session_id,
        status="stopping",
        message="已发送取消请求",
    )
