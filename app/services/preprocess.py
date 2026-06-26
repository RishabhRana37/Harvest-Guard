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

def sanitize_image(image_bytes: bytes) -> tuple[bytes, Image.Image]:
    """
    Decode, transpose, convert to RGB, cap max dimension to 1280px proportionally,
    and re-encode to a clean JPEG in memory. Returns (sanitized_bytes, PIL.Image.Image).
    """
    img = Image.open(io.BytesIO(image_bytes))
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    if img.mode != "RGB":
        img = img.convert("RGB")

    max_dim = 1280
    width, height = img.size
    if width > max_dim or height > max_dim:
        if width > height:
            new_width = max_dim
            new_height = int(height * (max_dim / width))
        else:
            new_height = max_dim
            new_width = int(width * (max_dim / height))
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    out_buf = io.BytesIO()
    img.save(out_buf, format="JPEG")
    sanitized_bytes = out_buf.getvalue()

    # Re-open from the clean bytes to verify and return the clean PIL Image
    clean_img = Image.open(io.BytesIO(sanitized_bytes))
    return sanitized_bytes, clean_img

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

