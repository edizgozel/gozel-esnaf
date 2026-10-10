from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Setting
from backend.app.schemas.all_schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/settings", tags=["Ayarlar"])


@router.get("", response_model=SettingResponse)
def get_settings(db: Session = Depends(get_db)):
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting(
            business_name="",
            currency_code="TRY",
            currency_symbol="₺",
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.put("", response_model=SettingResponse)
def update_settings(payload: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting(
            business_name="",
            currency_code="TRY",
            currency_symbol="₺",
        )
        db.add(setting)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(setting, key, value)

    db.commit()
    db.refresh(setting)
    return setting
