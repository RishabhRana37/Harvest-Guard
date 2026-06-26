from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class Prediction(BaseModel):
    slug: str
    crop: str
    name: str
    prob: float

class Treatment(BaseModel):
    action: str
    dosage: str
    frequency: str
    safety: str

class TreatmentPlan(BaseModel):
    organic: List[Treatment] = Field(default_factory=list)
    chemical: List[Treatment] = Field(default_factory=list)
    prevention: List[str] = Field(default_factory=list)

class Disease(BaseModel):
    slug: str
    crop: str
    name: str
    pathogen: str
    is_healthy: bool
    symptoms: List[str] = Field(default_factory=list)
    cause: str
    lifecycle: str
    treatments: TreatmentPlan
    confused_with: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

class DiagnosisResult(BaseModel):
    scan_id: str
    created_at: datetime
    is_leaf: bool
    is_confident: bool
    confidence: Optional[float] = None
    confidence_band: Optional[str] = None  # "high" | "medium" | "low"
    severity: Optional[str] = None         # "healthy" | "mild" | "severe"
    urgency_days: Optional[int] = None
    prediction: Optional[Prediction] = None
    top_k: List[Prediction] = Field(default_factory=list)
    heatmap: Optional[str] = None          # base64 data URI
    disease: Optional[Disease] = None

class DiseaseListResponse(BaseModel):
    items: List[Disease]
    page: int
    page_size: int
    total: int

