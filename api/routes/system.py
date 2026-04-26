from __future__ import annotations

from fastapi import APIRouter

from api.schemas import SystemInfoResponse

from ..deps import get_runtime


router = APIRouter(tags=["system"])


@router.get("/api/system/info", response_model=SystemInfoResponse)
async def get_system_info():
    runtime = get_runtime()
    orchestrator = await runtime.get_system_orchestrator()
    info = orchestrator.get_workflow_info()
    enabled_agents = orchestrator.get_enabled_agents()
    tool_count = info["mcp_tools_info"]["total_tools"]
    status = "connected" if tool_count > 0 else "degraded"
    return SystemInfoResponse(
        status=status,
        agents_count=info["agents_count"],
        enabled_agents=enabled_agents,
        mcp_tools_info=info["mcp_tools_info"],
        debug_mode=info["debug_mode"],
        verbose_logging=info["verbose_logging"],
    )
