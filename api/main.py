from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .deps import BASE_DIR, get_runtime
from .routes.analysis import router as analysis_router
from .routes.config import router as config_router
from .routes.export import router as export_router
from .routes.sessions import router as sessions_router
from .routes.system import router as system_router
from .sse import router as sse_router


app = FastAPI(title="TradingAgents API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)
app.include_router(sse_router)
app.include_router(sessions_router)
app.include_router(config_router)
app.include_router(export_router)
app.include_router(system_router)


@app.on_event("shutdown")
async def on_shutdown():
    await get_runtime().shutdown()


frontend_out = BASE_DIR / "frontend" / "out"
if frontend_out.exists():
    next_assets = frontend_out / "_next"
    static_assets = frontend_out / "static"
    if next_assets.exists():
        app.mount("/_next", StaticFiles(directory=next_assets), name="next-static")
    if static_assets.exists():
        app.mount("/static", StaticFiles(directory=static_assets), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        target = frontend_out / full_path
        if full_path and target.exists() and target.is_file():
            return FileResponse(target)
        html_target = frontend_out / f"{full_path}.html"
        if full_path and html_target.exists():
            return FileResponse(html_target)
        nested_index = frontend_out / full_path / "index.html"
        if full_path and nested_index.exists():
            return FileResponse(nested_index)
        return FileResponse(frontend_out / "index.html")
