import io
import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image

from app.main import app
from app.config import settings
from app.services import inference

@pytest.fixture
def anyio_backend():
    return "asyncio"

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
    return buf.getvalue()

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
    return buf.getvalue()

@pytest.mark.anyio
async def test_health_check_smoke():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data
    assert "db" in data
    assert "version" in data

@pytest.mark.anyio
async def test_diagnose_oversized_and_wrong_mime():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Wrong mime-type (text/plain) -> 415
        response = await ac.post(
            "/api/v1/diagnose",
            files={"image": ("test.txt", b"hello", "text/plain")},
            data={"crop_hint": "tomato"},
            headers={"X-Device-Id": "smoke-test-device"}
        )
        assert response.status_code == 415
        assert response.json()["error"]["code"] == "UNSUPPORTED_MEDIA"

        # Oversized file -> 413
        oversized = b"\x00" * (settings.MAX_UPLOAD_BYTES + 1024)
        response = await ac.post(
            "/api/v1/diagnose",
            files={"image": ("large.jpg", oversized, "image/jpeg")},
            headers={"X-Device-Id": "smoke-test-device"}
        )
        assert response.status_code == 413
        assert response.json()["error"]["code"] == "IMAGE_TOO_LARGE"

@pytest.mark.anyio
async def test_diagnose_leaf_smoke(valid_image):
    if not inference.model_loaded:
        pytest.xfail("Model artifacts absent, skipping/xfailing leaf diagnosis test.")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/diagnose",
            files={"image": ("leaf.jpg", valid_image, "image/jpeg")},
            headers={"X-Device-Id": "smoke-test-device"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_leaf"] is True
        assert "scan_id" in data
        assert "prediction" in data
        assert "heatmap" in data
        assert "disease" in data

@pytest.mark.anyio
async def test_diagnose_non_leaf_smoke(non_leaf_image):
    if not inference.model_loaded:
        pytest.xfail("Model artifacts absent, skipping/xfailing non-leaf check.")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/diagnose",
            files={"image": ("non_leaf.jpg", non_leaf_image, "image/jpeg")},
            headers={"X-Device-Id": "smoke-test-device"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_leaf"] is False
        assert data["scan_id"].startswith("scan_")

@pytest.mark.anyio
async def test_diseases_endpoints_smoke():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Get listing
        response = await ac.get("/api/v1/diseases?page_size=50")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 38
        
        # Get specific disease details
        response = await ac.get("/api/v1/diseases/tomato-early-blight")
        assert response.status_code == 200
        assert response.json()["slug"] == "tomato-early-blight"

        # Get non-existent disease details
        response = await ac.get("/api/v1/diseases/unknown-slug")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"

@pytest.mark.anyio
async def test_scans_and_feedback_smoke(valid_image):
    if not inference.model_loaded:
        pytest.xfail("Model artifacts absent, skipping/xfailing scans and feedback check.")

    device_id = "smoke-test-device-uuid"
    headers = {"X-Device-Id": device_id}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Post diagnosis
        diag_resp = await ac.post(
            "/api/v1/diagnose",
            files={"image": ("leaf.jpg", valid_image, "image/jpeg")},
            headers=headers
        )
        assert diag_resp.status_code == 200
        scan_id = diag_resp.json()["scan_id"]

        # 2. Get history list
        history_resp = await ac.get("/api/v1/scans", headers=headers)
        assert history_resp.status_code == 200
        history_data = history_resp.json()
        assert any(item["scan_id"] == scan_id for item in history_data["items"])

        # 3. Get history details
        detail_resp = await ac.get(f"/api/v1/scans/{scan_id}", headers=headers)
        assert detail_resp.status_code == 200
        assert detail_resp.json()["scan_id"] == scan_id

        # 4. Enforce X-Device-Id ownership (should return 403 on mismatched device ID)
        mismatched_headers = {"X-Device-Id": "other-device-uuid"}
        forbidden_resp = await ac.get(f"/api/v1/scans/{scan_id}", headers=mismatched_headers)
        assert forbidden_resp.status_code == 403
        assert forbidden_resp.json()["error"]["code"] == "FORBIDDEN"

        # 5. Post feedback (201)
        feedback_payload = {
            "scan_id": scan_id,
            "agreed": False,
            "corrected_slug": "potato-early-blight",
            "note": "looks more like potato early blight to me"
        }
        feedback_resp = await ac.post(
            "/api/v1/feedback",
            json=feedback_payload,
            headers=headers
        )
        assert feedback_resp.status_code == 201
        assert feedback_resp.json()["scan_id"] == scan_id
        assert feedback_resp.json()["received"] is True
