# app/services/quality.py
import cv2
import numpy as np

def assess_quality(rgb: np.ndarray) -> dict:
    """rgb: HxWx3 uint8 RGB (original, before resize). Returns score 0..1 + tips."""
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())   # higher = sharper
    brightness = float(gray.mean())                            # 0..255
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    leaf_fill = float(((h >= 25) & (h <= 95) & (s >= 40) & (v >= 40)).mean())

    tips = []
    if blur_var < 60:        tips.append("Photo looks blurry — hold steady and tap to focus.")
    if brightness < 60:      tips.append("Too dark — move to better light.")
    elif brightness > 210:   tips.append("Overexposed — avoid direct glare.")
    if leaf_fill < 0.15:     tips.append("Fill the frame with a single leaf.")

    blur_score   = min(blur_var / 120.0, 1.0)
    bright_score = max(0.0, min(1.0 - abs(brightness - 135) / 135.0, 1.0))
    fill_score   = min(leaf_fill / 0.4, 1.0)
    score = round(0.5 * blur_score + 0.2 * bright_score + 0.3 * fill_score, 3)

    return {
        "score": score,
        "is_acceptable": score >= 0.45,
        "metrics": {"sharpness": round(blur_var, 1),
                    "brightness": round(brightness, 1),
                    "leaf_fill": round(leaf_fill, 3)},
        "tips": tips,
    }
