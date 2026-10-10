from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, index=True)
    company_name = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    tax_id = Column(String(50), nullable=True)
    balance_cents = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sales = relationship("Sale", back_populates="customer", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="customer", cascade="all, delete-orphan")
    transactions = relationship("CustomerTransaction", back_populates="customer", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False, index=True)
    category = Column(String(100), nullable=True, index=True)
    cost_price_cents = Column(Integer, default=0, nullable=False)
    sale_price_cents = Column(Integer, default=0, nullable=False)
    current_stock = Column(Integer, default=0, nullable=False)
    min_stock_level = Column(Integer, default=0, nullable=False)
    unit = Column(String(20), default="Adet", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sale_items = relationship("SaleItem", back_populates="product")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sale_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    total_cents = Column(Integer, default=0, nullable=False)
    paid_amount_cents = Column(Integer, default=0, nullable=False)
    remaining_amount_cents = Column(Integer, default=0, nullable=False)
    payment_status = Column(String(50), default="Ödendi", nullable=False)
    payment_method = Column(String(50), default="Nakit", nullable=False)
    status = Column(String(50), default="Tamamlandı", nullable=False)
    notes = Column(Text, nullable=True)
    sale_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="sale")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    product_name = Column(String(200), nullable=False)
    unit_price_cents = Column(Integer, default=0, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    line_total_cents = Column(Integer, default=0, nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category = Column(String(100), nullable=False, index=True)
    amount_cents = Column(Integer, nullable=False)
    payment_method = Column(String(50), default="Nakit", nullable=False)
    description = Column(Text, nullable=True)
    expense_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="SET NULL"), nullable=True)
    amount_cents = Column(Integer, nullable=False)
    payment_method = Column(String(50), default="Nakit", nullable=False)
    notes = Column(Text, nullable=True)
    collection_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="collections")
    sale = relationship("Sale", back_populates="collections")


class CustomerTransaction(Base):
    __tablename__ = "customer_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    transaction_type = Column(String(50), nullable=False)
    amount_cents = Column(Integer, nullable=False)
    balance_after_cents = Column(Integer, nullable=False)
    reference_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    transaction_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="transactions")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    business_name = Column(String(200), default="", nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    currency_code = Column(String(10), default="TRY", nullable=False)
    currency_symbol = Column(String(10), default="₺", nullable=False)
    tax_id = Column(String(50), nullable=True)
    note_footer = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

