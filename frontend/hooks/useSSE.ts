'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { ProgressPayload } from '@/lib/types';

export function useSSE(sessionId: string | null) {
  const [progress, setProgress] = useState<ProgressPayload | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const source = new EventSource(api.progressUrl(sessionId));
    source.onmessage = (event) => {
      try {
        setProgress(JSON.parse(event.data) as ProgressPayload);
      } catch {
        // Ignore malformed events.
      }
    };
    source.onerror = () => source.close();

    return () => source.close();
  }, [sessionId]);

  return progress;
}
