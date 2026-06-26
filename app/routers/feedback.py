import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Header, status
from app.db import get_db
from app.schemas import FeedbackRequest, FeedbackResponse
from app.utils.errors import AppError

router = APIRouter(tags=["Feedback"])

@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def post_feedback(
    body: FeedbackRequest,
    x_device_id: str = Header(..., alias="X-Device-Id")
):
    """
    Submit feedback on a diagnosis. Stores scan assessment, notes,
    and checks if corrected slug is missing when disagreed.
    """
    db = get_db()
    
    # 1. Verify scan exists
    scan = await db.scans.find_one({"_id": body.scan_id})
    if not scan:
        scan = await db.scans.find_one({"scan_id": body.scan_id})
    if not scan:
        raise AppError(
            status_code=404,
            code="NOT_FOUND",
            message=f"Scan with ID {body.scan_id} not found."
        )
        
    # 2. Flag if disagreed and corrected_slug is missing
    flagged = False
    if not body.agreed and not body.corrected_slug:
        flagged = True
        
    feedback_id = f"feedback_{uuid.uuid4().hex[:16]}"
    
    feedback_doc = {
        "_id": feedback_id,
        "feedback_id": feedback_id,
        "scan_id": body.scan_id,
        "device_id": x_device_id,
        "agreed": body.agreed,
        "corrected_slug": body.corrected_slug,
        "note": body.note,
        "flagged_incomplete": flagged,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.feedback.insert_one(feedback_doc)
    
    return FeedbackResponse(
        feedback_id=feedback_id,
        scan_id=body.scan_id,
        received=True
    )
