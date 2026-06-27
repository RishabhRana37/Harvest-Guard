# app/services/gradcam.py
import base64
import cv2
import numpy as np
import tensorflow as tf

def _find_layer_and_container(model, target_name):
    for layer in model.layers:
        if layer.name == target_name:
            return model, layer
        if hasattr(layer, "layers"):
            container, target = _find_layer_and_container(layer, target_name)
            if target:
                return container, target
    return None, None

def _find_last_conv_layer(model_or_layer):
    if hasattr(model_or_layer, "layers"):
        for layer in reversed(model_or_layer.layers):
            res = _find_last_conv_layer(layer)
            if res:
                return res
    class_name = model_or_layer.__class__.__name__.lower()
    if "conv" in class_name:
        return model_or_layer.name
    return None

def _last_conv_layer(model):
    res = _find_last_conv_layer(model)
    if res:
        return res
    raise ValueError("No convolutional layer found for Grad-CAM.")

from app.services.inference import model_lock

def gradcam_plus_plus(model, img_array, class_index, layer_name=None):
    with model_lock:
        return _gradcam_plus_plus_unlocked(model, img_array, class_index, layer_name)

def _gradcam_plus_plus_unlocked(model, img_array, class_index, layer_name=None):
    """img_array: (1,224,224,3) preprocessed. Returns small HxW heatmap in 0..1."""
    layer_name = layer_name or _last_conv_layer(model)
    container, target_layer = _find_layer_and_container(model, layer_name)
    if container is None or target_layer is None:
        raise ValueError(f"Layer '{layer_name}' not found in model hierarchy.")

    # Check if the target layer is nested inside a submodel
    is_nested = (container.name != model.name)

    if is_nested:
        # Build submodel for base extraction: container.input -> [target_layer.output, container.output]
        grad_base_model = tf.keras.models.Model(container.input, [target_layer.output, container.output])
        
        # Build classifier model from post layers: container.output -> final predictions
        post_layers = []
        found = False
        for layer in model.layers:
            if found:
                post_layers.append(layer)
            if layer.name == container.name:
                found = True
        
        classifier_input = tf.keras.layers.Input(shape=container.output_shape[1:], dtype="float32")
        y = classifier_input
        for layer in post_layers:
            y = layer(y)
        classifier_model = tf.keras.models.Model(classifier_input, y)
        
        # The input img_array is fed directly to container (rescaling already done in preprocessing)
        x_in = img_array
    else:
        # Flat model: construct grad model directly
        grad_model = tf.keras.models.Model(model.inputs, [target_layer.output, model.output])

    with tf.GradientTape() as g3:
        with tf.GradientTape() as g2:
            with tf.GradientTape() as g1:
                if is_nested:
                    conv, base_out = grad_base_model(x_in)
                    preds = classifier_model(base_out)
                else:
                    conv, preds = grad_model(img_array)
                score = preds[:, class_index]
            grads = g1.gradient(score, conv)
        grads2 = g2.gradient(grads, conv)
    grads3 = g3.gradient(grads2, conv)

    global_sum = tf.reduce_sum(conv, axis=(1, 2), keepdims=True)
    denom = 2.0 * grads2 + global_sum * grads3
    denom = tf.where(denom != 0.0, denom, tf.ones_like(denom))
    alphas = grads2 / denom
    weights = tf.reduce_sum(alphas * tf.nn.relu(grads), axis=(1, 2))
    cam = tf.reduce_sum(weights[:, tf.newaxis, tf.newaxis, :] * conv, axis=-1)[0]
    cam = tf.nn.relu(cam).numpy()
    cam -= cam.min()
    if cam.max() > 0:
        cam /= cam.max()
    return cam

def overlay_to_b64(rgb_original, cam, alpha=0.4):
    """rgb_original: HxWx3 uint8. cam: small 0..1 map. Returns base64 PNG data URI."""
    h, w = rgb_original.shape[:2]
    cam_r = cv2.resize(cam, (w, h))
    heat = cv2.applyColorMap(np.uint8(255 * cam_r), cv2.COLORMAP_JET)
    heat = cv2.cvtColor(heat, cv2.COLOR_BGR2RGB)
    overlay = np.uint8(rgb_original * (1 - alpha) + heat * alpha)
    ok, buf = cv2.imencode(".png", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    return "data:image/png;base64," + base64.b64encode(buf).decode("utf-8")

def active_fraction(cam, thresh=0.5):
    """Fraction of leaf area with strong activation — feeds severity grading."""
    return float((cam >= thresh).mean())
