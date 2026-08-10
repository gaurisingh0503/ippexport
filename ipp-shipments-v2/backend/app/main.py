from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.customers import router as customers_router
from app.api.materials import router as materials_router
from app.api.shipments import router as shipments_router
from app.api.shippers import router as shippers_router
from app.config import settings

app = FastAPI(title="IPP Shipments API")

cors_kwargs: dict = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.environment == "development":
    # Vite picks the next free port when 5173 is taken — allow any localhost origin.
    cors_kwargs["allow_origin_regex"] = r"http://(localhost|127\.0\.0\.1)(:\d+)?"
else:
    cors_kwargs["allow_origins"] = settings.cors_origins_list

app.add_middleware(CORSMiddleware, **cors_kwargs)
app.include_router(auth_router)
app.include_router(customers_router)
app.include_router(materials_router)
app.include_router(shippers_router)
app.include_router(shipments_router)

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
