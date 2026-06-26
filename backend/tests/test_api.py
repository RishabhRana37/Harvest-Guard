import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import app
from db.connection import db_manager

# Ensure client is initialized with lifecycle context manager
@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def green_leaf_file():
    """Generates a mock green leaf image in memory."""
    img = Image.new("RGB", (100, 100), (34, 139, 34))  # Forest Green
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

@pytest.fixture
def non_leaf_file():
    """Generates a gray image in memory (should fail OOD leaf check)."""
    img = Image.new("RGB", (100, 100), (120, 120, 120))  # Gray
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert "db" in data

def test_list_diseases(client):
    response = client.get("/api/v1/diseases")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) > 0
    # Verify shape
    item = data["items"][0]
    assert "slug" in item
    assert "crop" in item
    assert "name" in item
    assert "treatments" in item

def test_list_diseases_filter(client):
    response = client.get("/api/v1/diseases?crop=Tomato")
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["crop"] == "Tomato"

def test_get_disease_by_slug(client):
    # Valid slug
    response = client.get("/api/v1/diseases/tomato-early-blight")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "tomato-early-blight"
    assert data["crop"] == "Tomato"
    assert "pathogen" in data
    
    # Invalid slug
    response = client.get("/api/v1/diseases/non-existent-disease")
    assert response.status_code == 404

def test_diagnose_endpoint_valid_leaf(client, green_leaf_file):
    device_id = "test-device-uuid-123"
    files = {"image": ("leaf.jpg", green_leaf_file, "image/jpeg")}
    data = {"crop_hint": "tomato"}
    headers = {"X-Device-Id": device_id}
    
    response = client.post(
        "/api/v1/diagnose",
        files=files,
        data=data,
        headers=headers
    )
    assert response.status_code == 200
    res_data = response.json()
    
    assert res_data["is_leaf"] is True
    assert res_data["scan_id"].startswith("scan_")
    assert res_data["confidence"] > 0
    assert res_data["confidence_band"] in ["high", "medium", "low"]
    assert res_data["severity"] in ["healthy", "mild", "severe"]
    assert "top_k" in res_data
    assert len(res_data["top_k"]) > 0
    
    if res_data["severity"] != "healthy":
        assert res_data["heatmap"].startswith("data:image/png;base64,")
        assert res_data["disease"] is not None
        assert res_data["urgency_days"] is not None
    else:
        assert res_data["heatmap"] is None
        assert res_data["disease"]["is_healthy"] is True

def test_diagnose_endpoint_ood_rejection(client, non_leaf_file):
    device_id = "test-device-uuid-123"
    files = {"image": ("wall.jpg", non_leaf_file, "image/jpeg")}
    headers = {"X-Device-Id": device_id}
    
    response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["is_leaf"] is False
    assert res_data["prediction"] is None
    assert res_data["heatmap"] is None
    assert res_data["disease"] is None

def test_scan_history_and_feedback(client, green_leaf_file):
    device_id = "history-test-device"
    headers = {"X-Device-Id": device_id}
    
    # 1. Submit a scan first to populate history
    files = {"image": ("leaf.jpg", green_leaf_file, "image/jpeg")}
    diag_response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )
    assert diag_response.status_code == 200
    scan_id = diag_response.json()["scan_id"]
    
    # 2. Fetch history
    history_response = client.get("/api/v1/scans", headers=headers)
    assert history_response.status_code == 200
    history_data = history_response.json()
    assert history_data["total"] >= 1
    assert history_data["items"][0]["scan_id"] == scan_id
    
    # 3. Retrieve single scan details
    detail_response = client.get(f"/api/v1/scans/{scan_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["scan_id"] == scan_id
    
    # 4. Submit feedback
    feedback_data = {
        "scan_id": scan_id,
        "agreed": True,
        "note": "Looked correct!"
    }
    fb_response = client.post("/api/v1/feedback", json=feedback_data, headers=headers)
    assert fb_response.status_code == 201
    assert fb_response.json()["received"] is True
    assert "feedback_id" in fb_response.json()
