import { AGENT_GROUPS, AGENT_LABELS, STAGE_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";
import type {
  AgentRecord,
  ChatFeedSession,
  ProgressPayload,
} from "@/lib/types";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MarkdownRenderer } from "../common/MarkdownRenderer";
import { StatusBadge } from "../common/StatusBadge";

function sortAgents(agents: AgentRecord[]) {
  return [...agents].sort((left, right) => {
    const leftTime = left.start_time || left.end_time || "";
    const rightTime = right.start_time || right.end_time || "";
    return leftTime.localeCompare(rightTime);
  });
}

const AGENT_EMOJIS: Record<string, string> = {
  公司概述: "🏢",
  市场分析师: "📈",
  情绪分析师: "💬",
  新闻分析师: "📰",
  基本面分析师: "📊",
  股东分析师: "👥",
  产品分析师: "🧩",
  看涨研究员: "🐂",
  看跌研究员: "🐻",
  研究经理: "🧠",
  交易员: "💹",
  激进风险分析师: "🔥",
  保守风险分析师: "🛡️",
  中性风险分析师: "⚖️",
  风险经理: "🚨",
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  公司概述: "先把公司背景和基本盘讲清楚",
  市场分析师: "盯盘面、价格和节奏变化",
  情绪分析师: "感受市场情绪和讨论热度",
  新闻分析师: "跟进消息面和催化事件",
  基本面分析师: "看业绩、估值和财务质量",
  股东分析师: "关注股东结构和资金动向",
  产品分析师: "拆产品、业务和竞争位置",
  看涨研究员: "负责提出积极观点",
  看跌研究员: "负责提出反面观点",
  研究经理: "收拢分歧，形成判断",
  交易员: "把判断转成执行方案",
  激进风险分析师: "从高收益角度看风险",
  保守风险分析师: "从防守角度看风险",
  中性风险分析师: "平衡风险与机会",
  风险经理: "给出最终风险把关",
};

function getAgentEmoji(name: string) {
  return AGENT_EMOJIS[name] || "🙂";
}

function AgentAvatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, rgba(31,106,82,0.14), rgba(184,135,70,0.14))",
        border: "1px solid rgba(95,84,68,0.12)",
        fontSize: 18,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
      }}
    >
      {getAgentEmoji(name)}
    </div>
  );
}

function StreamingBubble({
  content,
  streaming,
  messageKey,
  onSettled,
}: {
  content: string;
  streaming: boolean;
  messageKey: string;
  onSettled?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const lastMessageKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastMessageKeyRef.current !== messageKey) {
      lastMessageKeyRef.current = messageKey;
      setDisplayed("");
    }
  }, [messageKey]);

  useEffect(() => {
    setDisplayed((current) => {
      if (content.length < current.length) {
        return content;
      }
      return current;
    });
  }, [content, streaming]);

  useEffect(() => {
    if (displayed.length >= content.length) {
      if (!streaming && content.length > 0) {
        onSettled?.();
      }
      return;
    }

    const timer = window.setInterval(() => {
      setDisplayed((current) => {
        if (current.length >= content.length) {
          window.clearInterval(timer);
          return current;
        }
        const step = Math.max(
          2,
          Math.ceil((content.length - current.length) / 18)
        );
        return content.slice(0, current.length + step);
      });
    }, 24);

    return () => window.clearInterval(timer);
  }, [content, displayed.length, streaming, onSettled]);

  const normalizedDisplayed = displayed.replace(/^\s+|\s+$/g, "");
  const shouldRenderAsPlainText = !/[#>*`\-\[\]\n]/.test(normalizedDisplayed);

  return (
    <div style={{ display: "block", lineHeight: 1.45 }}>
      {shouldRenderAsPlainText ? (
        <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {normalizedDisplayed}
        </span>
      ) : (
        <MarkdownRenderer content={normalizedDisplayed} compact />
      )}
    </div>
  );
}

function isCompactPlainText(content?: string) {
  const normalized = (content || "").trim();
  if (!normalized) return true;
  return !/[#>*`\-\[\]\n]/.test(normalized) && normalized.length <= 120;
}

function getAgentThinking(agent: AgentRecord) {
  const thinking = (agent.action || "").trim();
  if (!thinking) return "";
  return thinking;
}

function TeamInsightModal({
  open,
  onClose,
  sessionId,
  agent,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  agent: AgentRecord | null;
}) {
  const [summary, setSummary] = useState("正在整理这位成员的摘要...");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const lastSummaryKeyRef = useRef<string | null>(null);
  const summaryCacheRef = useRef<Record<string, string>>({});

  const agentName = agent?.agent_name ?? "";
  const agentStatus = agent?.status ?? "";
  const agentContent = ((agent?.result || agent?.action || "") ?? "").trim();
  const summaryKey = `${sessionId}:${agentName}:${agentStatus}:${agentContent}`;

  useEffect(() => {
    if (!open || !agent || !sessionId || agentStatus !== "completed" || !agentContent) {
      return;
    }

    const cachedSummary = summaryCacheRef.current[summaryKey];
    if (cachedSummary) {
      lastSummaryKeyRef.current = summaryKey;
      setSummary(cachedSummary);
      setLoadingSummary(false);
      return;
    }

    if (lastSummaryKeyRef.current === summaryKey) {
      return;
    }

    let cancelled = false;
    lastSummaryKeyRef.current = summaryKey;
    setLoadingSummary(true);
    setSummary("正在整理这位成员的摘要...");

    void api
      .getAgentSummary(sessionId, agentName)
      .then((value) => {
        if (!cancelled) {
          const nextSummary = value || "暂时还没有生成摘要，请直接查看完整内容。";
          summaryCacheRef.current[summaryKey] = nextSummary;
          setSummary(nextSummary);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallbackSummary = "暂时还没有生成摘要，请直接查看完整内容。";
          summaryCacheRef.current[summaryKey] = fallbackSummary;
          setSummary(fallbackSummary);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentContent, agentName, agentStatus, open, sessionId, summaryKey]);

  if (!open || !agent) return null;

  const displayName = AGENT_LABELS[agent.agent_name] ?? agent.agent_name;
  const detail = agent.result || agent.action || "这位成员还没有给出完整内容。";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(40,34,25,0.24)",
        backdropFilter: "blur(12px)",
        zIndex: 95,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        className="panel"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(900px, 100%)",
          maxHeight: "calc(100vh - 40px)",
          overflow: "auto",
          padding: 28,
          background: "rgba(255,253,248,0.98)",
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <AgentAvatar name={displayName} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Team Insight
                  </div>
                  <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700 }}>
                    {displayName}
                  </div>
                </div>
              </div>
              <div
                className="panel-soft"
                style={{
                  padding: 16,
                  display: "grid",
                  gap: 8,
                  background: "linear-gradient(180deg, rgba(255,252,246,0.96), rgba(246,239,229,0.9))",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  摘要
                </div>
                <div style={{ fontSize: 16, lineHeight: 1.65, fontWeight: 600 }}>
                  {summary}
                </div>
                {loadingSummary ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    正在生成摘要...
                  </div>
                ) : null}
              </div>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={onClose}
              style={{ flexShrink: 0, alignSelf: "start", minWidth: 88 }}
            >
              关闭
            </button>
          </div>

          <div
            style={{
              padding: 22,
              borderRadius: 24,
              background: "rgba(255,250,242,0.84)",
              border: "1px solid rgba(95,84,68,0.12)",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <MarkdownRenderer content={detail} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressStrip({
  completedCount,
  totalCount,
  progressPercent,
  currentSpeakerName,
  waitingIndicator,
}: {
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  currentSpeakerName: string | null;
  waitingIndicator?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        marginBottom: 16,
        width: "100%",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Discussion Progress
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentSpeakerName
              ? `${currentSpeakerName} 正在推进这一轮讨论`
              : "等待团队开始发言"}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", flexShrink: 0 }}>
          {completedCount}/{totalCount || 0}
        </div>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(95,84,68,0.12)",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, var(--accent), rgba(184,135,70,0.92))",
          }}
        />
      </div>
      <div style={{ minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div />
        <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-end" }}>
          {waitingIndicator}
        </div>
      </div>
    </div>
  );
}

function TeamRosterModal({
  open,
  onClose,
  activeAgents,
  onToggleAgent,
  onSelectGroup,
  onClearGroup,
  onSelectAll,
  onClearAll,
}: {
  open: boolean;
  onClose: () => void;
  activeAgents: string[];
  onToggleAgent: (agent: string) => void;
  onSelectGroup: (agents: string[]) => void;
  onClearGroup: (agents: string[]) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(40,34,25,0.24)",
        backdropFilter: "blur(12px)",
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        className="panel"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1060px, 100%)",
          padding: 28,
          maxHeight: "calc(100vh - 40px)",
          overflow: "auto",
          background: "rgba(255,253,248,0.98)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Team Setup
            </div>
            <div style={{ marginTop: 6, fontSize: 28, fontWeight: 700 }}>安排这轮分析团队</div>
            <div style={{ marginTop: 8, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              决定这轮由谁参与讨论。成员会按各自分工接力给出观点。
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ghost-button" type="button" onClick={onSelectAll}>
              全部加入
            </button>
            <button className="ghost-button" type="button" onClick={onClearAll}>
              全部取消
            </button>
            <button className="ghost-button" type="button" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          {AGENT_GROUPS.map((group) => {
            const selectedCount = group.agents.filter((agent) =>
              activeAgents.includes(agent)
            ).length;

            return (
              <section
                key={group.key}
                className="panel-soft"
                style={{
                  padding: 20,
                  display: "grid",
                  gap: 16,
                  background:
                    "linear-gradient(180deg, rgba(255,252,246,0.96), rgba(246,239,229,0.9))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "end",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{group.label}</div>
                    <div style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 13 }}>
                      {selectedCount}/{group.agents.length} 位已加入
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => onSelectGroup(group.agents)}
                    >
                      本组全加
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => onClearGroup(group.agents)}
                    >
                      本组清空
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  {group.agents.map((agentKey) => {
                    const member = AGENT_LABELS[agentKey] ?? agentKey;
                    const selected = activeAgents.includes(agentKey);

                    return (
                      <button
                        key={agentKey}
                        type="button"
                        onClick={() => onToggleAgent(agentKey)}
                        style={{
                          padding: 18,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          minHeight: 110,
                          borderRadius: 22,
                          textAlign: "left",
                          border: selected
                            ? "1px solid rgba(31,106,82,0.28)"
                            : "1px solid rgba(95,84,68,0.12)",
                          background: selected
                            ? "linear-gradient(180deg, rgba(31,106,82,0.08), rgba(255,252,246,0.96))"
                            : "rgba(255,250,242,0.78)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          boxShadow: selected
                            ? "0 8px 22px rgba(31,106,82,0.08)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 14,
                            display: "grid",
                            placeItems: "center",
                            background: selected
                              ? "rgba(31,106,82,0.12)"
                              : "rgba(31,106,82,0.05)",
                            border: "1px solid rgba(31,106,82,0.12)",
                            fontSize: 22,
                            flexShrink: 0,
                          }}
                        >
                          {getAgentEmoji(member)}
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontWeight: 700 }}>{member}</div>
                          <div
                            style={{
                              color: "var(--text-secondary)",
                              lineHeight: 1.6,
                              fontSize: 13,
                            }}
                          >
                            {AGENT_DESCRIPTIONS[member] || "围绕这次问题参与讨论"}
                          </div>
                          <div
                            style={{
                              color: selected ? "var(--accent-deep)" : "var(--text-muted)",
                              fontSize: 12,
                            }}
                          >
                            {selected ? "已加入本轮" : "未加入本轮"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AgentChatFeed({
  session,
  progress,
  pendingUserQuery,
  pendingUserTime,
  intro,
  headerAction,
  teamMembers,
  activeAgents,
  onToggleAgent,
  onSelectGroup,
  onClearGroup,
  onSelectAll,
  onClearAll,
  sidebarActions,
}: {
  session: ChatFeedSession;
  progress: ProgressPayload | null;
  pendingUserQuery?: string;
  pendingUserTime?: string;
  intro?: ReactNode;
  headerAction?: ReactNode;
  teamMembers: string[];
  activeAgents: string[];
  onToggleAgent: (agent: string) => void;
  onSelectGroup: (agents: string[]) => void;
  onClearGroup: (agents: string[]) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  sidebarActions?: ReactNode;
}) {
  const agents = sortAgents(session.agents ?? []);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const [revealedAgentNames, setRevealedAgentNames] = useState<string[]>([]);
  const [displayingAgentName, setDisplayingAgentName] = useState<string | null>(
    null
  );
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [selectedInsightAgent, setSelectedInsightAgent] = useState<string | null>(null);
  const runningAgentName =
    agents.find((agent) => agent.status === "running")?.agent_name ||
    progress?.current_agent;
  const hasRunningBubble = agents.some(
    (agent) =>
      agent.agent_name === runningAgentName && agent.status === "running"
  );
  const runningAgent = runningAgentName
    ? agents.find((agent) => agent.agent_name === runningAgentName) || {
        agent_name: runningAgentName,
        status: "running",
        action: "正在分析中...",
      }
    : null;
  const members = useMemo(
    () =>
      teamMembers.length
        ? teamMembers.map((member) => AGENT_LABELS[member] ?? member)
        : [],
    [teamMembers]
  );
  const completedOrdered = useMemo(
    () =>
      [...agents]
        .filter(
          (agent) => agent.status === "completed" || agent.status === "failed"
        )
        .sort((left, right) =>
          (left.end_time || left.start_time || "").localeCompare(
            right.end_time || right.start_time || ""
          )
        ),
    [agents]
  );
  const runningOrdered = useMemo(
    () =>
      [...agents]
        .filter((agent) => agent.status === "running")
        .sort((left, right) =>
          (left.start_time || "").localeCompare(right.start_time || "")
        ),
    [agents]
  );
  const displayUserQuery = pendingUserQuery || session.user_query;
  const displayUserTime = pendingUserTime || session.updated_at || "";
  const validRevealedAgentNames = useMemo(
    () =>
      revealedAgentNames.filter((name) =>
        agents.some(
          (agent) => agent.agent_name === name && agent.status !== "running"
        )
      ),
    [agents, revealedAgentNames]
  );
  const displayAgents = useMemo(() => {
    const revealed = validRevealedAgentNames
      .map((name) => agents.find((agent) => agent.agent_name === name))
      .filter((agent): agent is AgentRecord => Boolean(agent));
    const displaying = displayingAgentName
      ? agents.find((agent) => agent.agent_name === displayingAgentName)
      : null;
    const combined = displaying ? [...revealed, displaying] : revealed;
    const uniqueAgents = new Map<string, AgentRecord>();
    combined.forEach((agent) => {
      uniqueAgents.set(agent.agent_name, agent);
    });
    return Array.from(uniqueAgents.values());
  }, [agents, displayingAgentName, validRevealedAgentNames]);
  const waitingAgents = useMemo(
    () =>
      agents.filter(
        (agent) =>
          !validRevealedAgentNames.includes(agent.agent_name) &&
          agent.agent_name !== displayingAgentName
      ),
    [agents, displayingAgentName, validRevealedAgentNames]
  );
  const waitingNames = waitingAgents.map(
    (agent) => AGENT_LABELS[agent.agent_name] ?? agent.agent_name
  );
  const displayingAgent = displayingAgentName
    ? agents.find((agent) => agent.agent_name === displayingAgentName) ?? null
    : null;
  const currentSpeakerName =
    displayingAgent?.agent_name ||
    runningAgentName ||
    completedOrdered[completedOrdered.length - 1]?.agent_name ||
    null;
  const completedCount =
    progress?.completed_agents ??
    agents.filter((agent) => agent.status === "completed").length;
  const totalCount =
    progress?.total_agents ?? teamMembers.length ?? activeAgents.length;
  const progressPercent = progress?.progress_percent ?? 0;
  const memberAgentKeys = teamMembers;
  const memberCards = memberAgentKeys.map((agentKey) => {
    const record = agents.find((agent) => agent.agent_name === agentKey) ?? null;
    return {
      key: agentKey,
      label: AGENT_LABELS[agentKey] ?? agentKey,
      record,
      completed: record?.status === "completed",
      running: record?.status === "running",
      clickable: record?.status === "completed",
    };
  });
  const selectedInsightRecord = selectedInsightAgent
    ? agents.find((agent) => agent.agent_name === selectedInsightAgent) ?? null
    : null;

  useEffect(() => {
    setRevealedAgentNames([]);
    setDisplayingAgentName(null);
  }, [session.session_id]);

  useEffect(() => {
    if (displayingAgent?.status === "running") {
      return;
    }

    if (
      displayingAgent &&
      !validRevealedAgentNames.includes(displayingAgent.agent_name)
    ) {
      return;
    }

    const nextCompleted = completedOrdered.find(
      (agent) => !validRevealedAgentNames.includes(agent.agent_name)
    );
    if (nextCompleted) {
      if (displayingAgentName !== nextCompleted.agent_name) {
        setDisplayingAgentName(nextCompleted.agent_name);
      }
      return;
    }

    const nextRunning = runningOrdered.find(
      (agent) => !validRevealedAgentNames.includes(agent.agent_name)
    );
    if (nextRunning) {
      if (displayingAgentName !== nextRunning.agent_name) {
        setDisplayingAgentName(nextRunning.agent_name);
      }
      return;
    }

    if (displayingAgentName) {
      setDisplayingAgentName(null);
    }
  }, [
    agents,
    completedOrdered,
    displayingAgent,
    displayingAgentName,
    runningOrdered,
    validRevealedAgentNames,
  ]);

  const settleDisplayedAgent = (agentName: string) => {
    const target = agents.find((agent) => agent.agent_name === agentName);
    if (!target || target.status === "running") return;
    setRevealedAgentNames((current) =>
      current.includes(agentName) ? current : [...current, agentName]
    );
    setDisplayingAgentName((current) =>
      current === agentName ? null : current
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 72;
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollSignature = [
    displayUserQuery,
    displayUserTime,
    displayAgents.length,
    waitingAgents.length,
    ...displayAgents.map(
      (agent) =>
        `${agent.agent_name}:${agent.status}:${agent.result?.length || 0}:${(
          agent.action || ""
        ).length}`
    ),
  ].join("|");

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !shouldAutoScrollRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [scrollSignature]);

  return (
    <section
      className="analysis-surface"
      style={{
        height: "100%",
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(420px, 500px)",
        gap: 16,
        overflow: "hidden",
      }}
    >
      <div
        className="panel"
        style={{
          padding: 24,
          display: "grid",
          minHeight: 0,
          gridTemplateRows: "auto minmax(0, 1fr)",
          overflow: "hidden",
          background: "rgba(255,253,248,0.96)",
        }}
      >
        <div style={{ display: "grid", gap: 12, minHeight: 64, alignContent: "start" }}>
          {intro || headerAction ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>{intro ? <div>{intro}</div> : null}</div>
              {headerAction ? <div style={{ flexShrink: 0 }}>{headerAction}</div> : null}
            </div>
          ) : null}
          <ProgressStrip
            completedCount={completedCount}
            totalCount={totalCount}
            progressPercent={progressPercent}
            currentSpeakerName={
              currentSpeakerName
                ? AGENT_LABELS[currentSpeakerName] ?? currentSpeakerName
                : null
            }
            waitingIndicator={
              waitingAgents.length ? (
                <div
                  className="tag"
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                    minWidth: 0,
                  }}
                >
                  {waitingAgents.length === 1
                    ? `${waitingNames[0]} 正在整理观点`
                    : `${waitingNames[0]} 等 ${waitingAgents.length} 位成员正在整理观点`}
                </div>
              ) : null
            }
          />
        </div>

        <div
          ref={scrollContainerRef}
          style={{
            display: "grid",
            gap: 16,
            minHeight: 0,
            overflow: "auto",
            overflowX: "hidden",
            paddingRight: 4,
            minWidth: 0,
          }}
        >
          {displayUserQuery ? (
            <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {displayUserTime}
              </div>
              <div
                style={{
                  display: "inline-block",
                  alignSelf: "end",
                  width: "auto",
                  maxWidth: "68%",
                  minWidth: 0,
                  padding: "10px 14px",
                  borderRadius: "18px 18px 8px 18px",
                  background:
                    "linear-gradient(135deg, rgba(31,106,82,0.96), rgba(23,73,56,0.92))",
                  color: "white",
                  lineHeight: 1.5,
                  boxShadow: "0 12px 28px rgba(31,106,82,0.18)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {displayUserQuery}
              </div>
            </div>
          ) : null}

          {displayAgents.map((agent, index) => {
            const displayName =
              AGENT_LABELS[agent.agent_name] ?? agent.agent_name;
            const compactBubble = isCompactPlainText(agent.result || agent.action);
            const thinking = getAgentThinking(agent);
            return (
              <div
                key={`${agent.agent_name}-${agent.start_time || index}`}
                style={{ display: "grid", gap: 8 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AgentAvatar name={displayName} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{displayName}</span>
                      {agent.status !== "completed" ? (
                        <StatusBadge status={agent.status} />
                      ) : null}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "var(--text-muted)",
                        fontSize: 12,
                      }}
                    >
                      {agent.end_time ||
                        agent.start_time ||
                        session.updated_at ||
                        ""}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginLeft: 48,
                    width: "fit-content",
                    height: "fit-content",
                    maxWidth: "calc(100% - 48px)",
                    minWidth: 0,
                    justifySelf: "start",
                    padding: compactBubble ? "4px 10px" : "8px 12px",
                    borderRadius: "18px 18px 18px 8px",
                    background:
                      agent.status === "running"
                        ? "rgba(244, 237, 227, 0.98)"
                        : "rgba(255, 250, 242, 0.9)",
                    border: "1px solid rgba(95,84,68,0.12)",
                    lineHeight: compactBubble ? 1.3 : 1.45,
                    boxShadow: "0 10px 24px rgba(52,46,35,0.06)",
                  }}
                >
                  <div style={{ display: "grid", gap: agent.result && thinking ? 8 : 0 }}>
                    {thinking ? (
                      <div
                        style={{
                          color: "var(--text-muted)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontSize: 12,
                          lineHeight: 1.45,
                          paddingBottom: agent.result ? 6 : 0,
                          borderBottom: agent.result ? "1px dashed rgba(95,84,68,0.14)" : "none",
                        }}
                      >
                        {thinking}
                      </div>
                    ) : null}

                    {agent.result ? (
                      <StreamingBubble
                        content={agent.result}
                        streaming={agent.status === "running"}
                        messageKey={`${agent.agent_name}-${agent.start_time || index}`}
                        onSettled={() => settleDisplayedAgent(agent.agent_name)}
                      />
                    ) : !thinking ? (
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        还在整理想法...
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {runningAgent &&
          !hasRunningBubble &&
          runningAgent.status === "running" ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AgentAvatar
                  name={
                    AGENT_LABELS[runningAgent.agent_name] ??
                    runningAgent.agent_name
                  }
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      {AGENT_LABELS[runningAgent.agent_name] ??
                        runningAgent.agent_name}
                    </span>
                    <StatusBadge status="active" />
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: "var(--text-muted)",
                      fontSize: 12,
                    }}
                  >
                    正在回复
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginLeft: 48,
                  width: "fit-content",
                  maxWidth: "calc(100% - 48px)",
                  minWidth: 0,
                  justifySelf: "start",
                  padding: "4px 10px",
                  borderRadius: "18px 18px 18px 8px",
                  background: "rgba(244, 237, 227, 0.98)",
                  border: "1px solid rgba(95,84,68,0.12)",
                  lineHeight: 1.3,
                  boxShadow: "0 10px 24px rgba(52,46,35,0.06)",
                }}
              >
                <div style={{ color: "var(--text-secondary)" }}>
                  {runningAgent.action || "正在生成输出..."}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <aside
        className="panel-soft"
        style={{
          minHeight: 0,
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gridAutoRows: "min-content",
          alignItems: "start",
          alignContent: "start",
          gap: 12,
          background: "rgba(255,250,242,0.76)",
          overflow: "hidden",
        }}
      >
        <div
          className="sidebar-card"
          style={{
            display: "grid",
            gap: 12,
            gridColumn: "1 / -1",
            order: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="sidebar-eyebrow">Team</div>
              <div className="sidebar-title">本轮团队</div>
              <div className="sidebar-copy">
                管理这轮参与讨论的成员。不同角色加入后，会按各自分工接力发言。
              </div>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setTeamModalOpen(true)}
              style={{ padding: "10px 14px", whiteSpace: "nowrap" }}
            >
              管理团队成员
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {memberCards.map((member) => (
              <button
                key={member.key}
                type="button"
                onClick={() => {
                  if (member.clickable) {
                    setSelectedInsightAgent(member.key);
                  }
                }}
                title={member.clickable ? member.label : `${member.label} 暂未完成`}
                disabled={!member.clickable}
                style={{
                  position: "relative",
                  padding: "8px 6px 7px",
                  borderRadius: 16,
                  border: "1px solid rgba(95,84,68,0.1)",
                  background: "rgba(255,250,242,0.72)",
                  cursor: member.clickable ? "pointer" : "default",
                  display: "grid",
                  justifyItems: "center",
                  gap: 6,
                  opacity: member.clickable ? 1 : 0.76,
                }}
              >
                <div style={{ transform: "scale(0.92)" }}>
                  <AgentAvatar name={member.label} />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.28,
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    maxWidth: "100%",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {member.label}
                </div>
                <span
                  style={{
                    position: "absolute",
                    right: 6,
                    top: 6,
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    border: "2px solid rgba(255,252,246,0.98)",
                    background: member.completed
                      ? "var(--accent)"
                      : member.running
                        ? "var(--accent-gold)"
                        : "rgba(95,84,68,0.18)",
                    boxShadow: member.completed
                      ? "0 0 0 3px rgba(31,106,82,0.08)"
                      : "none",
                  }}
                />
              </button>
            ))}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
            绿色表示已完成且可点开查看，金色表示正在发言，灰色表示还未开始。
          </div>
        </div>

        {sidebarActions}
      </aside>

      <TeamRosterModal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        activeAgents={activeAgents}
        onToggleAgent={onToggleAgent}
        onSelectGroup={onSelectGroup}
        onClearGroup={onClearGroup}
        onSelectAll={onSelectAll}
        onClearAll={onClearAll}
      />
      <TeamInsightModal
        open={Boolean(selectedInsightAgent)}
        onClose={() => setSelectedInsightAgent(null)}
        sessionId={session.session_id}
        agent={selectedInsightRecord}
      />
    </section>
  );
}
