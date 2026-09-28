from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.slot import Slot
from app.schemas import SlotResponse, SlotCreate, SlotUpdate
from app.services.auth import require_owner

router = APIRouter(prefix="/slots", tags=["Slots"])

@router.get("", response_model=List[SlotResponse])
def get_slots(db: Session = Depends(get_db)):
    slots = db.query(Slot).order_by(Slot.id.asc()).all()
    return slots

@router.post("", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
def create_slot(slot_in: SlotCreate, db: Session = Depends(get_db), owner=Depends(require_owner)):
    existing = db.query(Slot).filter(Slot.time_range == slot_in.time_range).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slot time range already exists")
    
    slot = Slot(
        time_range=slot_in.time_range,
        max_orders=slot_in.max_orders,
        is_active=slot_in.is_active
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot

@router.patch("/{slot_id}", response_model=SlotResponse)
def update_slot(slot_id: int, slot_in: SlotUpdate, db: Session = Depends(get_db), owner=Depends(require_owner)):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    if slot_in.time_range is not None:
        slot.time_range = slot_in.time_range
    if slot_in.max_orders is not None:
        slot.max_orders = slot_in.max_orders
    if slot_in.is_active is not None:
        slot.is_active = slot_in.is_active

    db.commit()
    db.refresh(slot)
    return slot
