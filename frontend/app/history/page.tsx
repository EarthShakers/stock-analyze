'use client';

import { SessionCard } from '@/components/history/SessionCard';
import { useSessions } from '@/hooks/useSessions';

export default function HistoryPage() {
  const { items, query, status, loading, setQuery, setStatus, remove } = useSessions();

  return (
    <main className="page-container" style={{ display: 'grid', gap: 18 }}>
      <section className="panel" style={{ padding: 22 }}>
        <div className="grid-2">
          <input className="field" placeholder="搜索历史会话" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="select-field" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">全部状态</option>
            <option value="completed">completed</option>
            <option value="active">active</option>
            <option value="cancelled">cancelled</option>
            <option value="error">error</option>
          </select>
        </div>
      </section>

      {loading ? <div className="panel" style={{ padding: 18 }}>加载中...</div> : null}

      <section style={{ display: 'grid', gap: 16 }}>
        {items.map((session) => (
          <SessionCard key={session.session_id} session={session} onDelete={() => void remove(session.session_id)} />
        ))}
        {!loading && !items.length ? (
          <div className="panel" style={{ padding: 24, color: 'var(--text-muted)' }}>
            暂无历史会话。
          </div>
        ) : null}
      </section>
    </main>
  );
}
