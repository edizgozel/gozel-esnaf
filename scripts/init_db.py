"""
Gozel Esnaf — Veritabanı İlklendirme Betiği
"""
import sys
from pathlib import Path

# Windows konsol UTF-8 desteği
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Proje kökünü sys.path'e ekle
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from backend.app.core.database import init_db
from backend.app.core.config import settings


def main():
    print(f"[{settings.APP_NAME}] Veritabani ilklendiriliyor...")
    print(f"Konum: {settings.DATABASE_PATH}")
    journal_mode = init_db()
    print(f"Basarili! SQLite gunluk modu: {journal_mode}")


if __name__ == "__main__":
    main()

