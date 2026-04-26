'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { SessionData } from '@/lib/types';

import { useSSE } from './useSSE';

export function useAnalysis() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useSSE(sessionId);

  const refreshSession = useCallback(async (targetSessionId: string) => {
    const data = await api.getSession(targetSessionId);
    setSession(data);
    return data;
  }, []);

  useEffect(() => {
    if (!sessionId || !progress) return;
    void refreshSession(sessionId).catch(() => undefined);
  }, [sessionId, progress?.updated_at]);

  const startAnalysis = useCallback(async (payload: {
    user_query: string;
    active_agents: string[];
    investment_debate_rounds: number;
    risk_debate_rounds: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.startAnalysis(payload);
      setSessionId(result.session_id);
      setSession(null);
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
    await api.stopAnalysis(sessionId);
  }, [sessionId]);

  const loadSession = useCallback(async (targetSessionId: string) => {
    setSessionId(targetSessionId);
    setError(null);
    return refreshSession(targetSessionId);
  }, [refreshSession]);

  return {
    sessionId,
    session,
    progress,
    loading,
    error,
    startAnalysis,
    stopAnalysis,
    loadSession,
  };
}
