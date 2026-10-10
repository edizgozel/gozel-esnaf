def test_get_products_initially_empty(client):
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    assert response.json() == []


def test_create_product_success(client):
    payload = {
        "code": "PRD-001",
        "name": "A4 Fotokopi Kağıdı",
        "category": "Kırtasiye",
        "cost_price_cents": 12000,
        "sale_price_cents": 18000,
        "current_stock": 50,
        "min_stock_level": 10,
        "unit": "Paket",
    }
    response = client.post("/api/v1/products", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "PRD-001"
    assert data["name"] == "A4 Fotokopi Kağıdı"
    assert data["cost_price_cents"] == 12000
    assert data["sale_price_cents"] == 18000
    assert data["current_stock"] == 50
    assert data["unit"] == "Paket"
    assert "id" in data


def test_product_unique_code_conflict(client):
    payload = {
        "code": "BENZER-KOD",
        "name": "Birinci Ürün",
    }
    client.post("/api/v1/products", json=payload)

    # Aynı kodla ikinci ürün
    res_conflict = client.post("/api/v1/products", json={
        "code": "BENZER-KOD",
        "name": "İkinci Ürün",
    })
    assert res_conflict.status_code == 400
    assert "zaten mevcut" in res_conflict.json()["detail"]


def test_product_negative_price_rejected(client):
    payload = {
        "code": "NEG-001",
        "name": "Negatif Fiyatlı Ürün",
        "sale_price_cents": -500,
    }
    response = client.post("/api/v1/products", json=payload)
    assert response.status_code == 422


def test_update_product(client):
    res_create = client.post("/api/v1/products", json={"code": "UPD-01", "name": "Eski Ürün", "sale_price_cents": 100})
    prod_id = res_create.json()["id"]

    res_update = client.put(f"/api/v1/products/{prod_id}", json={"sale_price_cents": 250})
    assert res_update.status_code == 200
    assert res_update.json()["sale_price_cents"] == 250
    assert res_update.json()["code"] == "UPD-01"


def test_delete_product_soft(client):
    res_create = client.post("/api/v1/products", json={"code": "DEL-01", "name": "Silinecek Ürün"})
    prod_id = res_create.json()["id"]

    res_del = client.delete(f"/api/v1/products/{prod_id}")
    assert res_del.status_code == 200

    # Aktif listede olmamalı
    res_list = client.get("/api/v1/products")
    assert not any(p["id"] == prod_id for p in res_list.json())

