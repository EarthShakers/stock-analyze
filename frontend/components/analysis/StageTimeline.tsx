'use client';

import { useState } from 'react';

import { STAGE_LABELS } from '@/lib/constants';
import type { ProgressPayload } from '@/lib/types';

export function StageTimeline({ progress }: { progress: ProgressPayload | null }) {
  const [open, setOpen] = useState(false);
  const stages = progress?.stages ?? [];
  const currentAgentLabel = progress?.current_agent ? `${progress.current_agent} 正在整理观点` : '等待开始';

  const getStageStatusLabel = (status: string) => {
    if (status === 'completed') return '已完成';
    if (status === 'running') return '进行中';
    if (status === 'error') return '异常';
    return '等待中';
  };

  return (
    <>
      <section className="sidebar-card">
        <div className="sidebar-eyebrow">进展</div>
        <div className="sidebar-title">讨论进展</div>
        <div className="sidebar-copy">{currentAgentLabel}</div>
        <div style={{ marginTop: 12, height: 8, background: 'rgba(51,65,85,0.6)', borderRadius: 999 }}>
          <div
            style={{
              width: `${progress?.progress_percent ?? 0}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #3b82f6, #10b981)',
            }}
          />
        </div>
        <div className="sidebar-meta">
          已完成 {progress?.completed_agents ?? 0}/{progress?.total_agents ?? 0} · {progress?.progress_percent ?? 0}%
        </div>
        <button className="ghost-button sidebar-button" type="button" onClick={() => setOpen(true)}>
          查看完整进展
        </button>
      </section>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.62)',
            zIndex: 45,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            className="panel"
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(920px, 100%)', padding: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>完整进展</div>
                <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>看看这轮讨论已经推进到了哪一步。</div>
              </div>
              <button className="ghost-button" type="button" onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>

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
                  <div key={stage.key} className="panel-soft" style={{ flex: 1, minWidth: 120, padding: 14 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{STAGE_LABELS[stage.key] ?? stage.key}</div>
                    <div style={{ marginTop: 10, color, fontWeight: 700 }}>{getStageStatusLabel(stage.status)}</div>
                    <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                      {stage.completed}/{stage.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
