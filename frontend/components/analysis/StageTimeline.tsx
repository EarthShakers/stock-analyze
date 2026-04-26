import { STAGE_LABELS } from '@/lib/constants';
import type { ProgressPayload } from '@/lib/types';

export function StageTimeline({ progress }: { progress: ProgressPayload | null }) {
  const stages = progress?.stages ?? [];

  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {stages.map((stage) => {
          const color =
            stage.status === 'completed'
              ? 'var(--accent-green)'
              : stage.status === 'running'
                ? 'var(--accent)'
                : stage.status === 'error'
                  ? 'var(--accent-red)'
                  : 'rgba(148,163,184,0.4)';

          return (
            <div key={stage.key} className="panel-soft" style={{ flex: 1, minWidth: 110, padding: 14 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{STAGE_LABELS[stage.key] ?? stage.key}</div>
              <div style={{ marginTop: 10, color, fontWeight: 700 }}>{stage.status.toUpperCase()}</div>
              <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                {stage.completed}/{stage.total}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18, color: 'var(--text-secondary)' }}>
        {progress?.current_agent ? `当前执行: ${progress.current_agent}` : '等待开始'}
      </div>
      <div style={{ marginTop: 10, height: 8, background: 'rgba(51,65,85,0.6)', borderRadius: 999 }}>
        <div
          style={{
            width: `${progress?.progress_percent ?? 0}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #3b82f6, #10b981)',
          }}
        />
      </div>
      <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
        {progress?.progress_percent ?? 0}% · {progress?.completed_agents ?? 0}/{progress?.total_agents ?? 0}
      </div>
    </div>
  );
}
