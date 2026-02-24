"""Evaluate model/skin_model.keras on a held-out test set."""
import argparse
import json
import os

import numpy as np
import tensorflow as tf

IMG_SIZE = (224, 224)
MODEL_PATH = "model/skin_model.keras"
CLASS_NAMES_PATH = "model/class_names.json"
DEFAULT_TEST_CANDIDATES = ["dataset/split/test", "dataset/test", "dataset/train"]


def load_class_names(default_names):
    if os.path.exists(CLASS_NAMES_PATH):
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as fp:
            loaded = json.load(fp)
        if isinstance(loaded, list) and loaded:
            return [str(x) for x in loaded]
    return default_names


def resolve_dataset_dir(cli_value):
    if cli_value:
        if not os.path.isdir(cli_value):
            raise FileNotFoundError(f"Dataset directory not found: {cli_value}")
        return cli_value

    for path in DEFAULT_TEST_CANDIDATES:
        if os.path.isdir(path):
            print(f"[INFO] Using dataset directory: {path}")
            return path

    raise FileNotFoundError(
        "No dataset directory found. Expected one of: "
        + ", ".join(DEFAULT_TEST_CANDIDATES)
    )


def safe_div(a, b):
    return float(a) / float(b) if b else 0.0


def evaluate(dataset_dir, batch_size):
    ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        image_size=IMG_SIZE,
        batch_size=batch_size,
        shuffle=False,
    )

    model = tf.keras.models.load_model(MODEL_PATH)
    class_names = load_class_names(ds.class_names)
    n_classes = len(class_names)

    y_true = []
    y_pred = []

    for images, labels in ds:
        images = tf.cast(images, tf.float32) / 255.0
        preds = model.predict(images, verbose=0)
        y_true.extend(labels.numpy().tolist())
        y_pred.extend(np.argmax(preds, axis=1).tolist())

    y_true = np.array(y_true, dtype=np.int32)
    y_pred = np.array(y_pred, dtype=np.int32)

    cm = np.zeros((n_classes, n_classes), dtype=np.int32)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1

    acc = float(np.mean(y_true == y_pred))
    print(f"[INFO] Overall accuracy: {acc * 100:.2f}%")
    print("[INFO] Confusion matrix rows=true, cols=pred")
    print(cm)

    print("[INFO] Per-class metrics:")
    for i, name in enumerate(class_names):
        tp = int(cm[i, i])
        fn = int(np.sum(cm[i]) - tp)
        fp = int(np.sum(cm[:, i]) - tp)
        support = int(np.sum(cm[i]))

        recall = safe_div(tp, tp + fn)
        precision = safe_div(tp, tp + fp)
        f1 = safe_div(2 * precision * recall, precision + recall)

        print(
            f"[INFO] {name:>6s}: support={support:4d}, "
            f"precision={precision*100:6.2f}%, "
            f"recall={recall*100:6.2f}%, "
            f"f1={f1*100:6.2f}%"
        )


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data-dir",
        default="",
        help="Directory containing class subfolders for evaluation.",
    )
    parser.add_argument("--batch-size", type=int, default=32)
    return parser.parse_args()


def main():
    args = parse_args()
    dataset_dir = resolve_dataset_dir(args.data_dir)
    evaluate(dataset_dir=dataset_dir, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
