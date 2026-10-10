import pytest
from datetime import datetime


def test_expenses_crud(client):
    # Gider ekle
    res = client.post("/api/v1/expenses", json={
        "category": "Kira",
        "amount_cents": 500000,
        "payment_method": "Banka",
        "description": "Ekim kirası",
    })
    assert res.status_code == 201
    exp = res.json()
    assert exp["category"] == "Kira"
    assert exp["amount_cents"] == 500000
    exp_id = exp["id"]

    # Detay getir
    get_res = client.get(f"/api/v1/expenses/{exp_id}")
    assert get_res.status_code == 200
    assert get_res.json()["description"] == "Ekim kirası"

    # Güncelle
    up_res = client.put(f"/api/v1/expenses/{exp_id}", json={
        "amount_cents": 550000,
        "description": "Revize kira",
    })
    assert up_res.status_code == 200
    assert up_res.json()["amount_cents"] == 550000
    assert up_res.json()["description"] == "Revize kira"

    # Sil
    del_res = client.delete(f"/api/v1/expenses/{exp_id}")
    assert del_res.status_code == 200

    # Tekrar sorgula 404
    assert client.get(f"/api/v1/expenses/{exp_id}").status_code == 404


def test_collections_and_customer_balance_lifecycle(client):
    # Müşteri oluştur (başlangıç bakiyesi 20.000 kuruş)
    cust = client.post("/api/v1/customers", json={
        "name": "Cari Tahsilat Müşterisi",
        "initial_balance_cents": 20000,
    }).json()
    cust_id = cust["id"]
    assert cust["balance_cents"] == 20000

    # Tahsilat yap: 8.000 kuruş
    col_res = client.post("/api/v1/collections", json={
        "customer_id": cust_id,
        "amount_cents": 8000,
        "payment_method": "Nakit",
        "notes": "Ara tahsilat makbuzu",
    })
    assert col_res.status_code == 201
    col = col_res.json()
    assert col["amount_cents"] == 8000
    col_id = col["id"]

    # Müşteri bakiyesi 20000 - 8000 = 12000 olmalı
    cust_after = client.get(f"/api/v1/customers/{cust_id}").json()
    assert cust_after["balance_cents"] == 12000

    # Cari hareketleri kontrol et: Açılış bakiyesi + Tahsilat
    tx_list = client.get(f"/api/v1/customers/{cust_id}/transactions").json()
    assert len(tx_list) == 2
    assert tx_list[0]["transaction_type"] == "TAHSİLAT"
    assert tx_list[0]["balance_after_cents"] == 12000

    # Tahsilatı sil / iptal et
    del_col = client.delete(f"/api/v1/collections/{col_id}")
    assert del_col.status_code == 200

    # Bakiye tekrar 20000'e dönmeli
    cust_restored = client.get(f"/api/v1/customers/{cust_id}").json()
    assert cust_restored["balance_cents"] == 20000

    # Cari hareketlere TAHSİLAT_İPTAL eklenmiş olmalı
    tx_after_cancel = client.get(f"/api/v1/customers/{cust_id}/transactions").json()
    assert len(tx_after_cancel) == 3
    assert tx_after_cancel[0]["transaction_type"] == "TAHSİLAT_İPTAL"
    assert tx_after_cancel[0]["balance_after_cents"] == 20000


def test_today_sales_summary_and_cancellation_filtering(client):
    # Ürün oluştur
    p = client.post("/api/v1/products", json={
        "code": "TODAY-1",
        "name": "Günlük Satış Ürünü",
        "sale_price_cents": 2500,
        "current_stock": 50,
    }).json()

    # Başlangıçta bugünkü satış 0 olmalı
    summary_initial = client.get("/api/v1/sales/today-summary").json()
    assert summary_initial["total_count"] == 0
    assert summary_initial["total_amount_cents"] == 0

    # 1. Satış: 2 adet (5000 kuruş, 5000 peşin)
    s1 = client.post("/api/v1/sales", json={
        "items": [{"product_id": p["id"], "quantity": 2}],
        "paid_amount_cents": 5000,
    }).json()

    # 2. Satış: 4 adet (10000 kuruş, 3000 peşin, 7000 borç)
    s2 = client.post("/api/v1/sales", json={
        "items": [{"product_id": p["id"], "quantity": 4}],
        "paid_amount_cents": 3000,
    }).json()

    # Bugünkü satış özeti kontrolü
    summary = client.get("/api/v1/sales/today-summary").json()
    assert summary["total_count"] == 2
    assert summary["total_amount_cents"] == 15000
    assert summary["paid_amount_cents"] == 8000
    assert summary["remaining_amount_cents"] == 7000

    # 2. Satışı iptal et
    client.post(f"/api/v1/sales/{s2['id']}/cancel")

    # İptal edilen satış bugünkü satış toplamından çıkarılmalı!
    summary_after_cancel = client.get("/api/v1/sales/today-summary").json()
    assert summary_after_cancel["total_count"] == 1
    assert summary_after_cancel["total_amount_cents"] == 5000
    assert summary_after_cancel["paid_amount_cents"] == 5000
    assert summary_after_cancel["remaining_amount_cents"] == 0

