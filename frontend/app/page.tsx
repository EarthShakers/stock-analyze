'use client';

import { useMemo, useState } from 'react';
import { useEffect } from 'react';

import { QueryInput } from '@/components/analysis/QueryInput';
import { StageTimeline } from '@/components/analysis/StageTimeline';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MetricCard } from '@/components/common/MetricCard';
import { AgentConfigDialog } from '@/components/dialogs/AgentConfigDialog';
import { AgentReport } from '@/components/results/AgentReport';
import { AgentTabs } from '@/components/results/AgentTabs';
import { FinalDecision } from '@/components/results/FinalDecision';
import { McpCallLog } from '@/components/results/McpCallLog';
import { ExportButtons } from '@/components/history/ExportButtons';
import { AGENT_GROUPS } from '@/lib/constants';
import { useAnalysis } from '@/hooks/useAnalysis';

const DEFAULT_AGENTS = AGENT_GROUPS.flatMap((group) => group.agents);

export default function HomePage() {
  const { sessionId, session, progress, loading, error, startAnalysis, stopAnalysis, loadSession } = useAnalysis();
  const [query, setQuery] = useState('');
  const [openConfig, setOpenConfig] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>(DEFAULT_AGENTS);
  const [investmentRounds, setInvestmentRounds] = useState(2);
  const [riskRounds, setRiskRounds] = useState(1);
  const [resultTab, setResultTab] = useState('analyst');

  useEffect(() => {
    const targetSession =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('session')
        : null;
    if (targetSession) {
      void loadSession(targetSession);
    }
  }, [loadSession]);

  const groupedAgents = useMemo(() => {
    const agents = session?.agents ?? [];
    return {
      analyst: agents.find((agent) =>
        ['company_overview_analyst', 'market_analyst', 'sentiment_analyst', 'news_analyst', 'fundamentals_analyst', 'shareholder_analyst', 'product_analyst'].includes(agent.agent_name),
      ),
      debate: agents.find((agent) => ['bull_researcher', 'bear_researcher', 'research_manager'].includes(agent.agent_name)),
      decision: agents.find((agent) => ['trader'].includes(agent.agent_name)),
      risk: agents.find((agent) =>
        ['aggressive_risk_analyst', 'safe_risk_analyst', 'neutral_risk_analyst', 'risk_manager'].includes(agent.agent_name),
      ),
    };
  }, [session]);

  const running =
    loading ||
    (!!sessionId && !['completed', 'cancelled', 'error'].includes(progress?.status ?? session?.status ?? 'pending'));

  const toggleAgent = (agent: string) => {
    setActiveAgents((current) =>
      current.includes(agent) ? current.filter((item) => item !== agent) : [...current, agent],
    );
  };

  return (
    <main className="page-container" style={{ display: 'grid', gap: 18 }}>
      <section className="grid-3">
        <MetricCard title="当前会话" value={session?.session_id ? session.session_id.slice(-8) : '--'} accent="var(--accent)" />
        <MetricCard title="进度" value={`${progress?.progress_percent ?? 0}%`} accent="var(--accent-green)" />
        <MetricCard title="MCP 调用" value={String(session?.mcp_calls?.length ?? 0)} accent="var(--accent-gold)" />
      </section>

      <QueryInput
        value={query}
        onChange={setQuery}
        onSubmit={() => {
          if (!query.trim()) return;
          void startAnalysis({
            user_query: query.trim(),
            active_agents: activeAgents,
            investment_debate_rounds: investmentRounds,
            risk_debate_rounds: riskRounds,
          });
        }}
        onOpenConfig={() => setOpenConfig(true)}
        loading={loading}
        running={running}
        onStop={() => void stopAnalysis()}
      />

      <StageTimeline progress={progress} />

      {error ? <div className="panel" style={{ padding: 18, color: '#fecaca' }}>{error}</div> : null}

      {session ? (
        <>
          <section className="panel" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{session.user_query}</div>
                <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>{session.updated_at}</div>
              </div>
              <StatusBadge status={session.status} />
            </div>
            <AgentTabs value={resultTab} onChange={setResultTab} />
          </section>

          <AgentReport agent={groupedAgents[resultTab as keyof typeof groupedAgents]} />

          <FinalDecision
            content={
              session.final_results?.final_state?.final_trade_decision ||
              session.final_results?.final_state?.trader_investment_plan ||
              session.final_results?.final_state?.investment_plan
            }
          />

          <div className="panel" style={{ padding: 18 }}>
            <ExportButtons sessionId={session.session_id} />
          </div>

          <McpCallLog calls={session.mcp_calls ?? []} />
        </>
      ) : null}

      <AgentConfigDialog
        open={openConfig}
        activeAgents={activeAgents}
        investmentRounds={investmentRounds}
        riskRounds={riskRounds}
        onClose={() => setOpenConfig(false)}
        onToggle={toggleAgent}
        onSelectAll={() => setActiveAgents(DEFAULT_AGENTS)}
        onClear={() => setActiveAgents([])}
        onInvestmentChange={setInvestmentRounds}
        onRiskChange={setRiskRounds}
      />
    </main>
  );
}
