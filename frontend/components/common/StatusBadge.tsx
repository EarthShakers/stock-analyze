import type { SessionStatus } from '@/lib/types';

const colorMap: Record<string, string> = {
  completed: 'rgba(16,185,129,0.14)',
  active: 'rgba(59,130,246,0.14)',
  cancelled: 'rgba(245,158,11,0.14)',
  error: 'rgba(239,68,68,0.14)',
};

export function StatusBadge({ status }: { status: SessionStatus | string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '6px 10px',
        borderRadius: 999,
        background: colorMap[status] || 'rgba(148,163,184,0.14)',
        color: 'var(--text-primary)',
        fontSize: 12,
      }}
    >
      {status}
    </span>
  );
}
