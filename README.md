# CropDoc AI Backend Service

CropDoc AI is a production-ready, asynchronous FastAPI backend service co-locating REST APIs and a deep-learning MobileNetV2 classification model for crop-disease detection. It features EXIF-stripping image sanitization, rate-limiting, out-of-distribution leaf detection, Grad-CAM explainability, and database history metrics.

---

## 1. Project Requirements & Directory Structure

- **Python Version:** 3.11+
- **Database:** MongoDB (Motor client + local json fallback engine)
- **Dependencies:** requirements.txt (FastAPI, TensorFlow, Pillow, OpenCV-headless, slowapi, etc.)

```text
app/
  main.py            # FastAPI app, middleware, CORS, routers mapping
  config.py          # Pydantic v2 settings manager
  schemas.py         # Pydantic v2 request & response schemas
  db.py              # MongoDB Motor driver and fallback data engine
  routers/
    health.py        # Readiness health checks
    diagnose.py      # MobileNetV2 leaf diagnosis endpoint
    diseases.py      # Seeded diseases directory query routing
    scans.py         # Scan history query and detailed scan resolver
    feedback.py      # Agreement/correction tracker endpoint
    metrics.py       # Public in-memory system metrics dashboard
  services/
    preprocess.py    # Image sanitization & MobileNetV2 input pre-processor
    inference.py     # Calibrated TensorFlow model singleton
    gradcam.py       # Grad-CAM heatmap visualization
    ood.py           # Out-of-Distribution leaf gating checks
    severity.py      # Disease severity evaluator using Grad-CAM heatmaps
    metrics.py       # In-memory metrics tracking module
  utils/
    errors.py        # Uniform error handling envelopes
    limiter.py       # Shared slowapi rate-limiter instance
requirements.txt     # Python requirements manifest
Dockerfile           # Production-ready slim container definition
render.yaml          # Render blueprint service deployment template
.dockerignore        # File ignore list for Docker context
.env.example         # Template configuration settings
README.md            # Setup and deployment documentation
```

---

## 2. Installation & Local Setup

### Step 1: Clone and set up environment
Create a Python virtual environment and install the package requirements:
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and fill out variables:
```bash
cp .env.example .env
```

| Env Variable | Default Value | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection URI. For a free Atlas DB, see the [Database Seeding](#3-database-seeding-mongodb-atlas) section. |
| `DB_NAME` | `cropdoc_db` | Database name. |
| `MODEL_PATH` | `model.keras` | File path of the `.keras` model artifact. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000` | Comma-separated CORS allowed origins. |
| `MAX_UPLOAD_BYTES` | `8388608` | Maximum file size in bytes (8MB). |
| `RATE_LIMIT` | `30` | Default rate limit capacity. |

### Step 3: Place ML Model Artifacts
Before running the backend, place your trained MobileNetV2 artifacts in the directory `app/ml/model/`:
- `app/ml/model/model.keras` (The saved classification model)
- `app/ml/model/class_index.json` (JSON dictionary mapping index string -> crop-disease class slug)
- `app/ml/model/calibration.json` (Temperature scaling parameters)

If the model is absent, the backend disables model processing gracefully without crashing.

### Step 4: Run local server
Start the FastAPI server locally:
```bash
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```
Visit `http://localhost:8000/docs` for the interactive Swagger API documentation.

---

## 3. Database Seeding & MongoDB Atlas

### MongoDB Atlas Template
To deploy on a free shared cloud database:
1. Create a free shared cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and whitelist client IPs.
3. Retrieve your connection string, which will look like:
   `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
4. Replace `<username>` and `<password>` and set this connection string as the `MONGODB_URI` environment variable.

### Seeding Command
Seeding the database imports all 38 PlantVillage crop-disease categories from [app/data/diseases_seed.json](file:///Users/rana/Downloads/HARVEST%20GUARD/app/data/diseases_seed.json) into MongoDB:
```bash
PYTHONPATH=. python scripts/seed_db.py
```

---

## 4. Docker Deployment

### Build the Image
Build the slim container image, which resolves all dependencies including OpenCV runtime requirements:
```bash
docker build -t cropdoc-backend .
```

### Run the Container
Run the container on port 8000. Ensure you pass your `.env` variables or supply them directly:
```bash
docker run -d \
  -p 8000:8000 \
  --name cropdoc-backend-service \
  --env MONGODB_URI="mongodb://localhost:27017" \
  --env DB_NAME="cropdoc_db" \
  cropdoc-backend
```

---

## 5. Verification: Running Tests

To run all automated integration and smoke tests (which check all API contracts, image downscaling, rate limits, and health states):
```bash
PYTHONPATH=. pytest
```
If model files are absent, model-reliant test routes will register as `xfail` (expected failure) instead of causing the build suite to fail.

---

## 6. API Documentation & Curl Examples

Every API route aligns with the specified CropDoc uniform envelope format.

### 1) Readiness check (`GET /api/v1/health`)
Returns readiness status of the backend. Ready only after the ML model completes warmup.
```bash
curl -i http://localhost:8000/api/v1/health
```

### 2) Diagnose Leaf (`POST /api/v1/diagnose`)
Ingests an image file, validates MIME-type, downscales maximum dimension to 1280px, strips EXIF tags, and runs classification. Requires `X-Device-Id` header.
```bash
curl -i -X POST http://localhost:8000/api/v1/diagnose \
  -H "X-Device-Id: test-grower-device-123" \
  -F "image=@/path/to/my_leaf.jpg" \
  -F "crop_hint=tomato"
```

### 3) Disease Directory (`GET /api/v1/diseases`)
Lists categories paginated with optional filtering.
```bash
curl -i "http://localhost:8000/api/v1/diseases?page=1&page_size=5&crop=Tomato"
```

### 4) Disease details (`GET /api/v1/diseases/{slug}`)
Retrieves comprehensive details about a specific disease slug.
```bash
curl -i http://localhost:8000/api/v1/diseases/tomato-early-blight
```

### 5) Scan History List (`GET /api/v1/scans`)
Fetches history of scans recorded on a device. Requires matching `X-Device-Id` header.
```bash
curl -i http://localhost:8000/api/v1/scans \
  -H "X-Device-Id: test-grower-device-123"
```

### 6) Scan Details (`GET /api/v1/scans/{id}`)
Fetches details of a specific scan. Enforces matching ownership checking on `X-Device-Id`.
```bash
curl -i http://localhost:8000/api/v1/scans/scan_123abc456def \
  -H "X-Device-Id: test-grower-device-123"
```

### 7) User Feedback (`POST /api/v1/feedback`)
Submits grower agreement or corrected classifications.
```bash
curl -i -X POST http://localhost:8000/api/v1/feedback \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: test-grower-device-123" \
  -d '{
    "scan_id": "scan_123abc456def",
    "agreed": false,
    "corrected_slug": "tomato-late-blight",
    "note": "Lesions look darker and water-soaked."
  }'
```

### 8) System Metrics (`GET /api/v1/metrics`)
Provides public, unauthenticated backend metrics.
```bash
curl -i http://localhost:8000/api/v1/metrics
```
