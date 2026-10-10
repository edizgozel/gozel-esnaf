import os
import sqlite3
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from backend.app.core.config import settings, BACKUPS_DIR
from backend.app.core.database import SessionLocal, init_db

router = APIRouter(prefix="/backup", tags=["Yedekleme"])

REQUIRED_TABLES = {
    "customers",
    "products",
    "sales",
    "sale_items",
    "expenses",
    "collections",
    "customer_transactions",
    "settings",
}


class BackupInfo(BaseModel):
    filename: str
    date: str
    size_bytes: int
    size_formatted: str
    is_valid: bool


class RestoreRequest(BaseModel):
    filename: str


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def check_sqlite_integrity(db_path: Path) -> bool:
    if not db_path.exists() or db_path.stat().st_size == 0:
        return False
    try:
        conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        res = cursor.fetchone()
        if not res or res[0] != "ok":
            conn.close()
            return False

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {row[0] for row in cursor.fetchall()}
        conn.close()

        if not REQUIRED_TABLES.issubset(tables):
            return False
        return True
    except Exception:
        return False


def create_sqlite_backup_file() -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"gozel_esnaf_backup_{timestamp}.db"
    backup_path = BACKUPS_DIR / backup_filename

    src_conn = sqlite3.connect(settings.DATABASE_PATH.as_posix())
    dest_conn = sqlite3.connect(backup_path.as_posix())

    with dest_conn:
        src_conn.backup(dest_conn)

    dest_conn.close()
    src_conn.close()

    return backup_filename


@router.get("", response_model=list[BackupInfo])
def list_backups():
    backups = []
    if not BACKUPS_DIR.exists():
        return []

    for file_path in sorted(BACKUPS_DIR.glob("*.db"), key=os.path.getmtime, reverse=True):
        if not file_path.is_file():
            continue
        stat = file_path.stat()
        file_date = datetime.fromtimestamp(stat.st_mtime).strftime("%d.%m.%Y %H:%M:%S")
        is_valid = check_sqlite_integrity(file_path)
        backups.append(
            BackupInfo(
                filename=file_path.name,
                date=file_date,
                size_bytes=stat.st_size,
                size_formatted=format_file_size(stat.st_size),
                is_valid=is_valid,
            )
        )
    return backups


@router.post("/create", response_model=BackupInfo)
def create_backup():
    try:
        filename = create_sqlite_backup_file()
        backup_path = BACKUPS_DIR / filename
        stat = backup_path.stat()
        file_date = datetime.fromtimestamp(stat.st_mtime).strftime("%d.%m.%Y %H:%M:%S")
        is_valid = check_sqlite_integrity(backup_path)

        return BackupInfo(
            filename=filename,
            date=file_date,
            size_bytes=stat.st_size,
            size_formatted=format_file_size(stat.st_size),
            is_valid=is_valid,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Yedek oluşturulamadı: {str(e)}")


@router.post("/restore")
def restore_backup(req: RestoreRequest):
    filename = os.path.basename(req.filename)
    backup_path = BACKUPS_DIR / filename

    if not backup_path.exists() or not backup_path.is_file():
        raise HTTPException(status_code=404, detail="Belirtilen yedek dosyası bulunamadı")

    if not check_sqlite_integrity(backup_path):
        raise HTTPException(status_code=400, detail="Yedek dosyası bozuk veya geçersiz SQLite şeması içeriyor")

    try:
        safety_name = create_sqlite_backup_file()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Güvenlik yedeği alınamadığı için geri yükleme durduruldu: {str(e)}")

    try:
        from backend.app.core.database import engine
        engine.dispose()

        wal_file = settings.DATABASE_PATH.with_name(settings.DATABASE_PATH.name + "-wal")
        shm_file = settings.DATABASE_PATH.with_name(settings.DATABASE_PATH.name + "-shm")

        if wal_file.exists():
            wal_file.unlink(missing_ok=True)
        if shm_file.exists():
            shm_file.unlink(missing_ok=True)

        shutil.copy2(backup_path, settings.DATABASE_PATH)
        init_db()

        return {
            "success": True,
            "message": "Veritabanı başarıyla geri yüklendi",
            "restored_file": filename,
            "safety_backup": safety_name,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geri yükleme sırasında hata oluştu: {str(e)}")


@router.get("/download/{filename}")
def download_backup(filename: str):
    clean_filename = os.path.basename(filename)
    file_path = BACKUPS_DIR / clean_filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    return FileResponse(
        path=file_path,
        filename=clean_filename,
        media_type="application/vnd.sqlite3",
    )

