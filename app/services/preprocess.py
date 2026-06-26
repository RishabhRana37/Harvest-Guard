import io
import numpy as np
from PIL import Image, ImageOps
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

def load_image(image_bytes: bytes) -> Image.Image:
    """
    Load an image from raw bytes, apply EXIF orientation transposition,
    and convert to RGB format.
    """
    img = Image.open(io.BytesIO(image_bytes))
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img

def to_model_input(img: Image.Image) -> np.ndarray:
    """
    Resize the image to 224x224, apply MobileNetV2 preprocessing,
    and add batch dimension to return shape (1, 224, 224, 3).
    """
    img_resized = img.resize((224, 224), Image.Resampling.BILINEAR)
    x = np.array(img_resized, dtype=np.float32)
    x = preprocess_input(x)
    x = np.expand_dims(x, axis=0)
    return x
