import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import init_db
from app.routers.auth import router as auth_router
from app.routers.claims import router as claims_router
from app.routers.admin import router as admin_router
from app.routers.users import router as users_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="ClaimIQ API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(claims_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
