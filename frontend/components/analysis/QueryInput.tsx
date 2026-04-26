'use client';

import { FormEvent } from 'react';

export function QueryInput({
  value,
  onChange,
  onSubmit,
  onOpenConfig,
  loading,
  running,
  onStop,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onOpenConfig: () => void;
  loading: boolean;
  running: boolean;
  onStop: () => void;
}) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="panel" onSubmit={handleSubmit} style={{ padding: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'stretch' }}>
        <textarea
          className="textarea-field"
          placeholder="给我分析一下东山精密"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{ minHeight: 92 }}
        />
        <button type="button" className="ghost-button" onClick={onOpenConfig} style={{ minWidth: 112 }}>
          配置
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button type="submit" className="primary-button" disabled={loading || running}>
          {loading ? '启动中...' : '开始分析'}
        </button>
        {running ? (
          <button type="button" className="danger-button" onClick={onStop}>
            停止分析
          </button>
        ) : null}
      </div>
    </form>
  );
}
