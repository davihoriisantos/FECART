import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "floodguard.db")

class Settings:
    SECRET_KEY: str = "floodguard-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 90  # 90 dias de sessão contínua
    DATABASE_URL: str = f"sqlite:///{DB_PATH}"

settings = Settings()

