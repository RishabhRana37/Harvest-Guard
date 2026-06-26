import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.config import settings

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def valid_image():
    """Generates a simple green image in memory."""
    img = Image.new("RGB", (100, 100), (34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is False
    assert data["db"] in ["connected", "down"]
    assert data["version"] == settings.VERSION

def test_diagnose_valid_request(client, valid_image):
    headers = {"X-Device-Id": "test-device-uuid"}
    files = {"image": ("leaf.jpg", valid_image, "image/jpeg")}
    data = {"crop_hint": "tomato"}
    
    response = client.post(
        "/api/v1/diagnose",
        files=files,
        data=data,
        headers=headers
    )
    
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["scan_id"] == "scan_mock_123"
    assert res_data["is_leaf"] is True
    assert res_data["confidence"] == 0.87
    assert res_data["confidence_band"] == "high"
    assert res_data["severity"] == "mild"
    assert res_data["urgency_days"] == 3
    assert res_data["prediction"]["slug"] == "tomato-early-blight"
    assert len(res_data["top_k"]) > 0
    assert res_data["heatmap"].startswith("data:image/png;base64,")
    assert res_data["disease"]["slug"] == "tomato-early-blight"
    assert "X-Request-Id" in response.headers

def test_diagnose_missing_device_id(client, valid_image):
    files = {"image": ("leaf.jpg", valid_image, "image/jpeg")}
    
    response = client.post(
        "/api/v1/diagnose",
        files=files
    )
    
    # Missing header triggers a 422 ValidationError formatted as standard envelope
    assert response.status_code == 422
    res_data = response.json()
    assert "error" in res_data
    assert res_data["error"]["code"] == "INVALID_IMAGE"
    assert "X-Device-Id" in res_data["error"]["message"]
    assert res_data["error"]["request_id"].startswith("req_")

def test_diagnose_unsupported_media(client):
    headers = {"X-Device-Id": "test-device-uuid"}
    # Using text/plain mime type
    files = {"image": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    
    response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )
    
    assert response.status_code == 415
    res_data = response.json()
    assert "error" in res_data
    assert res_data["error"]["code"] == "UNSUPPORTED_MEDIA"
    assert res_data["error"]["request_id"].startswith("req_")

def test_diagnose_image_too_large(client):
    headers = {"X-Device-Id": "test-device-uuid"}
    # Constructing a simulated stream exceeding 8MB limit
    oversized_size = settings.MAX_UPLOAD_BYTES + 1024
    dummy_large_file = io.BytesIO(b"\x00" * oversized_size)
    files = {"image": ("large.jpg", dummy_large_file, "image/jpeg")}
    
    response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )
    
    assert response.status_code == 413
    res_data = response.json()
    assert "error" in res_data
    assert res_data["error"]["code"] == "IMAGE_TOO_LARGE"
    assert res_data["error"]["request_id"].startswith("req_")

def test_diagnose_invalid_image_decoding(client):
    headers = {"X-Device-Id": "test-device-uuid"}
    # Passing random text with valid mime type (fails PIL decoding check)
    files = {"image": ("fake.jpg", io.BytesIO(b"not-a-valid-image-stream-bytes"), "image/jpeg")}
    
    response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )
    
    assert response.status_code == 422
    res_data = response.json()
    assert "error" in res_data
    assert res_data["error"]["code"] == "INVALID_IMAGE"
    assert res_data["error"]["request_id"].startswith("req_")
