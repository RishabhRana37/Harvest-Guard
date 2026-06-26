import numpy as np

def calculate_severity(
    heatmap: np.ndarray, 
    is_healthy: bool, 
    threshold: float = 0.5
) -> tuple[str, int | None]:
    """
    Calculate severity level ("healthy", "mild", or "severe") and urgency_days
    based on the class activation map (heatmap) and health status.
    
    If the predicted class is healthy:
      - returns ("healthy", None)
    If the fraction of high activation pixels (>= threshold) is >= 30%:
      - returns ("severe", 1)
    Otherwise:
      - returns ("mild", 3)
    """
    if is_healthy:
        return "healthy", None
        
    total_pixels = heatmap.size
    active_pixels = np.sum(heatmap >= threshold)
    fraction = active_pixels / total_pixels
    
    if fraction >= 0.30:
        return "severe", 1
    else:
        return "mild", 3
