from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import CustomerTransaction
from backend.app.schemas.all_schemas import CustomerTransactionResponse

router = APIRouter(prefix="/transactions", tags=["Cari Hareketler"])


@router.get("", response_model=List[CustomerTransactionResponse])
def get_transactions(
    customer_id: Optional[int] = Query(None, description="Müşteri filtresi"),
    transaction_type: Optional[str] = Query(None, description="Hareket türü"),
    db: Session = Depends(get_db),
):
    query = db.query(CustomerTransaction)
    if customer_id:
        query = query.filter(CustomerTransaction.customer_id == customer_id)
    if transaction_type:
        query = query.filter(CustomerTransaction.transaction_type == transaction_type)

    return query.order_by(CustomerTransaction.transaction_date.desc(), CustomerTransaction.id.desc()).all()

