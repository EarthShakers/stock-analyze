from __future__ import annotations

from fastapi import APIRouter

from api.schemas import ConfigPayload

from ..deps import (
    load_agent_permissions,
    load_llm_config,
    load_mcp_config,
    update_agent_permissions,
    update_llm_config,
    update_mcp_config,
)


router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/llm")
async def get_llm_config():
    return {"data": load_llm_config()}


@router.put("/llm")
async def put_llm_config(payload: ConfigPayload):
    return {"data": update_llm_config(payload.data)}


@router.get("/mcp")
async def get_mcp_config():
    return {"data": load_mcp_config()}


@router.put("/mcp")
async def put_mcp_config(payload: ConfigPayload):
    return {"data": update_mcp_config(payload.data)}


@router.get("/agents")
async def get_agent_config():
    return {"data": load_agent_permissions()}


@router.put("/agents")
async def put_agent_config(payload: ConfigPayload):
    return {"data": update_agent_permissions(payload.data)}
