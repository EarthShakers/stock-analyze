'use client';

import { useState } from 'react';

import { AGENT_LABELS } from '@/lib/constants';
import type { McpCall } from '@/lib/types';

export function McpCallPanel({ calls }: { calls: McpCall[] }) {
  const [open, setOpen] = useState(false);
  const latestCalls = calls.slice(0, 3);

  return (
    <>
      <section className="sidebar-card">
        <div className="sidebar-eyebrow">数据</div>
        <div className="sidebar-title">外部数据</div>
        <div className="sidebar-copy">
          {calls.length ? `这轮一共调用了 ${calls.length} 次外部工具。` : '这轮还没有记录到外部工具调用。'}
        </div>
        {latestCalls.length ? (
          <div className="sidebar-list">
            {latestCalls.map((call, index) => (
              <div key={`${call.agent_name}-${call.tool_name}-${index}`} className="sidebar-list-item">
                <div className="sidebar-list-title">{call.tool_name}</div>
                <div className="sidebar-list-subtitle">
                  {AGENT_LABELS[call.agent_name] ?? call.agent_name}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <button className="ghost-button sidebar-button" type="button" onClick={() => setOpen(true)}>
          查看详情
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
            style={{ width: 'min(960px, 100%)', padding: 24, maxHeight: 'calc(100vh - 40px)', overflow: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>外部数据详情</div>
                <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>看看这轮讨论向外部工具取回了哪些信息。</div>
              </div>
              <button className="ghost-button" type="button" onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>

            {calls.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {calls.map((call, index) => (
                  <div key={`${call.agent_name}-${call.tool_name}-${index}`} className="panel-soft" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{call.tool_name}</div>
                        <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>
                          {AGENT_LABELS[call.agent_name] ?? call.agent_name}
                        </div>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{call.timestamp}</div>
                    </div>
                    <div style={{ marginTop: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {call.tool_result || '无返回内容'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>本次分析未记录外部工具调用。</div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
