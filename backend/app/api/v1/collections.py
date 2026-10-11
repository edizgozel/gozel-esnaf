from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.models.all_models import Collection, Customer, CustomerTransaction, Sale
from backend.app.schemas.all_schemas import CollectionCreate, CollectionUpdate, CollectionResponse

router = APIRouter(prefix="/collections", tags=["Tahsilatlar"])


@router.get("", response_model=List[CollectionResponse])
def get_collections(
    customer_id: Optional[int] = Query(None, description="Müşteri filtresi"),
    start_date: Optional[str] = Query(None, description="Başlangıç tarihi (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Bitiş tarihi (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    query = db.query(Collection)
    if customer_id:
        query = query.filter(Collection.customer_id == customer_id)
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Collection.collection_date >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(Collection.collection_date <= ed)
        except ValueError:
            pass

    collections = query.order_by(Collection.collection_date.desc(), Collection.id.desc()).all()
    result = []
    for c in collections:
        resp = CollectionResponse.model_validate(c)
        if c.customer:
            resp.customer_name = c.customer.name
        result.append(resp)
    return result


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(collection_id: int, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Tahsilat kaydı bulunamadı.")
    resp = CollectionResponse.model_validate(collection)
    if collection.customer:
        resp.customer_name = collection.customer.name
    return resp


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(payload: CollectionCreate, db: Session = Depends(get_db)):
    """
    Tahsilat oluşturma ve cari bakiye güncellemesi:
    - Atomik transaction içinde çalışır.
    - Müşteri bulunur ve bakiyesi düşülür (alacak).
    - Mükerrer tıklamayı önlemek için aynı müşteri, aynı tutar ve son 5 saniyedeki kayıtlar kontrol edilir.
    - CustomerTransaction kaydı eklenir.
    """
    if payload.amount_cents <= 0:
        raise HTTPException(status_code=422, detail="Tahsilat tutarı 0'dan büyük olmalıdır.")

    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Seçilen müşteri bulunamadı.")

    if customer.balance_cents <= 0:
        raise HTTPException(
            status_code=400,
            detail="Müşterinin borcu bulunmamaktadır. Tahsilat kaydedilemez.",
        )

    if payload.amount_cents > customer.balance_cents:
        remaining_tl = f"{customer.balance_cents / 100:.2f}".replace(".", ",")
        entered_tl = f"{payload.amount_cents / 100:.2f}".replace(".", ",")
        raise HTTPException(
            status_code=400,
            detail=f"Tahsilat tutarı ({entered_tl} ₺) müşterinin kalan borcundan ({remaining_tl} ₺) fazla olamaz.",
        )

    col_date = payload.collection_date or datetime.utcnow()

    recent_duplicate = (
        db.query(Collection)
        .filter(
            Collection.customer_id == payload.customer_id,
            Collection.amount_cents == payload.amount_cents,
            Collection.notes == (payload.notes.strip() if payload.notes else None),
        )
        .order_by(Collection.created_at.desc())
        .first()
    )
    if recent_duplicate and (datetime.utcnow() - recent_duplicate.created_at).total_seconds() < 5:
        raise HTTPException(
            status_code=400,
            detail="Bu tahsilat işlemi çok kısa süre önce zaten kaydedildi. Mükerrer istek engellendi.",
        )

    collection = Collection(
        customer_id=payload.customer_id,
        sale_id=payload.sale_id,
        amount_cents=payload.amount_cents,
        payment_method=payload.payment_method.strip(),
        notes=payload.notes.strip() if payload.notes else None,
        collection_date=col_date,
        created_at=datetime.utcnow(),
    )
    db.add(collection)
    db.flush()

    customer.balance_cents -= payload.amount_cents

    transaction = CustomerTransaction(
        customer_id=customer.id,
        transaction_type="TAHSİLAT",
        amount_cents=payload.amount_cents,
        balance_after_cents=customer.balance_cents,
        reference_id=collection.id,
        description=payload.notes or "Müşteriden tahsilat alındı",
        transaction_date=col_date,
    )
    db.add(transaction)

    if payload.sale_id:
        target_sale = db.query(Sale).filter(Sale.id == payload.sale_id).first()
        if target_sale and target_sale.status == "Tamamlandı" and target_sale.remaining_amount_cents > 0:
            deduct_amt = min(payload.amount_cents, target_sale.remaining_amount_cents)
            target_sale.remaining_amount_cents -= deduct_amt
            if target_sale.remaining_amount_cents == 0:
                target_sale.payment_status = "Ödendi"
            else:
                target_sale.payment_status = "Kısmi Ödendi"
    else:
        pending_sales = (
            db.query(Sale)
            .filter(
                Sale.customer_id == customer.id,
                Sale.status == "Tamamlandı",
                Sale.remaining_amount_cents > 0,
            )
            .order_by(Sale.sale_date.asc(), Sale.id.asc())
            .all()
        )
        remaining_to_allocate = payload.amount_cents
        for s in pending_sales:
            if remaining_to_allocate <= 0:
                break
            deduct = min(remaining_to_allocate, s.remaining_amount_cents)
            s.remaining_amount_cents -= deduct
            remaining_to_allocate -= deduct
            if s.remaining_amount_cents == 0:
                s.payment_status = "Ödendi"
            else:
                s.payment_status = "Kısmi Ödendi"

    db.commit()
    db.refresh(collection)

    resp = CollectionResponse.model_validate(collection)
    resp.customer_name = customer.name
    return resp


@router.delete("/{collection_id}", status_code=status.HTTP_200_OK)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    """
    Tahsilatı iptal etme / silme:
    - Atomik transaction içinde çalışır.
    - Cari bakiye yalnızca bir kez eski haline getirilir.
    - İptal hareketi (TAHSİLAT_İPTAL) eklenir.
    """
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Tahsilat kaydı bulunamadı.")

    customer = collection.customer
    if customer:
        customer.balance_cents += collection.amount_cents
        transaction = CustomerTransaction(
            customer_id=customer.id,
            transaction_type="TAHSİLAT_İPTAL",
            amount_cents=collection.amount_cents,
            balance_after_cents=customer.balance_cents,
            reference_id=collection.id,
            description=f"Tahsilat silindi/iptal edildi (Makbuz #{collection.id})",
            transaction_date=datetime.utcnow(),
        )
        db.add(transaction)

        if collection.sale_id:
            target_sale = db.query(Sale).filter(Sale.id == collection.sale_id).first()
            if target_sale and target_sale.status == "Tamamlandı":
                max_restore = target_sale.total_cents - target_sale.paid_amount_cents
                target_sale.remaining_amount_cents = min(max_restore, target_sale.remaining_amount_cents + collection.amount_cents)
                if target_sale.remaining_amount_cents == 0:
                    target_sale.payment_status = "Ödendi"
                elif target_sale.remaining_amount_cents < target_sale.total_cents:
                    target_sale.payment_status = "Kısmi Ödendi"
                else:
                    target_sale.payment_status = "Bekliyor"
        else:
            recent_sales = (
                db.query(Sale)
                .filter(
                    Sale.customer_id == customer.id,
                    Sale.status == "Tamamlandı",
                )
                .order_by(Sale.sale_date.desc(), Sale.id.desc())
                .all()
            )
            remaining_to_restore = collection.amount_cents
            for s in recent_sales:
                if remaining_to_restore <= 0:
                    break
                max_can_restore = (s.total_cents - s.paid_amount_cents) - s.remaining_amount_cents
                if max_can_restore > 0:
                    restore_amt = min(remaining_to_restore, max_can_restore)
                    s.remaining_amount_cents += restore_amt
                    remaining_to_restore -= restore_amt
                    if s.remaining_amount_cents == 0:
                        s.payment_status = "Ödendi"
                    elif s.remaining_amount_cents < s.total_cents:
                        s.payment_status = "Kısmi Ödendi"
                    else:
                        s.payment_status = "Bekliyor"

    db.delete(collection)
    db.commit()
    return {"message": "Tahsilat kaydı başarıyla silindi ve cari bakiye düzeltildi", "id": collection_id}
