from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class AnalysisStartRequest(BaseModel):
    user_query: str = Field(..., min_length=1)
    active_agents: List[str] = Field(default_factory=list)
    investment_debate_rounds: Optional[int] = Field(default=None, ge=0, le=10)
    risk_debate_rounds: Optional[int] = Field(default=None, ge=0, le=10)


class AnalysisStartResponse(BaseModel):
    session_id: str
    status: str


class AnalysisStopResponse(BaseModel):
    session_id: str
    status: str
    message: str


class SessionSummary(BaseModel):
    session_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    status: str = "unknown"
    user_query: str = ""
    active_agents: List[str] = Field(default_factory=list)
    agent_count: int = 0
    completed_agents: int = 0
    mcp_call_count: int = 0
    duration_seconds: Optional[float] = None


class SessionListResponse(BaseModel):
    items: List[SessionSummary]
    total: int
    page: int
    page_size: int


class SessionDetailResponse(BaseModel):
    session: Dict[str, Any]


class AgentSummaryResponse(BaseModel):
    session_id: str
    agent_name: str
    summary: str


class DecisionSummaryResponse(BaseModel):
    session_id: str
    summary: str


class ConfigPayload(BaseModel):
    data: Dict[str, Any]


class SystemInfoResponse(BaseModel):
    status: Literal["connected", "degraded", "disconnected"]
    agents_count: int
    enabled_agents: List[str]
    mcp_tools_info: Dict[str, Any]
    debug_mode: bool
    verbose_logging: bool
