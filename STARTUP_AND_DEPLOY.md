# TradingAgents Docker 部署说明

项目现在只保留一种部署方式：`Docker + docker compose`。

## 1. 你需要准备什么

- Docker
- Docker Compose
- 根目录 `.env`
- 根目录 `mcp_config.json`

如果还没有配置文件，可以先复制示例：

```bash
cp .env.example .env
cp mcp_config.json.example mcp_config.json
```

至少确认 `.env` 里这些值已经填好：

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

## 2. 启动

在项目根目录执行：

```bash
docker compose up --build
```

启动后访问：

- 前端首页：`http://127.0.0.1:8000`
- API 文档：`http://127.0.0.1:8000/docs`
- 系统状态：`http://127.0.0.1:8000/api/system/info`

## 3. 后台运行

如果你想后台启动：

```bash
docker compose up --build -d
```

查看日志：

```bash
docker compose logs -f
```

停止服务：

```bash
docker compose down
```

## 4. 数据持久化

`docker-compose.yml` 已经把这些目录挂载出来了，容器重启后数据不会丢：

- `src/dump/`
- `markdown_reports/`
- `src/dumptools/pdf_reports/`
- `src/dumptools/docx_reports/`

同时也挂载了：

- `.env` 通过 `env_file` 注入
- `mcp_config.json` 作为只读配置文件挂载进容器

## 5. 常用命令

重新构建并启动：

```bash
docker compose up --build
```

只重启服务：

```bash
docker compose restart
```

删除容器但保留本地数据：

```bash
docker compose down
```

删除容器并清理镜像：

```bash
docker compose down --rmi local
```

进入容器：

```bash
docker compose exec app bash
```

## 6. 目录说明

- `Dockerfile`
  用来构建镜像。会先构建 `frontend/out`，再交给 FastAPI 单端口托管。

- `docker-compose.yml`
  用来启动正式服务，并挂载配置和会话/导出目录。

- `.dockerignore`
  用来排除本地缓存、构建产物和不需要进镜像的文件。

## 7. 故障排查

如果启动失败，优先检查：

1. `.env` 是否存在且 LLM 配置完整
2. `mcp_config.json` 是否是当前项目可识别的格式
3. `8000` 端口是否被占用

查看日志：

```bash
docker compose logs -f app
```

如果你修改了前端或后端代码，需要重新构建：

```bash
docker compose up --build
```
