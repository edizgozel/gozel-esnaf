import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import init_db

client = TestClient(app)


def test_init_db():
    journal_mode = init_db()
    assert str(journal_mode).upper() == "WAL"


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "Gozel Esnaf"
    assert data["developer"] == "Gozel Software"
    assert data["status"] == "calisiyor"


def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "Gozel Esnaf"
    assert "database" in data
    assert data["database"]["status"] == "connected"
    assert data["database"]["journal_mode"] == "WAL"
    assert data["database"]["foreign_keys_enabled"] is True


def test_api_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

