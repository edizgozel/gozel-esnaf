from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Expense
from backend.app.schemas.all_schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse

router = APIRouter(prefix="/expenses", tags=["Giderler"])


@router.get("", response_model=List[ExpenseResponse])
def get_expenses(
    category: Optional[str] = Query(None, description="Kategori filtresi"),
    start_date: Optional[str] = Query(None, description="Başlangıç tarihi (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Bitiş tarihi (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    query = db.query(Expense)
    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Expense.expense_date >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(Expense.expense_date <= ed)
        except ValueError:
            pass

    return query.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gider kaydı bulunamadı.")
    return expense


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    if payload.amount_cents <= 0:
        raise HTTPException(status_code=422, detail="Gider tutarı 0'dan büyük olmalıdır.")

    expense = Expense(
        category=payload.category.strip(),
        amount_cents=payload.amount_cents,
        payment_method=payload.payment_method.strip(),
        description=payload.description.strip() if payload.description else None,
        expense_date=payload.expense_date or datetime.utcnow(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gider kaydı bulunamadı.")

    update_data = payload.model_dump(exclude_unset=True)
    if "amount_cents" in update_data and update_data["amount_cents"] is not None:
        if update_data["amount_cents"] <= 0:
            raise HTTPException(status_code=422, detail="Gider tutarı 0'dan büyük olmalıdır.")
        expense.amount_cents = update_data["amount_cents"]

    if "category" in update_data and update_data["category"]:
        expense.category = update_data["category"].strip()

    if "payment_method" in update_data and update_data["payment_method"]:
        expense.payment_method = update_data["payment_method"].strip()

    if "description" in update_data:
        expense.description = update_data["description"].strip() if update_data["description"] else None

    if "expense_date" in update_data and update_data["expense_date"]:
        expense.expense_date = update_data["expense_date"]

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_200_OK)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gider kaydı bulunamadı.")
    db.delete(expense)
    db.commit()
    return {"message": "Gider kaydı başarıyla silindi", "id": expense_id}
