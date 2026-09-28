import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ─── Imports sem ponto (compatibilidade Serverless Vercel) ────────────────────
try:
    from config import SECRET_KEY, SUPABASE_URL, SUPABASE_KEY
    from database import engine, Base, SessionLocal
    from seed_data import seed_database
    from routers import (
        auth, sensors, zones, alerts, dashboard,
        user_profile, river_sensors, confirmations, historico
    )
except ImportError:
    from app.config import SECRET_KEY, SUPABASE_URL, SUPABASE_KEY
    from app.database import engine, Base, SessionLocal
    from app.seed_data import seed_database
    from app.routers import (
        auth, sensors, zones, alerts, dashboard,
        user_profile, river_sensors, confirmations, historico
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: validação das chaves e carregamento de seed estático.
    A validação dentro do lifespan garante segurança no arranque sem quebrar
    a inspeção de importação do runtime Serverless da Vercel.
    """
    if not SECRET_KEY:
        raise RuntimeError("FATAL: SECRET_KEY não configurada no ambiente.")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "FATAL: SUPABASE_URL e SUPABASE_KEY não configuradas no ambiente."
        )

    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        seed_database(db)
        db.close()
    except Exception as exc:
        import logging
        logging.warning(f"[seed] Inicialização dos dados estáticos ignorada: {exc}")
    yield


app = FastAPI(
    title="FloodGuard AI API",
    description="API de previsão de enchentes",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0"
        r"|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+"
        r"|.*\.onrender\.com|.*\.vercel\.app)(:\d+)?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(auth.compat_router)
app.include_router(sensors.router)
app.include_router(zones.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(user_profile.router)
app.include_router(confirmations.router)
app.include_router(river_sensors.router)
app.include_router(historico.router)

# ─── Ficheiros estáticos ──────────────────────────────────────────────────────
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

@app.get("/dashboard")
def serve_dashboard():
    return FileResponse(os.path.join(static_dir, "dashboard.html"))

@app.get("/{filename:path}")
def serve_static(filename: str):
    if filename.startswith("api/") or filename == "api":
        raise HTTPException(status_code=404, detail="Endpoint não encontrado")
    file_path = os.path.join(static_dir, filename)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    html_path = file_path + ".html"
    if os.path.isfile(html_path):
        return FileResponse(html_path)
    return FileResponse(os.path.join(static_dir, "index.html"))
