'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import type { SessionData } from '@/lib/types';

import { useSSE } from './useSSE';

function mergeSessions(current: SessionData | null, next: SessionData): SessionData {
  if (!current || current.session_id !== next.session_id) {
    return next;
  }

  const currentAgents = current.agents ?? [];
  const nextAgents = next.agents ?? [];
  const nextAgentMap = new Map(
    nextAgents.map((agent) => [`${agent.agent_name}:${agent.start_time || ''}`, agent]),
  );

  const mergedAgents = currentAgents
    .map((agent) => nextAgentMap.get(`${agent.agent_name}:${agent.start_time || ''}`) ?? agent)
    .concat(
      nextAgents.filter(
        (agent) =>
          !currentAgents.some(
            (item) => item.agent_name === agent.agent_name && (item.start_time || '') === (agent.start_time || ''),
          ),
      ),
    );

  const merged: SessionData = {
    ...current,
    ...next,
    agents: mergedAgents,
  };

  const currentSignature = JSON.stringify({
    updated_at: current.updated_at,
    status: current.status,
    user_query: current.user_query,
    active_agents: current.active_agents,
    mcp_calls: current.mcp_calls,
    final_results: current.final_results,
    agents: current.agents.map((agent) => ({
      agent_name: agent.agent_name,
      start_time: agent.start_time,
      end_time: agent.end_time,
      status: agent.status,
      action: agent.action,
      result: agent.result,
    })),
  });
  const mergedSignature = JSON.stringify({
    updated_at: merged.updated_at,
    status: merged.status,
    user_query: merged.user_query,
    active_agents: merged.active_agents,
    mcp_calls: merged.mcp_calls,
    final_results: merged.final_results,
    agents: merged.agents.map((agent) => ({
      agent_name: agent.agent_name,
      start_time: agent.start_time,
      end_time: agent.end_time,
      status: agent.status,
      action: agent.action,
      result: agent.result,
    })),
  });

  return currentSignature === mergedSignature ? current : merged;
}

export function useAnalysis() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useSSE(sessionId);
  const lastRefreshAtRef = useRef(0);
  const lastAgentRef = useRef<string | null>(null);

  const refreshSession = useCallback(async (targetSessionId: string) => {
    const data = await api.getSession(targetSessionId);
    setSession((current) => mergeSessions(current, data));
    return data;
  }, []);

  useEffect(() => {
    if (!sessionId || !progress) return;

    const now = Date.now();
    const terminal = progress.status === 'cancelled' || progress.status === 'completed' || progress.status === 'error';
    const agentChanged = progress.current_agent !== lastAgentRef.current;
    const throttled = now - lastRefreshAtRef.current > 1200;

    if (terminal || agentChanged || throttled) {
      lastRefreshAtRef.current = now;
      lastAgentRef.current = progress.current_agent ?? null;
      void refreshSession(sessionId).catch(() => undefined);
    }

    if (progress.status === 'cancelled' || progress.status === 'completed' || progress.status === 'error') {
      setStopping(false);
    }
  }, [sessionId, progress?.updated_at]);

  const startAnalysis = useCallback(async (payload: {
    user_query: string;
    active_agents: string[];
    investment_debate_rounds: number;
    risk_debate_rounds: number;
  }) => {
    setLoading(true);
    setError(null);
    setSession(null);
    setSessionId(null);
    setStopping(false);
    lastRefreshAtRef.current = 0;
    lastAgentRef.current = null;
    try {
      const result = await api.startAnalysis(payload);
      setSessionId(result.session_id);
      void refreshSession(result.session_id).catch(() => undefined);
      return result.session_id;
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopAnalysis = useCallback(async () => {
    if (!sessionId) return;
    setStopping(true);
    await api.stopAnalysis(sessionId);
  }, [sessionId]);

  const loadSession = useCallback(async (targetSessionId: string) => {
    setSessionId(targetSessionId);
    setError(null);
    lastRefreshAtRef.current = 0;
    lastAgentRef.current = null;
    return refreshSession(targetSessionId);
  }, [refreshSession]);

  return {
    sessionId,
    session,
    progress,
    loading,
    stopping,
    error,
    startAnalysis,
    stopAnalysis,
    loadSession,
  };
}
