'use client';

import { RESULT_TABS } from '@/lib/constants';

export function AgentTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {RESULT_TABS.map((tab) => (
        <button
          key={tab.key}
          className="ghost-button"
          onClick={() => onChange(tab.key)}
          style={{
            background: value === tab.key ? 'rgba(59,130,246,0.14)' : undefined,
            color: value === tab.key ? 'white' : 'var(--text-secondary)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
