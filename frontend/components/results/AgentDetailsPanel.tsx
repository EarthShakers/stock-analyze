'use client';

import { useEffect, useMemo, useState } from 'react';

import { AGENT_LABELS } from '@/lib/constants';
import type { SessionData } from '@/lib/types';

import { AgentReport } from './AgentReport';

export function AgentDetailsPanel({ session }: { session: SessionData }) {
  const allAgents = useMemo(() => session.agents ?? [], [session.agents]);
  const [open, setOpen] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState(allAgents[0]?.agent_name ?? '');

  useEffect(() => {
    setSelectedAgentName((current) => {
      if (current && allAgents.some((agent) => agent.agent_name === current)) {
        return current;
      }
      return allAgents[0]?.agent_name ?? '';
    });
  }, [allAgents]);

  const selectedAgent = allAgents.find((agent) => agent.agent_name === selectedAgentName) || allAgents[0];
  const completedCount = allAgents.filter((agent) => agent.status === 'completed').length;
  const previewAgents = allAgents.slice(0, 4);

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return '已完成';
    if (status === 'running') return '回复中';
    if (status === 'error') return '异常';
    return '等待中';
  };

  return (
    <>
      <section className="sidebar-card">
        <div className="sidebar-eyebrow">成员</div>
        <div className="sidebar-title">团队成员</div>
        <div className="sidebar-copy">
          {completedCount}/{allAgents.length || 0} 位成员已经给出观点。
        </div>
        <div className="sidebar-list">
          {previewAgents.map((agent) => (
            <div key={agent.agent_name} className="sidebar-list-item">
              <div className="sidebar-list-title">{AGENT_LABELS[agent.agent_name] ?? agent.agent_name}</div>
              <div className="sidebar-list-subtitle">
                {getStatusLabel(agent.status)}
              </div>
            </div>
          ))}
        </div>
        <button className="ghost-button sidebar-button" type="button" onClick={() => setOpen(true)}>
          查看成员详情
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
                <div style={{ fontSize: 22, fontWeight: 700 }}>成员详情</div>
                <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>按成员查看完整发言内容。</div>
              </div>
              <button className="ghost-button" type="button" onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <select
                className="select-field"
                value={selectedAgent?.agent_name ?? ''}
                onChange={(event) => setSelectedAgentName(event.target.value)}
              >
                {allAgents.map((agent) => (
                  <option key={agent.agent_name} value={agent.agent_name}>
                    {AGENT_LABELS[agent.agent_name] ?? agent.agent_name}
                  </option>
                ))}
              </select>
              <AgentReport agent={selectedAgent} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
