import os

# ─── Supabase ─────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fvfkrhmyqdymqywwlkon.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_iF_NuRm9aCAV2C-aCWOqBQ_G44M3Gdg")

# ─── JWT / Auth ───────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "floodguard-development-secret-key-2026")

# ─── SQLite legado (seed de sensores/zonas — não usado para usuários) ─────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.getenv("VERCEL"):
    import shutil
    DB_PATH = "/tmp/floodguard.db"
    orig_db = os.path.join(BASE_DIR, "floodguard.db")
    if not os.path.exists(DB_PATH) and os.path.exists(orig_db):
        try:
            shutil.copyfile(orig_db, DB_PATH)
        except Exception:
            pass
else:
    DB_PATH = os.path.join(BASE_DIR, "floodguard.db")


class Settings:
    SECRET_KEY: str = SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 90  # 90 dias
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    SUPABASE_URL: str | None = SUPABASE_URL
    SUPABASE_KEY: str | None = SUPABASE_KEY
    VERIFY_SSL: bool = os.getenv("VERIFY_SSL", "false").lower() in ("true", "1", "yes")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")


settings = Settings()
