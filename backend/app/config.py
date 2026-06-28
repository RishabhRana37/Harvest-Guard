from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Settings
    # Comma-separated list of origins in env
    ALLOWED_ORIGINS: str = "https://frontend-two-pi-24.vercel.app,http://localhost:5173,http://localhost:3000"
    
    # Database Settings
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "harvest_guard_db"
    
    # ML Model Settings
    MODEL_PATH: str = "model.keras"
    CONFIDENCE_TAU: float = 0.55
    
    # Business Limits
    MAX_UPLOAD_BYTES: int = 8388608  # 8MB
    RATE_LIMIT: int = 30
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
