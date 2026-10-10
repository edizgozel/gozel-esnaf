from fastapi import APIRouter
from backend.app.api.v1.customers import router as customers_router
from backend.app.api.v1.products import router as products_router
from backend.app.api.v1.sales import router as sales_router
from backend.app.api.v1.expenses import router as expenses_router
from backend.app.api.v1.collections import router as collections_router
from backend.app.api.v1.transactions import router as transactions_router
from backend.app.api.v1.settings import router as settings_router
from backend.app.api.v1.reports import router as reports_router
from backend.app.api.v1.backup import router as backup_router
from backend.app.api.v1.export import router as export_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(customers_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(sales_router)
api_v1_router.include_router(expenses_router)
api_v1_router.include_router(collections_router)
api_v1_router.include_router(transactions_router)
api_v1_router.include_router(settings_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(backup_router)
api_v1_router.include_router(export_router)


