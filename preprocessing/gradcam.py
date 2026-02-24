"""preprocessing/gradcam.py"""
import os

import cv2
import numpy as np
import tensorflow as tf


def _to_uint8_image(img_array):
    """Convert a normalized model input array (batch, H, W, C) to uint8 image."""
    if isinstance(img_array, tf.Tensor):
        array = img_array[0].numpy()
    else:
        array = np.asarray(img_array)[0]

    array = np.clip(array, 0.0, 1.0)
    return (array * 255).astype(np.uint8)


def _find_last_conv2d_layer(model, preferred_name=None):
    """
    Find the Grad-CAM target layer.
    Priority:
    1) Requested layer name if it is feature-map like.
    2) Last top-level Conv2D.
    3) Last top-level layer with 4D feature map output (e.g., nested backbone output).
    4) Last nested Conv2D as a final fallback.
    """
    def _is_4d_feature_layer(layer):
        try:
            output_shape = getattr(layer, "output_shape", None)
            if isinstance(output_shape, (tuple, list)):
                if isinstance(output_shape, list) and output_shape:
                    output_shape = output_shape[0]
                return isinstance(output_shape, tuple) and len(output_shape) == 4
        except Exception:
            pass

        try:
            rank = len(layer.output.shape)
            return rank == 4
        except Exception:
            return False

    if preferred_name:
        try:
            layer = model.get_layer(preferred_name)
            if isinstance(layer, tf.keras.layers.Conv2D) or _is_4d_feature_layer(layer):
                return layer
            print(f"[WARN] Requested layer '{preferred_name}' is not a 4D feature-map layer.")
        except Exception:
            print(f"[WARN] Requested layer '{preferred_name}' not found. Auto-selecting target layer.")

    # Scan top-level layers first.
    for layer in reversed(model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            return layer

    # For models with nested backbones (e.g., MobileNet), use the last top-level
    # layer that still has 4D feature maps and remains graph-connected.
    for layer in reversed(model.layers):
        if _is_4d_feature_layer(layer):
            return layer

    # Recursively scan nested models/layers if present.
    for layer in reversed(model.layers):
        if hasattr(layer, "layers"):
            for sub_layer in reversed(getattr(layer, "layers", [])):
                if isinstance(sub_layer, tf.keras.layers.Conv2D):
                    return sub_layer

    return None


def generate_gradcam(model, img_array, last_conv_layer_name, save_path):
    """
    Generate a Grad-CAM heatmap.
    Works with Sequential and Functional Keras models.
    """
    try:
        if not isinstance(img_array, tf.Tensor):
            img_array = tf.convert_to_tensor(img_array, dtype=tf.float32)

        original_img = _to_uint8_image(img_array)
        target_layer = _find_last_conv2d_layer(model, last_conv_layer_name)

        if target_layer is None:
            raise ValueError("No Conv2D layer found in model for Grad-CAM.")

        grads = None
        conv_output = None
        predictions = None

        # Preferred path: graph-based Grad-CAM (works for most Functional models).
        try:
            grad_model = tf.keras.models.Model(
                inputs=model.inputs,
                outputs=[target_layer.output, model.outputs[0]],
            )

            with tf.GradientTape() as tape:
                conv_output, predictions = grad_model(img_array, training=False)
                tape.watch(conv_output)
                pred_index = int(tf.argmax(predictions[0]).numpy())
                class_score = predictions[:, pred_index]

            grads = tape.gradient(class_score, conv_output)
        except Exception as err:
            # Fallback for models where the graph path is not exposed cleanly.
            print(f"[WARN] Graph Grad-CAM path failed: {err}. Falling back to manual path.")
            with tf.GradientTape() as tape:
                x = img_array
                manual_conv_output = None
                for layer in model.layers:
                    if isinstance(layer, tf.keras.layers.InputLayer):
                        continue
                    x = layer(x, training=False)
                    if layer is target_layer:
                        manual_conv_output = x
                if manual_conv_output is None:
                    raise RuntimeError("Manual Grad-CAM could not capture target layer output.")
                tape.watch(manual_conv_output)
                pred_index = int(tf.argmax(x[0]).numpy())
                class_score = x[:, pred_index]

            conv_output = manual_conv_output
            predictions = x
            grads = tape.gradient(class_score, conv_output)

        if grads is None:
            # Second fallback: use the exact manual method that works with this
            # project's Sequential CNN checkpoints.
            if isinstance(model, tf.keras.Sequential):
                print("[WARN] Graph/manual gradients were None. Retrying with strict manual Grad-CAM path.")
                target_layer_idx = None
                for idx, layer in enumerate(model.layers):
                    if layer is target_layer:
                        target_layer_idx = idx
                        break

                if target_layer_idx is not None:
                    with tf.GradientTape() as tape:
                        x = img_array
                        tape.watch(x)
                        strict_conv_output = None

                        for idx, layer in enumerate(model.layers):
                            x = layer(x)
                            if idx == target_layer_idx:
                                strict_conv_output = x
                                tape.watch(strict_conv_output)

                        pred_index = int(tf.argmax(x[0]).numpy())
                        class_score = x[:, pred_index]

                    strict_grads = tape.gradient(class_score, strict_conv_output)
                    if strict_grads is not None:
                        conv_output = strict_conv_output
                        grads = strict_grads

            if grads is None:
                print("[WARN] Gradients are None. Saving original image as fallback.")
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                cv2.imwrite(save_path, original_img)
                return save_path

        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_maps = conv_output[0]
        heatmap = tf.reduce_sum(conv_maps * pooled_grads, axis=-1)
        heatmap = tf.maximum(heatmap, 0)

        max_value = tf.reduce_max(heatmap)
        if float(max_value) > 0:
            heatmap = heatmap / max_value

        heatmap = heatmap.numpy()
        heatmap = cv2.resize(heatmap, (original_img.shape[1], original_img.shape[0]))
        heatmap_uint8 = np.uint8(255 * heatmap)
        heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

        # Balanced overlay: preserve details while showing focus regions.
        superimposed = cv2.addWeighted(original_img, 0.6, heatmap_color, 0.4, 0)

        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        cv2.imwrite(save_path, superimposed)
        print(f"[INFO] Grad-CAM saved to: {save_path}")
        return save_path

    except Exception as err:
        print(f"[ERROR] Error generating Grad-CAM: {err}")
        fallback_img = _to_uint8_image(img_array)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        cv2.imwrite(save_path, fallback_img)
        return save_path
