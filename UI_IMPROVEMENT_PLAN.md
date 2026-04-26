# TradingAgents UI 改造计划：React + FastAPI

> 生成时间: 2026-04-26
> 技术栈: Next.js (React) + FastAPI + SSE
> 部署目标: Railway (前后端同项目) / 阿里云服务器

---

## 一、目标架构

```
┌─────────────────────────────────────────────────────────┐
│                      Railway / 阿里云                    │
│                                                         │
│  ┌──────────────────┐      ┌──────────────────────────┐ │
│  │  Next.js 前端     │ HTTP │  FastAPI 后端             │ │
│  │  (端口 3000)      │◄────►│  (端口 8000)              │ │
│  │                  │      │                          │ │
│  │  - 暗色金融 UI    │  SSE │  - REST API              │ │
│  │  - 进度时间线     │◄─────│  - SSE 进度推送           │ │
│  │  - 结果渲染       │      │  - WorkflowOrchestrator  │ │
│  │  - 历史管理       │      │  - ProgressTracker       │ │
│  └──────────────────┘      └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 二、后端：FastAPI API 层

### 2.1 新增文件

```
api/
├── __init__.py
├── main.py              # FastAPI 入口 + CORS + 静态文件 serve
├── routes/
│   ├── analysis.py      # 分析任务 CRUD
│   ├── sessions.py      # 历史会话管理
│   ├── config.py        # LLM / MCP 配置读写
│   └── export.py        # MD/PDF/DOCX 导出
├── schemas.py           # Pydantic 请求/响应模型
├── sse.py               # SSE 进度推送
└── deps.py              # 共享依赖 (orchestrator 单例)
```

### 2.2 API 端点设计

```
POST   /api/analysis/start         启动分析 (返回 session_id)
POST   /api/analysis/stop/{id}     取消分析
GET    /api/analysis/progress/{id} SSE 流，推送实时进度

GET    /api/sessions                历史会话列表 (支持分页/筛选)
GET    /api/sessions/{id}           单个会话完整数据
DELETE /api/sessions/{id}           删除会话

GET    /api/config/llm              读取 LLM 配置
PUT    /api/config/llm              更新 LLM 配置
GET    /api/config/mcp              读取 MCP 配置
PUT    /api/config/mcp              更新 MCP 配置
GET    /api/config/agents           读取智能体权限
PUT    /api/config/agents           更新智能体权限

GET    /api/export/{id}/markdown    导出 Markdown (返回文件流)
GET    /api/export/{id}/pdf         导出 PDF
GET    /api/export/{id}/docx        导出 DOCX
GET    /api/system/info             系统状态 (工具数/智能体数/连接状态)
```

### 2.3 SSE 进度推送 (替代 JSON 文件轮询)

当前 Streamlit 通过读 `src/dump/session_*.json` 文件轮询进度（TTL 5-10s）。
改为 FastAPI 的 SSE 端点，后端在 `ProgressTracker` 回调时直接推事件：

```python
# api/sse.py 核心逻辑
@router.get("/api/analysis/progress/{session_id}")
async def stream_progress(session_id: str):
    async def event_generator():
        while True:
            progress = read_session_progress(session_id)
            yield f"data: {json.dumps(progress)}\n\n"
            if progress["status"] in ("completed", "cancelled", "error"):
                break
            await asyncio.sleep(2)
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### 2.4 Orchestrator 单例管理

```python
# api/deps.py
_orchestrator: Optional[WorkflowOrchestrator] = None

async def get_orchestrator() -> WorkflowOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = WorkflowOrchestrator("mcp_config.json")
        await _orchestrator.initialize()
    return _orchestrator
```

### 2.5 关键原则

- 不修改 `src/` 下的任何核心代码 (orchestrator / agents / mcp_manager / progress_tracker)
- FastAPI 只做薄包装，调用现有 Python 对象
- Session JSON 文件继续作为数据存储，API 层只是读写这些文件
- 分析任务在后台线程运行，与现有 `web_app.py` 逻辑一致

---

## 三、前端：Next.js + React

### 3.1 项目结构

```
frontend/
├── package.json
├── next.config.js          # API 代理配置
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.ico
├── app/
│   ├── layout.tsx          # 全局布局 (顶部导航 + 暗色主题)
│   ├── page.tsx            # 主页 = 分析 + 结果 (合一)
│   ├── history/
│   │   └── page.tsx        # 历史会话管理页
│   └── settings/
│       └── page.tsx        # LLM + MCP 配置页
├── components/
│   ├── layout/
│   │   └── TopNav.tsx      # 顶部导航栏 (Logo + 3个Tab + 系统状态灯)
│   ├── analysis/
│   │   ├── QueryInput.tsx     # 查询输入框 + 开始/停止按钮
│   │   ├── StageTimeline.tsx  # 五阶段可视化时间线
│   │   └── DebateConfig.tsx   # 辩论轮次配置 (内嵌在弹窗中)
│   ├── results/
│   │   ├── AgentTabs.tsx      # 智能体 Tab 切换 (分析师/辩论/决策/风险)
│   │   ├── AgentReport.tsx    # 报告内容 Markdown 渲染
│   │   ├── FinalDecision.tsx  # 最终决策醒目卡片
│   │   └── McpCallLog.tsx     # MCP 工具调用详情
│   ├── history/
│   │   ├── SessionCard.tsx    # 会话卡片
│   │   └── ExportButtons.tsx  # 导出按钮组
│   ├── dialogs/
│   │   ├── AgentConfigDialog.tsx  # 智能体选择弹窗
│   │   └── SettingsDialog.tsx     # (可选) 快捷配置弹窗
│   └── common/
│       ├── StatusBadge.tsx        # 状态标签
│       ├── MetricCard.tsx         # 指标卡片
│       └── MarkdownRenderer.tsx   # Markdown 渲染
├── hooks/
│   ├── useSSE.ts           # SSE 进度订阅 Hook
│   ├── useAnalysis.ts      # 分析任务状态管理
│   └── useSessions.ts      # 历史会话 CRUD
├── lib/
│   ├── api.ts              # fetch 封装
│   └── constants.ts        # 智能体映射、团队分组
└── styles/
    └── globals.css         # Tailwind + 自定义 CSS 变量
```

### 3.2 页面布局：只有 3 个页面

| 路由 | 功能 | 说明 |
|------|------|------|
| `/` | 分析 + 结果 (主页) | 上半部分输入+进度，下半部分结果展示 |
| `/history` | 历史会话 | 卡片列表 + 导出 |
| `/settings` | 系统配置 | LLM + MCP 配置 |

智能体选择 / 辩论轮次 → 通过**弹窗 (Dialog)** 在主页触发，不占独立页面。

### 3.3 导航方式：顶部 Tab 栏 (不用侧边栏)

```
┌──────────────────────────────────────────────────────────────┐
│  🏛️ TradingAgents    [ 分析 ]  [ 历史 ]  [ 设置 ]    🟢 已连接 │
└──────────────────────────────────────────────────────────────┘
```

- 3 个 Tab，点击切换页面
- 右侧系统状态指示灯 (连接/断开)
- 移动端 Tab 自适应为图标模式

### 3.4 主页设计：分析 + 结果合一 (`/`)

```
┌──────────────────────────────────────────────────────────────┐
│  🏛️ TradingAgents    [ 分析 ]  [ 历史 ]  [ 设置 ]    🟢     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────┐  ┌──────────┐ │
│  │ 🔍 给我分析一下东山精密                   │  │ ⚙️ 配置  │ │
│  └──────────────────────────────────────────┘  └──────────┘ │
│                         [🚀 开始分析]                        │
│                                                              │
│  ┌─概述──┐  ┌─分析──┐  ┌─辩论──┐  ┌─决策──┐  ┌──风险──┐    │
│  │  ✅  │→│  🔄  │→│  ⏳  │→│  ⏳  │→│  ⏳   │    │
│  └──────┘  └──────┘  └──────┘  └──────┘  └───────┘    │
│  📈 市场分析师执行中... (3/15)                                │
│  ━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░ 20%              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [ 📊 分析师 ] [ 💭 辩论 ] [ 👔 决策 ] [ ⚖️ 风险 ]           │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  📈 市场分析师         ✅ 完成  43s  MCP:3次         │    │
│  │                                                      │    │
│  │  苏州东山精密制造股份有限公司（全称）是一家在中国深    │    │
│  │  圳证券交易所上市的国家级高新技术企业，股票代码为      │    │
│  │  002384.SZ，所属市场为A股主板...                      │    │
│  │                                                      │    │
│  │  (可滚动的 Markdown 渲染区域)                         │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ── 🎯 最终交易决策 ─────────────────────────────────────── │
│  │ 建议: 买入  |  目标价: 29.5元  |  信心度: 高           │  │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│           [📄 下载 MD]   [📄 下载 PDF]   [📄 下载 DOCX]     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**交互逻辑**:
- 上半区: 输入 + 进度时间线（分析完成后进度区自动收起）
- 下半区: 4 个 Tab 切换智能体团队，每个 Tab 内用下拉选择具体智能体
- 最终决策卡片固定在结果区底部，醒目展示
- 导出按钮组在决策卡片下方，分析完成后显示，支持 MD / PDF / DOCX 三种格式
- 右上角「⚙️ 配置」按钮 → 弹出智能体选择 + 辩论轮次弹窗

### 3.5 配置弹窗设计 (Dialog)

点击「⚙️ 配置」弹出全屏 Dialog:

```
┌──────────────── 分析配置 ──────────────────────┐
│                                                │
│  🤖 启用智能体                    [全选] [清空] │
│                                                │
│  📊 分析师团队                                  │
│  ☑ 🏢 公司概述  ☑ 📈 市场  ☑ 😊 情绪           │
│  ☑ 📰 新闻  ☑ 📋 基本面  ☑ 👥 股东  ☑ 🏭 产品 │
│                                                │
│  🔬 研究员团队                                  │
│  ☑ 🐂 看涨研究员   ☑ 🐻 看跌研究员              │
│                                                │
│  👔 管理层                                      │
│  ☑ 👔 研究经理   ☑ 💼 交易员                     │
│                                                │
│  ⚖️ 风险管理团队                                │
│  ☑ ⚡ 激进   ☑ 🛡️ 保守   ☑ ⚖️ 中性   ☑ 🎯 风险  │
│                                                │
│  ── 辩论轮次 ─────────────────────────────────  │
│  投资辩论: ━━━━━━━━●━━━━━━━━ 2 轮               │
│  风险辩论: ━━━━━●━━━━━━━━━━━ 1 轮               │
│                                                │
│  已启用 15/15 智能体                            │
│                                                │
│                              [取消]  [确认]     │
└────────────────────────────────────────────────┘
```

### 3.6 历史页设计 (`/history`)

```
┌──────────────────────────────────────────────────────────────┐
│  🏛️ TradingAgents    [ 分析 ]  [ 历史 ]  [ 设置 ]    🟢     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  搜索: [___________________]      状态: [全部 ▼]             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📈 分析一下东山精密                                     │  │
│  │ 04-26 16:30  │  ✅ 完成  │  15/15  │  耗时 10m 37s     │  │
│  │ [查看结果]   [📄 MD]   [📄 PDF]   [📄 DOCX]   [🗑️]    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📈 分析平安银行(000001)                                 │  │
│  │ 04-26 14:30  │  ✅ 完成  │  15/15  │  耗时 8m 12s      │  │
│  │ [查看结果]   [📄 MD]   [📄 PDF]   [📄 DOCX]   [🗑️]    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- 「查看结果」→ 跳转主页并加载该会话数据到结果区

### 3.7 技术选型

| 职责 | 选型 | 理由 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | SSR/SSG 灵活、文件路由 |
| 样式 | Tailwind CSS + shadcn/ui | 暗色金融主题开箱即用，Dialog 组件现成 |
| 状态 | Zustand | 轻量，适合中等复杂度 |
| HTTP | fetch (原生) | Next.js 内置支持 |
| SSE | EventSource API | 浏览器原生，无需库 |
| Markdown | react-markdown + rehype-raw | 渲染 LLM 输出 |
| 弹窗 | shadcn/ui Dialog | 智能体配置弹窗 |

### 3.8 核心 Hook: SSE 进度订阅

```typescript
// hooks/useSSE.ts
export function useAnalysisProgress(sessionId: string | null) {
  const [progress, setProgress] = useState<ProgressData | null>(null)

  useEffect(() => {
    if (!sessionId) return
    const es = new EventSource(`/api/analysis/progress/${sessionId}`)
    es.onmessage = (e) => setProgress(JSON.parse(e.data))
    es.onerror = () => es.close()
    return () => es.close()
  }, [sessionId])

  return progress
}
```

---

## 四、暗色金融主题

### 4.1 CSS 变量 (Tailwind 配置)

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       { primary: '#0a0e17', card: '#111827', hover: '#1f2937' },
        accent:   { DEFAULT: '#3b82f6', gold: '#f59e0b', green: '#10b981', red: '#ef4444' },
        text:     { primary: '#e2e8f0', secondary: '#94a3b8', muted: '#64748b' },
        border:   { DEFAULT: '#1e293b' },
      }
    }
  }
}
```

### 4.2 视觉规范

- 背景: `#0a0e17` 深海蓝黑
- 卡片: `#111827` + 1px `#1e293b` 边框 + 微光效果
- 强调色: 蓝 `#3b82f6` (主操作) / 金 `#f59e0b` (导出) / 绿 `#10b981` (成功) / 红 `#ef4444` (风险)
- 字体: Inter / system-ui，标题 semibold，正文 regular
- 卡片圆角: 12px，按钮圆角: 8px
- 微动画: 页面切换 fade-in 200ms，卡片 hover translateY(-2px)

---

## 五、实施计划

### Phase 1: FastAPI 后端 API (第 1-2 天)

| 任务 | 耗时 | 说明 |
|------|------|------|
| 搭建 `api/main.py` 骨架 + CORS | 1h | uvicorn 启动 |
| 实现 `deps.py` orchestrator 单例 | 1h | 复用现有初始化逻辑 |
| 实现 `/api/analysis/start` + `/stop` | 2h | 后台线程运行，复用 `run_single_analysis_async_safe` |
| 实现 `/api/analysis/progress/{id}` SSE | 2h | 读 session JSON + StreamingResponse |
| 实现 `/api/sessions` CRUD | 1.5h | 读写 `src/dump/session_*.json` |
| 实现 `/api/config/*` 读写 | 1h | 复用 `ConfigManager` 逻辑 |
| 实现 `/api/export/*` 导出 | 1h | 复用 `json_to_markdown` / `md2pdf` / `md2docx` |
| 实现 `/api/system/info` | 0.5h | 复用 `get_workflow_info()` |
| 联调测试 (curl / httpie) | 1h | 验证所有端点 |

### Phase 2: Next.js 前端搭建 (第 3-4 天)

| 任务 | 耗时 | 说明 |
|------|------|------|
| `create-next-app` + Tailwind + shadcn/ui 初始化 | 1h | 暗色主题配置 |
| 全局 Layout (TopNav 顶部导航) | 1h | 3 个 Tab + 状态灯 |
| `/` 主页 (查询输入 + 进度时间线 + SSE + 结果 Tab) | 4h | 分析+结果合一，核心页面 |
| 智能体配置弹窗 (AgentConfigDialog) | 1.5h | shadcn Dialog，分组 checkbox + 辩论轮次 |
| `/history` 历史页 (卡片列表 + 搜索 + 导出) | 2h | |
| `/settings` 系统配置页 (LLM + MCP 表单) | 1.5h | |
| `useSSE` / `useAnalysis` / `useSessions` hooks | 1h | |

### Phase 3: 联调 + 部署 (第 5 天)

| 任务 | 耗时 | 说明 |
|------|------|------|
| 前后端联调 | 2h | API 代理、CORS、错误处理 |
| `next build` 静态导出 + FastAPI serve 静态文件 | 1h | 单端口部署方案 |
| 编写 `Dockerfile` 或 `Procfile` | 1h | Railway 一键部署 |
| 阿里云 systemd + Nginx 配置 | 1h | 生产部署 |
| 端到端测试 | 2h | 完整分析流程验证 |
| 清理旧 Streamlit 代码 (可选保留) | 0.5h | |

---

## 六、部署方案

### 6.1 Railway: 单项目双服务

**`Procfile`**:
```
web: bash -c "cd frontend && npm start & cd /app && uvicorn api.main:app --host 0.0.0.0 --port 8000"
```

或更优方案 — FastAPI serve 前端 build 产物，只需一个端口：

```python
# api/main.py
from fastapi.staticfiles import StaticFiles

app.mount("/", StaticFiles(directory="frontend/out", html=True), name="frontend")
```

**`railway.toml`**:
```toml
[build]
builder = "nixpacks"
buildCommand = "pip install -r requirements.txt && cd frontend && npm ci && npm run build"

[deploy]
startCommand = "uvicorn api.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/system/info"
restartPolicyType = "on_failure"
```

### 6.2 阿里云服务器

```bash
# systemd service
[Service]
ExecStart=/opt/TradingAgents/.venv/bin/uvicorn api.main:app \
    --host 0.0.0.0 --port 8000 --workers 2
```

Nginx 反代:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # 前端静态资源
    location / {
        proxy_pass http://127.0.0.1:8000;
    }

    # SSE 需要特殊配置
    location /api/analysis/progress/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
}
```

---

## 七、Session JSON 数据结构 (前后端共用)

基于现有 `src/dump/session_*.json` 的实际结构，前端直接消费：

```typescript
interface Session {
  session_id: string
  created_at: string          // ISO 8601
  updated_at: string
  status: "active" | "completed" | "cancelled" | "error"
  user_query: string
  active_agents: string[]     // 本次启用的智能体 key 列表

  agents: Agent[]             // 各智能体执行记录
  mcp_calls: McpCall[]        // MCP 工具调用记录
  errors: string[]
  warnings: string[]
  final_results: Record<string, any>
}

interface Agent {
  agent_name: string          // e.g. "market_analyst"
  action: string
  start_time: string
  end_time?: string
  status: "running" | "completed" | "error" | "skipped"
  result: string              // Markdown 格式的分析报告
  system_prompt: string
  user_prompt: string
  context: string
}

interface McpCall {
  agent_name: string
  tool_name: string
  timestamp: string
  tool_result: string
}
```

---

## 八、依赖新增

### Python 后端
```
fastapi>=0.115.0
uvicorn>=0.30.0
sse-starlette>=2.0.0
```

### Node.js 前端
```
next@latest
react@latest
tailwindcss@latest
@shadcn/ui
zustand
react-markdown
rehype-raw
remark-gfm
```

---

## 九、不动的部分

以下核心代码 **不做任何修改**：
- `src/workflow_orchestrator.py`
- `src/mcp_manager.py`
- `src/progress_tracker.py`
- `src/agents/` 所有智能体
- `src/agent_states.py`
- `src/dumptools/` 导出工具
- `src/dump/` 数据目录
- `.env` / `mcp_config.json` 配置文件格式

旧 Streamlit 文件 (`web_app.py`, `src/web/`) 保留不删，作为 fallback。
