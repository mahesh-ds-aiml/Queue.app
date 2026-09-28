from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    register_number: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=4)
    role: Optional[str] = "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    register_number: Optional[str] = None
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Slot Schemas
class SlotCreate(BaseModel):
    time_range: str
    max_orders: int = 10
    is_active: bool = True

class SlotUpdate(BaseModel):
    time_range: Optional[str] = None
    max_orders: Optional[int] = None
    is_active: Optional[bool] = None

class SlotResponse(BaseModel):
    id: int
    time_range: str
    max_orders: int
    current_orders: int
    is_active: bool

    class Config:
        from_attributes = True

# Settings Schemas
class ShopSettingsSchema(BaseModel):
    id: int
    bw_single_rate: float
    bw_double_rate: float
    color_single_rate: float
    color_double_rate: float
    a3_multiplier: float
    seconds_per_page: float

    class Config:
        from_attributes = True

class ShopSettingsUpdate(BaseModel):
    bw_single_rate: Optional[float] = None
    bw_double_rate: Optional[float] = None
    color_single_rate: Optional[float] = None
    color_double_rate: Optional[float] = None
    a3_multiplier: Optional[float] = None
    seconds_per_page: Optional[float] = None

# Order File Schemas
class OrderFileOptions(BaseModel):
    copies: int = 1
    is_color: bool = False
    is_double_sided: bool = False
    paper_size: str = "A4"       # A4 or A3
    page_range: str = "all"
    orientation: str = "portrait"

class OrderFileResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    page_count: int
    copies: int
    is_color: bool
    is_double_sided: bool
    paper_size: str
    page_range: str
    orientation: str
    file_price: float

    class Config:
        from_attributes = True

# Order Schemas
class OrderCreate(BaseModel):
    slot_id: int
    notes: Optional[str] = None
    # Files will be uploaded via multipart form alongside file options JSON string

class ManualOrderCreate(BaseModel):
    customer_name: str
    customer_reg: Optional[str] = None
    slot_id: Optional[int] = None
    notes: Optional[str] = None
    copies: int = 1
    page_count: int = 1
    is_color: bool = False
    is_double_sided: bool = False
    paper_size: str = "A4"

class OrderStatusUpdate(BaseModel):
    status: str  # Received, Printing, Ready, Collected, Cancelled

class OrderResponse(BaseModel):
    id: int
    token_number: str
    user_id: Optional[int] = None
    user_name: str
    user_reg: Optional[str] = None
    slot_id: Optional[int] = None
    slot_time: Optional[str] = None
    status: str
    total_price: float
    is_manual: bool
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    files: List[OrderFileResponse] = []

    class Config:
        from_attributes = True

# Wait Time Prediction
class WaitTimeResponse(BaseModel):
    estimated_seconds: float
    estimated_minutes: int
    queue_length: int
    pages_ahead: int
    queue_status: str  # Free, Moderate, Busy
    model_used: str    # "scikit-learn" or "formula"
