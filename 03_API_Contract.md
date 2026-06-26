# API Contract — CropDoc AI (ZenVerse)
### Single source of truth for the Frontend ⇄ Backend interface

**Status:** v1.0 · Hackathon build
**Companion docs:** `01_Frontend_PRD.md`, `02_Backend_PRD.md`
**Rule:** the frontend MUST NOT consume any field not defined here; the backend MUST NOT return shapes that contradict it. Change this doc first, then both sides.

---

## 1. Conventions

| Item | Value |
|---|---|
| **Base URL** | `https://<host>/api/v1` |
| **Versioning** | URL-path (`/v1`); breaking changes → `/v2` |
| **Content type** | `application/json` for all responses; `multipart/form-data` for image upload |
| **Encoding** | UTF-8 |
| **Timestamps** | ISO-8601 UTC, e.g. `2026-06-24T10:15:30Z` |
| **IDs** | string (Mongo ObjectId hex) |
| **Identity (MVP)** | anonymous `X-Device-Id` header (UUID generated client-side); no login required |
| **Heatmap/images** | returned **inline as base64 data URIs** to keep the client simple |

### 1.1 Standard headers
```
X-Device-Id: <uuid>          # required on /diagnose, /scans, /feedback
Content-Type: ...            # per endpoint
```

### 1.2 Success envelope
Endpoints return the resource directly (no wrapper) for simplicity, except lists which include pagination:
```json
{ "items": [ ... ], "page": 1, "page_size": 20, "total": 137 }
```

### 1.3 Error envelope (uniform)
```json
{
  "error": {
    "code": "INVALID_IMAGE",
    "message": "The uploaded file could not be read as an image.",
    "request_id": "req_8f2a..."
  }
}
```

### 1.4 Error codes
| HTTP | `code` | Meaning |
|---|---|---|
| 413 | `IMAGE_TOO_LARGE` | File exceeds max upload size (8MB) |
| 415 | `UNSUPPORTED_MEDIA` | Mime not in jpeg/png/webp |
| 422 | `INVALID_IMAGE` | Missing or undecodable image |
| 429 | `RATE_LIMITED` | Too many requests |
| 503 | `MODEL_UNAVAILABLE` | Model not loaded/ready |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

> **Note:** an out-of-distribution image (not a leaf) is **NOT an error**. It returns **200** with `is_leaf: false` (see §3.1).

---

## 2. Shared Schemas

### 2.1 `Prediction`
```json
{ "slug": "tomato-early-blight", "crop": "Tomato", "name": "Early Blight", "prob": 0.87 }
```

### 2.2 `Treatment`
```json
{ "action": "Neem oil spray", "dosage": "5 ml/L", "frequency": "every 7 days", "safety": "Apply in the evening" }
```

### 2.3 `TreatmentPlan`
```json
{
  "organic":   [ { "action": "...", "dosage": "...", "frequency": "...", "safety": "..." } ],
  "chemical":  [ { "action": "...", "dosage": "...", "frequency": "...", "safety": "..." } ],
  "prevention":[ "Crop rotation", "Remove infected debris" ]
}
```

### 2.4 `Disease`
```json
{
  "slug": "tomato-early-blight",
  "crop": "Tomato",
  "name": "Early Blight",
  "pathogen": "Alternaria solani",
  "is_healthy": false,
  "symptoms": ["Concentric brown rings on lower leaves", "Yellow halos"],
  "cause": "Fungal; favored by warm, humid conditions",
  "lifecycle": "Spreads via spores in 7–10 day cycles",
  "treatments": { "...": "TreatmentPlan" },
  "confused_with": ["tomato-late-blight"],
  "image_url": "https://.../tomato_early_blight.jpg"
}
```

### 2.5 `DiagnosisResult` (core)
```json
{
  "scan_id": "665f1c2a9b...",
  "created_at": "2026-06-24T10:15:30Z",
  "is_leaf": true,
  "is_confident": true,
  "confidence": 0.87,
  "confidence_band": "high",         // "high" | "medium" | "low"
  "severity": "mild",                // "healthy" | "mild" | "severe"
  "urgency_days": 3,                 // null when healthy
  "prediction": { "...": "Prediction" },
  "top_k": [ { "...": "Prediction" } ],
  "heatmap": "data:image/png;base64,iVBORw0KGgo...",  // Grad-CAM overlay
  "disease": { "...": "Disease" }    // enriched KB record; null if is_leaf=false
}
```

Field rules:
- `confidence` ∈ [0,1]; `confidence_band` derived (high ≥0.80, medium 0.60–0.79, low <0.60).
- `is_confident=false` ⇒ frontend shows the low-confidence path; result still rendered.
- `is_leaf=false` ⇒ `prediction`, `top_k`, `disease`, `heatmap`, `severity` may be null; frontend shows the OOD state.
- `severity="healthy"` ⇒ `urgency_days=null`, `disease.is_healthy=true`, treatments may be empty.

---

## 3. Endpoints

### 3.1 `POST /diagnose` — Image → diagnosis  ★core
Submit a leaf photo, get a full diagnosis.

**Auth:** `X-Device-Id` required.
**Request:** `multipart/form-data`
| field | type | required | notes |
|---|---|---|---|
| `image` | file | yes | jpeg/png/webp, ≤8MB (client pre-compresses) |
| `crop_hint` | string | no | optional crop the user selected, improves UX copy |

**cURL**
```bash
curl -X POST https://host/api/v1/diagnose \
  -H "X-Device-Id: 9f1c-..." \
  -F "image=@leaf.jpg" \
  -F "crop_hint=tomato"
```

**200 — confident diagnosis**
```json
{
  "scan_id": "665f1c2a9b3e",
  "created_at": "2026-06-24T10:15:30Z",
  "is_leaf": true,
  "is_confident": true,
  "confidence": 0.87,
  "confidence_band": "high",
  "severity": "mild",
  "urgency_days": 3,
  "prediction": { "slug":"tomato-early-blight","crop":"Tomato","name":"Early Blight","prob":0.87 },
  "top_k": [
    { "slug":"tomato-early-blight","crop":"Tomato","name":"Early Blight","prob":0.87 },
    { "slug":"tomato-late-blight","crop":"Tomato","name":"Late Blight","prob":0.07 },
    { "slug":"tomato-healthy","crop":"Tomato","name":"Healthy","prob":0.04 }
  ],
  "heatmap": "data:image/png;base64,iVBORw0KGgo...",
  "disease": {
    "slug":"tomato-early-blight","crop":"Tomato","name":"Early Blight",
    "pathogen":"Alternaria solani","is_healthy":false,
    "symptoms":["Concentric brown rings on lower leaves","Yellow halos"],
    "cause":"Fungal; favored by warm, humid conditions",
    "lifecycle":"Spreads via spores in 7–10 day cycles",
    "treatments":{
      "organic":[{"action":"Neem oil spray","dosage":"5 ml/L","frequency":"every 7 days","safety":"Apply in the evening"}],
      "chemical":[{"action":"Chlorothalonil","dosage":"2 g/L","frequency":"every 10 days","safety":"Wear gloves; 7-day PHI"}],
      "prevention":["Crop rotation","Remove infected debris","Drip irrigation to keep leaves dry"]
    },
    "confused_with":["tomato-late-blight"],
    "image_url":"https://.../tomato_early_blight.jpg"
  }
}
```

**200 — low confidence**
```json
{
  "scan_id":"665f1c2a9b40","created_at":"2026-06-24T10:16:00Z",
  "is_leaf":true,"is_confident":false,"confidence":0.48,"confidence_band":"low",
  "severity":"mild","urgency_days":3,
  "prediction":{"slug":"potato-late-blight","crop":"Potato","name":"Late Blight","prob":0.48},
  "top_k":[{"slug":"potato-late-blight","crop":"Potato","name":"Late Blight","prob":0.48},
           {"slug":"potato-early-blight","crop":"Potato","name":"Early Blight","prob":0.31}],
  "heatmap":"data:image/png;base64,...",
  "disease":{ "...": "tentative disease record" }
}
```

**200 — not a leaf (OOD)**
```json
{
  "scan_id":"665f1c2a9b41","created_at":"2026-06-24T10:16:20Z",
  "is_leaf":false,"is_confident":false,"confidence":null,"confidence_band":null,
  "severity":null,"urgency_days":null,
  "prediction":null,"top_k":[],"heatmap":null,"disease":null
}
```

**healthy result**
```json
{ "...": "is_leaf:true, is_confident:true, severity:'healthy', urgency_days:null, disease.is_healthy:true" }
```

**Errors:** `413 IMAGE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA`, `422 INVALID_IMAGE`, `429 RATE_LIMITED`, `503 MODEL_UNAVAILABLE`.

---

### 3.2 `GET /diseases` — list / search the knowledge base
**Auth:** none.
**Query params:**
| param | type | default | notes |
|---|---|---|---|
| `crop` | string | — | filter by crop (e.g. `tomato`) |
| `q` | string | — | free-text search on name/symptoms |
| `page` | int | 1 | |
| `page_size` | int | 20 | max 50 |

**200**
```json
{
  "items": [
    { "slug":"tomato-early-blight","crop":"Tomato","name":"Early Blight","is_healthy":false,"image_url":"https://..." },
    { "slug":"tomato-healthy","crop":"Tomato","name":"Healthy","is_healthy":true,"image_url":"https://..." }
  ],
  "page":1,"page_size":20,"total":38
}
```
> List items are a **lightweight** `Disease` (slug, crop, name, is_healthy, image_url) for fast rendering; full record via §3.3.

---

### 3.3 `GET /diseases/{slug}` — disease detail
**Auth:** none.
**200:** full `Disease` (§2.4).
**404:** `{ "error": { "code":"NOT_FOUND","message":"Unknown disease slug." } }`

```bash
curl https://host/api/v1/diseases/tomato-early-blight
```

---

### 3.4 `GET /scans` — history for this device
**Auth:** `X-Device-Id` required.
**Query:** `page`, `page_size`, optional `crop`, `severity`.

**200**
```json
{
  "items": [
    {
      "scan_id":"665f1c2a9b3e","created_at":"2026-06-24T10:15:30Z",
      "predicted":{"slug":"tomato-early-blight","crop":"Tomato","name":"Early Blight","prob":0.87},
      "confidence":0.87,"confidence_band":"high","severity":"mild","is_leaf":true,
      "thumb_url":"https://.../thumb.jpg"
    }
  ],
  "page":1,"page_size":20,"total":12
}
```

> MVP note: if the backend does not persist images, the frontend keeps its own thumbnails in IndexedDB and uses `/scans` only for cross-device echo. Either way the `scan_id` is the join key.

---

### 3.5 `GET /scans/{id}` — single scan
**Auth:** `X-Device-Id` required (must own the scan).
**200:** a full `DiagnosisResult` (§2.5) so the result screen re-renders without re-inference.
**404:** `NOT_FOUND`. **403:** `FORBIDDEN` (device mismatch).

---

### 3.6 `POST /feedback` — was the diagnosis right?
Captures agree/disagree for future active learning. Powers a tiny "Was this correct? 👍/👎" control on the Result screen.

**Auth:** `X-Device-Id` required.
**Body** `application/json`
```json
{ "scan_id":"665f1c2a9b3e", "agreed": false, "corrected_slug":"tomato-late-blight", "note":"looked oily/dark" }
```
| field | type | required |
|---|---|---|
| `scan_id` | string | yes |
| `agreed` | boolean | yes |
| `corrected_slug` | string | no (required-ish when `agreed=false`) |
| `note` | string | no |

**201**
```json
{ "feedback_id":"665f...","scan_id":"665f1c2a9b3e","received":true }
```

---

### 3.7 `GET /health` — liveness/readiness
**Auth:** none.
**200**
```json
{ "status":"ok", "model_loaded": true, "db": "connected", "version": "1.0.0" }
```
**503** when `model_loaded:false` (use for readiness gating on deploy).

---

## 4. Rate Limiting
- Default **30 requests/min per `X-Device-Id`** (and per-IP). On breach: `429 RATE_LIMITED` with `Retry-After` header (seconds).

## 5. Pagination
- `page` (1-based), `page_size` (max 50). Responses always include `page`, `page_size`, `total`.

## 6. CORS
- Only the deployed frontend origin(s) are allowed. Preflight supported on all mutating endpoints.

## 7. Mocking (unblocks parallel dev)
The frontend builds against fixtures shaped exactly like §3 responses **before** the model exists. Provide:
- `fixtures/diagnose.confident.json`, `diagnose.lowconf.json`, `diagnose.notleaf.json`, `diagnose.healthy.json`
- `fixtures/diseases.list.json`, `fixtures/disease.detail.json`, `fixtures/scans.list.json`
A trivial mock server (or MSW handlers) returns these so Frontend M1–M3 proceed without the backend.

## 8. Versioning & Change Policy
- Additive fields are non-breaking; the frontend ignores unknown fields gracefully.
- Removing/renaming a field or changing its type/semantics is **breaking** → bump to `/v2` and update this doc first.

## 9. Endpoint Quick-Reference
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/diagnose` | device | image → diagnosis (core) |
| GET | `/diseases` | none | list/search KB |
| GET | `/diseases/{slug}` | none | disease detail |
| GET | `/scans` | device | history |
| GET | `/scans/{id}` | device | single scan (full result) |
| POST | `/feedback` | device | agree/disagree |
| GET | `/health` | none | readiness |

## 10. Changelog
- **v1.0** — initial contract: diagnose, diseases, scans, feedback, health; OOD-as-200 convention; base64 heatmap; anonymous device identity.
