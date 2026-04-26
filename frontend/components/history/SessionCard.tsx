import Link from 'next/link';

import type { SessionSummary } from '@/lib/types';

import { StatusBadge } from '../common/StatusBadge';
import { ExportButtons } from './ExportButtons';

export function SessionCard({ session, onDelete }: { session: SessionSummary; onDelete: () => void }) {
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{session.user_query || session.session_id}</div>
          <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            {session.created_at} · {session.completed_agents}/{session.agent_count} · {session.duration_seconds ?? '--'}s
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
        <Link className="primary-button" href={`/?session=${session.session_id}`}>
          查看结果
        </Link>
        <ExportButtons sessionId={session.session_id} />
        <button className="danger-button" onClick={onDelete}>
          删除
        </button>
      </div>
    </div>
  );
}
