from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Collection, Customer, CustomerTransaction
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

    db.delete(collection)
    db.commit()
    return {"message": "Tahsilat kaydı başarıyla silindi ve cari bakiye düzeltildi", "id": collection_id}
