'use client';

import { useEffect, useState } from 'react';

import { DebateConfig } from '@/components/analysis/DebateConfig';
import { AGENT_GROUPS, AGENT_LABELS } from '@/lib/constants';
import { api } from '@/lib/api';

const HIDDEN_VALUE = '********';

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes('key') ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('authorization')
  );
}

function maskSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(maskSensitiveValues);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        isSensitiveKey(key) && typeof item === 'string' && item ? HIDDEN_VALUE : maskSensitiveValues(item),
      ]),
    );
  }

  return value;
}

function restoreSensitiveValues(maskedValue: unknown, originalValue: unknown): unknown {
  if (Array.isArray(maskedValue)) {
    const originalArray = Array.isArray(originalValue) ? originalValue : [];
    return maskedValue.map((item, index) => restoreSensitiveValues(item, originalArray[index]));
  }

  if (maskedValue && typeof maskedValue === 'object') {
    const originalObject = originalValue && typeof originalValue === 'object' ? (originalValue as Record<string, unknown>) : {};
    return Object.fromEntries(
      Object.entries(maskedValue).map(([key, item]) => {
        const originalItem = originalObject[key];
        if (isSensitiveKey(key) && item === HIDDEN_VALUE) {
          return [key, originalItem];
        }
        return [key, restoreSensitiveValues(item, originalItem)];
      }),
    );
  }

  return maskedValue;
}

export default function SettingsPage() {
  const [llm, setLlm] = useState<Record<string, string>>({});
  const [agents, setAgents] = useState<Record<string, boolean>>({});
  const [mcpConfig, setMcpConfig] = useState<string>('{}');
  const [rawMcpConfig, setRawMcpConfig] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    void Promise.all([api.getLlmConfig(), api.getAgentConfig(), api.getMcpConfig()]).then(
      ([llmConfig, agentConfig, mcp]) => {
        setLlm(llmConfig);
        setAgents(agentConfig);
        setRawMcpConfig(mcp);
        setMcpConfig(JSON.stringify(maskSensitiveValues(mcp), null, 2));
      },
    );
  }, []);

  const saveAll = async () => {
    const parsedMcpConfig = JSON.parse(mcpConfig);
    const restoredMcpConfig = restoreSensitiveValues(parsedMcpConfig, rawMcpConfig) as Record<string, unknown>;
    await Promise.all([
      api.updateLlmConfig(llm),
      api.updateAgentConfig(agents),
      api.updateMcpConfig(restoredMcpConfig),
    ]);
    setRawMcpConfig(restoredMcpConfig);
    setMcpConfig(JSON.stringify(maskSensitiveValues(restoredMcpConfig), null, 2));
    setMessage('配置已保存');
  };

  const setAllAgentPermissions = (enabled: boolean) => {
    setAgents(
      Object.fromEntries(AGENT_GROUPS.flatMap((group) => group.agents.map((agent) => [agent, enabled]))),
    );
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
            'DEBUG_MODE',
            'VERBOSE_LOGGING',
          ].map((key) => (
            <label key={key} style={{ display: 'grid', gap: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
              <input
                className="field"
                type={isSensitiveKey(key) ? 'password' : 'text'}
                autoComplete="off"
                value={llm[key] ?? ''}
                onChange={(event) => setLlm((current) => ({ ...current, [key]: event.target.value }))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel" style={{ padding: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>讨论轮次</div>
        <div style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
          这里控制默认的投资辩论轮次和风险辩论轮次，首页不再单独展示这部分配置。
        </div>
        <DebateConfig
          investmentRounds={Number(llm.MAX_DEBATE_ROUNDS ?? 2) || 2}
          riskRounds={Number(llm.MAX_RISK_DEBATE_ROUNDS ?? 1) || 1}
          onInvestmentChange={(value) => setLlm((current) => ({ ...current, MAX_DEBATE_ROUNDS: String(value) }))}
          onRiskChange={(value) => setLlm((current) => ({ ...current, MAX_RISK_DEBATE_ROUNDS: String(value) }))}
        />
      </section>

      <section className="panel" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>智能体 MCP 权限</div>
            <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>控制哪些智能体允许调用 MCP 外部工具，不影响智能体本身是否参与分析。</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ghost-button" type="button" onClick={() => setAllAgentPermissions(true)}>
              全选
            </button>
            <button className="ghost-button" type="button" onClick={() => setAllAgentPermissions(false)}>
              全不选
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          {AGENT_GROUPS.map((group) => (
            <div key={group.key} className="panel-soft" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700 }}>{group.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {group.agents.filter((agent) => agents[agent]).length}/{group.agents.length} 已开启
                </div>
              </div>
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
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>MCP 配置</div>
        <div style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
          敏感字段会以掩码显示；如果保持为 <code>{HIDDEN_VALUE}</code>，保存时会沿用原值。
        </div>
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
