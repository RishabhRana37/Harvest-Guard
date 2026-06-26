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

@pytest.fixture
def non_leaf_image():
    """Generates a solid red (non-green) image in memory."""
    img = Image.new("RGB", (100, 100), (255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] in [True, False]
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
    assert res_data["scan_id"].startswith("scan_")
    assert res_data["is_leaf"] is True
    assert isinstance(res_data["confidence"], float)
    assert res_data["confidence_band"] in ["high", "medium", "low"]
    assert res_data["severity"] in ["healthy", "mild", "severe"]
    assert res_data["urgency_days"] is None or isinstance(res_data["urgency_days"], int)
    assert "prediction" in res_data
    assert "slug" in res_data["prediction"]
    assert len(res_data["top_k"]) == 3
    assert res_data["heatmap"].startswith("data:image/png;base64,")
    assert "disease" in res_data
    assert "slug" in res_data["disease"]
    assert "X-Request-Id" in response.headers

def test_diagnose_non_leaf_image(client, non_leaf_image):
    headers = {"X-Device-Id": "test-device-uuid"}
    files = {"image": ("non_leaf.jpg", non_leaf_image, "image/jpeg")}
    
    response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )
    
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["is_leaf"] is False
    assert res_data["is_confident"] is False
    assert res_data["confidence"] is None
    assert res_data["confidence_band"] is None
    assert res_data["severity"] is None
    assert res_data["urgency_days"] is None
    assert res_data["prediction"] is None
    assert res_data["top_k"] == []
    assert res_data["heatmap"] is None
    assert res_data["disease"] is None

def test_diagnose_model_unavailable(client, valid_image):
    from app.services import inference
    original_loaded = inference.model_loaded
    inference.model_loaded = False
    try:
        headers = {"X-Device-Id": "test-device-uuid"}
        files = {"image": ("leaf.jpg", valid_image, "image/jpeg")}
        response = client.post(
            "/api/v1/diagnose",
            files=files,
            headers=headers
        )
        assert response.status_code == 503
        res_data = response.json()
        assert "error" in res_data
        assert res_data["error"]["code"] == "MODEL_UNAVAILABLE"
    finally:
        inference.model_loaded = original_loaded


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

def test_list_diseases_unfiltered(client):
    response = client.get("/api/v1/diseases?page_size=50")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 38
    assert len(data["items"]) == 38
    assert data["page"] == 1
    assert data["page_size"] == 50
    # Check fields in lightweight items
    first_item = data["items"][0]
    assert "slug" in first_item
    assert "crop" in first_item
    assert "name" in first_item
    assert "is_healthy" in first_item
    # These lightweight items should have default values or null for other fields
    assert first_item["pathogen"] == "None" or first_item["pathogen"] is not None

def test_list_diseases_crop_filter(client):
    response = client.get("/api/v1/diseases?crop=Tomato&page_size=50")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 10
    for item in data["items"]:
        assert item["crop"].lower() == "tomato"

def test_list_diseases_search(client):
    # Searching for 'Blight'
    response = client.get("/api/v1/diseases?q=Blight")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        # Verify that either name or symptoms contains 'blight' (case-insensitive)
        text = (item["name"] + " " + " ".join(item["symptoms"])).lower()
        assert "blight" in text

def test_get_disease_by_slug_success(client):
    response = client.get("/api/v1/diseases/tomato-early-blight")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "tomato-early-blight"
    assert data["crop"] == "Tomato"
    assert data["name"] == "Early Blight"
    assert data["is_healthy"] is False
    assert len(data["symptoms"]) > 0
    assert "organic" in data["treatments"]

def test_get_disease_by_slug_not_found(client):
    response = client.get("/api/v1/diseases/unknown-slug-format")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "Unknown disease" in data["error"]["message"]
    assert data["error"]["request_id"].startswith("req_")

