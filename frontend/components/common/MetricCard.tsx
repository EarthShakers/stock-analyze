export function MetricCard({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <div className="panel-soft" style={{ padding: 16 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: accent || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}
