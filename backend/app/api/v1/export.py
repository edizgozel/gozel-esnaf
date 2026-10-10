import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import (
    Customer,
    Product,
    Sale,
    SaleItem,
    Expense,
    Collection,
    CustomerTransaction,
)

router = APIRouter(prefix="/export", tags=["Dışa Aktarma"])


def sanitize_csv_value(value) -> str:
    if value is None:
        return ""
    val_str = str(value)
    if any(val_str.startswith(char) for char in ("=", "+", "-", "@", "\t", "\r")):
        return f"'{val_str}"
    return val_str


def format_cents_to_currency(cents: int) -> str:
    return f"{cents / 100:.2f}"


@router.get("/csv/{entity_type}")
def export_entity_csv(
    entity_type: str,
    db: Session = Depends(get_db),
):
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    now_str = datetime.now().strftime("%Y%m%d_%H%M%S")

    if entity_type == "customers":
        filename = f"musteriler_{now_str}.csv"
        writer.writerow([
            "Müşteri ID",
            "Müşteri Adı",
            "Ticari Unvan",
            "Telefon",
            "E-posta",
            "Adres",
            "Vergi No / TCKN",
            "Bakiye (TL)",
            "Durum",
            "Kayıt Tarihi",
        ])
        customers = db.query(Customer).order_by(Customer.id.asc()).all()
        for c in customers:
            writer.writerow([
                sanitize_csv_value(c.id),
                sanitize_csv_value(c.name),
                sanitize_csv_value(c.company_name or ""),
                sanitize_csv_value(c.phone or ""),
                sanitize_csv_value(c.email or ""),
                sanitize_csv_value(c.address or ""),
                sanitize_csv_value(c.tax_id or ""),
                sanitize_csv_value(format_cents_to_currency(c.balance_cents)),
                sanitize_csv_value("Aktif" if c.is_active else "Pasif"),
                sanitize_csv_value(c.created_at.strftime("%d.%m.%Y %H:%M") if c.created_at else ""),
            ])

    elif entity_type == "products":
        filename = f"urunler_{now_str}.csv"
        writer.writerow([
            "Ürün ID",
            "Ürün Kodu",
            "Ürün Adı",
            "Kategori",
            "Birim",
            "Alış Fiyatı (TL)",
            "Satış Fiyatı (TL)",
            "Mevcut Stok",
            "Kritik Stok Seviyesi",
            "Durum",
        ])
        products = db.query(Product).order_by(Product.id.asc()).all()
        for p in products:
            writer.writerow([
                sanitize_csv_value(p.id),
                sanitize_csv_value(p.code),
                sanitize_csv_value(p.name),
                sanitize_csv_value(p.category or ""),
                sanitize_csv_value(p.unit),
                sanitize_csv_value(format_cents_to_currency(p.cost_price_cents)),
                sanitize_csv_value(format_cents_to_currency(p.sale_price_cents)),
                sanitize_csv_value(p.current_stock),
                sanitize_csv_value(p.min_stock_level),
                sanitize_csv_value("Aktif" if p.is_active else "Pasif"),
            ])

    elif entity_type == "sales":
        filename = f"satislar_{now_str}.csv"
        writer.writerow([
            "Satış ID",
            "Fiş No",
            "Tarih",
            "Müşteri Adı",
            "Toplam Tutar (TL)",
            "Ödenen Tutar (TL)",
            "Kalan Tutar (TL)",
            "Ödeme Şekli",
            "Ödeme Durumu",
            "İşlem Durumu",
            "Notlar",
        ])
        sales = db.query(Sale).order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
        for s in sales:
            writer.writerow([
                sanitize_csv_value(s.id),
                sanitize_csv_value(s.sale_number),
                sanitize_csv_value(s.sale_date.strftime("%d.%m.%Y %H:%M") if s.sale_date else ""),
                sanitize_csv_value(s.customer.name if s.customer else "Perakende Müşteri"),
                sanitize_csv_value(format_cents_to_currency(s.total_cents)),
                sanitize_csv_value(format_cents_to_currency(s.paid_amount_cents)),
                sanitize_csv_value(format_cents_to_currency(s.remaining_amount_cents)),
                sanitize_csv_value(s.payment_method),
                sanitize_csv_value(s.payment_status),
                sanitize_csv_value(s.status),
                sanitize_csv_value(s.notes or ""),
            ])

    elif entity_type == "sale_items":
        filename = f"satis_kalemleri_{now_str}.csv"
        writer.writerow([
            "Kalem ID",
            "Satış Fiş No",
            "Tarih",
            "Ürün Kodu",
            "Ürün Adı",
            "Miktar",
            "Birim Fiyat (TL)",
            "Satır Toplamı (TL)",
        ])
        items = (
            db.query(SaleItem)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .order_by(Sale.sale_date.desc(), SaleItem.id.asc())
            .all()
        )
        for it in items:
            writer.writerow([
                sanitize_csv_value(it.id),
                sanitize_csv_value(it.sale.sale_number if it.sale else ""),
                sanitize_csv_value(it.sale.sale_date.strftime("%d.%m.%Y %H:%M") if it.sale and it.sale.sale_date else ""),
                sanitize_csv_value(it.product.code if it.product else ""),
                sanitize_csv_value(it.product_name),
                sanitize_csv_value(it.quantity),
                sanitize_csv_value(format_cents_to_currency(it.unit_price_cents)),
                sanitize_csv_value(format_cents_to_currency(it.line_total_cents)),
            ])

    elif entity_type == "expenses":
        filename = f"giderler_{now_str}.csv"
        writer.writerow([
            "Gider ID",
            "Tarih",
            "Kategori",
            "Açıklama",
            "Tutar (TL)",
            "Ödeme Şekli",
            "Fiş/Fatura No",
        ])
        expenses = db.query(Expense).order_by(Expense.expense_date.desc(), Expense.id.desc()).all()
        for e in expenses:
            writer.writerow([
                sanitize_csv_value(e.id),
                sanitize_csv_value(e.expense_date.strftime("%d.%m.%Y") if e.expense_date else ""),
                sanitize_csv_value(e.category),
                sanitize_csv_value(e.description or ""),
                sanitize_csv_value(format_cents_to_currency(e.amount_cents)),
                sanitize_csv_value(e.payment_method),
                sanitize_csv_value(e.receipt_number or ""),
            ])

    elif entity_type == "collections":
        filename = f"tahsilatlar_{now_str}.csv"
        writer.writerow([
            "Tahsilat ID",
            "Tarih",
            "Müşteri Adı",
            "Tutar (TL)",
            "Ödeme Şekli",
            "Notlar",
        ])
        collections = db.query(Collection).order_by(Collection.collection_date.desc(), Collection.id.desc()).all()
        for c in collections:
            writer.writerow([
                sanitize_csv_value(c.id),
                sanitize_csv_value(c.collection_date.strftime("%d.%m.%Y") if c.collection_date else ""),
                sanitize_csv_value(c.customer.name if c.customer else ""),
                sanitize_csv_value(format_cents_to_currency(c.amount_cents)),
                sanitize_csv_value(c.payment_method),
                sanitize_csv_value(c.notes or ""),
            ])

    elif entity_type == "transactions":
        filename = f"cari_hareketler_{now_str}.csv"
        writer.writerow([
            "Hareket ID",
            "Tarih",
            "Müşteri Adı",
            "İşlem Türü",
            "Borç Tutarı (TL)",
            "Alacak Tutarı (TL)",
            "Açıklama",
        ])
        txs = db.query(CustomerTransaction).order_by(CustomerTransaction.transaction_date.desc(), CustomerTransaction.id.desc()).all()
        for tx in txs:
            writer.writerow([
                sanitize_csv_value(tx.id),
                sanitize_csv_value(tx.transaction_date.strftime("%d.%m.%Y %H:%M") if tx.transaction_date else ""),
                sanitize_csv_value(tx.customer.name if tx.customer else ""),
                sanitize_csv_value(tx.transaction_type),
                sanitize_csv_value(format_cents_to_currency(tx.debt_cents)),
                sanitize_csv_value(format_cents_to_currency(tx.credit_cents)),
                sanitize_csv_value(tx.description or ""),
            ])

    else:
        raise HTTPException(status_code=400, detail="Geçersiz dışa aktarma türü")

    csv_content = output.getvalue().encode("utf-8-sig")

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
        },
    )

