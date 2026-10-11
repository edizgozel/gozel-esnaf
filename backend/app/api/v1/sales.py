from typing import List, Optional
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from backend.app.core.database import get_db
from backend.app.models.all_models import Sale, SaleItem, Product, Customer, CustomerTransaction, Collection
from backend.app.schemas.all_schemas import SaleCreate, SaleResponse, SaleItemResponse

router = APIRouter(prefix="/sales", tags=["Satışlar"])


def generate_sale_number(db: Session) -> str:
    today_str = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"SLS-{today_str}-"
    last_sale = (
        db.query(Sale)
        .filter(Sale.sale_number.like(f"{prefix}%"))
        .order_by(desc(Sale.id))
        .first()
    )
    if last_sale and last_sale.sale_number:
        try:
            last_seq = int(last_sale.sale_number.split("-")[-1])
            new_seq = last_seq + 1
        except (ValueError, IndexError):
            new_seq = 1
    else:
        new_seq = 1
    return f"{prefix}{new_seq:04d}"


def get_effective_sale_payment(sale: Sale, db: Session):
    col_sum = (
        db.query(func.coalesce(func.sum(Collection.amount_cents), 0))
        .filter(Collection.sale_id == sale.id)
        .scalar()
    ) or 0
    total_paid = max(
        (sale.paid_amount_cents or 0) + col_sum,
        sale.total_cents - (sale.remaining_amount_cents or 0)
    )
    if total_paid > sale.total_cents:
        total_paid = sale.total_cents
    effective_remaining = sale.total_cents - total_paid
    if effective_remaining == 0:
        effective_status = "Ödendi"
    elif total_paid > 0:
        effective_status = "Kısmi Ödendi"
    else:
        effective_status = "Bekliyor"
    return total_paid, effective_remaining, effective_status


@router.get("/today-summary")
def get_today_sales_summary(db: Session = Depends(get_db)):
    """
    Bugün oluşturulmuş aktif (iptal edilmemiş) satışların özetini döndürür:
    - total_count: Satış fişi adedi
    - total_amount_cents: Toplam ciro (kuruş)
    - paid_amount_cents: Tahsil edilen tutar (kuruş)
    - remaining_amount_cents: Kalan veresiye tutar (kuruş)
    - sales: Bugünün satış listesi (tarihe göre sıralı)
    """
    now = datetime.now()
    start_of_today = datetime(now.year, now.month, now.day, 0, 0, 0)
    end_of_today = datetime(now.year, now.month, now.day, 23, 59, 59)

    today_sales = (
        db.query(Sale)
        .filter(
            Sale.sale_date >= start_of_today,
            Sale.sale_date <= end_of_today,
            Sale.status == "Tamamlandı",
        )
        .order_by(Sale.sale_date.desc(), Sale.id.desc())
        .all()
    )

    total_count = len(today_sales)
    total_amount_cents = sum(s.total_cents for s in today_sales)

    items_summary = []
    total_paid_cents = 0
    total_remaining_cents = 0

    for s in today_sales:
        eff_paid, eff_remaining, eff_status = get_effective_sale_payment(s, db)
        total_paid_cents += eff_paid
        total_remaining_cents += eff_remaining
        items_summary.append({
            "id": s.id,
            "sale_number": s.sale_number,
            "customer_name": s.customer.name if s.customer else "Perakende Müşteri",
            "total_cents": s.total_cents,
            "paid_amount_cents": eff_paid,
            "remaining_amount_cents": eff_remaining,
            "payment_status": eff_status,
            "payment_method": s.payment_method,
            "sale_date": s.sale_date.isoformat(),
        })

    return {
        "date": start_of_today.strftime("%Y-%m-%d"),
        "total_count": total_count,
        "total_amount_cents": total_amount_cents,
        "paid_amount_cents": total_paid_cents,
        "remaining_amount_cents": total_remaining_cents,
        "sales": items_summary,
    }


@router.get("", response_model=List[SaleResponse])
def get_sales(
    search: Optional[str] = Query(None, description="Fiş no veya müşteri adına göre arama"),
    customer_id: Optional[int] = Query(None, description="Müşteri filtresi"),
    payment_status: Optional[str] = Query(None, description="Ödeme durumu filtresi"),
    db: Session = Depends(get_db),
):
    query = db.query(Sale)
    if customer_id:
        query = query.filter(Sale.customer_id == customer_id)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.outerjoin(Customer).filter(
            (Sale.sale_number.ilike(search_pattern))
            | (Customer.name.ilike(search_pattern))
            | (Customer.company_name.ilike(search_pattern))
        )

    sales = query.order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
    result = []
    for s in sales:
        eff_paid, eff_remaining, eff_status = get_effective_sale_payment(s, db)
        if payment_status and eff_status != payment_status:
            continue
        resp = SaleResponse(
            id=s.id,
            sale_number=s.sale_number,
            customer_id=s.customer_id,
            customer_name=s.customer.name if s.customer else ("Perakende Müşteri" if not s.customer_id else None),
            total_cents=s.total_cents,
            paid_amount_cents=eff_paid,
            remaining_amount_cents=eff_remaining,
            payment_status=eff_status,
            payment_method=s.payment_method,
            status=s.status,
            notes=s.notes,
            sale_date=s.sale_date,
            created_at=s.created_at,
            items=[SaleItemResponse.model_validate(item) for item in s.items],
        )
        result.append(resp)
    return result


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Satış kaydı bulunamadı")

    eff_paid, eff_remaining, eff_status = get_effective_sale_payment(sale, db)
    return SaleResponse(
        id=sale.id,
        sale_number=sale.sale_number,
        customer_id=sale.customer_id,
        customer_name=sale.customer.name if sale.customer else ("Perakende Müşteri" if not sale.customer_id else None),
        total_cents=sale.total_cents,
        paid_amount_cents=eff_paid,
        remaining_amount_cents=eff_remaining,
        payment_status=eff_status,
        payment_method=sale.payment_method,
        status=sale.status,
        notes=sale.notes,
        sale_date=sale.sale_date,
        created_at=sale.created_at,
        items=[SaleItemResponse.model_validate(item) for item in sale.items],
    )


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    """
    Satış oluşturma ve atomik stok yönetimi:
    - Tek bir transaction içinde çalışır.
    - Tüm kalemlerin stok miktarları kontrol edilir; herhangi biri yetersizse işlem geri alınır.
    - Ürün fiyatları ve ara toplamlar backend tarafında doğrulanır ve hesaplanır.
    - Kuruş hassasiyeti korunur.
    - Stoklar güncellenir.
    - Müşteri seçilmişse ve kalan borç varsa müşterinin bakiyesi ve cari hareketi güncellenir.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Satış fişinde en az bir ürün bulunmalıdır.")

    customer = None
    if payload.customer_id:
        customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Seçilen müşteri bulunamadı.")

    sale_number = payload.sale_number.strip() if payload.sale_number else generate_sale_number(db)
    existing_sale = db.query(Sale).filter(Sale.sale_number == sale_number).first()
    if existing_sale:
        raise HTTPException(
            status_code=400,
            detail=f"'{sale_number}' numaralı satış zaten kayıtlı. Mükerrer işlem engellendi.",
        )

    calculated_items = []
    total_cents = 0

    product_requested_qtys = {}
    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=422, detail="Ürün miktarı 0'dan büyük olmalıdır.")
        product_requested_qtys[item.product_id] = (
            product_requested_qtys.get(item.product_id, 0) + item.quantity
        )

    for product_id, total_qty in product_requested_qtys.items():
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"ID {product_id} olan ürün bulunamadı.")
        if not product.is_active:
            raise HTTPException(status_code=400, detail=f"'{product.name}' ürünü pasif durumda, satılamaz.")

        if product.current_stock < total_qty:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Yetersiz stok: '{product.name}' ürününden {total_qty} {product.unit} istendi, "
                    f"ancak mevcut stok yalnızca {product.current_stock} {product.unit}."
                ),
            )

    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        unit_price_cents = (
            item.unit_price_cents if item.unit_price_cents is not None else product.sale_price_cents
        )
        if unit_price_cents < 0:
            raise HTTPException(status_code=422, detail="Birim fiyat negatif olamaz.")

        line_total_cents = unit_price_cents * item.quantity
        total_cents += line_total_cents

        product.current_stock -= item.quantity

        calculated_items.append({
            "product_id": product.id,
            "product_name": product.name,
            "unit_price_cents": unit_price_cents,
            "quantity": item.quantity,
            "line_total_cents": line_total_cents,
        })

    paid_cents = payload.paid_amount_cents if payload.paid_amount_cents is not None else 0
    if paid_cents > total_cents:
        paid_cents = total_cents
    remaining_cents = total_cents - paid_cents

    if remaining_cents == 0:
        payment_status = "Ödendi"
    elif paid_cents > 0:
        payment_status = "Kısmi Ödendi"
    else:
        payment_status = "Bekliyor"

    sale_date = payload.sale_date or datetime.utcnow()

    sale = Sale(
        sale_number=sale_number,
        customer_id=payload.customer_id,
        total_cents=total_cents,
        paid_amount_cents=paid_cents,
        remaining_amount_cents=remaining_cents,
        payment_status=payment_status,
        payment_method=payload.payment_method or "Nakit",
        status="Tamamlandı",
        notes=payload.notes.strip() if payload.notes else None,
        sale_date=sale_date,
        created_at=datetime.utcnow(),
    )
    db.add(sale)
    db.flush()

    for c_item in calculated_items:
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=c_item["product_id"],
            product_name=c_item["product_name"],
            unit_price_cents=c_item["unit_price_cents"],
            quantity=c_item["quantity"],
            line_total_cents=c_item["line_total_cents"],
        )
        db.add(sale_item)

    if customer and remaining_cents > 0:
        customer.balance_cents += remaining_cents
        transaction = CustomerTransaction(
            customer_id=customer.id,
            transaction_type="SATIŞ",
            amount_cents=remaining_cents,
            balance_after_cents=customer.balance_cents,
            reference_id=sale.id,
            description=f"{sale.sale_number} nolu satıştan kalan borç",
            transaction_date=sale_date,
        )
        db.add(transaction)

    db.commit()
    db.refresh(sale)

    return SaleResponse(
        id=sale.id,
        sale_number=sale.sale_number,
        customer_id=sale.customer_id,
        customer_name=sale.customer.name if sale.customer else ("Perakende Müşteri" if not sale.customer_id else None),
        total_cents=sale.total_cents,
        paid_amount_cents=sale.paid_amount_cents,
        remaining_amount_cents=sale.remaining_amount_cents,
        payment_status=sale.payment_status,
        payment_method=sale.payment_method,
        status=sale.status,
        notes=sale.notes,
        sale_date=sale.sale_date,
        created_at=sale.created_at,
        items=[SaleItemResponse.model_validate(item) for item in sale.items],
    )


@router.post("/{sale_id}/cancel", response_model=SaleResponse)
def cancel_sale(sale_id: int, db: Session = Depends(get_db)):
    """
    Satışı iptal etme:
    - Zaten iptal edilmişse tekrar iptal edilemez (çift stok iadesi engellenir).
    - Satıştaki ürünler stoğa iade edilir.
    - Müşteri carisi düzeltilir.
    """
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Satış kaydı bulunamadı.")

    if sale.status == "İptal Edildi":
        raise HTTPException(status_code=400, detail="Bu satış zaten daha önce iptal edilmiştir.")

    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.current_stock += item.quantity

    if sale.customer_id and sale.remaining_amount_cents > 0:
        customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
        if customer:
            customer.balance_cents -= sale.remaining_amount_cents
            transaction = CustomerTransaction(
                customer_id=customer.id,
                transaction_type="SATIŞ_İPTAL",
                amount_cents=sale.remaining_amount_cents,
                balance_after_cents=customer.balance_cents,
                reference_id=sale.id,
                description=f"{sale.sale_number} nolu satış iptali",
                transaction_date=datetime.utcnow(),
            )
            db.add(transaction)

    sale.status = "İptal Edildi"
    db.commit()
    db.refresh(sale)

    return SaleResponse(
        id=sale.id,
        sale_number=sale.sale_number,
        customer_id=sale.customer_id,
        customer_name=sale.customer.name if sale.customer else ("Perakende Müşteri" if not sale.customer_id else None),
        total_cents=sale.total_cents,
        paid_amount_cents=sale.paid_amount_cents,
        remaining_amount_cents=sale.remaining_amount_cents,
        payment_status=sale.payment_status,
        payment_method=sale.payment_method,
        status=sale.status,
        notes=sale.notes,
        sale_date=sale.sale_date,
        created_at=sale.created_at,
        items=[SaleItemResponse.model_validate(item) for item in sale.items],
    )
