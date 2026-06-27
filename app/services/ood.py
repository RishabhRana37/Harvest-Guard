import cv2
import numpy as np

def check_is_leaf(original_image_np: np.ndarray, max_prob: float, entropy: float) -> bool:
    """
    Detects if the input image is a leaf based on color heuristics (HSV green fraction)
    and prediction certainty (max probability and entropy).
    
    Returns is_leaf: bool. If green fraction is extremely low (< 5%) and the model's
    max calibrated probability is low (< 60%), it is flagged as not a leaf.
    """
    # Convert RGB image to HSV
    hsv = cv2.cvtColor(original_image_np, cv2.COLOR_RGB2HSV)
    
    # Green HSV bounds: H in [25, 95], S >= 40, V >= 40
    lower_green = np.array([25, 40, 40])
    upper_green = np.array([95, 255, 255])
    
    green_mask = cv2.inRange(hsv, lower_green, upper_green)
    green_pixels = np.sum(green_mask > 0)
    total_pixels = original_image_np.shape[0] * original_image_np.shape[1]
    
    green_fraction = green_pixels / total_pixels
    
    # If the image has less than 5% green pixels and the model has low certainty (<60%)
    if green_fraction < 0.05 and max_prob < 0.60:
        return False
        
    return True
