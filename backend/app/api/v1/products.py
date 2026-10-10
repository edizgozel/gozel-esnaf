from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Product
from backend.app.schemas.all_schemas import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
)

router = APIRouter(prefix="/products", tags=["Ürünler"])


@router.get("", response_model=List[ProductResponse])
def get_products(
    search: Optional[str] = Query(None, description="Ürün adı veya kodu ile arama"),
    category: Optional[str] = Query(None, description="Kategori filtresi"),
    is_active: Optional[bool] = Query(True, description="Sadece aktif olanları listele"),
    low_stock_only: Optional[bool] = Query(False, description="Sadece kritik stoktakiler"),
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    if category:
        query = query.filter(Product.category == category)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_pattern)) | (Product.code.ilike(search_pattern))
        )
    if low_stock_only:
        query = query.filter(Product.current_stock <= Product.min_stock_level)

    return query.order_by(Product.name.asc()).all()


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.code == payload.code.strip()).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"'{payload.code}' koduna sahip başka bir ürün zaten mevcut",
        )

    product = Product(
        code=payload.code.strip(),
        name=payload.name.strip(),
        category=payload.category.strip() if payload.category else None,
        cost_price_cents=payload.cost_price_cents,
        sale_price_cents=payload.sale_price_cents,
        current_stock=payload.current_stock,
        min_stock_level=payload.min_stock_level,
        unit=payload.unit.strip() if payload.unit else "Adet",
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        new_code = update_data["code"].strip()
        existing = (
            db.query(Product)
            .filter(Product.code == new_code, Product.id != product_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"'{new_code}' koduna sahip başka bir ürün zaten mevcut",
            )
        update_data["code"] = new_code

    for key, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(product_id: int, hard: bool = False, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    if hard:
        db.delete(product)
    else:
        product.is_active = False

    db.commit()
    return {"message": "Ürün başarıyla silindi", "id": product_id}

