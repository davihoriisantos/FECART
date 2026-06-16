class Settings:
    SECRET_KEY: str = "floodguard-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./floodguard.db"

settings = Settings()
