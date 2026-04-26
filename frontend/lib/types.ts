export type SessionStatus = 'active' | 'completed' | 'cancelled' | 'error' | 'pending' | 'unknown';

export interface AgentRecord {
  agent_name: string;
  action?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  result?: string;
  system_prompt?: string;
  user_prompt?: string;
  context?: string;
}

export interface McpCall {
  agent_name: string;
  tool_name: string;
  timestamp?: string;
  tool_result?: string;
}

export interface SessionData {
  session_id: string;
  created_at?: string;
  updated_at?: string;
  status: SessionStatus;
  user_query: string;
  active_agents: string[];
  agents: AgentRecord[];
  mcp_calls: McpCall[];
  warnings?: Array<{ warning_msg?: string; timestamp?: string; agent_name?: string }>;
  errors?: Array<{ error_msg?: string; timestamp?: string; agent_name?: string }>;
  final_results?: {
    final_state?: {
      final_trade_decision?: string;
      trader_investment_plan?: string;
      investment_plan?: string;
    };
  };
}

export interface ChatFeedSession {
  session_id: string;
  status: SessionStatus;
  user_query: string;
  updated_at?: string;
  agents: AgentRecord[];
  mcp_calls: McpCall[];
  final_results?: SessionData['final_results'];
}

export interface SessionSummary {
  session_id: string;
  created_at?: string;
  updated_at?: string;
  status: SessionStatus;
  user_query: string;
  active_agents: string[];
  agent_count: number;
  completed_agents: number;
  mcp_call_count: number;
  duration_seconds?: number;
}

export interface ProgressStage {
  key: string;
  status: string;
  completed: number;
  total: number;
}

export interface ProgressPayload {
  session_id: string;
  status: SessionStatus;
  progress_percent: number;
  completed_agents: number;
  total_agents: number;
  current_agent?: string | null;
  updated_at?: string;
  final_decision?: string;
  stages: ProgressStage[];
}

export interface SystemInfo {
  status: 'connected' | 'degraded' | 'disconnected';
  agents_count: number;
  enabled_agents: string[];
  mcp_tools_info: {
    total_tools: number;
    server_count: number;
  };
  debug_mode: boolean;
  verbose_logging: boolean;
}
