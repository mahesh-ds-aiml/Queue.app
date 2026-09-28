from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class OrderFile(Base):
    __tablename__ = "order_files"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    filename = Column(String(255), nullable=False)        # Saved server filename
    original_name = Column(String(255), nullable=False)   # User uploaded name
    page_count = Column(Integer, default=1)
    copies = Column(Integer, default=1)
    is_color = Column(Boolean, default=False)
    is_double_sided = Column(Boolean, default=False)
    paper_size = Column(String(10), default="A4")         # A4, A3
    page_range = Column(String(50), default="all")         # "all" or "1-5", "2,4,6"
    orientation = Column(String(20), default="portrait")  # portrait, landscape
    file_price = Column(Float, default=0.0)

    order = relationship("Order", back_populates="files")
