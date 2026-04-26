'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { SessionSummary } from '@/lib/types';

export function useSessions(initialQuery = '') {
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status) params.set('status', status);
    const result = await api.getSessions(params.toString());
    setItems(result.items);
    setLoading(false);
  }, [query, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = async (sessionId: string) => {
    await api.deleteSession(sessionId);
    await refresh();
  };

  return {
    items,
    query,
    status,
    loading,
    setQuery,
    setStatus,
    refresh,
    remove,
  };
}
