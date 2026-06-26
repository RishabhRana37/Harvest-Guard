# CropDoc AI (Harvest-Guard) Backend

This is the FastAPI backend service for **CropDoc AI** (Harvest-Guard), an AI-powered crop disease detection API.

## Project Structure
```text
app/
  main.py            # FastAPI app, lifespan, CORS, router includes, /api/v1 prefix
  config.py          # pydantic-settings configurations
  schemas.py         # ALL Pydantic v2 model schemas
  db.py              # Motor client & connection getter
  routers/
    health.py        # Health route (/health)
    diagnose.py      # Diagnosis route (/diagnose)
  utils/
    errors.py        # AppError and uniform error envelope middleware/handlers
requirements.txt
.env.example
README.md
```

## Stack
- Python 3.11+
- FastAPI (async)
- Uvicorn
- Pydantic v2
- Motor (async MongoDB)
- Pillow (image processing)

## Installation & Setup

1. **Create and Activate a Virtual Environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment:**
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

## Running the Server
To launch the FastAPI development server:
```bash
uvicorn app.main:app --reload --port 8000
```
Open `http://localhost:8000/docs` in your browser to view the interactive Swagger API documentation.

## Running Tests
To run the automated integration tests:
```bash
PYTHONPATH=. pytest app/tests/
```
