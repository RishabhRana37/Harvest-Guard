# app/services/tta.py
import numpy as np

def tta_probs(engine, base_input):
    """base_input: (1,224,224,3) preprocessed.
    engine.predict_probs(x) must return calibrated probabilities shape (1,38)."""
    views = [
        base_input,                       # original
        base_input[:, :, ::-1, :],        # horizontal flip
        base_input[:, ::-1, :, :],        # vertical flip
    ]
    probs = np.mean([engine.predict_probs(v)[0] for v in views], axis=0)
    return probs[np.newaxis, :]
