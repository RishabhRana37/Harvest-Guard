# Harvest Guard — Backend API

FastAPI backend for the CropDoc AI disease-diagnosis service.

---

## Repository Layout

```
backend/
├── app/
│   ├── data/                  # Local JSON fallback database files
│   │   ├── diseases_seed.json # Disease knowledge base (38 classes)
│   │   ├── scans_fallback.json
│   │   └── feedback_fallback.json
│   ├── ml/
│   │   └── model/             # ML model artefacts
│   │       ├── model.keras    # MobileNetV2 fine-tuned weights
│   │       ├── class_index.json
│   │       ├── calibration.json
│   │       └── metrics.json
│   ├── routers/               # FastAPI route handlers
│   │   ├── diagnose.py        # POST /api/v1/diagnose
│   │   ├── diseases.py        # GET  /api/v1/diseases
│   │   ├── scans.py           # GET  /api/v1/scans
│   │   ├── feedback.py        # POST /api/v1/feedback
│   │   ├── report.py          # GET  /api/v1/scans/{id}/report (PDF)
│   │   ├── health.py          # GET  /api/v1/health
│   │   ├── metrics.py         # GET  /api/v1/metrics
│   │   └── model.py           # GET  /api/v1/model/info
│   ├── services/              # Core ML pipeline services
│   │   ├── inference.py       # Model loading & temperature-calibrated predict
│   │   ├── preprocess.py      # Image sanitisation & MobileNetV2 preprocessing
│   │   ├── quality.py         # Image quality gate (blur, brightness, leaf fill)
│   │   ├── tta.py             # Test-Time Augmentation (TTA) ensemble
│   │   ├── gradcam.py         # Grad-CAM++ saliency map generation
│   │   ├── ood.py             # Out-of-distribution (non-leaf) detection
│   │   ├── severity.py        # Severity grading from CAM active fraction
│   │   ├── explain.py         # Natural-language explanation generator
│   │   └── metrics.py         # In-memory request/latency tracker
│   ├── utils/
│   │   ├── errors.py          # AppError exception & global error handler
│   │   └── limiter.py         # slowapi rate-limiter setup
│   ├── config.py              # Pydantic settings (env vars)
│   ├── db.py                  # Motor MongoDB client + local JSON fallback
│   ├── main.py                # FastAPI app, lifespan, middleware, routers
│   └── schemas.py             # Pydantic request/response models
├── tests/                     # Pytest integration & smoke tests
│   ├── test_api.py            # 24 integration tests
│   └── test_smoke.py          # 6 smoke tests
├── Dockerfile                 # Production Docker image
├── .dockerignore
├── requirements.txt
└── pytest.ini
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- MongoDB (optional — a local JSON fallback is used automatically if `MONGODB_URI` is unset)

### 1. Create & activate a virtual environment
```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment variables
```bash
cp ../.env.example .env
# Set MONGODB_URI if you have a MongoDB Atlas cluster
```

### 4. Start the server
```bash
uvicorn app.main:app --reload --port 8000
```

Interactive Swagger docs: **http://localhost:8000/docs**

---

## Running Tests
```bash
# From the backend/ directory
PYTHONPATH=. pytest
```

---

## Docker Build
```bash
# From the project root
docker build -f backend/Dockerfile -t harvest-guard-api ./backend
docker run -p 8000:8000 harvest-guard-api
```

---

## API Summary

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/v1/diagnose` | Diagnose a crop leaf image |
| `GET` | `/api/v1/diseases` | List/search the disease knowledge base |
| `GET` | `/api/v1/diseases/{slug}` | Get full disease detail |
| `GET` | `/api/v1/scans` | Fetch scan history for a device |
| `GET` | `/api/v1/scans/{scan_id}` | Get a single scan result |
| `GET` | `/api/v1/scans/{scan_id}/report` | Download PDF diagnostic report |
| `POST` | `/api/v1/feedback` | Submit correction feedback |
| `GET` | `/api/v1/health` | Readiness probe |
| `GET` | `/api/v1/metrics` | Prometheus-style request metrics |
| `GET` | `/api/v1/model/info` | Model metadata & validation metrics |
