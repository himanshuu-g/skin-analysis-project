"""preprocessing/image_preprocess.py"""
import json
import logging
import os
import time

import cv2
import numpy as np
from tensorflow.keras.preprocessing import image

from model.cnn_model import load_trained_model
from preprocessing.gradcam import generate_gradcam

# Load model once at startup.
model = load_trained_model("model/skin_model.keras")
MODEL_PATH = "model/skin_model.keras"
MODEL_VERSION = os.path.basename(MODEL_PATH)
logger = logging.getLogger(__name__)

DEFAULT_CLASS_NAMES = ["dry", "normal", "oily"]
CLASS_NAMES_PATH = "model/class_names.json"
# Keep inference preprocessing aligned with train.py (resize + normalize only).
USE_FACE_AND_SKIN_PREPROCESSING = False


def _load_class_names():
    if not os.path.exists(CLASS_NAMES_PATH):
        print(f"[WARN] {CLASS_NAMES_PATH} not found. Using default class order: {DEFAULT_CLASS_NAMES}")
        return DEFAULT_CLASS_NAMES

    try:
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as fp:
            loaded = json.load(fp)

        if not isinstance(loaded, list) or not loaded:
            raise ValueError("class_names.json must contain a non-empty list")

        class_names = [str(item) for item in loaded]
        print(f"[INFO] Loaded class names: {class_names}")
        return class_names
    except Exception as err:
        print(f"[WARN] Failed to parse {CLASS_NAMES_PATH}: {err}. Using defaults.")
        return DEFAULT_CLASS_NAMES


CLASS_NAMES = _load_class_names()
LOW_CONFIDENCE_THRESHOLD = 0.70
LAST_CONV_LAYER = os.environ.get("GRADCAM_LAYER", "").strip() or None


def preprocess_image(image_path):
    """
    Inference pipeline:
    1. Load image
    2. (Optional) face + skin preprocessing
    3. Resize + normalize for CNN
    4. Predict skin type
    5. Generate Grad-CAM
    """
    try:
        start_time = time.perf_counter()

        # Step 1: Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image from {image_path}")

        # Step 2: Optional face/skin preprocessing. Disabled by default because
        # the current model was trained on raw images (see train.py).
        skin_img = img
        if USE_FACE_AND_SKIN_PREPROCESSING:
            try:
                from preprocessing.face_detection import detect_face
                from preprocessing.skin_region_extractor import extract_skin_region

                face = detect_face(img)
                if face is not None and face.size > 0:
                    img = face

                skin_img = extract_skin_region(img)
            except Exception as err:
                print(f"[WARN] Optional face/skin preprocessing failed: {err}. Using original image.")

        # Step 3: Preprocess for CNN
        img_resized = cv2.resize(skin_img, (224, 224))
        img_array = image.img_to_array(img_resized)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0

        # Step 4: Predict
        predictions = model.predict(img_array, verbose=0)
        predicted_class = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][predicted_class])

        print(f"[DEBUG] CNN raw probabilities: {predictions[0]}")
        print(f"[DEBUG] Class order: {CLASS_NAMES}")

        skin_type = CLASS_NAMES[predicted_class]
        inference_ms = round((time.perf_counter() - start_time) * 1000, 2)
        is_low_confidence = confidence < LOW_CONFIDENCE_THRESHOLD

        # Step 5: Generate Grad-CAM with fallback
        gradcam_path = image_path
        try:
            gradcam_filename = f"gradcam_{os.path.basename(image_path)}"
            gradcam_path = os.path.join("static", "gradcam", gradcam_filename)
            os.makedirs(os.path.dirname(gradcam_path), exist_ok=True)

            gradcam_path = generate_gradcam(
                model=model,
                img_array=img_array,
                last_conv_layer_name=LAST_CONV_LAYER,
                save_path=gradcam_path,
            )
            print(f"[INFO] Grad-CAM generated: {gradcam_path}")
        except Exception as err:
            print(f"[WARN] Grad-CAM generation failed: {err}")

        logger.info(
            "inference_complete skin_type=%s confidence=%.4f low_confidence=%s inference_ms=%.2f probs=%s",
            skin_type,
            confidence,
            is_low_confidence,
            inference_ms,
            predictions[0].tolist(),
        )

        return {
            "skin_type": skin_type,
            "confidence": confidence,
            "gradcam": gradcam_path,
            "is_low_confidence": is_low_confidence,
            "model_version": MODEL_VERSION,
            "inference_ms": inference_ms,
            "class_probabilities": {
                CLASS_NAMES[i]: float(predictions[0][i]) for i in range(len(CLASS_NAMES))
            },
        }

    except Exception as err:
        print(f"[ERROR] Error in preprocessing: {err}")
        raise
