from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base, SessionLocal
from .routers import auth, sensors, zones, alerts, dashboard, user_profile
from .seed_data import seed_database
from contextlib import asynccontextmanager
from .services.database_migrations import ensure_user_place_columns, migrate_legacy_history
from .config import SECRET_KEY

if not SECRET_KEY:
    raise RuntimeError("FATAL: SECRET_KEY não configurada no ambiente.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_user_place_columns(engine)
    Base.metadata.create_all(bind=engine)
    migrate_legacy_history(engine)
    db = SessionLocal()
    seed_database(db)
    db.close()
    yield

app = FastAPI(title="FloodGuard AI API", description="API de previsão de enchentes", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(auth.compat_router)
app.include_router(sensors.router)
app.include_router(zones.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(user_profile.router)

from .routers import confirmations, river_sensors, historico
app.include_router(confirmations.router)
app.include_router(river_sensors.router)
app.include_router(historico.router)

import os
static_dir = os.path.join(os.path.dirname(__file__), "../../static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/login")
def serve_login():
    return FileResponse(os.path.join(static_dir, "login.html"))

@app.get("/profile")
def serve_profile():
    return FileResponse(os.path.join(static_dir, "profile.html"))

@app.get("/map")
def serve_map():
    return FileResponse(os.path.join(static_dir, "map.html"))

@app.get("/{filename:path}")
def serve_static(filename: str):
    file_path = os.path.join(static_dir, filename)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(static_dir, "index.html"))
