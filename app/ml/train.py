import os
import io
import re
import json
import argparse
import logging
import numpy as np
import tensorflow as tf
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("train")

# Set TF logging level
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

from tensorflow.keras import layers, models
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, recall_score, confusion_matrix
from scipy.optimize import minimize

# Config/Constants
IMG_SIZE = 224
BATCH_SIZE = 32
SEED = 42
EPOCHS_HEAD = 8
EPOCHS_FT = 6
SUBSET_PER_CLASS = 400

# 1. Slugify helper
def to_slug(name: str) -> str:
    """
    Convert a class name to a clean database slug:
    lowercase, replace '___' with '-', replace non-alphanumeric with '-', collapse repeats, strip.
    """
    name = name.replace("___", "-")
    name = re.sub(r'[^a-zA-Z0-9]', '-', name)
    name = re.sub(r'-+', '-', name)
    return name.strip("-").lower()

def get_class_weights(train_labels, num_classes=38):
    """Calculate balanced class weights from training labels."""
    from sklearn.utils.class_weight import compute_class_weight
    classes = np.arange(num_classes)
    weights = compute_class_weight(
        class_weight='balanced',
        classes=classes,
        y=train_labels
    )
    return {int(i): float(w) for i, w in enumerate(weights)}

def main():
    parser = argparse.ArgumentParser(description="CropDoc AI Transfer Learning Model Trainer")
    parser.add_argument("--data_dir", type=str, default=None, help="Path to PlantVillage local directory")
    parser.add_argument("--smoke", action="store_true", help="Run in validation smoke mode (minimal images/epochs)")
    args = parser.parse_args()

    # Determine SMOKE mode from env variable or arg flag
    is_smoke = args.smoke or (os.environ.get("SMOKE", "false").lower() == "true")

    epochs_head = 1 if is_smoke else EPOCHS_HEAD
    epochs_ft = 1 if is_smoke else EPOCHS_FT
    max_per_class = 40 if is_smoke else SUBSET_PER_CLASS

    logger.info(f"Running pipeline. Mode: {'SMOKE (Fast Validation)' if is_smoke else 'Full training'}")
    logger.info(f"Max images per class limit: {max_per_class}")
    logger.info(f"Epochs: Head={epochs_head}, Fine-Tune={epochs_ft}")

    # Auto-detect GPU and set mixed float16 precision if present
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        logger.info(f"GPU detected: {gpus}. Enabling mixed_float16 precision policy.")
        from tensorflow.keras import mixed_precision
        mixed_precision.set_global_policy('mixed_float16')
    else:
        logger.info("No GPU detected. Running on CPU.")

    # 2. Load Datasets
    raw_dataset = None
    class_names = []

    if args.data_dir and os.path.exists(args.data_dir):
        logger.info(f"Loading local dataset from directory: {args.data_dir}")
        raw_dataset = tf.keras.utils.image_dataset_from_directory(
            args.data_dir,
            image_size=(IMG_SIZE, IMG_SIZE),
            batch_size=32,
            label_mode="int"
        ).unbatch()
        # Find class names sorted alphabetically
        class_names = sorted(os.listdir(args.data_dir))
        # Exclude hidden files
        class_names = [c for c in class_names if not c.startswith('.')]
    else:
        logger.info("Primary path: loading via tensorflow_datasets 'plant_village'...")
        try:
            import tensorflow_datasets as tfds
            ds, info = tfds.load("plant_village", split="train", as_supervised=True, with_info=True)
            raw_dataset = ds
            class_names = info.features["label"].names
        except Exception as e:
            logger.error(f"Failed to load from tensorflow_datasets: {e}")
            raise e

    num_classes = len(class_names)
    assert num_classes == 38, f"Expected 38 classes, but found {num_classes}."
    logger.info(f"Number of classes: {num_classes}")

    # Generate slugs
    resolved_slugs = [to_slug(name) for name in class_names]

    # Collect, cap and split dataset
    class_counts = {i: 0 for i in range(num_classes)}
    images = []
    labels = []
    collected_count = 0

    logger.info("Collecting and resizing dataset elements...")
    for img, label in raw_dataset:
        lbl = int(label)
        if lbl >= num_classes:
            continue
        if max_per_class is None or class_counts[lbl] < max_per_class:
            class_counts[lbl] += 1
            # Resize
            img_resized = tf.image.resize(img, (IMG_SIZE, IMG_SIZE)).numpy().astype(np.uint8)
            images.append(img_resized)
            labels.append(lbl)
            collected_count += 1
            if collected_count % 1000 == 0:
                logger.info(f"Collected {collected_count} images...")

    images = np.array(images)
    labels = np.array(labels)
    logger.info(f"Total dataset collected: {len(images)} images.")

    # Stratified Split (80% Train, 20% Val)
    train_imgs, val_imgs, train_lbls, val_lbls = train_test_split(
        images, labels, test_size=0.2, random_state=SEED, stratify=labels
    )
    logger.info(f"Train size: {len(train_imgs)}, Validation size: {len(val_imgs)}")

    # Compute class weights
    class_weights = get_class_weights(train_lbls, num_classes)

    # One-hot encode targets for categorical crossentropy
    train_targets = tf.keras.utils.to_categorical(train_lbls, num_classes=num_classes)
    val_targets = tf.keras.utils.to_categorical(val_lbls, num_classes=num_classes)

    # Create tf.data.Dataset pipelines
    train_ds = tf.data.Dataset.from_tensor_slices((train_imgs, train_targets))
    val_ds = tf.data.Dataset.from_tensor_slices((val_imgs, val_targets))

    # Apply caching, prefetching, batching
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().shuffle(buffer_size=1000).batch(BATCH_SIZE).prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().batch(BATCH_SIZE).prefetch(buffer_size=AUTOTUNE)

    # 3. Network Architecture
    # Augmentation Pipeline
    data_augmentation = tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1, seed=SEED),
        layers.RandomZoom(0.1, seed=SEED),
        layers.RandomContrast(0.1, seed=SEED)
    ])

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights="imagenet"
    )
    base_model.trainable = False

    inputs = layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3), dtype="float32")
    # Augmentation only runs during training automatically
    x = data_augmentation(inputs)
    # Preprocess inputs to [-1, 1] using standard Keras Rescaling layer
    x = layers.Rescaling(scale=1./127.5, offset=-1.0)(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.2)(x)
    # Output layer in float32 for mixed precision stability
    outputs = layers.Dense(num_classes, activation="softmax", dtype="float32")(x)

    model = models.Model(inputs, outputs)

    # Callbacks
    os.makedirs("app/ml/model", exist_ok=True)
    ckpt_path = "app/ml/model/_ckpt.keras"
    checkpoint = ModelCheckpoint(ckpt_path, monitor="val_loss", save_best_only=True, mode="min")
    early_stop = EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True)
    lr_decay = ReduceLROnPlateau(monitor="val_loss", factor=0.2, patience=2)

    # 4. Phase 1: Train Head
    logger.info("--- Phase 1: Training Classification Head ---")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )

    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_head,
        class_weight=class_weights,
        callbacks=[checkpoint, early_stop, lr_decay]
    )

    # 5. Phase 2: Fine-Tuning (Skip if SMOKE mode)
    if is_smoke:
        logger.info("--- Phase 2: Fine-tuning skipped in SMOKE mode ---")
    else:
        logger.info("--- Phase 2: Unfreezing top 30 layers & Fine-tuning ---")
        base_model.trainable = True
        for layer in base_model.layers[:-30]:
            layer.trainable = False

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss="categorical_crossentropy",
            metrics=["accuracy"]
        )

        model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=epochs_ft,
            class_weight=class_weights,
            callbacks=[checkpoint, early_stop, lr_decay]
        )

    # 6. Evaluation
    logger.info("Running evaluation on validation dataset...")
    # Predict probabilities on validation dataset
    val_probs = []
    for x, y in val_ds:
        preds = model.predict(x, verbose=0)
        val_probs.append(preds)
    val_probs = np.concatenate(val_probs, axis=0)

    val_preds = np.argmax(val_probs, axis=1)

    overall_acc = accuracy_score(val_lbls, val_preds)
    macro_f1 = f1_score(val_lbls, val_preds, average="macro", zero_division=0)
    recalls = recall_score(val_lbls, val_preds, average=None, zero_division=0)

    # Confusion matrix top confusions
    cm = confusion_matrix(val_lbls, val_preds)
    confusions = []
    for i in range(num_classes):
        for j in range(num_classes):
            if i != j and cm[i][j] > 0:
                confusions.append((cm[i][j], i, j))
    confusions.sort(key=lambda x: x[0], reverse=True)

    # Print validation performance details
    logger.info("================ EVALUATION SUMMARY ================")
    logger.info(f"Overall Validation Accuracy: {overall_acc:.4%}")
    logger.info(f"Macro-F1 Score: {macro_f1:.4f}")
    logger.info("Per-class Recalls:")
    per_class_recalls_dict = {}
    for i, rec in enumerate(recalls):
        per_class_recalls_dict[resolved_slugs[i]] = float(rec)
        logger.info(f"  {resolved_slugs[i]}: {rec:.2%}")

    logger.info("Top Confusions:")
    for count, i, j in confusions[:10]:
        logger.info(f"  Class {resolved_slugs[i]} ({i}) confused with {resolved_slugs[j]} ({j}) -> {count} times")
    logger.info("====================================================")

    # 7. Temperature Calibration
    logger.info("Calibrating model temperature scaling parameter T...")
    val_logits = np.log(np.clip(val_probs, 1e-15, 1.0))

    def nll_loss(T_param):
        T_val = T_param[0]
        scaled_logits = val_logits / T_val
        max_logits = np.max(scaled_logits, axis=1, keepdims=True)
        exp_logits = np.exp(scaled_logits - max_logits)
        probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)
        true_probs = probs[np.arange(len(val_lbls)), val_lbls]
        true_probs = np.clip(true_probs, 1e-15, 1.0)
        return -np.mean(np.log(true_probs))

    res = minimize(nll_loss, x0=[1.0], bounds=[(0.1, 10.0)], method="L-BFGS-B")
    temperature = float(res.x[0])
    logger.info(f"Optimized temperature scaling T: {temperature:.4f}")

    # 8. Save Artifacts
    model_dir = "app/ml/model"
    os.makedirs(model_dir, exist_ok=True)

    # Save trained Keras model
    model_path = os.path.abspath(os.path.join(model_dir, "model.keras"))
    model.save(model_path)

    # Save class_index index mapping
    class_index_path = os.path.abspath(os.path.join(model_dir, "class_index.json"))
    class_index_data = {str(i): slug for i, slug in enumerate(resolved_slugs)}
    with open(class_index_path, "w", encoding="utf-8") as f:
        json.dump(class_index_data, f, indent=2)

    # Save calibration values
    calibration_path = os.path.abspath(os.path.join(model_dir, "calibration.json"))
    calibration_data = {"temperature": temperature, "tau_low": 0.55}
    with open(calibration_path, "w", encoding="utf-8") as f:
        json.dump(calibration_data, f, indent=2)

    # Save metrics JSON
    metrics_path = os.path.abspath(os.path.join(model_dir, "metrics.json"))
    metrics_data = {
        "accuracy": float(overall_acc),
        "macro_f1": float(macro_f1),
        "per_class_recall": per_class_recalls_dict,
        "trained_on": int(len(train_imgs)),
        "subset_per_class": max_per_class
    }
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)

    # Print absolute path of every saved file
    logger.info("================ ARTIFACTS WRITTEN ================")
    logger.info(f"Model File: {model_path}")
    logger.info(f"Class Index: {class_index_path}")
    logger.info(f"Calibration: {calibration_path}")
    logger.info(f"Metrics: {metrics_path}")
    logger.info("===================================================")

    # Print full slug list
    print("\nFULL SLUG LIST:")
    for slug in resolved_slugs:
        print(f"  {slug}")
    print("")

    # Print one-line metrics summary
    print(f"SUMMARY: val_acc={overall_acc:.4f} | macro_f1={macro_f1:.4f} | T={temperature:.4f} | trained_on={len(train_imgs)}")

if __name__ == "__main__":
    main()
