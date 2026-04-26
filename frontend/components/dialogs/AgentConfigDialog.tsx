'use client';

import { AGENT_GROUPS, AGENT_LABELS } from '@/lib/constants';

import { DebateConfig } from '../analysis/DebateConfig';

export function AgentConfigDialog({
  open,
  activeAgents,
  investmentRounds,
  riskRounds,
  onClose,
  onToggle,
  onSelectAll,
  onClear,
  onInvestmentChange,
  onRiskChange,
}: {
  open: boolean;
  activeAgents: string[];
  investmentRounds: number;
  riskRounds: number;
  onClose: () => void;
  onToggle: (agent: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onInvestmentChange: (value: number) => void;
  onRiskChange: (value: number) => void;
}) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.72)', zIndex: 50, padding: 20 }}>
      <div className="panel" style={{ maxWidth: 980, margin: '0 auto', padding: 24, maxHeight: 'calc(100vh - 40px)', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>分析配置</div>
            <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>启用智能体与调整辩论轮次</div>
          </div>
          <button className="ghost-button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, marginBottom: 20 }}>
          <button className="ghost-button" onClick={onSelectAll}>
            全选
          </button>
          <button className="ghost-button" onClick={onClear}>
            清空
          </button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {AGENT_GROUPS.map((group) => (
            <div key={group.key} className="panel-soft" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{group.label}</div>
              <div className="grid-3">
                {group.agents.map((agent) => {
                  const checked = activeAgents.includes(agent);
                  return (
                    <label key={agent} style={{ display: 'flex', gap: 10, alignItems: 'center', color: checked ? 'white' : 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={checked} onChange={() => onToggle(agent)} />
                      {AGENT_LABELS[agent] ?? agent}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <DebateConfig
            investmentRounds={investmentRounds}
            riskRounds={riskRounds}
            onInvestmentChange={onInvestmentChange}
            onRiskChange={onRiskChange}
          />
        </div>
      </div>
    </div>
  );
}
