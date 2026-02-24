"""model/cnn_model.py"""
import tensorflow as tf
from tensorflow.keras.layers import Conv2D, Dense, Dropout, Flatten, MaxPooling2D
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.optimizers import Adam


def build_cnn_model(input_shape=(224, 224, 3), num_classes=3):
    """
    Build and compile a CNN model for skin type classification.
    Classes: oily, dry, normal.
    """
    model = Sequential()

    # Block 1
    model.add(Conv2D(32, (3, 3), activation="relu", input_shape=input_shape, name="conv2d_0"))
    model.add(MaxPooling2D(pool_size=(2, 2)))

    # Block 2
    model.add(Conv2D(64, (3, 3), activation="relu", name="conv2d_1"))
    model.add(MaxPooling2D(pool_size=(2, 2)))

    # Block 3
    model.add(Conv2D(128, (3, 3), activation="relu", name="conv2d_2"))  # Last conv layer
    model.add(MaxPooling2D(pool_size=(2, 2)))

    # Fully connected layers
    model.add(Flatten())
    model.add(Dense(128, activation="relu"))
    model.add(Dropout(0.5))
    model.add(Dense(num_classes, activation="softmax"))

    # Compile model
    model.compile(
        optimizer=Adam(learning_rate=0.0001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model


def load_trained_model(model_path="model/skin_model.keras"):
    """
    Load a pre-trained model and build it by running one dummy prediction.
    """
    model = load_model(model_path)

    dummy_input = tf.zeros((1, 224, 224, 3))
    _ = model.predict(dummy_input, verbose=0)

    print("[INFO] CNN model input shape:", model.input_shape)
    print("[INFO] Model layers:")
    for i, layer in enumerate(model.layers):
        print(f"  {i}: {layer.name} ({layer.__class__.__name__})")

    return model
