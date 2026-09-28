from sqlalchemy import Column, Integer, Float
from app.database import Base

class ShopSettings(Base):
    __tablename__ = "shop_settings"

    id = Column(Integer, primary_key=True, index=True)
    bw_single_rate = Column(Float, default=2.0)     # ₹2.00 per page B&W single sided
    bw_double_rate = Column(Float, default=1.5)     # ₹1.50 per page side B&W double sided (discounted rate per side)
    color_single_rate = Column(Float, default=10.0) # ₹10.00 per page Color single sided
    color_double_rate = Column(Float, default=8.0)  # ₹8.00 per page side Color double sided
    a3_multiplier = Column(Float, default=2.0)      # A3 paper costs 2x
    seconds_per_page = Column(Float, default=4.0)   # Default estimate 4 sec per page printed
