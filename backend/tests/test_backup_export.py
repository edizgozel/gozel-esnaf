from datetime import datetime
from backend.app.models.all_models import Customer, Product, Sale, Setting
from backend.app.api.v1.export import sanitize_csv_value


def test_sanitize_csv_value():
    assert sanitize_csv_value("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_csv_value("+12345") == "'+12345"
    assert sanitize_csv_value("-500") == "'-500"
    assert sanitize_csv_value("@cmd") == "'@cmd"
    assert sanitize_csv_value("Normal Text") == "Normal Text"
    assert sanitize_csv_value(None) == ""


def test_sales_chart_endpoint(client, db_session):
    c = Customer(name="Test Chart Customer", balance_cents=0, is_active=True)
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)

    now = datetime.now()
    sale1 = Sale(
        sale_number="SL-CHART-001",
        customer_id=c.id,
        total_cents=15000,
        paid_amount_cents=15000,
        remaining_amount_cents=0,
        payment_method="Nakit",
        payment_status="Ödendi",
        status="Tamamlandı",
        sale_date=now,
    )
    db_session.add(sale1)
    db_session.commit()

    res = client.get("/api/v1/reports/sales-chart")
    assert res.status_code == 200
    data = res.json()
    assert "days" in data
    assert len(data["days"]) == 7
    assert data["total_period_cents"] >= 15000
    assert data["total_period_count"] >= 1


def test_csv_export_customers(client, db_session):
    c = Customer(name="=FormulaCustomer", balance_cents=25000, is_active=True)
    db_session.add(c)
    db_session.commit()

    res = client.get("/api/v1/export/csv/customers")
    assert res.status_code == 200
    assert res.headers["content-type"] == "text/csv; charset=utf-8"
    content = res.content.decode("utf-8-sig")
    assert "'=FormulaCustomer" in content
    assert "250.00" in content


def test_csv_export_products(client, db_session):
    p = Product(code="P-CSV-01", name="CSV Test Urun", sale_price_cents=10000, cost_price_cents=6000, current_stock=10, is_active=True)
    db_session.add(p)
    db_session.commit()

    res = client.get("/api/v1/export/csv/products")
    assert res.status_code == 200
    content = res.content.decode("utf-8-sig")
    assert "P-CSV-01" in content
    assert "CSV Test Urun" in content


def test_backup_list_and_create(client):
    res = client.get("/api/v1/backup")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
