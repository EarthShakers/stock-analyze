# TradingAgents 启动与部署说明

本文档适用于当前项目的新版架构：

- 后端：`FastAPI`
- 前端：`Next.js`
- 数据存储：`src/dump/session_*.json`
- 部署模式：本地开发 / 单端口静态部署 / Railway / 阿里云服务器

## 1. 目录说明

当前关键目录如下：

```text
api/                 FastAPI API 层
frontend/            Next.js 前端
src/                 原有核心工作流、智能体、MCP、导出逻辑
src/dump/            分析会话 JSON 数据
markdown_reports/    Markdown 导出结果
```

## 2. 环境要求

- Python 3.11+，建议直接使用项目内 `.venv`
- Node.js 20+
- npm 10+

如果你是第一次拉起项目，建议优先确认：

```bash
python --version
node -v
npm -v
```

## 3. 后端启动

### 3.1 安装 Python 依赖

如果项目虚拟环境还没准备好：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

如果已经存在 `.venv`，建议直接使用它：

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### 3.2 配置环境变量

确认根目录存在 `.env` 文件，至少应配置：

```env
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://your-llm-endpoint/v1
LLM_MODEL=your-model-name
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=4000

MAX_DEBATE_ROUNDS=2
MAX_RISK_DEBATE_ROUNDS=1
DEBUG_MODE=true
VERBOSE_LOGGING=true
```

### 3.3 配置 MCP

编辑根目录的 `mcp_config.json`：

```json
{
  "servers": {
    "your-server": {
      "url": "http://localhost:3000/sse",
      "transport": "sse",
      "timeout": 600
    }
  }
}
```

如果暂时不接 MCP，也可以保留空配置，系统会以降级模式运行。

### 3.4 启动 FastAPI

在项目根目录执行：

```bash
source .venv/bin/activate
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

启动后可访问：

- API 文档：`http://127.0.0.1:8000/docs`
- 系统状态：`http://127.0.0.1:8000/api/system/info`

## 4. 前端启动

### 4.1 安装前端依赖

```bash
cd frontend
npm install
```

### 4.2 本地开发模式启动

```bash
cd frontend
npm run dev
```

默认访问：

- 前端页面：`http://127.0.0.1:3000`

注意：

- 开发模式下，前端通过浏览器请求 `/api/*`
- 如果你直接从 `3000` 访问页面，需要确保后端 `8000` 已启动
- 当前实现主要面向“前后端分端口开发 + 生产静态托管”模式

## 5. 本地联调启动顺序

推荐使用两个终端。

### 终端一：启动后端

```bash
cd /Users/zhuochaoli/code/ai/stock-analyze
source .venv/bin/activate
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 终端二：启动前端

```bash
cd /Users/zhuochaoli/code/ai/stock-analyze/frontend
npm run dev
```

联调访问地址：

- 前端：`http://127.0.0.1:3000`
- 后端：`http://127.0.0.1:8000`

## 6. 生产构建

### 6.1 构建前端静态文件

```bash
cd frontend
npm run build
```

构建完成后会生成：

```text
frontend/out/
```

### 6.2 单端口部署

当前 `api/main.py` 已支持在 `frontend/out` 存在时直接托管前端静态页面，因此可以只启一个 `uvicorn`：

```bash
cd /Users/zhuochaoli/code/ai/stock-analyze
source .venv/bin/activate
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

此时访问：

- `/` → 前端首页
- `/history` → 历史页
- `/settings` → 设置页
- `/api/*` → 后端接口

这是当前最推荐的部署方式。

## 7. Railway 部署

项目已新增：

- `Procfile`
- `railway.toml`

### 7.1 Railway 构建逻辑

`railway.toml` 当前配置为：

- 安装 Python 依赖
- 安装前端依赖
- 执行 `npm run build`
- 最终使用 `uvicorn api.main:app` 启动

### 7.2 Railway 环境变量

在 Railway 控制台中至少配置：

- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `LLM_TEMPERATURE`
- `LLM_MAX_TOKENS`
- `MAX_DEBATE_ROUNDS`
- `MAX_RISK_DEBATE_ROUNDS`
- `DEBUG_MODE`
- `VERBOSE_LOGGING`

如果使用 MCP，还需确保：

- `mcp_config.json` 内容已正确提交或通过部署流程写入
- Railway 网络可以访问相应 MCP 服务

### 7.3 Railway 启动命令

当前使用：

```bash
uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

健康检查路径：

```text
/api/system/info
```

## 8. 阿里云服务器部署

以下以 Linux 服务器为例。

### 8.1 拉代码并安装依赖

```bash
git clone <your-repo-url> /opt/stock-analyze
cd /opt/stock-analyze
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cd frontend
npm install
npm run build
cd ..
```

### 8.2 systemd 服务文件

创建 `/etc/systemd/system/tradingagents.service`：

```ini
[Unit]
Description=TradingAgents FastAPI
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/stock-analyze
Environment="PATH=/opt/stock-analyze/.venv/bin"
ExecStart=/opt/stock-analyze/.venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

加载并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable tradingagents
sudo systemctl start tradingagents
sudo systemctl status tradingagents
```

### 8.3 Nginx 反向代理

示例配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

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

如果启用 HTTPS，请再额外配置证书。

## 9. 常见问题

### 9.1 `ModuleNotFoundError: No module named 'fastapi'`

说明当前 Python 环境没有安装后端依赖，请在项目虚拟环境里执行：

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### 9.2 前端页面能打开，但接口报错

优先检查：

- `uvicorn` 是否已启动
- `.env` 是否存在且配置完整
- `mcp_config.json` 是否格式正确
- 浏览器请求的接口是否走到了正确地址

### 9.3 `npm run build` 失败

建议依次检查：

- Node 版本是否为 20+
- `frontend/node_modules` 是否完整
- 是否在 `frontend/` 目录下执行构建

可重新执行：

```bash
cd frontend
npm install
npm run build
```

### 9.4 SSE 进度流不更新

优先检查：

- 是否通过 `/api/analysis/start` 启动了会话
- `src/dump/` 下是否生成了对应 `session_*.json`
- 反向代理是否关闭了 SSE 缓冲

## 10. 当前推荐使用方式

开发环境推荐：

1. 后端：`uvicorn api.main:app --reload --port 8000`
2. 前端：`cd frontend && npm run dev`

生产环境推荐：

1. 先执行 `cd frontend && npm run build`
2. 再只启动 `uvicorn api.main:app --port 8000`
3. 由 FastAPI 统一托管前端静态页面和 API
