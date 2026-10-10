from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Customer, CustomerTransaction
from backend.app.schemas.all_schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerTransactionResponse,
)

router = APIRouter(prefix="/customers", tags=["Müşteriler"])


@router.get("", response_model=List[CustomerResponse])
def get_customers(
    search: Optional[str] = Query(None, description="İsim, firma veya telefon ile arama"),
    is_active: Optional[bool] = Query(True, description="Sadece aktif olanları listele"),
    db: Session = Depends(get_db),
):
    query = db.query(Customer)
    if is_active is not None:
        query = query.filter(Customer.is_active == is_active)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(search_pattern))
            | (Customer.company_name.ilike(search_pattern))
            | (Customer.phone.ilike(search_pattern))
        )
    return query.order_by(Customer.name.asc()).all()


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(
        name=payload.name.strip(),
        company_name=payload.company_name.strip() if payload.company_name else None,
        phone=payload.phone.strip() if payload.phone else None,
        email=payload.email.strip() if payload.email else None,
        address=payload.address.strip() if payload.address else None,
        tax_id=payload.tax_id.strip() if payload.tax_id else None,
        balance_cents=payload.initial_balance_cents or 0,
        is_active=True,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    if payload.initial_balance_cents and payload.initial_balance_cents != 0:
        transaction = CustomerTransaction(
            customer_id=customer.id,
            transaction_type="AÇILIŞ_BAKİYESİ",
            amount_cents=payload.initial_balance_cents,
            balance_after_cents=payload.initial_balance_cents,
            description="Müşteri kartı açılış bakiyesi",
        )
        db.add(transaction)
        db.commit()

    return customer


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(customer, key, value)

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_200_OK)
def delete_customer(customer_id: int, hard: bool = False, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    if hard:
        db.delete(customer)
    else:
        customer.is_active = False

    db.commit()
    return {"message": "Müşteri başarıyla silindi", "id": customer_id}


@router.get("/{customer_id}/transactions", response_model=List[CustomerTransactionResponse])
def get_customer_transactions(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    return (
        db.query(CustomerTransaction)
        .filter(CustomerTransaction.customer_id == customer_id)
        .order_by(CustomerTransaction.transaction_date.desc(), CustomerTransaction.id.desc())
        .all()
    )

