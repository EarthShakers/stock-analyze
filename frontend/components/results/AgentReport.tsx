import { AGENT_LABELS } from '@/lib/constants';
import type { AgentRecord } from '@/lib/types';

import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { StatusBadge } from '../common/StatusBadge';

export function AgentReport({ agent }: { agent?: AgentRecord }) {
  return (
    <div className="panel-soft" style={{ padding: 22 }}>
      {agent ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{AGENT_LABELS[agent.agent_name] ?? agent.agent_name}</div>
              <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>{agent.start_time ?? ''}</div>
            </div>
            <StatusBadge status={agent.status} />
          </div>
          <MarkdownRenderer content={agent.result} />
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>当前分组还没有可展示的智能体输出。</div>
      )}
    </div>
  );
}
