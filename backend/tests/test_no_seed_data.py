import sqlite3
from backend.app.core.config import settings
from backend.app.core.database import init_db


def test_production_db_no_mock_seed_data():
    """Uygulama veritabanına otomatik mock/sahte seed verisi eklenmediğini doğrular."""
    init_db()
    conn = sqlite3.connect(settings.DATABASE_PATH)
    cursor = conn.cursor()

    # Sahte test isimlerinin veya mock seed verilerinin veritabanında bulunmadığını kontrol et
    mock_names = ["Ahmet Yılmaz", "Demir Elektrik", "Kaya Mimarlık", "URN-00101", "SLS-20261010-0001"]
    for mock_name in mock_names:
        cursor.execute("SELECT count(*) FROM customers WHERE name = ? OR company_name = ?", (mock_name, mock_name))
        assert cursor.fetchone()[0] == 0, f"Müşterilerde sahte seed bulundu: {mock_name}"

        cursor.execute("SELECT count(*) FROM products WHERE code = ?", (mock_name,))
        assert cursor.fetchone()[0] == 0, f"Ürünlerde sahte seed bulundu: {mock_name}"

    conn.close()


def test_api_collections_and_expenses_crud(client):
    """Gider ve tahsilat temel altyapısının test edilmesi."""
    # Müşteri oluştur
    cust_res = client.post("/api/v1/customers", json={"name": "Tahsilat Test Müşteri", "initial_balance_cents": 10000})
    cust_id = cust_res.json()["id"]
    assert cust_res.json()["balance_cents"] == 10000

    # Tahsilat yap
    col_res = client.post("/api/v1/collections", json={
        "customer_id": cust_id,
        "amount_cents": 4000,
        "payment_method": "Nakit",
        "notes": "Ara ödeme",
    })
    assert col_res.status_code == 201
    assert col_res.json()["amount_cents"] == 4000

    # Müşteri bakiyesi 10000 - 4000 = 6000 olmalı
    cust_updated = client.get(f"/api/v1/customers/{cust_id}").json()
    assert cust_updated["balance_cents"] == 6000

    # Gider ekle
    exp_res = client.post("/api/v1/expenses", json={
        "category": "Kira",
        "amount_cents": 250000,
        "payment_method": "Banka",
        "description": "Dükkan kirası",
    })
    assert exp_res.status_code == 201
    assert exp_res.json()["amount_cents"] == 250000

    # Gider listele
    exp_list = client.get("/api/v1/expenses").json()
    assert len(exp_list) == 1
    assert exp_list[0]["category"] == "Kira"

