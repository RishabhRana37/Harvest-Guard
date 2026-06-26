import io
import base64
import random
import logging
from typing import Dict, List, Tuple, Optional, Any
from PIL import Image, ImageDraw, ImageFilter

logger = logging.getLogger("harvest_guard.inference")

class InferenceEngine:
    def __init__(self):
        # We will dynamically define classes that map to the 12 seeded diseases
        self.diseases_map = {
            "tomato": ["tomato-early-blight", "tomato-late-blight", "tomato-healthy"],
            "potato": ["potato-early-blight", "potato-late-blight", "potato-healthy"],
            "rice": ["rice-blast", "rice-healthy"],
            "wheat": ["wheat-rust", "wheat-healthy"],
            "maize": ["maize-smut", "maize-healthy"]
        }
        # Fallback list of crops
        self.crops = list(self.diseases_map.keys())

    def validate_image(self, file_bytes: bytes) -> bool:
        """Verify the uploaded bytes can be decoded as an image."""
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()
            return True
        except Exception:
            return False

    def check_is_leaf(self, file_bytes: bytes) -> Tuple[bool, Optional[Image.Image]]:
        """
        OOD (Out of Distribution) Gate.
        Resizes the image and scans HSL/HSV pixels to check if there are enough
        leaf-like tones (green/yellow/brown).
        """
        try:
            img = Image.open(io.BytesIO(file_bytes))
            # Convert to RGB to ensure standard 3-channel handling
            img_rgb = img.convert("RGB")
            
            # Downscale for cheap scanning
            img_small = img_rgb.resize((64, 64))
            hsv_small = img_small.convert("HSV")
            
            leaf_pixels = 0
            total_pixels = 64 * 64
            
            for y in range(64):
                for x in range(64):
                    h, s, v = hsv_small.getpixel((x, y))
                    # Leaf colors: 
                    # Green: H is roughly 35-100 (deg 50 to 140)
                    # Yellow/Brown (dry/disease): H is roughly 10-35 (deg 14 to 50)
                    # We also require moderate saturation (s >= 30) and brightness (v >= 20)
                    # to exclude white backgrounds, dark shadows, or dark skin tones.
                    if 8 <= h <= 110 and s >= 25 and v >= 15:
                        leaf_pixels += 1
                        
            percentage = leaf_pixels / total_pixels
            logger.info(f"OOD Leaf Check: {percentage:.2%} of pixels match leaf tones.")
            
            # Leaf threshold is 15% leaf-colored pixels
            is_leaf = percentage >= 0.15
            return is_leaf, img_rgb
        except Exception as e:
            logger.error(f"Error in OOD check: {e}")
            return False, None

    def run_prediction(self, crop_hint: Optional[str] = None) -> Tuple[str, float, str, List[Dict[str, Any]]]:
        """
        Calibrated inference simulator.
        Returns (predicted_slug, confidence, confidence_band, top_k_list)
        """
        # Resolve crop category
        crop = (crop_hint or "").lower().strip()
        if crop not in self.diseases_map:
            # Pick a random crop if not provided or unrecognized
            crop = random.choice(self.crops)
            
        slugs = self.diseases_map[crop]
        
        # Determine if we predict healthy or diseased
        # Healthy probability is around 30% for a demo
        is_healthy = random.random() < 0.30
        
        if is_healthy:
            predicted_slug = next((s for s in slugs if "healthy" in s), slugs[-1])
        else:
            diseased_slugs = [s for s in slugs if "healthy" not in s]
            predicted_slug = random.choice(diseased_slugs) if diseased_slugs else slugs[0]
            
        # Determine confidence and band
        # 70% chance of high confidence, 30% medium/low
        rand_val = random.random()
        if rand_val < 0.70:
            confidence = round(random.uniform(0.80, 0.96), 2)
            confidence_band = "high"
        elif rand_val < 0.90:
            confidence = round(random.uniform(0.60, 0.79), 2)
            confidence_band = "medium"
        else:
            confidence = round(random.uniform(0.40, 0.59), 2)
            confidence_band = "low"

        # Build top-k predictions
        top_k = []
        remaining_slugs = list(slugs)
        
        # Add prediction first
        top_k.append({
            "slug": predicted_slug,
            "crop": crop.capitalize(),
            "name": self._slug_to_name(predicted_slug),
            "prob": confidence
        })
        remaining_slugs.remove(predicted_slug)
        
        # Distribute remaining probability
        rem_prob = round(1.0 - confidence, 2)
        if remaining_slugs:
            for i, slug in enumerate(remaining_slugs):
                if i == len(remaining_slugs) - 1:
                    prob = rem_prob
                else:
                    prob = round(random.uniform(0.01, rem_prob * 0.8), 2)
                    rem_prob = round(rem_prob - prob, 2)
                top_k.append({
                    "slug": slug,
                    "crop": crop.capitalize(),
                    "name": self._slug_to_name(slug),
                    "prob": max(0.01, prob)
                })
        
        # Sort top_k by probability descending
        top_k.sort(key=lambda x: x["prob"], reverse=True)
        
        return predicted_slug, confidence, confidence_band, top_k

    def generate_heatmap(self, severity: str) -> str:
        """
        Generates a simulated Grad-CAM heatmap overlay.
        A solid white canvas (255, 255, 255) with blurred warm color spots (red, orange, yellow).
        Multiply blend mode in the UI will multiply the leaf image with this heatmap,
        rendering warm hotspots while keeping the rest of the image unaffected.
        """
        # Standard resolution 224x224
        size = 224
        heatmap_img = Image.new("RGB", (size, size), (255, 255, 255))
        draw = ImageDraw.Draw(heatmap_img)
        
        # Determine number of spots based on severity
        num_spots = 0
        if severity == "mild":
            num_spots = random.randint(1, 2)
        elif severity == "severe":
            num_spots = random.randint(3, 4)
            
        for _ in range(num_spots):
            # Pick a center for the spot
            cx = random.randint(40, size - 40)
            cy = random.randint(40, size - 40)
            
            # Radii for concentric gradient circles
            r_yellow = random.randint(35, 55)
            r_orange = int(r_yellow * 0.7)
            r_red = int(r_yellow * 0.4)
            
            # Draw concentric circles with colors fading to white
            # Since we will apply a strong Gaussian blur, these sharp circles will blend beautifully
            draw.ellipse([cx - r_yellow, cy - r_yellow, cx + r_yellow, cy + r_yellow], fill=(255, 255, 200)) # outer warm glow
            draw.ellipse([cx - r_orange, cy - r_orange, cx + r_orange, cy + r_orange], fill=(255, 180, 100)) # orange ring
            draw.ellipse([cx - r_red, cy - r_red, cx + r_red, cy + r_red], fill=(240, 70, 70))           # red core
            
        # Apply Gaussian Blur to create smooth gradient heat map
        blurred_heatmap = heatmap_img.filter(ImageFilter.GaussianBlur(radius=15))
        
        # Export as PNG base64 Data URI
        buffered = io.BytesIO()
        blurred_heatmap.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"

    def calculate_severity(self, is_healthy: bool) -> Tuple[str, Optional[int]]:
        """Returns (severity_grade, urgency_days) based on health status."""
        if is_healthy:
            return "healthy", None
            
        # 60% chance mild, 40% severe
        if random.random() < 0.60:
            return "mild", random.choice([3, 4, 5])
        else:
            return "severe", random.choice([1, 2])

    def _slug_to_name(self, slug: str) -> str:
        """Formats slug to human readable disease name."""
        parts = slug.split("-")
        if len(parts) > 1:
            name_parts = parts[1:]
            return " ".join(p.capitalize() for p in name_parts)
        return slug.capitalize()

inference_engine = InferenceEngine()
