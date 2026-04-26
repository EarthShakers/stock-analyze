import type { ProgressPayload, SessionData, SessionSummary, SystemInfo } from './types';

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || '请求失败');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getSystemInfo: () => request<SystemInfo>('/api/system/info'),
  startAnalysis: (payload: {
    user_query: string;
    active_agents: string[];
    investment_debate_rounds: number;
    risk_debate_rounds: number;
  }) => request<{ session_id: string; status: string }>('/api/analysis/start', { method: 'POST', body: JSON.stringify(payload) }),
  stopAnalysis: (sessionId: string) => request<{ status: string }>(`/api/analysis/stop/${sessionId}`, { method: 'POST' }),
  getSession: async (sessionId: string) => (await request<{ session: SessionData }>(`/api/sessions/${sessionId}`)).session,
  getAgentSummary: async (sessionId: string, agentName: string) =>
    (await request<{ session_id: string; agent_name: string; summary: string }>(
      `/api/sessions/${sessionId}/agents/${agentName}/summary`,
    )).summary,
  getDecisionSummary: async (sessionId: string) =>
    (await request<{ session_id: string; summary: string }>(`/api/sessions/${sessionId}/decision-summary`)).summary,
  getSessions: async (query = '') => {
    const suffix = query ? `?${query}` : '';
    return request<{ items: SessionSummary[]; total: number }>(`/api/sessions${suffix}`);
  },
  deleteSession: (sessionId: string) => request(`/api/sessions/${sessionId}`, { method: 'DELETE' }),
  getLlmConfig: async () => (await request<{ data: Record<string, string> }>('/api/config/llm')).data,
  updateLlmConfig: (data: Record<string, string>) => request('/api/config/llm', { method: 'PUT', body: JSON.stringify({ data }) }),
  getMcpConfig: async () => (await request<{ data: Record<string, unknown> }>('/api/config/mcp')).data,
  updateMcpConfig: (data: Record<string, unknown>) => request('/api/config/mcp', { method: 'PUT', body: JSON.stringify({ data }) }),
  getAgentConfig: async () => (await request<{ data: Record<string, boolean> }>('/api/config/agents')).data,
  updateAgentConfig: (data: Record<string, boolean>) => request('/api/config/agents', { method: 'PUT', body: JSON.stringify({ data }) }),
  progressUrl: (sessionId: string) => `${getApiBaseUrl()}/api/analysis/progress/${sessionId}`,
  exportUrl: (sessionId: string, format: 'markdown' | 'pdf' | 'docx') =>
    `${getApiBaseUrl()}/api/export/${sessionId}/${format}`,
};

export type { ProgressPayload };
