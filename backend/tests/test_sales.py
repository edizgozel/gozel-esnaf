import pytest


def test_create_sale_single_product_success(client):
    # Ürün oluştur (stok: 10, fiyat: 50.00 TL = 5000 kuruş)
    p_res = client.post("/api/v1/products", json={
        "code": "SLS-PRD-1",
        "name": "Defter A5",
        "sale_price_cents": 5000,
        "current_stock": 10,
    })
    p_id = p_res.json()["id"]

    # Satış yap (2 adet)
    sale_payload = {
        "items": [{"product_id": p_id, "quantity": 2}],
        "paid_amount_cents": 10000,
        "payment_method": "Nakit",
    }
    s_res = client.post("/api/v1/sales", json=sale_payload)
    assert s_res.status_code == 201
    sale = s_res.json()
    assert sale["total_cents"] == 10000  # 2 * 5000 = 100.00 TL
    assert sale["paid_amount_cents"] == 10000
    assert sale["remaining_amount_cents"] == 0
    assert sale["payment_status"] == "Ödendi"
    assert len(sale["items"]) == 1
    assert sale["items"][0]["quantity"] == 2
    assert sale["items"][0]["line_total_cents"] == 10000

    # Ürün stok miktarını kontrol et (10 - 2 = 8 olmalı)
    p_check = client.get(f"/api/v1/products/{p_id}").json()
    assert p_check["current_stock"] == 8


def test_create_sale_multi_products_success(client):
    # 2 adet ürün oluştur
    p1 = client.post("/api/v1/products", json={
        "code": "MULTI-1",
        "name": "Kalem",
        "sale_price_cents": 1500,
        "current_stock": 20,
    }).json()

    p2 = client.post("/api/v1/products", json={
        "code": "MULTI-2",
        "name": "Silgi",
        "sale_price_cents": 500,
        "current_stock": 15,
    }).json()

    # Müşteri oluştur
    cust = client.post("/api/v1/customers", json={"name": "Satış Müşterisi", "initial_balance_cents": 0}).json()

    # Satış: 3 adet Kalem (4500) + 4 adet Silgi (2000) = 6500 kuruş (65 TL)
    # 25 TL peşin ödensin (2500 kuruş), 40 TL borç kalsın (4000 kuruş)
    sale_payload = {
        "customer_id": cust["id"],
        "items": [
            {"product_id": p1["id"], "quantity": 3},
            {"product_id": p2["id"], "quantity": 4},
        ],
        "paid_amount_cents": 2500,
        "payment_method": "Kredi Kartı",
    }
    res = client.post("/api/v1/sales", json=sale_payload)
    assert res.status_code == 201
    sale = res.json()
    assert sale["total_cents"] == 6500
    assert sale["paid_amount_cents"] == 2500
    assert sale["remaining_amount_cents"] == 4000
    assert sale["payment_status"] == "Kısmi Ödendi"

    # Stok kontrolleri
    assert client.get(f"/api/v1/products/{p1['id']}").json()["current_stock"] == 17
    assert client.get(f"/api/v1/products/{p2['id']}").json()["current_stock"] == 11

    # Müşteri bakiye kontrolü (kalan 4000 kuruş borç eklenmeli)
    cust_check = client.get(f"/api/v1/customers/{cust['id']}").json()
    assert cust_check["balance_cents"] == 4000


def test_insufficient_stock_rejection(client):
    p = client.post("/api/v1/products", json={
        "code": "STOCK-LIMIT",
        "name": "Limitli Ürün",
        "sale_price_cents": 1000,
        "current_stock": 3,
    }).json()

    # 5 adet talep et (stok 3) -> Reddedilmeli
    res = client.post("/api/v1/sales", json={
        "items": [{"product_id": p["id"], "quantity": 5}]
    })
    assert res.status_code == 400
    assert "Yetersiz stok" in res.json()["detail"]
    assert "Limitli Ürün" in res.json()["detail"]

    # Stok değişmemiş olmalı
    assert client.get(f"/api/v1/products/{p['id']}").json()["current_stock"] == 3


def test_multi_item_transaction_rollback_when_one_item_insufficient(client):
    # p1 yeterli, p2 yetersiz
    p1 = client.post("/api/v1/products", json={
        "code": "ROLL-1",
        "name": "Bol Ürün",
        "sale_price_cents": 1000,
        "current_stock": 50,
    }).json()

    p2 = client.post("/api/v1/products", json={
        "code": "ROLL-2",
        "name": "Kıt Ürün",
        "sale_price_cents": 2000,
        "current_stock": 1,
    }).json()

    # p1'den 10 adet, p2'den 5 adet iste
    res = client.post("/api/v1/sales", json={
        "items": [
            {"product_id": p1["id"], "quantity": 10},
            {"product_id": p2["id"], "quantity": 5},
        ]
    })
    assert res.status_code == 400
    assert "Yetersiz stok" in res.json()["detail"]

    # Transaction rollback: p1'in stoğu kesinlikle düşmemiş olmalı (hâlâ 50)
    assert client.get(f"/api/v1/products/{p1['id']}").json()["current_stock"] == 50
    assert client.get(f"/api/v1/products/{p2['id']}").json()["current_stock"] == 1


def test_historical_price_preservation(client):
    p = client.post("/api/v1/products", json={
        "code": "HIST-1",
        "name": "Fiyatı Değişecek Ürün",
        "sale_price_cents": 10000,  # 100 TL
        "current_stock": 10,
    }).json()

    # Satış yap (fiyat: 100 TL)
    sale_res = client.post("/api/v1/sales", json={
        "items": [{"product_id": p["id"], "quantity": 1}],
    })
    sale_id = sale_res.json()["id"]

    # Şimdi ürünün fiyatını 250 TL'ye çıkaralım
    client.put(f"/api/v1/products/{p['id']}", json={"sale_price_cents": 25000})

    # Satış detayını sorgula: eski satıştaki fiyat 100 TL (10000 kuruş) olarak kalmalı!
    sale_check = client.get(f"/api/v1/sales/{sale_id}").json()
    assert sale_check["items"][0]["unit_price_cents"] == 10000
    assert sale_check["items"][0]["line_total_cents"] == 10000
    assert sale_check["total_cents"] == 10000


def test_duplicate_sale_number_prevented(client):
    p = client.post("/api/v1/products", json={
        "code": "DUP-1",
        "name": "Test Ürünü",
        "sale_price_cents": 1000,
        "current_stock": 10,
    }).json()

    # Belirli bir fiş no ile ilk satış
    res1 = client.post("/api/v1/sales", json={
        "sale_number": "SLS-SPECIAL-001",
        "items": [{"product_id": p["id"], "quantity": 1}],
    })
    assert res1.status_code == 201

    # Aynı fiş no ile ikinci satış -> 400 hatası vermeli
    res2 = client.post("/api/v1/sales", json={
        "sale_number": "SLS-SPECIAL-001",
        "items": [{"product_id": p["id"], "quantity": 1}],
    })
    assert res2.status_code == 400
    assert "zaten kayıtlı" in res2.json()["detail"]


def test_sale_cancellation_and_stock_restoration(client):
    p = client.post("/api/v1/products", json={
        "code": "CNC-1",
        "name": "İptal Edilecek Satışın Ürünü",
        "sale_price_cents": 5000,
        "current_stock": 10,
    }).json()

    cust = client.post("/api/v1/customers", json={"name": "İptal Müşterisi", "initial_balance_cents": 0}).json()

    # Satış yap (2 adet veresiye)
    sale = client.post("/api/v1/sales", json={
        "customer_id": cust["id"],
        "items": [{"product_id": p["id"], "quantity": 2}],
        "paid_amount_cents": 0,
    }).json()

    # Stok 8 olmalı, müşteri borcu 10000 olmalı
    assert client.get(f"/api/v1/products/{p['id']}").json()["current_stock"] == 8
    assert client.get(f"/api/v1/customers/{cust['id']}").json()["balance_cents"] == 10000

    # Satışı iptal et
    cancel_res = client.post(f"/api/v1/sales/{sale['id']}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "İptal Edildi"

    # Stok 10'a iade edilmiş olmalı, müşteri borcu 0'a düşmüş olmalı
    assert client.get(f"/api/v1/products/{p['id']}").json()["current_stock"] == 10
    assert client.get(f"/api/v1/customers/{cust['id']}").json()["balance_cents"] == 0

    # Tekrar iptal etmeye çalışınca çift iade engellenmeli (400)
    cancel_again = client.post(f"/api/v1/sales/{sale['id']}/cancel")
    cancel_again_detail = cancel_again.json()["detail"]
    assert cancel_again.status_code == 400
    assert "daha önce iptal edilmiştir" in cancel_again_detail
    assert client.get(f"/api/v1/products/{p['id']}").json()["current_stock"] == 10


def test_today_sales_summary_payment_status(client):
    p = client.post("/api/v1/products", json={
        "code": "TODAY-1",
        "name": "Özet Ürünü",
        "sale_price_cents": 5000,
        "current_stock": 20,
    }).json()

    res_paid = client.post("/api/v1/sales", json={
        "items": [{"product_id": p["id"], "quantity": 1}],
        "paid_amount_cents": 5000,
        "payment_method": "Nakit",
    })
    assert res_paid.status_code == 201

    res_unpaid = client.post("/api/v1/sales", json={
        "items": [{"product_id": p["id"], "quantity": 2}],
        "paid_amount_cents": 0,
        "payment_method": "Açık Hesap",
    })
    assert res_unpaid.status_code == 201

    res_partial = client.post("/api/v1/sales", json={
        "items": [{"product_id": p["id"], "quantity": 2}],
        "paid_amount_cents": 3000,
        "payment_method": "Nakit",
    })
    assert res_partial.status_code == 201

    summary_res = client.get("/api/v1/sales/today-summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_count"] >= 3
    sales_map = {s["id"]: s for s in summary["sales"]}

    assert sales_map[res_paid.json()["id"]]["payment_status"] == "Ödendi"
    assert sales_map[res_paid.json()["id"]]["remaining_amount_cents"] == 0

    assert sales_map[res_unpaid.json()["id"]]["payment_status"] == "Bekliyor"
    assert sales_map[res_unpaid.json()["id"]]["remaining_amount_cents"] == 10000

    assert sales_map[res_partial.json()["id"]]["payment_status"] == "Kısmi Ödendi"
    assert sales_map[res_partial.json()["id"]]["remaining_amount_cents"] == 7000


def test_credit_sale_updated_by_subsequent_collections(client):
    cust = client.post("/api/v1/customers", json={"name": "Açık Hesap Müşteri", "initial_balance_cents": 0}).json()
    p = client.post("/api/v1/products", json={"code": "ACIK-1", "name": "Borçlu Ürün", "sale_price_cents": 25000, "current_stock": 10}).json()

    res_sale = client.post("/api/v1/sales", json={
        "customer_id": cust["id"],
        "items": [{"product_id": p["id"], "quantity": 1}],
        "paid_amount_cents": 0,
        "payment_method": "Açık Hesap",
    })
    assert res_sale.status_code == 201
    sale_data = res_sale.json()
    sale_id = sale_data["id"]
    assert sale_data["total_cents"] == 25000
    assert sale_data["paid_amount_cents"] == 0
    assert sale_data["remaining_amount_cents"] == 25000
    assert sale_data["payment_status"] == "Bekliyor"

    res_partial_col = client.post("/api/v1/collections", json={
        "customer_id": cust["id"],
        "amount_cents": 10000,
        "payment_method": "Nakit",
    })
    assert res_partial_col.status_code == 201

    sale_after_partial = client.get(f"/api/v1/sales/{sale_id}").json()
    assert sale_after_partial["paid_amount_cents"] == 10000
    assert sale_after_partial["remaining_amount_cents"] == 15000
    assert sale_after_partial["payment_status"] == "Kısmi Ödendi"

    summary_partial = client.get("/api/v1/sales/today-summary").json()
    today_sale_item = next(s for s in summary_partial["sales"] if s["id"] == sale_id)
    assert today_sale_item["paid_amount_cents"] == 10000
    assert today_sale_item["remaining_amount_cents"] == 15000
    assert today_sale_item["payment_status"] == "Kısmi Ödendi"

    res_full_col = client.post("/api/v1/collections", json={
        "customer_id": cust["id"],
        "amount_cents": 15000,
        "payment_method": "Banka",
    })
    assert res_full_col.status_code == 201

    sale_after_full = client.get(f"/api/v1/sales/{sale_id}").json()
    assert sale_after_full["paid_amount_cents"] == 25000
    assert sale_after_full["remaining_amount_cents"] == 0
    assert sale_after_full["payment_status"] == "Ödendi"

    summary_full = client.get("/api/v1/sales/today-summary").json()
    today_sale_full = next(s for s in summary_full["sales"] if s["id"] == sale_id)
    assert today_sale_full["paid_amount_cents"] == 25000
    assert today_sale_full["remaining_amount_cents"] == 0
    assert today_sale_full["payment_status"] == "Ödendi"


