from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.app.core.database import get_db
from backend.app.models.all_models import (
    Customer,
    Product,
    Sale,
    SaleItem,
    Expense,
    Collection,
)

router = APIRouter(prefix="/reports", tags=["Raporlar"])


@router.get("/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Dashboard için tek seferde tüm ana metrikleri döndürür:
    - Bugünkü satış sayısı ve tutarı
    - Bugünkü gider toplamı
    - Bugünkü tahsilat toplamı
    - Bu ayki toplam ciro, tahsilat, gider
    - Toplam aktif müşteri sayısı, toplam ürün sayısı, kritik stoktaki ürün sayısı
    """
    now = datetime.now()
    start_of_today = datetime(now.year, now.month, now.day, 0, 0, 0)
    end_of_today = datetime(now.year, now.month, now.day, 23, 59, 59)

    start_of_month = datetime(now.year, now.month, 1, 0, 0, 0)

    today_sales = (
        db.query(Sale)
        .filter(
            Sale.sale_date >= start_of_today,
            Sale.sale_date <= end_of_today,
            Sale.status == "Tamamlandı",
        )
        .all()
    )
    today_sales_count = len(today_sales)
    today_sales_total_cents = sum(s.total_cents for s in today_sales)
    today_sales_paid_cents = sum(s.paid_amount_cents for s in today_sales)
    today_sales_remaining_cents = sum(s.remaining_amount_cents for s in today_sales)

    today_expenses = (
        db.query(Expense)
        .filter(
            Expense.expense_date >= start_of_today,
            Expense.expense_date <= end_of_today,
        )
        .all()
    )
    today_expenses_total_cents = sum(e.amount_cents for e in today_expenses)

    today_collections = (
        db.query(Collection)
        .filter(
            Collection.collection_date >= start_of_today,
            Collection.collection_date <= end_of_today,
        )
        .all()
    )
    today_collections_total_cents = sum(c.amount_cents for c in today_collections)

    month_sales = (
        db.query(Sale)
        .filter(
            Sale.sale_date >= start_of_month,
            Sale.status == "Tamamlandı",
        )
        .all()
    )
    month_sales_total_cents = sum(s.total_cents for s in month_sales)

    month_expenses = (
        db.query(Expense)
        .filter(Expense.expense_date >= start_of_month)
        .all()
    )
    month_expenses_total_cents = sum(e.amount_cents for e in month_expenses)

    month_collections = (
        db.query(Collection)
        .filter(Collection.collection_date >= start_of_month)
        .all()
    )
    month_collections_total_cents = sum(c.amount_cents for c in month_collections)

    total_customers_count = db.query(Customer).filter(Customer.is_active == True).count()
    total_products_count = db.query(Product).filter(Product.is_active == True).count()
    critical_stock_count = (
        db.query(Product)
        .filter(
            Product.is_active == True,
            Product.current_stock <= Product.min_stock_level,
        )
        .count()
    )

    total_customer_receivables_cents = (
        db.query(func.coalesce(func.sum(Customer.balance_cents), 0))
        .filter(Customer.is_active == True, Customer.balance_cents > 0)
        .scalar()
    )

    return {
        "today": {
            "sales_count": today_sales_count,
            "sales_total_cents": today_sales_total_cents,
            "sales_paid_cents": today_sales_paid_cents,
            "sales_remaining_cents": today_sales_remaining_cents,
            "expenses_total_cents": today_expenses_total_cents,
            "collections_total_cents": today_collections_total_cents,
        },
        "month": {
            "sales_total_cents": month_sales_total_cents,
            "expenses_total_cents": month_expenses_total_cents,
            "collections_total_cents": month_collections_total_cents,
            "net_cash_flow_cents": month_collections_total_cents - month_expenses_total_cents,
        },
        "counts": {
            "customers": total_customers_count,
            "products": total_products_count,
            "critical_stock_products": critical_stock_count,
            "total_receivables_cents": int(total_customer_receivables_cents),
        },
    }


def parse_date_range(start_date: Optional[str], end_date: Optional[str]):
    sd = None
    ed = None
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Geçersiz başlangıç tarihi formatı (YYYY-MM-DD olmalı)")
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(status_code=400, detail="Geçersiz bitiş tarihi formatı (YYYY-MM-DD olmalı)")
    if sd and ed and sd > ed:
        raise HTTPException(status_code=400, detail="Başlangıç tarihi bitiş tarihinden sonra olamaz")
    return sd, ed


@router.get("/sales-report")
def get_sales_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sd, ed = parse_date_range(start_date, end_date)
    query = db.query(Sale).filter(Sale.status == "Tamamlandı")
    if sd:
        query = query.filter(Sale.sale_date >= sd)
    if ed:
        query = query.filter(Sale.sale_date <= ed)

    sales = query.order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
    total_cents = sum(s.total_cents for s in sales)
    items = []
    total_paid_cents = 0
    total_remaining_cents = 0

    for s in sales:
        col_sum = (
            db.query(func.coalesce(func.sum(Collection.amount_cents), 0))
            .filter(Collection.sale_id == s.id)
            .scalar()
        ) or 0
        eff_paid = max(
            (s.paid_amount_cents or 0) + col_sum,
            s.total_cents - (s.remaining_amount_cents or 0)
        )
        if eff_paid > s.total_cents:
            eff_paid = s.total_cents
        eff_remaining = s.total_cents - eff_paid
        total_paid_cents += eff_paid
        total_remaining_cents += eff_remaining

        items.append({
            "id": s.id,
            "sale_number": s.sale_number,
            "date": s.sale_date.strftime("%d.%m.%Y %H:%M"),
            "customer_name": s.customer.name if s.customer else "Perakende Müşteri",
            "total_cents": s.total_cents,
            "paid_amount_cents": eff_paid,
            "remaining_amount_cents": eff_remaining,
            "payment_method": s.payment_method,
            "items_count": len(s.items),
        })

    return {
        "total_count": len(sales),
        "total_cents": total_cents,
        "paid_cents": total_paid_cents,
        "remaining_cents": total_remaining_cents,
        "items": items,
    }


@router.get("/expenses-report")
def get_expenses_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sd, ed = parse_date_range(start_date, end_date)
    query = db.query(Expense)
    if sd:
        query = query.filter(Expense.expense_date >= sd)
    if ed:
        query = query.filter(Expense.expense_date <= ed)

    expenses = query.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()
    total_cents = sum(e.amount_cents for e in expenses)

    category_summary = {}
    for e in expenses:
        category_summary[e.category] = category_summary.get(e.category, 0) + e.amount_cents

    items = [
        {
            "id": e.id,
            "date": e.expense_date.strftime("%d.%m.%Y"),
            "category": e.category,
            "description": e.description or "-",
            "payment_method": e.payment_method,
            "amount_cents": e.amount_cents,
        }
        for e in expenses
    ]

    return {
        "total_count": len(expenses),
        "total_cents": total_cents,
        "by_category": category_summary,
        "items": items,
    }


@router.get("/collections-report")
def get_collections_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    sd, ed = parse_date_range(start_date, end_date)
    query = db.query(Collection)
    if sd:
        query = query.filter(Collection.collection_date >= sd)
    if ed:
        query = query.filter(Collection.collection_date <= ed)

    collections = query.order_by(Collection.collection_date.desc(), Collection.id.desc()).all()
    total_cents = sum(c.amount_cents for c in collections)

    items = [
        {
            "id": c.id,
            "receipt_number": f"THS-{c.id:04d}",
            "date": c.collection_date.strftime("%d.%m.%Y"),
            "customer_name": c.customer.name if c.customer else "Müşteri",
            "payment_method": c.payment_method,
            "notes": c.notes or "-",
            "amount_cents": c.amount_cents,
        }
        for c in collections
    ]

    return {
        "total_count": len(collections),
        "total_cents": total_cents,
        "items": items,
    }


@router.get("/customer-summary-report")
def get_customer_summary_report(db: Session = Depends(get_db)):
    """Müşteri bazında toplam borç/alacak ve işlem sayıları."""
    customers = db.query(Customer).filter(Customer.is_active == True).order_by(Customer.name.asc()).all()
    items = []
    total_receivable_cents = 0

    for c in customers:
        if c.balance_cents > 0:
            total_receivable_cents += c.balance_cents
        sales_count = len(c.sales) if c.sales else 0
        items.append({
            "id": c.id,
            "name": c.name,
            "company_name": c.company_name or "-",
            "phone": c.phone or "-",
            "balance_cents": c.balance_cents,
            "sales_count": sales_count,
        })

    return {
        "total_customers": len(customers),
        "total_receivable_cents": total_receivable_cents,
        "items": items,
    }


@router.get("/product-sales-report")
def get_product_sales_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Ürün bazında toplam satılan adet ve toplam ciro."""
    sd, ed = parse_date_range(start_date, end_date)

    query = (
        db.query(
            SaleItem.product_id,
            SaleItem.product_name,
            func.sum(SaleItem.quantity).label("total_quantity"),
            func.sum(SaleItem.line_total_cents).label("total_cents"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.status == "Tamamlandı")
    )

    if sd:
        query = query.filter(Sale.sale_date >= sd)
    if ed:
        query = query.filter(Sale.sale_date <= ed)

    results = query.group_by(SaleItem.product_id, SaleItem.product_name).order_by(desc("total_cents")).all()

    items = [
        {
            "product_id": r.product_id,
            "product_name": r.product_name,
            "total_quantity": int(r.total_quantity or 0),
            "total_cents": int(r.total_cents or 0),
        }
        for r in results
    ]

    total_revenue_cents = sum(item["total_cents"] for item in items)
    total_quantity = sum(item["total_quantity"] for item in items)

    return {
        "total_products_sold": len(items),
        "total_quantity": total_quantity,
        "total_revenue_cents": total_revenue_cents,
        "items": items,
    }


@router.get("/inventory-valuation-report")
def get_inventory_valuation_report(db: Session = Depends(get_db)):
    """Stok ve envanter maliyet / satış değerlemesi."""
    products = db.query(Product).filter(Product.is_active == True).order_by(Product.name.asc()).all()

    total_cost_value_cents = 0
    total_sale_value_cents = 0
    total_items_count = 0

    items = []
    for p in products:
        cost_val = p.cost_price_cents * max(0, p.current_stock)
        sale_val = p.sale_price_cents * max(0, p.current_stock)
        total_cost_value_cents += cost_val
        total_sale_value_cents += sale_val
        total_items_count += p.current_stock

        items.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "category": p.category or "Genel",
            "unit": p.unit,
            "current_stock": p.current_stock,
            "min_stock_level": p.min_stock_level,
            "cost_price_cents": p.cost_price_cents,
            "sale_price_cents": p.sale_price_cents,
            "cost_value_cents": cost_val,
            "sale_value_cents": sale_val,
        })

    return {
        "total_unique_products": len(products),
        "total_stock_count": total_items_count,
        "total_cost_value_cents": total_cost_value_cents,
        "total_sale_value_cents": total_sale_value_cents,
        "estimated_potential_profit_cents": total_sale_value_cents - total_cost_value_cents,
        "items": items,
    }


@router.get("/sales-chart")
def get_sales_chart_data(db: Session = Depends(get_db)):
    from datetime import timedelta
    now = datetime.now()
    today_date = now.date()

    chart_items = []
    for i in range(6, -1, -1):
        target_date = today_date - timedelta(days=i)
        start_dt = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0)
        end_dt = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59)

        sales = (
            db.query(Sale)
            .filter(
                Sale.sale_date >= start_dt,
                Sale.sale_date <= end_dt,
                Sale.status == "Tamamlandı",
            )
            .all()
        )
        total_cents = sum(s.total_cents for s in sales)
        count = len(sales)

        day_label = target_date.strftime("%d.%m")
        day_name = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][target_date.weekday()]

        chart_items.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "display_date": f"{day_label} {day_name}",
            "total_cents": total_cents,
            "count": count,
        })

    return {
        "days": chart_items,
        "total_period_cents": sum(it["total_cents"] for it in chart_items),
        "total_period_count": sum(it["count"] for it in chart_items),
    }

