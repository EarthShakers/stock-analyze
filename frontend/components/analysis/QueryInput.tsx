'use client';

import { FormEvent } from 'react';

export function QueryInput({
  value,
  onChange,
  onSubmit,
  loading,
  running,
  stopping,
  onStop,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  running: boolean;
  stopping: boolean;
  onStop: () => void;
}) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (running) {
      onStop();
      return;
    }
    onSubmit();
  };

  return (
    <form
      className="panel"
      onSubmit={handleSubmit}
      style={{
        padding: 18,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        zIndex: 15,
        background: 'rgba(255, 253, 248, 0.96)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        <div style={{ position: 'relative', minWidth: 0, width: '100%' }}>
          <textarea
            className="textarea-field"
            placeholder="发一条消息，比如：帮我分析一下东山精密，看看值不值得买"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            style={{
              minHeight: 102,
              maxHeight: 220,
              paddingRight: 148,
              paddingBottom: 22,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              fontSize: 15,
              lineHeight: 1.7,
              background: 'rgba(255,251,245,0.98)',
            }}
          />
          <button
            type="submit"
            className={running ? 'danger-button' : 'primary-button'}
            disabled={loading || stopping}
            style={{
              minWidth: 120,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              right: 14,
              bottom: 14,
            }}
          >
            {loading ? '发送中...' : running ? (stopping ? '停止中...' : '停止') : '开始分析'}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingLeft: 4 }}>
            {running ? (stopping ? '正在尝试停止这轮分析。' : '分析进行中，新的回复会继续往上滚动。') : '不输入内容时，会直接按默认示例发起分析。'}
          </div>
        </div>
      </div>
    </form>
  );
}
