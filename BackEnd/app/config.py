import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "floodguard.db")
SECRET_KEY = os.getenv("SECRET_KEY")
VERIFY_SSL = os.getenv("ENVIRONMENT", "production").lower() == "production"

class Settings:
    SECRET_KEY: str | None = SECRET_KEY
    VERIFY_SSL: bool = VERIFY_SSL
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 90  # 90 dias de sessão contínua
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

settings = Settings()

