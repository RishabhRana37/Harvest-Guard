from fastapi import Request
from slowapi import Limiter

def device_id_or_ip_key_generator(request: Request) -> str:
    """
    Generate rate limiting key using X-Device-Id header,
    falling back to request client IP.
    """
    device_id = request.headers.get("X-Device-Id")
    if device_id:
        return device_id
    client = request.client
    if client:
        return client.host
    return "127.0.0.1"

limiter = Limiter(
    key_func=device_id_or_ip_key_generator,
    default_limits=["30/minute"]
)
