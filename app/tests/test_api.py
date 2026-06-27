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
    """Generates a textured green image in memory to pass quality/blur checks."""
    import numpy as np
    np.random.seed(42)
    arr = np.random.randint(50, 150, (224, 224, 3), dtype=np.uint8)
    arr[:, :, 0] = np.random.randint(20, 50, (224, 224), dtype=np.uint8)
    arr[:, :, 1] = np.random.randint(150, 250, (224, 224), dtype=np.uint8)
    arr[:, :, 2] = np.random.randint(20, 50, (224, 224), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

@pytest.fixture
def non_leaf_image():
    """Generates a textured red (non-green) image in memory to pass quality/blur checks."""
    import numpy as np
    np.random.seed(42)
    arr = np.random.randint(50, 150, (224, 224, 3), dtype=np.uint8)
    arr[:, :, 0] = np.random.randint(150, 250, (224, 224), dtype=np.uint8)
    arr[:, :, 1] = np.random.randint(20, 50, (224, 224), dtype=np.uint8)
    arr[:, :, 2] = np.random.randint(20, 50, (224, 224), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
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

def test_scans_history_and_feedback(client, valid_image):
    device_id = "test-history-device-uuid"
    headers = {"X-Device-Id": device_id}
    files = {"image": ("leaf.jpg", valid_image, "image/jpeg")}
    
    # 1. Post a diagnosis
    diag_response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )
    assert diag_response.status_code == 200
    diag_data = diag_response.json()
    scan_id = diag_data["scan_id"]
    
    # 2. Get history list (should contain 1 scan)
    list_response = client.get("/api/v1/scans", headers=headers)
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert list_data["total"] >= 1
    assert list_data["items"][0]["scan_id"] == scan_id
    
    # 3. Get history details
    detail_response = client.get(f"/api/v1/scans/{scan_id}", headers=headers)
    assert detail_response.status_code == 200
    detail_data = detail_response.json()
    assert detail_data["scan_id"] == scan_id
    assert detail_data["heatmap"] is None  # Re-fetched heatmap must be null
    
    # 4. Enforce ownership (different X-Device-Id returns 403)
    wrong_headers = {"X-Device-Id": "other-device-uuid"}
    forbidden_response = client.get(f"/api/v1/scans/{scan_id}", headers=wrong_headers)
    assert forbidden_response.status_code == 403
    forbidden_data = forbidden_response.json()
    assert forbidden_data["error"]["code"] == "FORBIDDEN"
    
    # 5. Post feedback (returns 201)
    feedback_payload = {
        "scan_id": scan_id,
        "agreed": False,
        "corrected_slug": "potato-early-blight",
        "note": "looks more like potato early blight to me"
    }
    feedback_response = client.post(
        "/api/v1/feedback",
        json=feedback_payload,
        headers=headers
    )
    assert feedback_response.status_code == 201
    feedback_data = feedback_response.json()
    assert feedback_data["scan_id"] == scan_id
    assert "feedback_id" in feedback_data
    assert feedback_data["received"] is True

def test_rate_limiting(client, valid_image):
    headers = {"X-Device-Id": "rate-limit-test-device-uuid"}
    # Send 30 requests
    for _ in range(30):
        valid_image.seek(0)
        files = {"image": ("leaf.jpg", valid_image, "image/jpeg")}
        response = client.post(
            "/api/v1/diagnose",
            files=files,
            headers=headers
        )
        assert response.status_code == 200

    # 31st request must trigger 429
    valid_image.seek(0)
    files = {"image": ("leaf.jpg", valid_image, "image/jpeg")}
    response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )
    assert response.status_code == 429
    res_data = response.json()
    assert "error" in res_data
    assert res_data["error"]["code"] == "RATE_LIMITED"
    assert "Retry-After" in response.headers

def test_sanitize_image_downscaling():
    from app.services import preprocess
    # Generate a huge image (2000 x 1000)
    img = Image.new("RGB", (2000, 1000), (0, 255, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    sanitized_bytes, clean_img = preprocess.sanitize_image(img_bytes)
    # Capped to 1280px max dimension, preserving aspect ratio (2:1) -> 1280 x 640
    assert clean_img.size == (1280, 640)

def test_metrics_endpoint(client):
    response = client.get("/api/v1/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_requests" in data
    assert "error_rate" in data
    assert "ood_rejections" in data
    assert "diagnose_p50_latency_ms" in data
    assert "diagnose_p95_latency_ms" in data

def test_health_readiness(client):
    from app.services import inference
    original_warmup = inference.warmup_succeeded

    # 1. Warmup succeeded = True -> 200 OK
    inference.warmup_succeeded = True
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["model_loaded"] is True

    # 2. Warmup succeeded = False -> 503 Service Unavailable
    inference.warmup_succeeded = False
    response = client.get("/api/v1/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "not-ready"
    assert data["model_loaded"] is False

    # Restore original state
    inference.warmup_succeeded = original_warmup

def test_diagnose_poor_quality_rejection(client):
    headers = {"X-Device-Id": "test-device-uuid"}
    # Flat solid green color -> blur_var = 0 -> unacceptable
    flat_img = Image.new("RGB", (100, 100), (34, 139, 34))
    buf = io.BytesIO()
    flat_img.save(buf, format="JPEG")
    buf.seek(0)
    files = {"image": ("flat_blurry.jpg", buf, "image/jpeg")}

    response = client.post(
        "/api/v1/diagnose",
        files=files,
        headers=headers
    )

    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "INVALID_IMAGE"
    assert "quality is too poor" in data["error"]["message"]
    assert "Tips:" in data["error"]["message"]

def test_tta_calculation():
    from app.services.tta import tta_probs
    import numpy as np

    class MockEngine:
        def predict_probs(self, x):
            if np.array_equal(x, base_input):
                return np.array([[0.6, 0.4]])
            elif np.array_equal(x, base_input[:, :, ::-1, :]):
                return np.array([[0.5, 0.5]])
            else:
                return np.array([[0.4, 0.6]])

    base_input = np.arange(224 * 224 * 3).reshape((1, 224, 224, 3)).astype(np.float32)
    engine = MockEngine()
    probs = tta_probs(engine, base_input)

    # Average: (0.6 + 0.5 + 0.4)/3 = 0.5, (0.4 + 0.5 + 0.6)/3 = 0.5
    assert probs.shape == (1, 2)
    assert np.allclose(probs, np.array([[0.5, 0.5]]))

def test_generate_explanation():
    from app.services.explain import generate_explanation

    # Case 1: is_leaf is False
    res_non_leaf = {"is_leaf": False}
    exp_non_leaf = generate_explanation(res_non_leaf)
    assert "doesn't look like a crop leaf" in exp_non_leaf

    # Case 2: Healthy, high confidence, heatmap present
    res_healthy = {
        "is_leaf": True,
        "prediction": {"crop": "Apple", "name": "Apple Healthy"},
        "confidence_band": "high",
        "confidence": 0.95,
        "severity": "healthy",
        "urgency_days": None,
        "heatmap": "data:image/png;base64,..."
    }
    exp_healthy = generate_explanation(res_healthy)
    assert "Apple — Apple Healthy" in exp_healthy
    assert "95% confidence" in exp_healthy
    assert "appears healthy" in exp_healthy
    assert "Highlighted areas" in exp_healthy

    # Case 3: Diseased, low confidence, severe severity, no heatmap
    res_severe = {
        "is_leaf": True,
        "prediction": {"crop": "Tomato", "name": "Late Blight"},
        "confidence_band": "low",
        "confidence": 0.45,
        "severity": "severe",
        "urgency_days": 1,
        "heatmap": None
    }
    exp_severe = generate_explanation(res_severe)
    assert "Tomato — Late Blight" in exp_severe
    assert "45% confidence" in exp_severe
    assert "Advanced infection — treat within about 1 day(s)" in exp_severe
    assert "retake in good light" in exp_severe




