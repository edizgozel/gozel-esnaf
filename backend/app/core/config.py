from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
BACKUPS_DIR = PROJECT_ROOT / "backups"

DATA_DIR.mkdir(parents=True, exist_ok=True)
BACKUPS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseModel):
    APP_NAME: str = "Gozel Esnaf"
    APP_VERSION: str = "0.1.0"
    DEVELOPER: str = "Gozel Software"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DATABASE_PATH: Path = DATA_DIR / "gozel_esnaf.db"
    DATABASE_URL: str = f"sqlite:///{DATABASE_PATH.as_posix()}"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()

