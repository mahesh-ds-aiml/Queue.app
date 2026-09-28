import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import Base, get_db
from app.services.auth import hash_password
from app.models.user import User
from app.models.slot import Slot
from app.models.settings import ShopSettings

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create test owner & student
    owner = User(name="Test Owner", register_number="OWNER-1", email="owner@test.com", hashed_password=hash_password("owner123"), role="owner")
    student = User(name="Test Student", register_number="STUD-1", email="student@test.com", hashed_password=hash_password("student123"), role="student")
    db.add_all([owner, student])

    # Create slot
    slot = Slot(id=1, time_range="10:00 - 11:00 AM", max_orders=2, current_orders=0, is_active=True)
    db.add(slot)

    # Create settings
    settings = ShopSettings(bw_single_rate=2.0, bw_double_rate=1.5, color_single_rate=10.0, color_double_rate=8.0, a3_multiplier=2.0, seconds_per_page=4.0)
    db.add(settings)

    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

def get_auth_headers(email="student@test.com", password="student123"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_auth_flow():
    # Register new user
    res = client.post("/api/v1/auth/register", json={
        "name": "New Student",
        "register_number": "REG100",
        "email": "newstudent@test.com",
        "password": "password123",
        "role": "student"
    })
    assert res.status_code == 201
    assert res.json()["email"] == "newstudent@test.com"

    # Login
    res = client.post("/api/v1/auth/login", json={
        "email": "newstudent@test.com",
        "password": "password123"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()

def test_pricing_and_order_creation(tmp_path):
    headers = get_auth_headers()
    
    # Create dummy pdf file
    pdf_file = tmp_path / "test.pdf"
    pdf_file.write_bytes(b"%PDF-1.4 test dummy pdf content")

    file_options = [{
        "copies": 2,
        "is_color": False,
        "is_double_sided": False,
        "paper_size": "A4",
        "page_range": "all",
        "orientation": "portrait"
    }]

    with open(pdf_file, "rb") as f:
        res = client.post(
            "/api/v1/orders",
            headers=headers,
            data={
                "slot_id": 1,
                "notes": "Test order",
                "options": json_dumps(file_options)
            },
            files={"files": ("test.pdf", f, "application/pdf")}
        )
    
    assert res.status_code == 201
    data = res.json()
    assert data["token_number"] == "P-001"
    assert data["status"] == "Received"
    assert len(data["files"]) == 1

def json_dumps(obj):
    import json
    return json.dumps(obj)

def test_slot_capacity_blocking(tmp_path):
    headers = get_auth_headers()
    pdf_file = tmp_path / "test.pdf"
    pdf_file.write_bytes(b"%PDF-1.4 dummy")
    opts = json_dumps([{"copies": 1, "is_color": False, "is_double_sided": False, "paper_size": "A4", "page_range": "all", "orientation": "portrait"}])

    # Fill slot capacity (max_orders = 2)
    for _ in range(2):
        with open(pdf_file, "rb") as f:
            res = client.post("/api/v1/orders", headers=headers, data={"slot_id": 1, "options": opts}, files={"files": ("test.pdf", f, "application/pdf")})
            assert res.status_code == 201

    # 3rd order should fail with slot full error
    with open(pdf_file, "rb") as f:
        res = client.post("/api/v1/orders", headers=headers, data={"slot_id": 1, "options": opts}, files={"files": ("test.pdf", f, "application/pdf")})
        assert res.status_code == 400
        assert "slot is full" in res.json()["detail"].lower()

def test_predict_wait_endpoint():
    res = client.get("/api/v1/predict-wait?pages_count=10")
    assert res.status_code == 200
    data = res.json()
    assert "estimated_seconds" in data
    assert "queue_status" in data
    assert data["model_used"] in ["scikit-learn (RandomForest)", "formula"]
