# Backend PRD — Harvest Guard (ZenVerse)
### Crop Disease Diagnosis from Photo using AI · API + ML Inference Service

**Owner:** Backend / ML Lead
**Team:** ZenVerse — Jai Karthick · Rishabh Rana
**Status:** Draft v1.0 · Hackathon build
**Companion docs:** `01_Frontend_PRD.md`, `03_API_Contract.md`

---

## 1. Purpose & Scope

The backend ingests a crop-leaf image and returns, in **under ~1.5s of server time**, a structured diagnosis: the predicted disease, calibrated confidence, top-k alternates, a **Grad-CAM explainability heatmap**, a **severity grade**, an **out-of-distribution (OOD) gate** ("is this even a leaf?"), and an **enriched, localized treatment plan** pulled from a disease knowledge base.

It is one cohesive **FastAPI service** that co-locates the REST API and the TensorFlow/Keras inference engine, backed by **MongoDB** for the disease knowledge base and scan history.

**In scope (MVP):** image diagnosis endpoint, model inference + Grad-CAM, confidence calibration + OOD gating, severity heuristic, disease KB CRUD/read, scan persistence, feedback capture, health/metrics, security basics.

**Out of scope (roadmap §15):** user auth at scale, on-device model distribution, active-learning retraining pipeline, IoT/weather ingestion.

---

## 2. Architecture Decision: One FastAPI Service (deviation from the deck)

The pitch deck lists **Node.js · Express (API server)** *and* a separate **Python · TensorFlow (AI engine)**. This PRD **deliberately collapses those into a single FastAPI service.** Rationale, stated plainly so it's defensible to judges:

- The ML model is Python/Keras. A Node API would have to shell out or make an HTTP hop to a Python inference process for **every** request — adding latency, a second runtime, a second deploy, and a serialization boundary, all under a tight hackathon clock.
- FastAPI is async, fast, and lets the model load **once** into the same process memory, so inference is a direct in-process call. This is the main reason the "<3s" promise is achievable.
- It matches the team's proven FastAPI experience, reducing build risk.

**If a judge asks** "your deck said Node": *"The deck shows the logical layers; we implemented the API and inference as one FastAPI service to keep inference in-process and hit our latency target. The architecture is identical in responsibilities, simpler in operations."*

```
                ┌───────────────────────────────────────────────┐
                │              FastAPI Service                   │
  Client  ──▶   │  Router → Validation → Inference Engine        │
  (PWA)         │                 │            │                 │
                │                 │            ├─ Preprocess(CV)  │
                │                 │            ├─ CNN predict     │
                │                 │            ├─ OOD / calibrate │
                │                 │            ├─ Grad-CAM        │
                │                 │            └─ Severity        │
                │                 ▼                               │
                │           KB Enrichment  ◀── MongoDB (diseases) │
                │                 │                               │
                │           Persist Scan   ──▶ MongoDB (scans)    │
                └───────────────────────────────────────────────┘
                        Model artifact loaded once at startup
```

---

## 3. Components & Responsibilities

| Component | Responsibility |
|---|---|
| **API layer** (FastAPI routers) | HTTP, validation, error envelope, CORS, rate limiting |
| **Preprocessing** (OpenCV/Pillow + NumPy) | decode, EXIF-orient, resize 224×224, normalize, to-tensor |
| **Inference engine** (TensorFlow/Keras) | single-load model, `predict`, softmax, top-k |
| **Calibration + OOD gate** | temperature-scaled confidence; leaf/not-leaf + low-confidence decisions |
| **Explainability** (Grad-CAM) | heatmap on last conv layer → overlay → base64 PNG |
| **Severity grader** | heuristic from class + lesion area in the CAM |
| **KB service** | look up disease metadata + treatments from MongoDB |
| **Scan service** | persist each diagnosis; serve history |
| **Feedback service** | capture user agree/disagree for future retraining |
| **Observability** | structured logs, `/health`, basic metrics |

---

## 4. The ML Model

### 4.1 Dataset
- **PlantVillage** (~54k labeled leaf images, **38 classes** across 14 crops incl. tomato, potato, corn, grape, apple, etc.). Directly substantiates the deck's "Multi-crop" and "38+ diseases" claims.
- **PlantDoc** (optional, real-field images) blended in for robustness — PlantVillage is lab-clean, so a small real-field set reduces demo-day surprises.
- An explicit **"background / not-a-leaf"** negative set (random non-leaf images) to train/validate the OOD gate.

### 4.2 Architecture
- **Transfer learning** on a lightweight backbone: **MobileNetV2** (default) or **EfficientNet-B0**. Chosen for small size, fast CPU inference, and clean **TFLite export** for the offline roadmap.
- Head: GlobalAveragePooling → Dropout(0.2) → Dense(38, softmax).
- Train in two phases: (1) freeze backbone, train head; (2) unfreeze top blocks, fine-tune at low LR.

### 4.3 Augmentation & Training
- Augment: random flip, rotation, brightness/contrast, zoom, slight blur — to bridge lab→field gap.
- Class imbalance: class weights; track **macro-F1** and **per-class recall**, not just accuracy (accuracy hides minority-class failure).
- Early stopping on val macro-F1; save best weights.

### 4.4 Confidence Calibration
- Apply **temperature scaling** on a held-out set so the reported confidence is meaningful (an "87%" should behave like 87%). The UI's confidence gauge depends on this being honest.

### 4.5 OOD / "Is this a leaf?" Gate
Two cheap, layered checks before trusting a class:
1. **Softmax confidence threshold** — if max prob < `τ_low` (e.g., 0.55) → `is_confident: false`.
2. **Leaf gate** — a lightweight green-dominance/texture heuristic on the image **and/or** a low-max-logit + high-entropy check → `is_leaf: false` for clearly non-leaf inputs (hand, wall, sky).
- This is what powers the frontend's OOD and low-confidence states and protects the live demo from confident nonsense.

### 4.6 Severity Grade
Heuristic, transparent, demo-safe:
- From the Grad-CAM activation, estimate the **fraction of leaf area** that is "diseased-active," bucket into **Healthy / Mild / Severe**.
- Map severity → an **urgency window** ("act within ~N days") echoing the deck's <3-day framing.
- Documented as a heuristic (not a second trained model) so it's honest and fast.

### 4.7 Metrics & Targets (report these to judges)
- Overall accuracy, **macro-F1**, per-class recall, confusion matrix.
- Calibration (ECE before/after temperature scaling).
- p50 / p95 server inference latency.

---

## 5. Inference Pipeline (per request)

```
receive multipart image
 → validate (mime, size ≤ 8MB, decodable)
 → preprocess (EXIF-orient, resize 224², normalize)
 → leaf gate  ──(not leaf)──▶ return OOD response (is_leaf:false)
 → model.predict → softmax → top-k
 → temperature-scaled confidence + band (high/med/low)
 → Grad-CAM → overlay heatmap → base64 PNG
 → severity from CAM area
 → enrich: KB lookup for predicted disease (+ alternates' names)
 → persist scan (async, non-blocking)
 → respond (DiagnosisResult per API contract)
```

**Latency budget (server):** validate+preprocess ≤150ms · inference ≤300ms (CPU) · Grad-CAM ≤300ms · KB+serialize ≤150ms → **~p95 < 1.5s**. Persistence is fire-and-forget so it never blocks the response.

---

## 6. Data Models (MongoDB)

### 6.1 `diseases` (knowledge base — document-shaped, hence Mongo)
```json
{
  "_id": "ObjectId",
  "slug": "tomato-early-blight",
  "class_index": 12,
  "crop": "Tomato",
  "name": "Early Blight",
  "pathogen": "Alternaria solani",
  "is_healthy": false,
  "symptoms": ["Concentric brown rings on lower leaves", "Yellow halos"],
  "cause": "Fungal; favored by warm, humid conditions",
  "lifecycle": "Spreads via spores in 7–10 day cycles",
  "severity_default": "mild",
  "treatments": {
    "organic":   [{"action":"Neem oil spray","dosage":"5 ml/L","frequency":"every 7 days","safety":"Apply evening"}],
    "chemical":  [{"action":"Chlorothalonil","dosage":"2 g/L","frequency":"every 10 days","safety":"Wear gloves; 7-day PHI"}],
    "prevention":["Crop rotation","Remove infected debris","Drip irrigation to keep leaves dry"]
  },
  "confused_with": ["tomato-late-blight"],
  "image_ref": "tomato_early_blight.jpg",
  "i18n": { "hi": { "name": "अगेती झुलसा" } }
}
```
- Seeded from a curated JSON for all 38 classes (including the **healthy** classes, which carry positive "your crop looks healthy" copy and no treatment).
- `class_index` is the bridge between the model's softmax index and the KB.

### 6.2 `scans` (history)
```json
{
  "_id": "ObjectId",
  "created_at": "ISODate",
  "device_id": "anon-uuid",            // anonymous; no PII required for MVP
  "image_thumb_ref": "gridfs/uri",     // small thumbnail only
  "predicted_slug": "tomato-early-blight",
  "confidence": 0.87,
  "confidence_band": "high",
  "is_leaf": true,
  "severity": "mild",
  "top_k": [{"slug":"...","prob":0.87}, {"slug":"...","prob":0.07}],
  "heatmap_ref": "gridfs/uri"          // optional; or regenerated on demand
}
```

### 6.3 `feedback`
```json
{
  "_id":"ObjectId","scan_id":"ObjectId","created_at":"ISODate",
  "agreed": false, "corrected_slug":"tomato-late-blight", "note":"..."
}
```

> **Storage note:** thumbnails/heatmaps via GridFS or an object store; for a hackathon, returning the heatmap inline as base64 in the diagnosis response (and *not* persisting full images) is acceptable and simplest — persistence of raw images is optional and privacy-friendly to skip.

---

## 7. API Surface (summary — full spec in `03_API_Contract.md`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/diagnose` | Image → diagnosis (core) |
| `GET`  | `/api/v1/diseases` | List/search KB |
| `GET`  | `/api/v1/diseases/{slug}` | Disease detail |
| `GET`  | `/api/v1/scans` | History (by `device_id`) |
| `GET`  | `/api/v1/scans/{id}` | Single scan |
| `POST` | `/api/v1/feedback` | Capture agree/disagree |
| `GET`  | `/api/v1/health` | Liveness/readiness |

---

## 8. Security & Abuse Protection

- **Input validation:** accept only `image/jpeg|png|webp`; **max 8MB**; reject undecodable/zero-byte; strip to pixels (never trust filename/metadata for logic).
- **Image sanitization:** decode → re-encode through Pillow/OpenCV to drop malicious payloads; cap dimensions.
- **Rate limiting:** per-IP / per-`device_id` (e.g., 30 req/min) to protect the single inference process.
- **CORS:** allow only the deployed frontend origin(s).
- **No PII required:** history keyed by an anonymous `device_id`; auth is an optional roadmap item, not MVP.
- **Secrets** via environment variables; never in code or responses.
- **Payload size & timeouts** enforced at the server and reverse proxy.

---

## 9. Performance & Scaling

- **Model loaded once** at startup (lifespan event); never per-request.
- **Async I/O** for Mongo and persistence; CPU-bound inference runs in a thread/process pool so it doesn't block the event loop.
- **Warmup:** run one dummy inference at boot to JIT/initialize TF graphs → avoids a slow first real request during the demo.
- **Caching:** `/diseases` responses cached (in-memory/Redis-optional); KB changes rarely.
- **Horizontal scale path:** the service is stateless except for Mongo; replicate behind a load balancer if needed (out of MVP scope but noted).

---

## 10. Observability

- **Structured JSON logs** per request: request id, latency breakdown (preprocess/infer/cam), predicted class, confidence, is_leaf.
- **`/health`** returns model-loaded status + Mongo connectivity (readiness vs liveness).
- **Lightweight metrics:** request count, error rate, p50/p95 latency, OOD-rejection rate (a great demo stat).

---

## 11. Error Handling (taxonomy → maps to API contract)

| Condition | HTTP | App code |
|---|---|---|
| Missing/invalid file | 422 | `INVALID_IMAGE` |
| Unsupported mime | 415 | `UNSUPPORTED_MEDIA` |
| Too large | 413 | `IMAGE_TOO_LARGE` |
| Not a leaf (OOD) | 200 | body `is_leaf:false` (not an error — a valid result) |
| Model not ready | 503 | `MODEL_UNAVAILABLE` |
| Rate limited | 429 | `RATE_LIMITED` |
| Unexpected | 500 | `INTERNAL_ERROR` |

OOD is intentionally a **200 with a flag**, not an error, so the frontend renders the friendly "point at a leaf" state rather than an error toast.

---

## 12. Tech Stack

| Concern | Choice |
|---|---|
| API framework | **FastAPI** (async) + Uvicorn |
| ML runtime | **TensorFlow / Keras** (MobileNetV2 transfer learning) |
| Image processing | **OpenCV + Pillow + NumPy** |
| Explainability | **Grad-CAM** (tf-keras-vis or hand-rolled on last conv layer) |
| Database | **MongoDB** (Motor async driver / Beanie ODM) |
| Validation | **Pydantic** models |
| Optional cache | Redis (diseases cache, rate limiting) |
| Packaging | **Docker** |
| Deploy | Render / Railway / Fly.io (container); model artifact bundled or fetched at boot |

> **Deck alignment:** deck lists Python · TensorFlow · OpenCV · CNN (AI engine) and MongoDB (knowledge base) — all retained. Only the *API server* layer moves from Node/Express into the same FastAPI process (§2).

---

## 13. Deployment & Config

- **Container** with the model artifact (`model.keras` / `SavedModel`) baked in or pulled from object storage at boot (keep the artifact < a few hundred MB via MobileNetV2).
- **Env vars:** `MONGODB_URI`, `MODEL_PATH`, `ALLOWED_ORIGINS`, `MAX_UPLOAD_BYTES`, `CONFIDENCE_TAU`, `RATE_LIMIT`.
- **Startup sequence:** connect Mongo → load model → warmup inference → mark ready.
- **CORS** locked to the frontend origin(s).

---

## 14. Build Milestones (backend track)

| Phase | Deliverable | "Done" means |
|---|---|---|
| **M0 — Skeleton** | FastAPI app, Pydantic schemas, `/health`, CORS, mock `/diagnose` returning a fixed result | Frontend can integrate against the contract immediately |
| **M1 — Model** | Trained MobileNetV2 on PlantVillage; metrics report | Macro-F1 acceptable; weights saved |
| **M2 — Inference** | Real `/diagnose`: preprocess → predict → top-k → calibrated confidence | Returns correct class + confidence on test leaves |
| **M3 — Explain + gate** | Grad-CAM heatmap (base64), OOD/leaf gate, severity | Heatmap returned; non-leaf images rejected; low-conf flagged |
| **M4 — KB + history** | Seed `diseases` (38 classes), enrichment, scan persistence, feedback | Treatment plan enriched from Mongo; history queryable |
| **M5 — Harden + deploy** | rate limit, sanitization, warmup, Docker, deploy | Live URL; p95 < 1.5s server; demo runs twice clean |

---

## 15. Roadmap (mirrors deck "Future Scope")
- **TFLite export** of MobileNetV2 → on-device offline inference (powers the frontend's true-offline roadmap).
- **Active learning:** feedback → periodic retraining; surface "needs review" scans.
- **Weather/IoT signals** feeding the severity/urgency model.
- **Regional-language KB** (the `i18n` field already exists in the schema).
- **Optional accounts** + cloud history sync.

---

## 16. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Lab→field accuracy gap (PlantVillage is clean) | Blend PlantDoc, strong augmentation, honest confidence + OOD gate so the demo never lies |
| Confident misclassification on demo day | OOD/leaf gate + low-confidence band + temperature scaling |
| First-request latency spike | Boot-time warmup inference |
| Cold-start on free-tier hosts | Keep-alive ping; warmup; lightweight backbone |
| Large phone photos slow the pipeline | Client compresses pre-upload (Frontend PRD §10); server also caps dimensions |
| KB gaps for some classes | Seed all 38 classes incl. healthy; "treatment coming soon" fallback copy |

---

## 17. Definition of Done (backend)
- `/diagnose` returns a fully-populated `DiagnosisResult` (class, calibrated confidence, top-k, heatmap, severity, enriched treatment) per `03_API_Contract.md`.
- OOD/leaf gate and low-confidence flagging demonstrably work.
- All 38 classes seeded in the KB with treatments + healthy copy.
- Security basics (validation, sanitization, rate limit, CORS) in place.
- p95 server latency < 1.5s with warmup; `/health` reports readiness.
- Deployed to a public URL the frontend consumes.
