import { ExportButtons } from './ExportButtons';

export function ExportPanel({ sessionId }: { sessionId: string }) {
  return (
    <section className="sidebar-card">
      <div className="sidebar-eyebrow">导出</div>
      <div className="sidebar-title">导出结果</div>
      <div className="sidebar-copy">
        把这轮讨论整理成文档，方便留存或分享。
      </div>
      <div style={{ marginTop: 14 }}>
        <ExportButtons sessionId={sessionId} />
      </div>
    </section>
  );
}
