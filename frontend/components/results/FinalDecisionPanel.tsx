'use client';

import { useMemo, useState } from 'react';

import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

export function FinalDecisionPanel({ content }: { content?: string }) {
  const [open, setOpen] = useState(false);
  const preview = useMemo(() => {
    const plain = (content ?? '').replace(/[#*_>`~-]/g, '').trim();
    if (!plain) return '这轮讨论还没有形成最终建议。';
      return plain.length > 88 ? `${plain.slice(0, 88)}...` : plain;
  }, [content]);

  return (
    <>
      <section className="sidebar-card">
        <div className="sidebar-eyebrow">结论</div>
        <div className="sidebar-title">最终建议</div>
        <div className="sidebar-copy">{preview}</div>
        {content ? (
          <button className="ghost-button sidebar-button" type="button" onClick={() => setOpen(true)}>
            查看完整建议
          </button>
        ) : null}
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
            style={{ width: 'min(920px, 100%)', padding: 24, maxHeight: 'calc(100vh - 40px)', overflow: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>完整建议</div>
                <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>查看这轮讨论最终形成的结论。</div>
              </div>
              <button className="ghost-button" type="button" onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>
            <div className="panel-soft" style={{ padding: 20 }}>
              <MarkdownRenderer content={content} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
