import os
import logging
from pathlib import Path
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
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


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await seed()
    logger.info("Digital Store API up. Mongo=%s db=%s", os.environ.get("MONGO_URL"), os.environ.get("DB_NAME"))


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
