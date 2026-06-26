import base64
import cv2
import numpy as np
import tensorflow as tf

def generate_gradcam(model, input_array: np.ndarray, class_idx: int, original_image_np: np.ndarray) -> tuple[str, np.ndarray]:
    """
    Generate a Grad-CAM heatmap using tf.GradientTape on MobileNetV2's Conv_1 layer.
    Overlays the translucent colormap onto the original image and returns:
      - base64 data URI string of the superimposed image
      - normalized raw heatmap array (7x7) for severity calculation
    """
    base_model = model.get_layer("mobilenetv2_1.00_224")
    conv_layer = base_model.get_layer("Conv_1")
    
    # Create sub-model of the base model
    base_sub_model = tf.keras.Model(
        inputs=base_model.input,
        outputs=[conv_layer.output, base_model.output]
    )
    
    # We construct the complete custom multi-output pipeline
    inputs = model.input
    x = model.get_layer("sequential")(inputs)
    x = model.get_layer("rescaling")(x)
    conv_outputs, base_outputs = base_sub_model(x)
    h = model.get_layer("global_average_pooling2d")(base_outputs)
    h = model.get_layer("dropout")(h)
    outputs = model.get_layer("dense")(h)
    
    gradcam_model = tf.keras.Model(inputs=inputs, outputs=[conv_outputs, outputs])
    
    # Record gradients under GradientTape
    with tf.GradientTape() as tape:
        conv_outputs, predictions = gradcam_model(input_array)
        loss = predictions[:, class_idx]
        
    grads = tape.gradient(loss, conv_outputs)
    
    # Guided Grad-CAM spatially averaged gradients
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    
    # Weighted average of feature maps
    conv_outputs_val = conv_outputs[0].numpy()
    pooled_grads_val = pooled_grads.numpy()
    
    heatmap = conv_outputs_val @ pooled_grads_val[..., np.newaxis]
    heatmap = np.squeeze(heatmap)
    
    # ReLU to keep positive influence
    heatmap = np.maximum(heatmap, 0)
    
    # Normalization
    max_val = np.max(heatmap)
    if max_val > 0:
        heatmap = heatmap / max_val
        
    # Resize heatmap to match original image dimensions
    orig_h, orig_w = original_image_np.shape[:2]
    heatmap_resized = cv2.resize(heatmap, (orig_w, orig_h))
    
    # Convert heatmap to colormap
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_color_rgb = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    
    # Superimpose on original image (using alpha weight 0.4)
    alpha = 0.4
    blended = cv2.addWeighted(original_image_np, 1.0 - alpha, heatmap_color_rgb, alpha, 0)
    
    # Convert back to BGR for cv2.imencode
    _, buffer = cv2.imencode(".png", cv2.cvtColor(blended, cv2.COLOR_RGB2BGR))
    base64_str = base64.b64encode(buffer).decode("utf-8")
    
    data_uri = f"data:image/png;base64,{base64_str}"
    
    return data_uri, heatmap
