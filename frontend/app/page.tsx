'use client';

import { useEffect, useState } from 'react';

import { QueryInput } from '@/components/analysis/QueryInput';
import { AgentChatFeed } from '@/components/results/AgentChatFeed';
import { AnalysisDetailsModal, FinalDecisionModal } from '@/components/results/AnalysisDetailsModal';
import { AGENT_GROUPS } from '@/lib/constants';
import { api } from '@/lib/api';
import { useAnalysis } from '@/hooks/useAnalysis';
import type { ChatFeedSession } from '@/lib/types';

const DEFAULT_AGENTS = AGENT_GROUPS.flatMap((group) => group.agents);
const DEFAULT_QUERY = '帮我分析一下东山精密，看看值不值得买';

function ExportHeaderAction({
  sessionId,
}: {
  sessionId: string;
}) {
  const [format, setFormat] = useState<'markdown' | 'pdf' | 'docx'>('markdown');
  const labelMap = {
    markdown: 'Markdown',
    pdf: 'PDF',
    docx: 'Word',
  } as const;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 6,
        borderRadius: 18,
        background: 'rgba(255,250,242,0.78)',
        border: '1px solid rgba(95,84,68,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.48)',
      }}
    >
      <div style={{ position: 'relative', minWidth: 0 }}>
        <select
          value={format}
          onChange={(event) => setFormat(event.target.value as 'markdown' | 'pdf' | 'docx')}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            padding: '8px 30px 8px 10px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="markdown">Markdown</option>
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
        </select>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          ▾
        </span>
      </div>
      <a
        className="ghost-button"
        href={api.exportUrl(sessionId, format)}
        style={{
          padding: '9px 14px',
          borderRadius: 14,
          whiteSpace: 'nowrap',
        }}
      >
        下载 {labelMap[format]}
      </a>
    </div>
  );
}

export default function HomePage() {
  const { sessionId, session, progress, loading, stopping, error, startAnalysis, stopAnalysis, loadSession } = useAnalysis();
  const [query, setQuery] = useState('');
  const [activeAgents, setActiveAgents] = useState<string[]>(DEFAULT_AGENTS);
  const [investmentRounds, setInvestmentRounds] = useState(2);
  const [riskRounds, setRiskRounds] = useState(1);
  const [pendingUserQuery, setPendingUserQuery] = useState('');
  const [pendingUserTime, setPendingUserTime] = useState('');
  const [finalDecisionSummary, setFinalDecisionSummary] = useState('这一轮的最终建议会在讨论收束后展示在这里。');

  useEffect(() => {
    const targetSession =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('session')
        : null;
    if (targetSession) {
      void loadSession(targetSession);
    }
  }, [loadSession]);

  useEffect(() => {
    void api.getLlmConfig().then((config) => {
      const investment = Number(config.MAX_DEBATE_ROUNDS ?? 2);
      const risk = Number(config.MAX_RISK_DEBATE_ROUNDS ?? 1);
      setInvestmentRounds(Number.isFinite(investment) ? investment : 2);
      setRiskRounds(Number.isFinite(risk) ? risk : 1);
    });
  }, []);

  useEffect(() => {
    if (session?.active_agents?.length) {
      setActiveAgents(session.active_agents);
    }
  }, [session?.session_id, session?.active_agents]);

  useEffect(() => {
    if (session?.user_query && pendingUserQuery && session.user_query === pendingUserQuery) {
      setPendingUserQuery('');
      setPendingUserTime('');
    }
  }, [session?.user_query, pendingUserQuery]);

  const running =
    loading ||
    (!!sessionId && !['completed', 'cancelled', 'error'].includes(progress?.status ?? session?.status ?? 'pending'));

  const toggleAgent = (agent: string) => {
    setActiveAgents((current) =>
      current.includes(agent) ? current.filter((item) => item !== agent) : [...current, agent],
    );
  };

  const selectGroupAgents = (agents: string[]) => {
    setActiveAgents((current) => Array.from(new Set([...current, ...agents])));
  };

  const clearGroupAgents = (agents: string[]) => {
    setActiveAgents((current) => current.filter((agent) => !agents.includes(agent)));
  };

  const selectAllAgents = () => {
    setActiveAgents(DEFAULT_AGENTS);
  };

  const clearAllAgents = () => {
    setActiveAgents([]);
  };

  const chatSession: ChatFeedSession = session ?? {
    session_id: sessionId ?? 'pending',
    status: running ? 'active' : 'pending',
    user_query: '',
    updated_at: progress?.updated_at,
    agents: [],
    mcp_calls: [],
    final_results: undefined,
  };
  const hasDetailsContent = Boolean(session?.mcp_calls?.length) || Boolean(session?.session_id);
  const finalDecision =
    session?.final_results?.final_state?.final_trade_decision ||
    session?.final_results?.final_state?.trader_investment_plan ||
    session?.final_results?.final_state?.investment_plan ||
    progress?.final_decision ||
    '';
  const exportReady = (session?.status ?? progress?.status) === 'completed';

  useEffect(() => {
    if (!session?.session_id || !finalDecision) {
      setFinalDecisionSummary('这一轮的最终建议会在讨论收束后展示在这里。');
      return;
    }

    let cancelled = false;
    setFinalDecisionSummary('正在整理这轮最终建议...');

    void api
      .getDecisionSummary(session.session_id)
      .then((summary) => {
        if (!cancelled) {
          setFinalDecisionSummary(summary || '已经形成最终建议，可以点开查看完整内容。');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFinalDecisionSummary('已经形成最终建议，可以点开查看完整内容。');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [finalDecision, session?.session_id]);

  return (
    <main
      className="page-container"
      style={{
        display: 'grid',
        gap: 16,
        paddingBottom: 16,
        height: 'calc(100vh - 86px)',
        gridTemplateRows: 'minmax(0, 1fr) auto',
        overflow: 'hidden',
      }}
    >
      {error ? <div className="panel" style={{ padding: 18, color: '#fecaca' }}>{error}</div> : null}

      <section style={{ display: 'grid', gap: 12, minHeight: 0, overflow: 'hidden' }}>
        <AgentChatFeed
          session={chatSession}
          progress={progress}
          pendingUserQuery={pendingUserQuery}
          pendingUserTime={pendingUserTime}
          intro={
            <div
              style={{
                display: 'grid',
                gap: 6,
                padding: '2px 2px 6px',
              }}
            >
              <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Research Desk
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                抛出一个问题，让团队开始这一轮讨论
              </div>
            </div>
          }
          headerAction={
            exportReady && session?.session_id ? <ExportHeaderAction sessionId={session.session_id} /> : null
          }
          teamMembers={activeAgents}
          activeAgents={activeAgents}
          onToggleAgent={toggleAgent}
          onSelectGroup={selectGroupAgents}
          onClearGroup={clearGroupAgents}
          onSelectAll={selectAllAgents}
          onClearAll={clearAllAgents}
          sidebarActions={
            <>
              <div className="sidebar-card" style={{ display: 'grid', gap: 14, order: 2, minWidth: 0, gridColumn: '1 / -1' }}>
                <div>
                  <div className="sidebar-eyebrow">Decision</div>
                  <div className="sidebar-title">最终建议</div>
                  <div className="sidebar-copy">{finalDecisionSummary}</div>
                </div>
                {finalDecision ? (
                  <FinalDecisionModal
                    decision={finalDecision}
                    summary={finalDecisionSummary}
                    trigger={(open) => (
                      <button
                        className="ghost-button sidebar-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          open();
                        }}
                        title="查看最终建议"
                        aria-label="查看最终建议"
                      >
                        查看完整建议
                      </button>
                    )}
                  />
                ) : (
                  <div className="sidebar-meta">讨论完成后，这里会自动更新。</div>
                )}
              </div>

              {hasDetailsContent ? (
                <div className="sidebar-card" style={{ display: 'grid', gap: 14, order: 5, minWidth: 0 }}>
                  <div>
                    <div className="sidebar-eyebrow">More</div>
                    <div className="sidebar-title">更多内容</div>
                    <div className="sidebar-copy">查看外部数据调用、补充记录和更多留档信息。</div>
                  </div>
                  <AnalysisDetailsModal
                    session={session ?? null}
                    progress={progress}
                    trigger={(open) => (
                      <button
                        className="ghost-button sidebar-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          open();
                        }}
                        style={{ minWidth: 96, padding: '10px 14px' }}
                      >
                        查看详情
                      </button>
                    )}
                  />
                </div>
              ) : null}
            </>
          }
        />
      </section>

      <div
        className="analysis-surface"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) minmax(420px, 500px)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <QueryInput
          value={query}
          onChange={setQuery}
          onSubmit={() => {
            const finalQuery = query.trim() || DEFAULT_QUERY;
            setPendingUserQuery(finalQuery);
            setPendingUserTime(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
            void startAnalysis({
              user_query: finalQuery,
              active_agents: activeAgents,
              investment_debate_rounds: investmentRounds,
              risk_debate_rounds: riskRounds,
            });
            setQuery('');
          }}
          loading={loading}
          running={running}
          stopping={stopping}
          onStop={() => void stopAnalysis()}
        />
        <div />
      </div>
    </main>
  );
}
