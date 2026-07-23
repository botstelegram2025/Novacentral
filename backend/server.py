import os
import logging
from pathlib import Path
from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from db import client, ensure_indexes  # noqa: E402
from seed import seed  # noqa: E402

# Routers
from routes.auth_routes import router as auth_router, admin_router as admin_auth_router  # noqa: E402
from routes.catalog_routes import router as catalog_router  # noqa: E402
from routes.orders_routes import router as orders_router  # noqa: E402
from routes.users_routes import router as users_router, admin_router as admin_users_router  # noqa: E402
from routes.marketing_routes import router as marketing_router  # noqa: E402
from routes.whatsapp_routes import router as whatsapp_router  # noqa: E402
from routes.admin_routes import router as admin_router  # noqa: E402
from routes.uploads_routes import router as uploads_router  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("api")

app = FastAPI(title=os.environ.get("APP_NAME", "Digital Store"), version="1.0.0")

api = APIRouter(prefix="/api")
api.include_router(auth_router)
api.include_router(admin_auth_router)
api.include_router(catalog_router)
api.include_router(orders_router)
api.include_router(users_router)
api.include_router(admin_users_router)
api.include_router(marketing_router)
api.include_router(whatsapp_router)
api.include_router(admin_router)
api.include_router(uploads_router)


@api.get("/")
async def api_root():
    return {"app": os.environ.get("APP_NAME", "Digital Store"), "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ============================================================
# Serve the React frontend build in production (single-service
# monolithic deploy on Northflank / Docker). If FRONTEND_DIST is
# not set or the directory does not exist, this block is skipped.
# ============================================================
FRONTEND_DIST = os.environ.get("FRONTEND_DIST", "")
if FRONTEND_DIST and os.path.isdir(FRONTEND_DIST):
    static_dir = os.path.join(FRONTEND_DIST, "static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str, request: Request):
        # Never intercept API routes
        if full_path.startswith("api/") or full_path == "api":
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    logger.info("Serving frontend from %s", FRONTEND_DIST)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await seed()
    logger.info("API up. Mongo=%s db=%s", os.environ.get("MONGO_URL"), os.environ.get("DB_NAME"))


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
