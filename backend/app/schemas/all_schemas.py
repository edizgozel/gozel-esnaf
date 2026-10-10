from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr



class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Müşteri Ad Soyad")
    company_name: Optional[str] = Field(None, max_length=200, description="Firma Ünvanı")
    phone: Optional[str] = Field(None, max_length=50, description="Telefon Numarası")
    email: Optional[str] = Field(None, max_length=100, description="E-posta")
    address: Optional[str] = Field(None, description="Adres")
    tax_id: Optional[str] = Field(None, max_length=50, description="Vergi No / T.C.")


class CustomerCreate(CustomerBase):
    initial_balance_cents: Optional[int] = Field(0, description="Açılış bakiyesi (kuruş)")


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    company_name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None)
    tax_id: Optional[str] = Field(None, max_length=50)


class CustomerResponse(CustomerBase):
    id: int
    balance_cents: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



class ProductBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50, description="Ürün Kodu / Barkod")
    name: str = Field(..., min_length=1, max_length=200, description="Ürün Adı")
    category: Optional[str] = Field(None, max_length=100, description="Kategori")
    cost_price_cents: int = Field(0, ge=0, description="Alış Fiyatı (kuruş)")
    sale_price_cents: int = Field(0, ge=0, description="Satış Fiyatı (kuruş)")
    current_stock: int = Field(0, description="Mevcut Stok Miktarı")
    min_stock_level: int = Field(0, ge=0, description="Kritik Stok Seviyesi")
    unit: str = Field("Adet", max_length=20, description="Birim")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    cost_price_cents: Optional[int] = Field(None, ge=0)
    sale_price_cents: Optional[int] = Field(None, ge=0)
    current_stock: Optional[int] = Field(None)
    min_stock_level: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=20)


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



class SaleItemBase(BaseModel):
    product_id: int
    product_name: Optional[str] = None
    unit_price_cents: Optional[int] = Field(None, ge=0)
    quantity: int = Field(..., gt=0)
    line_total_cents: Optional[int] = Field(None, ge=0)


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price_cents: Optional[int] = Field(None, ge=0)  # None ise veritabanındaki satış fiyatı alınır


class SaleItemResponse(BaseModel):
    id: int
    sale_id: int
    product_id: int
    product_name: str
    unit_price_cents: int
    quantity: int
    line_total_cents: int

    class Config:
        from_attributes = True


class SaleBase(BaseModel):
    sale_number: Optional[str] = None
    customer_id: Optional[int] = None
    total_cents: Optional[int] = Field(0, ge=0)
    paid_amount_cents: Optional[int] = Field(0, ge=0)
    remaining_amount_cents: Optional[int] = Field(0, ge=0)
    payment_status: Optional[str] = Field("Ödendi")
    payment_method: Optional[str] = Field("Nakit")
    status: Optional[str] = Field("Tamamlandı")
    notes: Optional[str] = None
    sale_date: Optional[datetime] = None


class SaleCreate(BaseModel):
    sale_number: Optional[str] = None
    customer_id: Optional[int] = None
    paid_amount_cents: Optional[int] = Field(0, ge=0)
    payment_method: Optional[str] = Field("Nakit")
    notes: Optional[str] = None
    sale_date: Optional[datetime] = None
    items: List[SaleItemCreate] = Field(..., min_length=1)


class SaleResponse(BaseModel):
    id: int
    sale_number: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    total_cents: int
    paid_amount_cents: int
    remaining_amount_cents: int
    payment_status: str
    payment_method: str
    status: str
    notes: Optional[str] = None
    sale_date: datetime
    created_at: datetime
    items: List[SaleItemResponse] = []

    class Config:
        from_attributes = True



class ExpenseBase(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    amount_cents: int = Field(..., gt=0)
    payment_method: str = Field("Nakit", max_length=50)
    description: Optional[str] = None
    expense_date: Optional[datetime] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    amount_cents: Optional[int] = Field(None, gt=0)
    payment_method: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    expense_date: Optional[datetime] = None


class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True



class CollectionBase(BaseModel):
    customer_id: int
    sale_id: Optional[int] = None
    amount_cents: int = Field(..., gt=0)
    payment_method: str = Field("Nakit", max_length=50)
    notes: Optional[str] = None
    collection_date: Optional[datetime] = None


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(BaseModel):
    amount_cents: Optional[int] = Field(None, gt=0)
    payment_method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    collection_date: Optional[datetime] = None


class CollectionResponse(CollectionBase):
    id: int
    created_at: datetime
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True



class CustomerTransactionResponse(BaseModel):
    id: int
    customer_id: int
    transaction_type: str
    amount_cents: int
    balance_after_cents: int
    reference_id: Optional[int] = None
    description: Optional[str] = None
    transaction_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True



class SettingBase(BaseModel):
    business_name: Optional[str] = Field("", max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    currency_code: str = Field("TRY", max_length=10)
    currency_symbol: str = Field("₺", max_length=10)
    tax_id: Optional[str] = Field(None, max_length=50)
    note_footer: Optional[str] = None


class SettingUpdate(SettingBase):
    pass


class SettingResponse(SettingBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

