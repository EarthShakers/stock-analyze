export function DebateConfig({
  investmentRounds,
  riskRounds,
  onInvestmentChange,
  onRiskChange,
}: {
  investmentRounds: number;
  riskRounds: number;
  onInvestmentChange: (value: number) => void;
  onRiskChange: (value: number) => void;
}) {
  return (
    <div className="grid-2">
      <label className="panel-soft" style={{ padding: 16 }}>
        <div style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>投资辩论轮次</div>
        <input type="range" min={0} max={6} value={investmentRounds} onChange={(e) => onInvestmentChange(Number(e.target.value))} style={{ width: '100%' }} />
        <div style={{ marginTop: 8 }}>{investmentRounds} 轮</div>
      </label>
      <label className="panel-soft" style={{ padding: 16 }}>
        <div style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>风险辩论轮次</div>
        <input type="range" min={0} max={6} value={riskRounds} onChange={(e) => onRiskChange(Number(e.target.value))} style={{ width: '100%' }} />
        <div style={{ marginTop: 8 }}>{riskRounds} 轮</div>
      </label>
    </div>
  );
}
