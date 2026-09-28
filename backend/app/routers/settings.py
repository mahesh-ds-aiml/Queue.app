from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.settings import ShopSettings
from app.schemas import ShopSettingsSchema, ShopSettingsUpdate
from app.services.auth import require_owner

router = APIRouter(prefix="/settings", tags=["Settings"])

def get_or_create_settings(db: Session) -> ShopSettings:
    settings_obj = db.query(ShopSettings).first()
    if not settings_obj:
        settings_obj = ShopSettings()
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
    return settings_obj

@router.get("", response_model=ShopSettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)

@router.put("", response_model=ShopSettingsSchema)
def update_settings(settings_in: ShopSettingsUpdate, db: Session = Depends(get_db), owner=Depends(require_owner)):
    settings_obj = get_or_create_settings(db)
    
    for field, value in settings_in.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(settings_obj, field, value)

    db.commit()
    db.refresh(settings_obj)
    return settings_obj
