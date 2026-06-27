import os
import json
import logging
import numpy as np
from tensorflow.keras.models import load_model

from app.config import settings
from app.db import get_db
from app.schemas import Prediction

logger = logging.getLogger("app.services.inference")

# Module-level singletons
model = None
class_index = {}
temperature = 1.0
tau_low = 0.55
model_loaded = False
is_loaded = False
warmup_succeeded = False
disease_cache = {}  # maps slug -> {"crop": str, "name": str}
metrics = {}

def load_model_artifacts():
    """
    Safely load model.keras, class_index.json, and calibration.json.
    Sets model_loaded = True on success, otherwise False. Does not crash.
    """
    global model, class_index, temperature, tau_low, model_loaded, is_loaded, metrics
    model_path = settings.MODEL_PATH
    if not os.path.exists(model_path):
        model_dir_rel = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ml", "model"))
        model_path = os.path.join(model_dir_rel, settings.MODEL_PATH)
        
    if not os.path.exists(model_path):
        model_path = os.path.join("backend", "app", "ml", "model", settings.MODEL_PATH)
        
    if not os.path.exists(model_path):
        model_path = os.path.join("app", "ml", "model", settings.MODEL_PATH)
        
    if not os.path.exists(model_path):
        logger.warning(f"Model path '{settings.MODEL_PATH}' or fallbacks do not exist. Disabling ML inference.")
        model_loaded = False
        return

    model_dir = os.path.dirname(model_path)
    class_index_path = os.path.join(model_dir, "class_index.json")
    calibration_path = os.path.join(model_dir, "calibration.json")
    
    try:
        logger.info(f"Loading Keras model from {model_path}...")
        model = load_model(model_path, safe_mode=False)

        
        # Load class index mapping
        if os.path.exists(class_index_path):
            with open(class_index_path, "r", encoding="utf-8") as f:
                class_index = json.load(f)
            logger.info(f"Loaded class index with {len(class_index)} classes.")
        else:
            logger.warning(f"Class index file not found at {class_index_path}.")
            model_loaded = False
            return
            
        # Load calibration parameters
        if os.path.exists(calibration_path):
            with open(calibration_path, "r", encoding="utf-8") as f:
                cal_data = json.load(f)
                temperature = cal_data.get("temperature", 1.0)
                tau_low = cal_data.get("tau_low", 0.55)
            logger.info(f"Loaded calibration parameters: temperature={temperature}, tau_low={tau_low}")
        else:
            logger.warning(f"Calibration file not found at {calibration_path}. Using default temperature=1.0, tau_low=0.55")
            
        # Load validation metrics
        metrics_path = os.path.join(model_dir, "metrics.json")
        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    metrics = json.load(f)
                logger.info(f"Loaded validation metrics successfully: {metrics}")
            except Exception as e:
                logger.error(f"Failed to load metrics.json: {e}")
        else:
            logger.warning(f"Metrics file not found at {metrics_path}")

        model_loaded = True
        is_loaded = True
        logger.info("Model artifacts loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model artifacts: {e}", exc_info=True)
        model_loaded = False
        is_loaded = False

async def initialize_disease_cache():
    """
    Populate the memory cache mapping disease slugs to crop/name names.
    Queries the database with a seed JSON file fallback.
    """
    global disease_cache
    try:
        db = get_db()
        cursor = db.diseases.find({}, {"slug": 1, "crop": 1, "name": 1})
        
        if hasattr(cursor, "to_list"):
            docs = await cursor.to_list(length=100)
        else:
            docs = await cursor.to_list(100)
            
        for doc in docs:
            disease_cache[doc["slug"]] = {
                "crop": doc.get("crop", ""),
                "name": doc.get("name", "")
            }
        logger.info(f"Initialized disease cache with {len(disease_cache)} items from DB.")
    except Exception as e:
        logger.error(f"Error querying diseases collection for cache: {e}")
        
    if not disease_cache:
        seed_path = os.path.join(os.path.dirname(__file__), "..", "data", "diseases_seed.json")
        if os.path.exists(seed_path):
            try:
                with open(seed_path, "r", encoding="utf-8") as f:
                    seed_data = json.load(f)
                    for item in seed_data:
                        disease_cache[item["slug"]] = {
                            "crop": item.get("crop", ""),
                            "name": item.get("name", "")
                        }
                logger.info(f"Loaded {len(disease_cache)} items into disease cache from local seed JSON fallback.")
            except Exception as read_err:
                logger.error(f"Failed to read local seed JSON fallback: {read_err}")

def predict(input_array: np.ndarray) -> np.ndarray:
    """
    Run raw model inference, apply temperature scaling on the logits,
    and apply softmax to return calibrated class probabilities.
    """
    if not model_loaded or model is None:
        raise ValueError("Model is not loaded.")
        
    probs = model.predict(input_array, verbose=0)
    probs_clipped = np.clip(probs, 1e-15, 1.0)
    logits = np.log(probs_clipped)
    scaled_logits = logits / temperature
    
    exp_logits = np.exp(scaled_logits - np.max(scaled_logits, axis=-1, keepdims=True))
    calibrated_probs = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)
    return calibrated_probs

predict_probs = predict

def get_predictions(calibrated_probs: np.ndarray) -> tuple[Prediction, list[Prediction]]:
    """
    Given calibrated probabilities (shape (1, 38)), build the top-1 Prediction
    and top-3 (k=3) Prediction list.
    """
    probs = calibrated_probs[0]
    top_indices = np.argsort(probs)[::-1]
    
    predictions = []
    for idx in top_indices:
        idx_str = str(idx)
        slug = class_index.get(idx_str)
        if not slug:
            continue
            
        disease_info = disease_cache.get(slug, {"crop": "Unknown", "name": "Unknown"})
        pred = Prediction(
            slug=slug,
            crop=disease_info["crop"],
            name=disease_info["name"],
            prob=float(probs[idx])
        )
        predictions.append(pred)
        
    top_1 = predictions[0]
    top_3 = predictions[:3]
    return top_1, top_3

def warmup():
    """Run one dummy inference at startup if the model is loaded."""
    global warmup_succeeded
    if model_loaded and model is not None:
        try:
            logger.info("Running warmup inference...")
            dummy_input = np.zeros((1, 224, 224, 3), dtype=np.float32)
            _ = predict(dummy_input)
            warmup_succeeded = True
            logger.info("Warmup inference completed successfully.")
        except Exception as e:
            logger.error(f"Warmup inference failed: {e}")
            warmup_succeeded = False
    else:
        warmup_succeeded = False

class InferenceEngine:
    @property
    def is_loaded(self) -> bool:
        return model_loaded

    @property
    def class_index(self) -> dict:
        return class_index

    @property
    def temperature(self) -> float:
        return temperature

    @property
    def tau_low(self) -> float:
        return tau_low

    @property
    def metrics(self) -> dict:
        return metrics

    def predict_probs(self, x: np.ndarray) -> np.ndarray:
        return predict(x)

engine = InferenceEngine()
