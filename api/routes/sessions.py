from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, HTTPException, Query
from langchain_core.messages import HumanMessage

from api.schemas import AgentSummaryResponse, DecisionSummaryResponse, SessionDetailResponse, SessionListResponse, SessionSummary

from ..deps import delete_session_files, list_sessions, load_session, summarize_session
from src.mcp_manager import MCPManager


router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _fallback_summary(content: str) -> str:
    normalized = " ".join(content.replace("\n", " ").split())
    if not normalized:
        return "暂时还没有可供摘要的内容。"
    return "这位成员已经完成发言，可以打开查看完整内容。"


@lru_cache(maxsize=1)
def _summary_llm():
    return MCPManager().llm


async def _generate_agent_summary(content: str) -> str:
    prompt = f"""
请你把下面这位分析成员的完整发言，总结成一段简短、产品化、易读的中文摘要。

要求：
1. 只输出摘要正文，不要标题，不要项目符号
2. 控制在 45 到 80 个汉字之间
3. 不要复述套话，不要写“该成员认为”
4. 要保留核心判断、风险或结论

发言内容：
{content}
""".strip()

    try:
        result = await _summary_llm().ainvoke([HumanMessage(content=prompt)])
        summary = (getattr(result, "content", "") or "").strip()
        return summary or _fallback_summary(content)
    except Exception:
        return _fallback_summary(content)


async def _generate_decision_summary(content: str) -> str:
    prompt = f"""
请你把下面这份最终投资建议，总结成一段更完整但仍然简洁的中文摘要。

要求：
1. 只输出摘要正文，不要标题，不要项目符号
2. 控制在 90 到 160 个汉字之间
3. 用产品化、自然的中文表达
4. 保留核心结论、主要依据和关键风险提醒

最终建议内容：
{content}
""".strip()

    try:
        result = await _summary_llm().ainvoke([HumanMessage(content=prompt)])
        summary = (getattr(result, "content", "") or "").strip()
        return summary or _fallback_summary(content)
    except Exception:
        return _fallback_summary(content)


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


@router.get("/{session_id}/agents/{agent_name}/summary", response_model=AgentSummaryResponse)
async def get_agent_summary(session_id: str, agent_name: str):
    session = load_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="会话不存在")

    agent = next(
        (item for item in session.get("agents", []) if item.get("agent_name") == agent_name),
        None,
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="成员不存在")

    if agent.get("status") != "completed":
        raise HTTPException(status_code=400, detail="成员尚未完成发言")

    content = (agent.get("result") or agent.get("action") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="成员暂无可摘要内容")

    summary = await _generate_agent_summary(content)
    return AgentSummaryResponse(session_id=session_id, agent_name=agent_name, summary=summary)


@router.get("/{session_id}/decision-summary", response_model=DecisionSummaryResponse)
async def get_decision_summary(session_id: str):
    session = load_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="会话不存在")

    final_state = session.get("final_results", {}).get("final_state", {})
    content = (
        final_state.get("final_trade_decision")
        or final_state.get("trader_investment_plan")
        or final_state.get("investment_plan")
        or ""
    ).strip()

    if not content:
        raise HTTPException(status_code=400, detail="当前还没有最终建议")

    summary = await _generate_decision_summary(content)
    return DecisionSummaryResponse(session_id=session_id, summary=summary)


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    session = load_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="会话不存在")
    delete_session_files(session_id)
    return {"status": "deleted", "session_id": session_id}
