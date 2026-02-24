"""Train a stronger skin-type classifier using cleaned dataset splits."""
import json
import os

import tensorflow as tf
from tensorflow.keras import layers

IMG_SIZE = (224, 224)
BATCH_SIZE = 24
INITIAL_EPOCHS = 10
FINE_TUNE_EPOCHS = 12
SEED = 42

SPLIT_ROOT = "dataset/split"
TRAIN_DIR = os.path.join(SPLIT_ROOT, "train")
VAL_DIR = os.path.join(SPLIT_ROOT, "val")

MODEL_DIR = "model"
MODEL_PATH = os.path.join(MODEL_DIR, "skin_model.keras")
BEST_MODEL_PATH = os.path.join(MODEL_DIR, "skin_model_best.keras")
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, "class_names.json")

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def _ensure_split_exists():
    missing = [path for path in (TRAIN_DIR, VAL_DIR) if not os.path.isdir(path)]
    if missing:
        missing_str = ", ".join(missing)
        raise FileNotFoundError(
            f"Missing dataset split directories: {missing_str}. "
            "Run `python prepare_dataset.py` first."
        )


def _count_images_per_class(root_dir, class_names):
    counts = {}
    for class_name in class_names:
        class_dir = os.path.join(root_dir, class_name)
        count = 0
        for name in os.listdir(class_dir):
            path = os.path.join(class_dir, name)
            ext = os.path.splitext(name)[1].lower()
            if os.path.isfile(path) and ext in VALID_EXTENSIONS:
                count += 1
        counts[class_name] = count
    return counts


def build_datasets():
    _ensure_split_exists()

    train_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        seed=SEED,
        shuffle=True,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        VAL_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=False,
    )

    class_names = train_ds.class_names
    if val_ds.class_names != class_names:
        raise ValueError(
            f"Train/val class order mismatch. train={class_names}, val={val_ds.class_names}"
        )
    num_classes = len(class_names)
    print("[INFO] Class order:", class_names)

    autotune = tf.data.AUTOTUNE
    # Keep input contract aligned with app inference: [0, 1] before model body.
    train_ds = train_ds.map(
        lambda x, y: (tf.cast(x, tf.float32) / 255.0, y),
        num_parallel_calls=autotune,
    )
    val_ds = val_ds.map(
        lambda x, y: (tf.cast(x, tf.float32) / 255.0, y),
        num_parallel_calls=autotune,
    )

    train_ds = train_ds.prefetch(buffer_size=autotune)
    val_ds = val_ds.prefetch(buffer_size=autotune)
    return train_ds, val_ds, class_names, num_classes


def estimate_class_weights(class_names):
    counts = _count_images_per_class(TRAIN_DIR, class_names)
    total = sum(counts.values())
    n_classes = len(class_names)

    weights = {}
    for idx, class_name in enumerate(class_names):
        count = counts[class_name]
        if count <= 0:
            continue
        weights[idx] = float(total / (n_classes * count))

    print("[INFO] Train class counts:", counts)
    print("[INFO] Class weights:", weights)
    return weights


def create_model(num_classes):
    data_augmentation = tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.08),
            layers.RandomZoom(0.15),
            layers.RandomTranslation(height_factor=0.05, width_factor=0.05),
            layers.RandomContrast(0.15),
        ],
        name="data_augmentation",
    )

    try:
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=IMG_SIZE + (3,),
            include_top=False,
            weights="imagenet",
        )
        print("[INFO] Using ImageNet pretrained MobileNetV2 weights.")
    except Exception as err:
        print(f"[WARN] Could not load ImageNet weights ({err}). Using random init.")
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=IMG_SIZE + (3,),
            include_top=False,
            weights=None,
        )

    base_model.trainable = False

    inputs = tf.keras.Input(shape=IMG_SIZE + (3,), dtype=tf.float32)
    x = data_augmentation(inputs)
    x = layers.Rescaling(2.0, offset=-1.0, name="mobilenetv2_input_scale")(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs, name="skin_mobilenetv2")
    return model, base_model


def compile_model(model, learning_rate):
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss="sparse_categorical_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.SparseTopKCategoricalAccuracy(k=2, name="top2_accuracy"),
        ],
    )


def train():
    os.makedirs(MODEL_DIR, exist_ok=True)

    train_ds, val_ds, class_names, num_classes = build_datasets()
    class_weights = estimate_class_weights(class_names)
    model, base_model = create_model(num_classes)

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            BEST_MODEL_PATH,
            monitor="val_accuracy",
            mode="max",
            save_best_only=True,
            verbose=1,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            mode="max",
            patience=6,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            min_lr=1e-6,
            verbose=1,
        ),
    ]

    print("\n[INFO] Phase 1: Train classifier head")
    compile_model(model, learning_rate=3e-4)
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=INITIAL_EPOCHS,
        class_weight=class_weights,
        callbacks=callbacks,
    )

    print("\n[INFO] Phase 2: Fine-tune backbone tail")
    base_model.trainable = True
    for layer in base_model.layers[:-80]:
        layer.trainable = False

    compile_model(model, learning_rate=1e-5)
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=INITIAL_EPOCHS + FINE_TUNE_EPOCHS,
        initial_epoch=INITIAL_EPOCHS,
        class_weight=class_weights,
        callbacks=callbacks,
    )

    if os.path.exists(BEST_MODEL_PATH):
        model = tf.keras.models.load_model(BEST_MODEL_PATH)
        print(f"[INFO] Loaded best checkpoint from {BEST_MODEL_PATH}")

    model.save(MODEL_PATH)
    print(f"[INFO] Saved model to {MODEL_PATH}")

    with open(CLASS_NAMES_PATH, "w", encoding="utf-8") as fp:
        json.dump(class_names, fp, ensure_ascii=True, indent=2)
    print(f"[INFO] Saved class names to {CLASS_NAMES_PATH}")
    print("[INFO] Next: run `python evaluate_model.py`")


if __name__ == "__main__":
    train()
