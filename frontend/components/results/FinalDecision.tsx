import { MarkdownRenderer } from '../common/MarkdownRenderer';

export function FinalDecision({ content }: { content?: string }) {
  return (
    <div className="panel" style={{ padding: 22, borderColor: 'rgba(245,158,11,0.36)' }}>
      <div style={{ color: 'var(--accent-gold)', fontWeight: 700, marginBottom: 12 }}>最终交易决策</div>
      <MarkdownRenderer content={content} />
    </div>
  );
}
