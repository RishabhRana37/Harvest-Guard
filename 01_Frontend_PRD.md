# Frontend PRD — CropDoc AI (ZenVerse)
### Crop Disease Diagnosis from Photo using AI · Web + Mobile (PWA)

**Owner:** Frontend Lead (Rishabh Rana)
**Team:** ZenVerse — Jai Karthick · Rishabh Rana
**Status:** Draft v1.0 · Hackathon build
**Companion docs:** `02_Backend_PRD.md`, `03_API_Contract.md`

---

## 1. Purpose & Scope

The frontend is a **mobile-first Progressive Web App (PWA)** that lets a farmer photograph a crop leaf and receive, in under three seconds, a clear diagnosis, a confidence-rated heatmap of *where* the disease is, a severity grade, and a localized treatment plan — without needing an agronomist.

This document specifies every screen, state, interaction, design token, and acceptance criterion for the client. It is written so the frontend can be built **in parallel** with the backend against the shared `03_API_Contract.md` using mock fixtures.

**In scope (hackathon MVP):** capture/upload, live analysis state, diagnosis result with explainability, treatment plan, disease library, scan history, low-confidence and offline handling, installable PWA shell, language toggle scaffold.

**Out of scope (roadmap, called out in §16):** full offline on-device inference, voice assistant, IoT/weather overlays, multi-user accounts with cloud sync, drone integration.

---

## 2. Why This Wins (Frontend's Job in the Demo)

Judges score on **innovation, technical clarity, viability, and human impact**. The frontend carries three of those four. The differentiators we commit to building:

1. **Explainability that's visible, not claimed.** A Grad-CAM heatmap overlaid on the user's own photo, with an opacity slider. Most teams show a label and a number; we show the model *pointing at the lesion*. This is the single biggest "wow" lever and it lives in the UI.
2. **Honesty under uncertainty.** When the model isn't sure or the photo isn't a leaf, we say so and coach a re-take — instead of confidently mislabeling. This reads as engineering maturity and directly supports the deck's "prevents false alarms" USP.
3. **Built for the actual user.** Large tap targets, icon-forward design, severity color-coding, and a 2-tap path from "open app" to "diagnosis." The deck's "Universal Access" claim has to be felt in 10 seconds of demo, not described on a slide.

---

## 3. Target Users & Personas

| Persona | Context | Needs from the UI |
|---|---|---|
| **Ravi — smallholder farmer** | Low-end Android, intermittent 4G, limited literacy, in the field, bright sunlight | One obvious action, big buttons, minimal text, fast result, works on a cracked screen in sunlight |
| **Sunita — agri-extension worker** | Visits multiple farms, slightly more tech-comfortable | Scan many crops, review history, trust the confidence/severity, share a result |
| **Judge / evaluator** | Reviews the demo for 3–5 minutes | Sees the full loop instantly, understands the AI is real (heatmap), notices the polish |

Design decisions optimize for **Ravi first**; Sunita and the judge are served by the same simplicity plus a History view.

---

## 4. Design Principles

1. **One primary action per screen.** The home screen has exactly one hero CTA: capture/upload.
2. **Show, don't tell.** Severity, confidence, and disease location are visual (color, heatmap, gauge), not buried in paragraphs.
3. **Speak the result plainly.** "Tomato — Early Blight (87% confident). Act within 3 days." No jargon as the headline; jargon available on tap.
4. **Fail gracefully, loudly, and helpfully.** Every failure (no net, blurry, not-a-leaf, low confidence) has a designed state with a recovery action.
5. **Thumb-reachable.** Primary actions sit in the bottom 40% of the viewport.

---

## 5. Visual Design System

A content-informed palette — agronomy greens dominant, a clinical-blue accent for "AI," and a severity scale that doubles as the product's information layer.

### 5.1 Color Tokens
```
--green-900: #143A1B   /* deep forest — dark surfaces, headers      */
--green-700: #2C5F2D   /* forest — primary brand, primary buttons   */
--green-500: #4F9D52   /* leaf — active/hover                       */
--moss-400:  #97BC62   /* moss — secondary, subtle fills            */
--sage-100:  #EAF2E3   /* light surface tint                        */

--ai-blue-500: #2D6CDF /* "AI" accent — heatmap legend, confidence  */

/* Severity scale (also used for diagnosis result chrome) */
--sev-healthy: #2EA44F  /* green  */
--sev-mild:    #E8A23D  /* amber  */
--sev-severe:  #D64545  /* red    */

--surface:     #FFFFFF
--surface-alt: #F6F8F4
--text-strong: #16241A
--text-muted:  #5B6B5E
--border:      #E1E7DE
```

### 5.2 Typography
- **Headings:** Inter / system-ui, 600–700. Result headline 28–32px.
- **Body:** Inter 400–500, 16px minimum (never below 14px — field readability).
- **Numbers (confidence, severity %):** tabular figures, 600.

### 5.3 Spacing & Shape
- 8px base grid. Card radius 16px. Button radius 12px. Min tap target **48×48px**.
- Screen gutters 16px mobile / 24px tablet.

### 5.4 Motif
Rounded "leaf-card" containers with a soft drop shadow; a single repeating leaf glyph for brand moments. No accent stripes or underlines.

### 5.5 Theme
Light theme is default (sunlight legibility). Dark theme is a stretch goal; tokens above already support it via `--green-900` surfaces.

---

## 6. Information Architecture

```
App Shell (installable PWA)
├─ Onboarding (first launch only) — 3 cards, skippable
├─ Home / Capture           [primary]
│   └─ Camera & Upload, capture-quality coaching
├─ Analyzing (transient)    — progress + cancel
├─ Result                   [core screen]
│   ├─ Diagnosis header (crop · disease · confidence · severity)
│   ├─ Photo + Grad-CAM overlay (opacity slider, toggle)
│   ├─ Treatment plan (organic / chemical / prevention tabs)
│   ├─ Low-confidence banner (conditional)
│   └─ Actions: Save · Share · New scan · Disease detail
├─ Disease Detail / Library
│   ├─ Disease index (search + crop filter)
│   └─ Disease page (symptoms, causes, lifecycle, treatments)
├─ History / Dashboard
│   └─ Recent scans (thumbnail, disease, date, severity chip)
└─ Settings
    └─ Language toggle (scaffold), about, clear history
```

Bottom navigation (3 items): **Scan** (home), **History**, **Library**. Settings via top-right gear.

---

## 7. Screen-by-Screen Specification

### 7.1 Onboarding (first launch)
- 3 swipeable cards: *Snap a leaf → Get a diagnosis → Treat in time*. Each is one illustration + one line.
- "Skip" top-right; "Get started" on last card. Persisted in `localStorage` so it shows once.
- **Acceptance:** never blocks a returning user; fully skippable; ≤3 cards.

### 7.2 Home / Capture `[primary]`
- **Hero CTA:** a large circular **"Scan a leaf"** button (camera icon), center-low. Mirrors the deck mock's green upload disc.
- Two entry paths: **Take photo** (opens device camera via `capture="environment"`) and **Upload** (gallery / file).
- **Capture coaching:** a one-line tip above the button — "Fill the frame with one leaf, good light, steady hands." A dismissible card.
- Below CTA: a horizontally scrollable strip of the **3 most recent scans** (thumbnail + disease chip), tappable to their Result.
- Empty state (no scans yet): friendly leaf illustration + "Your scans will appear here."
- **States:** idle · camera-permission-denied (show how to enable) · file-too-large (auto-compress, see §10).
- **Acceptance:** from cold open to camera in ≤2 taps; works without any prior scan.

### 7.3 Image Pre-check (client-side, pre-upload)
Before calling the API, run cheap local checks to save a round-trip and improve result quality:
- **Resize & compress** to max 1280px long edge, JPEG q≈0.8 (see §10).
- **Blur heuristic** (variance-of-Laplacian via a small canvas pass): if very blurry, show "Photo looks blurry — retake?" with *Use anyway* / *Retake*.
- **Acceptance:** compression always runs; blur prompt is advisory, never blocking.

### 7.4 Analyzing (transient)
- Full-screen state: the captured photo dimmed, a scanning shimmer sweeping across it, and a status line cycling: *Uploading → Analyzing leaf → Identifying disease → Preparing treatment*.
- A **Cancel** affordance aborts the request (AbortController) and returns Home.
- Show a skeleton if it exceeds ~1.2s; if it exceeds ~8s, surface a soft "Still working… check your connection" with retry.
- **Acceptance:** never an indefinite spinner; cancel always works; status text maps to real request lifecycle, not fake steps.

### 7.5 Result `[core]`
The most important screen. Layout top→bottom:

1. **Diagnosis header card** (color-themed by severity):
   - Crop name + disease name (plain language), e.g. *Tomato · Early Blight*.
   - **Confidence gauge** (e.g., 87%) with a label band: High ≥80 / Medium 60–79 / Low <60.
   - **Severity chip:** Healthy / Mild / Severe, color-coded; if diseased, a "**Act within ~N days**" urgency line tying to the deck's <3-day window.
2. **Evidence block:**
   - The user's photo with a **Grad-CAM heatmap overlay**. A toggle (Photo / Heatmap) and an **opacity slider** (0–100%). A short caption: "Red areas most influenced the diagnosis."
   - Legend: cool→warm gradient with the `--ai-blue-500`/`--sev-severe` ends.
3. **Top-3 predictions** (collapsible): the alternate classes with their probabilities, for transparency.
4. **Treatment plan** (tabbed): **Organic · Chemical · Prevention**. Each item: action, dosage/frequency, and a safety note. Sourced from the API's enriched payload.
5. **Actions:** Save (to history) · Share (Web Share API → image+summary) · New scan · "Learn more" → Disease Detail.
6. **Conditional low-confidence banner** (see §8.2).

- **Acceptance:** heatmap overlay renders and the opacity slider works on a mid-range Android; treatment tabs populated from API; share produces a legible summary; healthy result suppresses urgency/treatment and shows a positive confirmation state.

### 7.6 Disease Detail / Library
- **Index:** search box + crop filter chips (Rice, Wheat, Potato, Tomato, …). Grid of disease cards (name, crop, thumbnail).
- **Disease page:** hero image, symptoms, cause/pathogen, disease lifecycle, full treatment (organic/chemical/prevention), and "commonly confused with" links. Data from `GET /diseases/{slug}`.
- **Acceptance:** library is browsable offline once cached; deep-link from a Result lands on the right disease.

### 7.7 History / Dashboard
- Reverse-chronological list of saved scans: thumbnail, crop·disease, date, severity chip, confidence.
- Filter by crop and by severity. Tap → re-open that Result (cached).
- **Storage strategy:** MVP stores history client-side (IndexedDB) keyed by scan id; if backend auth is enabled, it syncs via `GET /scans`. (See §11.)
- Empty state + "Clear history" in Settings.
- **Acceptance:** a saved scan survives refresh and app reinstall-as-PWA within the same browser profile (IndexedDB), and reopens without a network call.

### 7.8 Settings
- Language toggle (English + one regional language **scaffold** — strings externalized via i18n even if only English is filled for MVP).
- About / team / version. Clear history. Reinstall prompt.

---

## 8. Key Flows

### 8.1 Happy path
Open → Scan → (auto compress) → Analyzing → Result (high confidence, heatmap, treatment) → Save. Target perceived time to result: **≤3s** on 4G.

### 8.2 Low-confidence path
If `confidence_band == "low"` or API returns `is_confident: false`:
- Result still renders, but the header switches to a **muted, cautionary** treatment; a banner reads: "Not fully sure — this may be *{topClass}*. For a clearer result, retake in better light, one leaf, filling the frame." CTA: **Retake**.
- Treatment plan is collapsed by default with a "tentative" tag.

### 8.3 Not-a-leaf / out-of-distribution path
If API returns `is_leaf: false` (OOD gate, see Backend PRD):
- No diagnosis shown. Friendly state: "That doesn't look like a crop leaf. Point the camera at a single leaf." CTA: **Try again**. (Prevents the classic demo failure of confidently labeling a hand or wall.)

### 8.4 Offline path
- App shell, library (cached), and history load offline (service worker + IndexedDB).
- Capturing offline: photo is stored and **queued**; a banner shows "Saved — will diagnose when you're back online." On reconnect, queued images auto-submit (Background Sync where supported, else on next app focus).
- **Acceptance:** capturing offline never throws; the queued item appears in History as "Pending."

### 8.5 Error path
- Network/5xx: toast + inline retry on the Analyzing screen, request preserved.
- 413 (too large): shouldn't happen post-compression, but if so, re-compress harder and retry once automatically.
- 422 (bad image): route to the not-a-leaf state.

---

## 9. Component Inventory (build list)

| Component | Notes |
|---|---|
| `AppShell` / `BottomNav` | 3-tab nav + top bar |
| `ScanButton` | hero capture CTA, camera/upload |
| `CapturePreview` | shows photo, runs compression + blur check |
| `AnalyzingOverlay` | lifecycle status, cancel |
| `DiagnosisHeader` | crop/disease, confidence gauge, severity chip, urgency |
| `ConfidenceGauge` | radial/linear gauge with bands |
| `HeatmapViewer` | photo + Grad-CAM layer, toggle + opacity slider |
| `PredictionList` | top-3 alternates |
| `TreatmentTabs` | organic / chemical / prevention |
| `LowConfidenceBanner` / `OODState` | conditional states |
| `DiseaseCard` / `DiseasePage` | library |
| `HistoryList` / `ScanRow` | dashboard |
| `LanguageToggle` | i18n scaffold |
| `Toast` / `EmptyState` / `Skeleton` | shared |

---

## 10. Performance Budget

- **Time to interactive (home):** < 2.5s on a mid-range Android over 4G.
- **Perceived time to result:** ≤ 3s (compression + upload + inference + render).
- **Client image compression (mandatory before upload):** downscale to ≤1280px long edge, JPEG ~0.8, target ≤ 400KB. This is the single biggest lever on the "<3s" claim — a raw 8MP phone photo otherwise dominates latency.
- **Bundle:** initial route ≤ ~200KB gzip; lazy-load Library and History routes.
- **Images:** lazy-loaded, width-appropriate, `loading="lazy"`.
- **No layout shift** on result render (reserve heatmap/photo box dimensions).

---

## 11. State, Data & Caching

- **Server state:** TanStack Query (React Query) for all API calls — caching, retries, request cancellation.
- **Local persistence:** IndexedDB (via `idb`) for scan history and the offline queue; `localStorage` for lightweight prefs (onboarding seen, language, last crop filter).
- **No secrets in the client.** API base URL via build-time env (`VITE_API_BASE_URL`).
- **Cache keys** align to the API contract (`/diseases`, `/scans`) so background refresh is trivial.

> Note: `localStorage`/IndexedDB are used because this is a real deployed app, not a sandboxed canvas — browser storage is fully available in the production environment.

---

## 12. PWA & Offline Strategy

- `vite-plugin-pwa` (Workbox) for the service worker.
- **Precache** app shell + core icons + the disease library JSON.
- **Runtime caching:** `GET /diseases*` stale-while-revalidate; images cache-first with expiration.
- **Installable:** valid manifest (name, icons 192/512, theme `#2C5F2D`, `display: standalone`), Add-to-Home-Screen prompt after first successful diagnosis.
- **Background Sync** for the offline diagnosis queue where supported.

---

## 13. Accessibility & Inclusivity

- Minimum 48px targets; 16px+ body; WCAG AA contrast on all text/severity chrome.
- Every icon paired with a text label; no color-only meaning (severity also carries an icon + word).
- Full keyboard navigation and ARIA roles for the web build; focus states visible.
- i18n from day one (strings externalized) so regional-language support (roadmap) is a content task, not a refactor.
- Heatmap is decorative-augmenting, never the *only* carrier of meaning — the textual diagnosis is always present.

---

## 14. Tech Stack

| Concern | Choice |
|---|---|
| Framework | **React 18 + Vite + TypeScript** |
| Styling | **Tailwind CSS** + CSS variables (tokens above) |
| Animation | **Framer Motion** (analyzing shimmer, result reveal, tab transitions) |
| Server state | **TanStack Query** |
| Local storage | **IndexedDB (`idb`)** + `localStorage` |
| PWA | **vite-plugin-pwa / Workbox** |
| Image handling | Canvas-based resize/compress (`browser-image-compression` or hand-rolled) |
| Charts/gauge | lightweight SVG (no heavy chart lib needed) |
| i18n | `react-i18next` (scaffold) |
| Routing | React Router |

> **Deck alignment:** the deck lists React.js · HTML5 · CSS3 · Tailwind for "Web & Mobile Application." This PRD realizes that as a single React+Vite **PWA** that satisfies both web and mobile from one codebase — defensible to judges as a deliberate scope choice that ships in the hackathon window.

---

## 15. Hackathon Build Milestones (frontend track)

| Phase | Deliverable | "Done" means |
|---|---|---|
| **M0 — Setup** | Vite+TS+Tailwind, routing, design tokens, mock API layer | App runs against `03_API_Contract.md` fixtures |
| **M1 — Capture loop** | Home, camera/upload, compression, Analyzing | Can submit a photo to a stub and see a stubbed result |
| **M2 — Result screen** | DiagnosisHeader, ConfidenceGauge, HeatmapViewer, TreatmentTabs | Heatmap overlay + slider working on a phone |
| **M3 — States & robustness** | low-confidence, OOD, offline queue, errors | All four edge flows have designed, tested states |
| **M4 — Library + History** | disease index/detail, history dashboard | Browsable offline; deep-links work |
| **M5 — Polish + PWA** | install prompt, motion, empty states, share | Installs to home screen; demo script runs clean twice |

Wire to the real backend as soon as `POST /diagnose` is live; until then, the mock layer keeps the frontend unblocked.

---

## 16. Roadmap (post-hackathon, mirrors deck "Future Scope")
- **On-device offline inference** via TensorFlow.js / TFLite (true offline diagnosis, not just queueing).
- **Voice + regional languages** (fill the i18n scaffold; add TTS for results).
- **IoT/weather overlays** influencing severity/urgency.
- **Accounts + cloud history sync**; agronomist-verified feedback loop feeding model retraining.

---

## 17. Definition of Done (frontend)
- All §7 screens implemented with their specified states.
- The four edge flows in §8 are demonstrable.
- Performance budget §10 met on a mid-range Android.
- Installs as a PWA; library + history usable offline.
- Conforms exactly to `03_API_Contract.md` (no undocumented fields consumed).
- Demo script executes twice consecutively without a manual reset.
