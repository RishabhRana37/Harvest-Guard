import logging
import contextvars
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")

# Context variable to hold the request_id throughout the request lifecycle
request_id_var = contextvars.ContextVar("request_id", default="req_unknown")

class AppError(Exception):
    """
    Custom application exception that represents known business logic or validation failures.
    """
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message

def make_error_response(status_code: int, code: str, message: str, request_id: str) -> JSONResponse:
    """Format and return the standard error envelope JSON."""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": request_id
            }
        }
    )

async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = request_id_var.get()
    return make_error_response(exc.status_code, exc.code, exc.message, request_id)

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = request_id_var.get()
    
    # Map status codes to specific error codes from the contract
    code = "INTERNAL_ERROR"
    if exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 413:
        code = "IMAGE_TOO_LARGE"
    elif exc.status_code == 415:
        code = "UNSUPPORTED_MEDIA"
    elif exc.status_code == 422:
        code = "INVALID_IMAGE"
    elif exc.status_code == 429:
        code = "RATE_LIMITED"
    elif exc.status_code == 503:
        code = "MODEL_UNAVAILABLE"
        
    return make_error_response(exc.status_code, code, str(exc.detail), request_id)

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = request_id_var.get()
    
    # Formulate validation error message details
    errors = exc.errors()
    msg_parts = []
    for err in errors:
        loc = ".".join(str(p) for p in err["loc"])
        msg_parts.append(f"{loc}: {err['msg']}")
    message = "Validation failed: " + "; ".join(msg_parts)
    
    # Mapping request validation failures under 422 to "INVALID_IMAGE" as per user requirements
    return make_error_response(422, "INVALID_IMAGE", message, request_id)

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request_id_var.get()
    logger.error(f"Unhandled exception encountered: {exc}", exc_info=True)
    return make_error_response(
        500, 
        "INTERNAL_ERROR", 
        "An unexpected internal error occurred on the server.", 
        request_id
    )
