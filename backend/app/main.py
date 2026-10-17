import logging
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.batches import router as batches_router
from app.api.customers import router as customers_router
from app.api.export_documents import router as export_documents_router
from app.api.materials import router as materials_router
from app.api.shippers import router as shippers_router
from app.config import settings

logger = logging.getLogger(__name__)

_ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def _run_migrations() -> None:
    alembic_cfg = Config(str(_ALEMBIC_INI))
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        _run_migrations()
    except Exception:
        logger.exception("Migration failed — server will start but DB may be out of date")
    yield


app = FastAPI(title="IPP Shipments API", lifespan=lifespan)

cors_kwargs: dict = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.environment == "development":
    cors_kwargs["allow_origin_regex"] = r"http://(localhost|127\.0\.0\.1)(:\d+)?"
else:
    cors_kwargs["allow_origins"] = settings.cors_origins_list

app.add_middleware(CORSMiddleware, **cors_kwargs)
app.include_router(auth_router)
app.include_router(customers_router)
app.include_router(export_documents_router)
app.include_router(materials_router)
app.include_router(shippers_router)
app.include_router(batches_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
