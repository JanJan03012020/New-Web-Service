from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Dict

from database import get_db
from models import Settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "cost_per_page": "2.0",
    "shop_name": "PisoNet Business",
    "currency": "PHP",
    "scan_interval_seconds": "30",
}


class SettingsUpdate(BaseModel):
    settings: Dict[str, str]


@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(Settings).all()
    result = dict(DEFAULT_SETTINGS)
    for row in rows:
        result[row.key] = row.value
    return result


@router.put("/")
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    for key, value in data.settings.items():
        row = db.query(Settings).filter(Settings.key == key).first()
        if row:
            row.value = value
            row.updated_at = datetime.utcnow()
        else:
            db.add(Settings(key=key, value=value))
    db.commit()
    return {"status": "ok"}
