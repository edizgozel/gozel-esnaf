def test_dashboard_summary_api(client):
    res = client.get("/api/v1/reports/dashboard-summary")
    assert res.status_code == 200
    data = res.json()
    assert "today" in data
    assert "month" in data
    assert "counts" in data
    assert "sales_count" in data["today"]
    assert "sales_total_cents" in data["today"]
    assert "customers" in data["counts"]


def test_reports_endpoints(client):
    # Satış raporu
    r_sales = client.get("/api/v1/reports/sales-report")
    assert r_sales.status_code == 200
    assert "total_count" in r_sales.json()
    assert "total_cents" in r_sales.json()

    # Gider raporu
    r_expenses = client.get("/api/v1/reports/expenses-report")
    assert r_expenses.status_code == 200
    assert "by_category" in r_expenses.json()

    # Tahsilat raporu
    r_collections = client.get("/api/v1/reports/collections-report")
    assert r_collections.status_code == 200
    assert "items" in r_collections.json()

    # Müşteri özeti raporu
    r_cust = client.get("/api/v1/reports/customer-summary-report")
    assert r_cust.status_code == 200
    assert "total_customers" in r_cust.json()

    # Ürün satış raporu
    r_prod = client.get("/api/v1/reports/product-sales-report")
    assert r_prod.status_code == 200
    assert "total_products_sold" in r_prod.json()

    # Envanter değerleme raporu
    r_inv = client.get("/api/v1/reports/inventory-valuation-report")
    assert r_inv.status_code == 200
    assert "total_stock_count" in r_inv.json()
    assert "total_cost_value_cents" in r_inv.json()


def test_reports_date_validation(client):
    # Başlangıç tarihi bitiş tarihinden sonra olamaz -> 400
    res = client.get("/api/v1/reports/sales-report?start_date=2026-10-20&end_date=2026-10-10")
    assert res.status_code == 400
    assert "sonra olamaz" in res.json()["detail"]

