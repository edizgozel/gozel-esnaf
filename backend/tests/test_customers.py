def test_get_customers_initially_empty(client):
    response = client.get("/api/v1/customers")
    assert response.status_code == 200
    assert response.json() == []


def test_create_customer_success(client):
    payload = {
        "name": "Ahmet Yılmaz",
        "company_name": "Yılmaz Ticaret",
        "phone": "0555 123 4567",
        "email": "ahmet@example.com",
        "address": "Kadıköy / İstanbul",
        "tax_id": "1234567890",
        "initial_balance_cents": 15000,
    }
    response = client.post("/api/v1/customers", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Ahmet Yılmaz"
    assert data["company_name"] == "Yılmaz Ticaret"
    assert data["balance_cents"] == 15000
    assert data["is_active"] is True
    assert "id" in data


def test_customer_validation_empty_name(client):
    payload = {"name": ""}
    response = client.post("/api/v1/customers", json=payload)
    assert response.status_code == 422


def test_get_customer_detail(client):
    # Oluştur
    res_create = client.post("/api/v1/customers", json={"name": "Mehmet Kaya"})
    customer_id = res_create.json()["id"]

    # Detay getir
    res = client.get(f"/api/v1/customers/{customer_id}")
    assert res.status_code == 200
    assert res.json()["name"] == "Mehmet Kaya"

    # Bulunamayan müşteri
    res_404 = client.get("/api/v1/customers/99999")
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Müşteri bulunamadı"


def test_update_customer(client):
    res_create = client.post("/api/v1/customers", json={"name": "Eski İsim", "phone": "111"})
    customer_id = res_create.json()["id"]

    res_update = client.put(f"/api/v1/customers/{customer_id}", json={"name": "Yeni İsim"})
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Yeni İsim"
    assert res_update.json()["phone"] == "111"


def test_delete_customer_soft(client):
    res_create = client.post("/api/v1/customers", json={"name": "Silinecek Müşteri"})
    customer_id = res_create.json()["id"]

    # Soft delete
    res_del = client.delete(f"/api/v1/customers/{customer_id}")
    assert res_del.status_code == 200

    # Aktif listede çıkmamalı
    res_list = client.get("/api/v1/customers")
    assert not any(c["id"] == customer_id for c in res_list.json())

    # Pasif dahil listede bulunmalı
    res_all = client.get("/api/v1/customers?is_active=false")
    assert any(c["id"] == customer_id for c in res_all.json())

