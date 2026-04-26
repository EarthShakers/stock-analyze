'use client';

import { useEffect, useState } from 'react';

import { AGENT_GROUPS, AGENT_LABELS } from '@/lib/constants';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [llm, setLlm] = useState<Record<string, string>>({});
  const [agents, setAgents] = useState<Record<string, boolean>>({});
  const [mcpConfig, setMcpConfig] = useState<string>('{}');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void Promise.all([api.getLlmConfig(), api.getAgentConfig(), api.getMcpConfig()]).then(
      ([llmConfig, agentConfig, mcp]) => {
        setLlm(llmConfig);
        setAgents(agentConfig);
        setMcpConfig(JSON.stringify(mcp, null, 2));
      },
    );
  }, []);

  const saveAll = async () => {
    await Promise.all([
      api.updateLlmConfig(llm),
      api.updateAgentConfig(agents),
      api.updateMcpConfig(JSON.parse(mcpConfig)),
    ]);
    setMessage('配置已保存');
  };

  return (
    <main className="page-container" style={{ display: 'grid', gap: 18 }}>
      {message ? <div className="panel" style={{ padding: 18, color: '#bbf7d0' }}>{message}</div> : null}

      <section className="panel" style={{ padding: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>LLM 配置</div>
        <div className="grid-2">
          {[
            'LLM_API_KEY',
            'LLM_BASE_URL',
            'LLM_MODEL',
            'LLM_TEMPERATURE',
            'LLM_MAX_TOKENS',
            'MAX_DEBATE_ROUNDS',
            'MAX_RISK_DEBATE_ROUNDS',
            'DEBUG_MODE',
            'VERBOSE_LOGGING',
          ].map((key) => (
            <label key={key} style={{ display: 'grid', gap: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
              <input className="field" value={llm[key] ?? ''} onChange={(event) => setLlm((current) => ({ ...current, [key]: event.target.value }))} />
            </label>
          ))}
        </div>
      </section>

      <section className="panel" style={{ padding: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>智能体权限</div>
        <div style={{ display: 'grid', gap: 16 }}>
          {AGENT_GROUPS.map((group) => (
            <div key={group.key} className="panel-soft" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{group.label}</div>
              <div className="grid-3">
                {group.agents.map((agent) => (
                  <label key={agent} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(agents[agent])}
                      onChange={(event) => setAgents((current) => ({ ...current, [agent]: event.target.checked }))}
                    />
                    {AGENT_LABELS[agent] ?? agent}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ padding: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>MCP 配置</div>
        <textarea className="textarea-field" value={mcpConfig} onChange={(event) => setMcpConfig(event.target.value)} style={{ minHeight: 320 }} />
      </section>

      <div>
        <button className="primary-button" onClick={() => void saveAll()}>
          保存配置
        </button>
      </div>
    </main>
  );
}
