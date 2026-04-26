import { AGENT_LABELS } from '@/lib/constants';
import type { McpCall } from '@/lib/types';

export function McpCallLog({ calls }: { calls: McpCall[] }) {
  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={{ fontWeight: 700, marginBottom: 14 }}>MCP 工具调用</div>
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
        <div style={{ color: 'var(--text-muted)' }}>本次分析未记录 MCP 调用。</div>
      )}
    </div>
  );
}
