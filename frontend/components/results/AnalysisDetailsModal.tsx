'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { AGENT_LABELS, STAGE_LABELS } from '@/lib/constants';
import type { ProgressPayload, SessionData } from '@/lib/types';

import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { StatusBadge } from '../common/StatusBadge';

type DetailTab = 'data' | 'export';

export function AnalysisDetailsModal({
  session,
  progress,
  trigger,
}: {
  session: SessionData | null;
  progress: ProgressPayload | null;
  trigger?: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('data');
  const [exportFormat, setExportFormat] = useState<'markdown' | 'pdf' | 'docx'>('markdown');
  const activeStage =
    progress?.stages?.find((stage) => stage.status === 'running') ??
    progress?.stages?.find((stage) => stage.status === 'completed') ??
    null;
  const exportReady = (session?.status ?? progress?.status) === 'completed';

  const tabs = useMemo(
    () =>
      [
        { key: 'data' as const, label: '外部数据' },
        { key: 'export' as const, label: '导出结果' },
      ].filter((tab) => {
        if (!session && (tab.key === 'data' || tab.key === 'export')) {
          return false;
        }
        return true;
      }),
    [session],
  );

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="ghost-button" type="button" onClick={() => setOpen(true)} style={{ minWidth: 132 }}>
            查看详情
          </button>
        </div>
      )}

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(40,34,25,0.22)',
            backdropFilter: 'blur(14px)',
            zIndex: 50,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            className="panel"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(1180px, 100%)',
              maxHeight: 'calc(100vh - 40px)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '240px minmax(0, 1fr)',
              background:
                'radial-gradient(circle at top left, rgba(31,106,82,0.08), transparent 28%), linear-gradient(180deg, rgba(255,253,248,0.98), rgba(247,241,232,0.98))',
            }}
          >
            <aside
              style={{
                padding: 24,
                borderRight: '1px solid rgba(95,84,68,0.12)',
                background: 'rgba(250,244,236,0.78)',
                display: 'grid',
                alignContent: 'start',
                gap: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Details
                </div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>分析详情</div>
                <div style={{ marginTop: 8, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
                  这里收纳这轮讨论里的补充信息，方便继续深挖和导出留档。
                </div>
              </div>

              <div className="panel-soft" style={{ padding: 14, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>状态</span>
                  <StatusBadge status={progress?.status ?? session?.status ?? 'pending'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>当前阶段</span>
                  <span style={{ fontWeight: 600 }}>
                    {activeStage ? STAGE_LABELS[activeStage.key] ?? activeStage.key : '等待开始'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>外部数据</span>
                  <span style={{ fontWeight: 600 }}>{session?.mcp_calls?.length ?? 0} 次</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      textAlign: 'left',
                      borderRadius: 14,
                      padding: '12px 14px',
                      border: activeTab === tab.key ? '1px solid rgba(31,106,82,0.24)' : '1px solid rgba(95,84,68,0.12)',
                      background: activeTab === tab.key ? 'rgba(31,106,82,0.08)' : 'rgba(255,250,242,0.72)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button className="ghost-button" type="button" onClick={() => setOpen(false)}>
                关闭
              </button>
            </aside>

            <div style={{ padding: 28, overflow: 'auto' }}>
              {activeTab === 'data' ? (
                <div style={{ display: 'grid', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>外部数据</div>
                    <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>这轮讨论向外部工具补充了哪些信息，一目了然。</div>
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {session?.mcp_calls?.length ? (
                      session.mcp_calls.map((call, index) => (
                        <div
                          key={`${call.agent_name}-${call.tool_name}-${index}`}
                          style={{
                            padding: 18,
                            borderRadius: 20,
                            background: 'rgba(255,250,242,0.84)',
                            border: '1px solid rgba(95,84,68,0.12)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 17 }}>{call.tool_name}</div>
                              <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>
                                {AGENT_LABELS[call.agent_name] ?? call.agent_name}
                              </div>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{call.timestamp}</div>
                          </div>
                          <div style={{ marginTop: 14, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                            {call.tool_result || '无返回内容'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-muted)' }}>这轮还没有记录到外部工具调用。</div>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === 'export' ? (
                <div style={{ display: 'grid', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>导出结果</div>
                    <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>把这轮讨论整理成文件，方便留档或继续分享。</div>
                  </div>
                  {session ? (
                    <div
                      style={{
                        padding: 22,
                        borderRadius: 22,
                        background: 'rgba(255,250,242,0.84)',
                        border: '1px solid rgba(95,84,68,0.12)',
                        display: 'grid',
                        gap: 12,
                      }}
                    >
                      <select
                        value={exportFormat}
                        onChange={(event) => setExportFormat(event.target.value as 'markdown' | 'pdf' | 'docx')}
                        disabled={!exportReady}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          borderRadius: 14,
                          border: '1px solid rgba(95,84,68,0.14)',
                          background: exportReady ? 'rgba(255,250,242,0.92)' : 'rgba(244,239,231,0.9)',
                          color: 'var(--text-primary)',
                          padding: '12px 14px',
                          outline: 'none',
                        }}
                      >
                        <option value="markdown">Markdown</option>
                        <option value="pdf">PDF</option>
                        <option value="docx">Word</option>
                      </select>
                      {exportReady ? (
                        <a className="ghost-button" href={api.exportUrl(session.session_id, exportFormat)}>
                          下载 {exportFormat === 'markdown' ? 'Markdown' : exportFormat === 'pdf' ? 'PDF' : 'Word'}
                        </a>
                      ) : (
                        <button className="ghost-button" type="button" disabled style={{ opacity: 0.55, cursor: 'not-allowed' }}>
                          等待全部完成
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function FinalDecisionModal({
  decision,
  summary,
  trigger,
}: {
  decision: string;
  summary: string;
  trigger?: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button className="ghost-button" type="button" onClick={() => setOpen(true)}>
          最终建议
        </button>
      )}

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(40,34,25,0.22)',
            backdropFilter: 'blur(14px)',
            zIndex: 50,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            className="panel"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(880px, 100%)',
              maxHeight: 'calc(100vh - 40px)',
              overflow: 'auto',
              padding: 28,
              background:
                'radial-gradient(circle at top left, rgba(31,106,82,0.1), transparent 30%), linear-gradient(180deg, rgba(255,253,248,0.98), rgba(247,241,232,0.98))',
            }}
          >
            <div style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Decision
                  </div>
                  <div style={{ marginTop: 8, fontSize: 30, fontWeight: 700 }}>最终建议</div>
                  <div style={{ marginTop: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    这轮讨论最后沉淀出来的判断都在这里，方便快速回看和继续决策。
                  </div>
                </div>
                <button className="ghost-button" type="button" onClick={() => setOpen(false)}>
                  关闭
                </button>
              </div>

              <div
                className="panel-soft"
                style={{
                  padding: 18,
                  display: 'grid',
                  gap: 8,
                  background: 'linear-gradient(180deg, rgba(255,252,246,0.96), rgba(246,239,229,0.9))',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  摘要
                </div>
                <div style={{ fontSize: 16, lineHeight: 1.75, fontWeight: 600 }}>
                  {summary}
                </div>
              </div>

              <div
                style={{
                  padding: 24,
                  borderRadius: 24,
                  background: 'rgba(255,250,242,0.84)',
                  border: '1px solid rgba(95,84,68,0.12)',
                }}
              >
                <MarkdownRenderer content={decision} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
