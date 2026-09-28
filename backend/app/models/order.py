from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String(20), nullable=False, index=True)  # e.g., P-001
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null if walk-in manual order
    user_name = Column(String(100), nullable=False)
    user_reg = Column(String(50), nullable=True)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=True)
    status = Column(String(30), default="Received", index=True)  # Received, Printing, Ready, Collected, Cancelled
    total_price = Column(Float, default=0.0)
    is_manual = Column(Boolean, default=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="orders")
    slot = relationship("Slot", back_populates="orders")
    files = relationship("OrderFile", back_populates="order", cascade="all, delete-orphan")
