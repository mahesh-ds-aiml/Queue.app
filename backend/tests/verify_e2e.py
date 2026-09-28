import httpx
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_e2e_flow():
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    print("Step 1: Student registration & login...")
    email = "teststudent_e2e@printq.edu"
    password = "studentpassword123"
    
    # Try register first
    reg_res = client.post("/auth/register", json={
        "name": "E2E Test Student",
        "register_number": "E2E-2026",
        "email": email,
        "password": password,
        "role": "student"
    })
    
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("✅ Student registered & logged in successfully.")

    print("Step 2: Fetch available slots...")
    res = client.get("/slots")
    slots = res.json()
    assert len(slots) > 0
    slot_id = slots[0]["id"]
    print(f"✅ Selected slot ID {slot_id} ({slots[0]['time_range']}).")

    print("Step 3: Submit new order with document upload...")
    options_data = [{
        "copies": 2,
        "is_color": False,
        "is_double_sided": True,
        "paper_size": "A4",
        "page_range": "all",
        "orientation": "portrait"
    }]
    
    files = {"files": ("test_assignment.pdf", b"%PDF-1.4 sample test student PDF content for printing", "application/pdf")}
    data = {
        "slot_id": str(slot_id),
        "notes": "E2E verification test order",
        "options": json.dumps(options_data)
    }
    
    res = client.post("/orders", headers=student_headers, data=data, files=files)
    assert res.status_code == 201, f"Order creation failed: {res.text}"
    order = res.json()
    order_id = order["id"]
    token_num = order["token_number"]
    assert order["status"] == "Received"
    print(f"✅ Order placed successfully! Token: {token_num} (Order ID: {order_id}), Total Price: ₹{order['total_price']:.2f}")

    print("Step 4: Owner registration/login...")
    owner_email = "owner_e2e@printq.edu"
    owner_pwd = "ownerpassword123"
    client.post("/auth/register", json={
        "name": "Shop Owner E2E",
        "register_number": "OWNER-99",
        "email": owner_email,
        "password": owner_pwd,
        "role": "owner"
    })
    res = client.post("/auth/login", json={"email": owner_email, "password": owner_pwd})
    assert res.status_code == 200
    owner_token = res.json()["access_token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    print("✅ Owner registered & logged in successfully.")

    print("Step 5: Owner moves status to 'Printing'...")
    res = client.patch(f"/owner/orders/{order_id}/status", headers=owner_headers, json={"status": "Printing"})
    assert res.status_code == 200
    assert res.json()["status"] == "Printing"
    print("✅ Order status updated to 'Printing'.")

    print("Step 6: Owner moves status to 'Ready'...")
    res = client.patch(f"/owner/orders/{order_id}/status", headers=owner_headers, json={"status": "Ready"})
    assert res.status_code == 200
    assert res.json()["status"] == "Ready"
    print("✅ Order status updated to 'Ready'.")

    print("Step 7: Student verifies order status is 'Ready'...")
    res = client.get("/orders/my", headers=student_headers)
    assert res.status_code == 200
    my_orders = res.json()
    target_order = next((o for o in my_orders if o["id"] == order_id), None)
    assert target_order is not None
    assert target_order["status"] == "Ready"
    print(f"✅ Student confirmed order {token_num} is READY FOR PICKUP!")

    print("\n🎉 FULL END-TO-END VERIFICATION PASSED PERFECTLY!")

if __name__ == "__main__":
    test_e2e_flow()
