export const STAGE_LABELS: Record<string, string> = {
  overview: '概述',
  analysis: '分析',
  debate: '辩论',
  decision: '决策',
  risk: '风险',
};

export const AGENT_LABELS: Record<string, string> = {
  company_overview_analyst: '公司概述',
  market_analyst: '市场分析师',
  sentiment_analyst: '情绪分析师',
  news_analyst: '新闻分析师',
  fundamentals_analyst: '基本面分析师',
  shareholder_analyst: '股东分析师',
  product_analyst: '产品分析师',
  bull_researcher: '看涨研究员',
  bear_researcher: '看跌研究员',
  research_manager: '研究经理',
  trader: '交易员',
  aggressive_risk_analyst: '激进风险分析师',
  safe_risk_analyst: '保守风险分析师',
  neutral_risk_analyst: '中性风险分析师',
  risk_manager: '风险经理',
};

export const AGENT_GROUPS = [
  {
    key: 'analyst',
    label: '分析师团队',
    agents: [
      'company_overview_analyst',
      'market_analyst',
      'sentiment_analyst',
      'news_analyst',
      'fundamentals_analyst',
      'shareholder_analyst',
      'product_analyst',
    ],
  },
  {
    key: 'research',
    label: '研究员团队',
    agents: ['bull_researcher', 'bear_researcher'],
  },
  {
    key: 'management',
    label: '管理层',
    agents: ['research_manager', 'trader'],
  },
  {
    key: 'risk',
    label: '风险管理',
    agents: [
      'aggressive_risk_analyst',
      'safe_risk_analyst',
      'neutral_risk_analyst',
      'risk_manager',
    ],
  },
];

export const RESULT_TABS = [
  { key: 'analyst', label: '分析师' },
  { key: 'debate', label: '辩论' },
  { key: 'decision', label: '决策' },
  { key: 'risk', label: '风险' },
];
