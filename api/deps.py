from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import set_key

from src.agent_states import AgentState
from src.progress_tracker import ProgressTracker
from src.workflow_orchestrator import WorkflowOrchestrator


BASE_DIR = Path(__file__).resolve().parent.parent
DUMP_DIR = BASE_DIR / "src" / "dump"
ENV_FILE = BASE_DIR / ".env"
MCP_CONFIG_FILE = BASE_DIR / "mcp_config.json"


AGENT_ENV_MAPPING = {
    "company_overview_analyst": "COMPANY_OVERVIEW_ANALYST_MCP_ENABLED",
    "market_analyst": "MARKET_ANALYST_MCP_ENABLED",
    "sentiment_analyst": "SENTIMENT_ANALYST_MCP_ENABLED",
    "news_analyst": "NEWS_ANALYST_MCP_ENABLED",
    "fundamentals_analyst": "FUNDAMENTALS_ANALYST_MCP_ENABLED",
    "shareholder_analyst": "SHAREHOLDER_ANALYST_MCP_ENABLED",
    "product_analyst": "PRODUCT_ANALYST_MCP_ENABLED",
    "bull_researcher": "BULL_RESEARCHER_MCP_ENABLED",
    "bear_researcher": "BEAR_RESEARCHER_MCP_ENABLED",
    "research_manager": "RESEARCH_MANAGER_MCP_ENABLED",
    "trader": "TRADER_MCP_ENABLED",
    "aggressive_risk_analyst": "AGGRESSIVE_RISK_ANALYST_MCP_ENABLED",
    "safe_risk_analyst": "SAFE_RISK_ANALYST_MCP_ENABLED",
    "neutral_risk_analyst": "NEUTRAL_RISK_ANALYST_MCP_ENABLED",
    "risk_manager": "RISK_MANAGER_MCP_ENABLED",
}

LLM_ENV_KEYS = [
    "LLM_API_KEY",
    "LLM_BASE_URL",
    "LLM_MODEL",
    "LLM_TEMPERATURE",
    "LLM_MAX_TOKENS",
    "MAX_DEBATE_ROUNDS",
    "MAX_RISK_DEBATE_ROUNDS",
    "DEBUG_MODE",
    "VERBOSE_LOGGING",
]

STAGE_GROUPS = [
    ("overview", ["company_overview_analyst"]),
    (
        "analysis",
        [
            "market_analyst",
            "sentiment_analyst",
            "news_analyst",
            "fundamentals_analyst",
            "shareholder_analyst",
            "product_analyst",
        ],
    ),
    ("debate", ["bull_researcher", "bear_researcher", "research_manager"]),
    ("decision", ["trader"]),
    (
        "risk",
        [
            "aggressive_risk_analyst",
            "safe_risk_analyst",
            "neutral_risk_analyst",
            "risk_manager",
        ],
    ),
]


class ApiWorkflowOrchestrator(WorkflowOrchestrator):
    async def run_analysis_with_session(
        self,
        *,
        session_id: str,
        user_query: str,
        cancel_checker=None,
        active_agents: Optional[List[str]] = None,
    ) -> AgentState:
        self.cancel_checker = cancel_checker
        if active_agents:
            self.active_agents = {a for a in active_agents if a in self.agents}
        else:
            self.active_agents = set(self.agents.keys())

        self.progress_manager = ProgressTracker(session_id=session_id)
        self.progress_manager.cancel_checker = cancel_checker
        self.progress_manager.update_user_query(user_query)
        self.progress_manager.set_active_agents(sorted(self.active_agents))
        self.progress_manager.log_workflow_start({"user_query": user_query})

        initial_state = AgentState(
            user_query=user_query,
            investment_debate_state={
                "count": 0,
                "history": "",
                "bull_history": "",
                "bear_history": "",
                "current_response": "",
            },
            risk_debate_state={
                "count": 0,
                "history": "",
                "aggressive_history": "",
                "safe_history": "",
                "neutral_history": "",
                "current_aggressive_response": "",
                "current_safe_response": "",
                "current_neutral_response": "",
            },
            messages=[],
        )

        try:
            self._check_cancel()
            workflow_result = await self.workflow.ainvoke(initial_state)
            if isinstance(workflow_result, dict):
                final_state = AgentState(
                    user_query=workflow_result.get("user_query", user_query),
                    investment_debate_state=workflow_result.get("investment_debate_state", {}),
                    risk_debate_state=workflow_result.get("risk_debate_state", {}),
                    messages=workflow_result.get("messages", []),
                    market_report=workflow_result.get("market_report", ""),
                    sentiment_report=workflow_result.get("sentiment_report", ""),
                    news_report=workflow_result.get("news_report", ""),
                    fundamentals_report=workflow_result.get("fundamentals_report", ""),
                    shareholder_report=workflow_result.get("shareholder_report", ""),
                    investment_plan=workflow_result.get("investment_plan", ""),
                    trader_investment_plan=workflow_result.get("trader_investment_plan", ""),
                    final_trade_decision=workflow_result.get("final_trade_decision", ""),
                    errors=workflow_result.get("errors", []),
                    warnings=workflow_result.get("warnings", []),
                    agent_execution_history=workflow_result.get("agent_execution_history", []),
                    mcp_tool_calls=workflow_result.get("mcp_tool_calls", []),
                )
            else:
                final_state = workflow_result

            if self.progress_manager:
                self.progress_manager.set_final_results(
                    {
                        "final_state": self._state_to_dict(final_state),
                        "completion_time": datetime.now().isoformat(),
                        "success": True,
                    }
                )
                self.progress_manager.log_workflow_completion({"success": True})
            return final_state
        except asyncio.CancelledError:
            if self.progress_manager:
                self.progress_manager.add_warning("分析已被用户取消")
                self.progress_manager.session_data["status"] = "cancelled"
                self.progress_manager._save_json()
                self.progress_manager.log_workflow_completion(
                    {"success": False, "cancelled": True}
                )
            raise
        except Exception as exc:
            if self.progress_manager:
                self.progress_manager.add_error(str(exc))
                self.progress_manager.session_data["status"] = "error"
                self.progress_manager.session_data["final_results"] = {
                    "error": str(exc),
                    "completion_time": datetime.now().isoformat(),
                    "success": False,
                }
                self.progress_manager._save_json()
            raise exc


class AnalysisRuntime:
    def __init__(self, config_file: str = "mcp_config.json"):
        self.config_file = config_file
        self.tasks: Dict[str, asyncio.Task] = {}
        self.cancel_events: Dict[str, asyncio.Event] = {}
        self._system_orchestrator: Optional[WorkflowOrchestrator] = None
        self._system_lock = asyncio.Lock()

    def _generate_session_id(self) -> str:
        return f"{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{uuid.uuid4().hex[:8]}"

    async def start_analysis(
        self,
        *,
        user_query: str,
        active_agents: Optional[List[str]] = None,
        investment_rounds: Optional[int] = None,
        risk_rounds: Optional[int] = None,
    ) -> str:
        session_id = self._generate_session_id()
        cancel_event = asyncio.Event()
        self.cancel_events[session_id] = cancel_event
        task = asyncio.create_task(
            self._run_job(
                session_id=session_id,
                user_query=user_query,
                active_agents=active_agents or [],
                investment_rounds=investment_rounds,
                risk_rounds=risk_rounds,
                cancel_event=cancel_event,
            )
        )
        self.tasks[session_id] = task
        return session_id

    async def _run_job(
        self,
        *,
        session_id: str,
        user_query: str,
        active_agents: List[str],
        investment_rounds: Optional[int],
        risk_rounds: Optional[int],
        cancel_event: asyncio.Event,
    ) -> None:
        orchestrator = ApiWorkflowOrchestrator(self.config_file)
        try:
            await orchestrator.initialize()
            orchestrator.set_debate_rounds(investment_rounds, risk_rounds)
            await orchestrator.run_analysis_with_session(
                session_id=session_id,
                user_query=user_query,
                cancel_checker=cancel_event.is_set,
                active_agents=active_agents,
            )
        except asyncio.CancelledError:
            pass
        except Exception:
            session = load_session(session_id)
            if session:
                session["status"] = "error"
                session.setdefault("errors", []).append(
                    {
                        "error_msg": "后台任务执行失败",
                        "agent_name": "",
                        "timestamp": datetime.now().isoformat(),
                    }
                )
                save_session(session_id, session)
        finally:
            await orchestrator.close()

    async def stop_analysis(self, session_id: str) -> bool:
        task = self.tasks.get(session_id)
        cancel_event = self.cancel_events.get(session_id)
        if cancel_event:
            cancel_event.set()
        if task and not task.done():
            return True
        return bool(cancel_event)

    def is_running(self, session_id: str) -> bool:
        task = self.tasks.get(session_id)
        return bool(task and not task.done())

    async def get_system_orchestrator(self) -> WorkflowOrchestrator:
        async with self._system_lock:
            if self._system_orchestrator is None:
                orchestrator = WorkflowOrchestrator(self.config_file)
                await orchestrator.initialize()
                self._system_orchestrator = orchestrator
            return self._system_orchestrator

    async def shutdown(self) -> None:
        for cancel_event in self.cancel_events.values():
            cancel_event.set()
        for task in self.tasks.values():
            if not task.done():
                task.cancel()
        if self.tasks:
            await asyncio.gather(*self.tasks.values(), return_exceptions=True)
        self.tasks.clear()
        self.cancel_events.clear()
        if self._system_orchestrator is not None:
            await self._system_orchestrator.close()
            self._system_orchestrator = None


_runtime = AnalysisRuntime()


def get_runtime() -> AnalysisRuntime:
    return _runtime


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)


def session_path(session_id: str) -> Path:
    return DUMP_DIR / f"session_{session_id}.json"


def load_session(session_id: str) -> Optional[Dict[str, Any]]:
    path = session_path(session_id)
    if not path.exists():
        return None
    return load_json(path, {})


def save_session(session_id: str, data: Dict[str, Any]) -> None:
    save_json(session_path(session_id), data)


def list_sessions() -> List[Dict[str, Any]]:
    sessions: List[Dict[str, Any]] = []
    if not DUMP_DIR.exists():
        return sessions
    for path in sorted(DUMP_DIR.glob("session_*.json"), reverse=True):
        try:
            data = load_json(path, {})
            data["_path"] = str(path)
            sessions.append(data)
        except Exception:
            continue
    sessions.sort(key=lambda item: item.get("updated_at") or item.get("created_at") or "", reverse=True)
    return sessions


def delete_session_files(session_id: str) -> None:
    targets = [
        session_path(session_id),
        BASE_DIR / "markdown_reports" / f"session_{session_id}.md",
        BASE_DIR / "markdown_reports" / f"session_{session_id}_关键分析.md",
        BASE_DIR / "src" / "dumptools" / "pdf_reports" / f"session_{session_id}.pdf",
        BASE_DIR / "src" / "dumptools" / "pdf_reports" / f"session_{session_id}_关键分析.pdf",
        BASE_DIR / "src" / "dumptools" / "docx_reports" / f"session_{session_id}.docx",
        BASE_DIR / "src" / "dumptools" / "docx_reports" / f"session_{session_id}_关键分析.docx",
    ]
    for path in targets:
        if path.exists():
            path.unlink()


def parse_env_file() -> Dict[str, str]:
    data: Dict[str, str] = {}
    if not ENV_FILE.exists():
        return data
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            data[key.strip()] = value.strip()
    return data


def update_env_values(values: Dict[str, Any]) -> Dict[str, str]:
    ENV_FILE.touch(exist_ok=True)
    applied: Dict[str, str] = {}
    for key, value in values.items():
        str_value = "" if value is None else str(value)
        set_key(str(ENV_FILE), key, str_value)
        os.environ[key] = str_value
        applied[key] = str_value
    return applied


def load_llm_config() -> Dict[str, Any]:
    env = parse_env_file()
    return {key: env.get(key, "") for key in LLM_ENV_KEYS}


def update_llm_config(values: Dict[str, Any]) -> Dict[str, str]:
    filtered = {key: values[key] for key in LLM_ENV_KEYS if key in values}
    return update_env_values(filtered)


def load_agent_permissions() -> Dict[str, bool]:
    env = parse_env_file()
    return {
        agent: env.get(env_key, "false").lower() == "true"
        for agent, env_key in AGENT_ENV_MAPPING.items()
    }


def update_agent_permissions(values: Dict[str, Any]) -> Dict[str, str]:
    mapped = {
        AGENT_ENV_MAPPING[agent]: "true" if bool(enabled) else "false"
        for agent, enabled in values.items()
        if agent in AGENT_ENV_MAPPING
    }
    return update_env_values(mapped)


def load_mcp_config() -> Dict[str, Any]:
    return load_json(MCP_CONFIG_FILE, {"servers": {}})


def update_mcp_config(data: Dict[str, Any]) -> Dict[str, Any]:
    save_json(MCP_CONFIG_FILE, data)
    return data


def _safe_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def summarize_session(session: Dict[str, Any]) -> Dict[str, Any]:
    agents = session.get("agents", [])
    completed_agents = sum(1 for agent in agents if agent.get("status") == "completed")
    started_at = _safe_datetime(session.get("created_at"))
    ended_at = _safe_datetime(session.get("updated_at"))
    duration = None
    if started_at and ended_at:
        duration = round((ended_at - started_at).total_seconds(), 2)
    return {
        "session_id": session.get("session_id", ""),
        "created_at": session.get("created_at"),
        "updated_at": session.get("updated_at"),
        "status": session.get("status", "unknown"),
        "user_query": session.get("user_query", ""),
        "active_agents": session.get("active_agents", []),
        "agent_count": len(agents),
        "completed_agents": completed_agents,
        "mcp_call_count": len(session.get("mcp_calls", [])),
        "duration_seconds": duration,
    }


def build_progress_payload(session: Optional[Dict[str, Any]], running: bool = False) -> Dict[str, Any]:
    if not session:
        return {
            "status": "pending",
            "session_id": "",
            "progress_percent": 0,
            "completed_agents": 0,
            "total_agents": 0,
            "current_agent": None,
            "stages": [],
        }

    agents = session.get("agents", [])
    agents_by_name = {agent.get("agent_name"): agent for agent in agents}
    completed_agents = sum(1 for agent in agents if agent.get("status") == "completed")
    running_agent = next(
        (agent.get("agent_name") for agent in reversed(agents) if agent.get("status") == "running"),
        None,
    )
    total_agents = max(len(session.get("active_agents", [])), len(agents))
    progress_percent = int((completed_agents / total_agents) * 100) if total_agents else 0

    stages = []
    for key, stage_agents in STAGE_GROUPS:
        relevant = [agents_by_name[name] for name in stage_agents if name in agents_by_name]
        if not relevant:
            status = "completed" if key == "overview" and progress_percent > 0 else "pending"
        elif all(agent.get("status") == "completed" for agent in relevant):
            status = "completed"
        elif any(agent.get("status") == "running" for agent in relevant):
            status = "running"
        elif any(agent.get("status") == "failed" for agent in relevant):
            status = "error"
        else:
            status = "pending"
        stages.append(
            {
                "key": key,
                "status": status,
                "completed": sum(1 for agent in relevant if agent.get("status") == "completed"),
                "total": len(stage_agents),
            }
        )

    return {
        "session_id": session.get("session_id", ""),
        "status": session.get("status", "active" if running else "pending"),
        "progress_percent": progress_percent,
        "completed_agents": completed_agents,
        "total_agents": total_agents,
        "current_agent": running_agent,
        "updated_at": session.get("updated_at"),
        "final_decision": session.get("final_results", {})
        .get("final_state", {})
        .get("final_trade_decision", ""),
        "stages": stages,
    }
