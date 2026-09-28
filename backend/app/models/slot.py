from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    time_range = Column(String(50), nullable=False, unique=True)  # e.g., "09:00 - 10:00"
    max_orders = Column(Integer, default=10)
    current_orders = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    orders = relationship("Order", back_populates="slot")
