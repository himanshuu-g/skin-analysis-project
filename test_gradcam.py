"""test_gradcam.py - BULLETPROOF VERSION"""
import numpy as np
import cv2
import tensorflow as tf
from model.cnn_model import load_trained_model
import os
import glob

# Load model
print("Loading model...")
model = load_trained_model('model/skin_model.keras')

# Find an image
print("\n🔍 Looking for test images...")
image_paths = []
for pattern in ['static/uploads/*.jpg', 'static/uploads/*.png', 'static/uploads/*.jpeg']:
    image_paths.extend(glob.glob(pattern))

if not image_paths:
    print("❌ No images found in static/uploads/")
    exit(1)

test_image_path = image_paths[0]
print(f"✅ Found image: {test_image_path}")

# Load image
img = cv2.imread(test_image_path)
img_resized = cv2.resize(img, (224, 224))
img_array = img_resized / 255.0
img_array = np.expand_dims(img_array, axis=0)
img_array = tf.convert_to_tensor(img_array, dtype=tf.float32)

print(f"✅ Image loaded: {img_array.shape}")

# Make prediction
print("\n🧠 Making prediction...")
predictions = model.predict(img_array)
predicted_class = np.argmax(predictions[0])
class_names = ['dry', 'normal', 'oily']
print(f"Predicted: {class_names[predicted_class]} (confidence: {predictions[0][predicted_class]*100:.2f}%)")

# Generate Grad-CAM manually
print("\n🔥 Generating Grad-CAM (manual method)...")
last_conv_layer_name = 'conv2d_2'

try:
    # Find the target layer index
    target_layer_idx = None
    for idx, layer in enumerate(model.layers):
        if layer.name == last_conv_layer_name:
            target_layer_idx = idx
            break
    
    if target_layer_idx is None:
        raise ValueError(f"Layer {last_conv_layer_name} not found")
    
    print(f"✅ Target layer found at index {target_layer_idx}")
    
    # Forward pass with gradient tape
    with tf.GradientTape() as tape:
        # Manual forward pass through layers
        x = img_array
        tape.watch(x)
        
        conv_output = None
        for idx, layer in enumerate(model.layers):
            x = layer(x)
            if idx == target_layer_idx:
                conv_output = x
                tape.watch(conv_output)
        
        # x is now the final predictions
        pred_index = tf.argmax(x[0])
        class_score = x[:, pred_index]
    
    print(f"✅ Forward pass complete")
    print(f"   Conv output shape: {conv_output.shape}")
    print(f"   Predicted class: {pred_index.numpy()}")
    
    # Compute gradients
    grads = tape.gradient(class_score, conv_output)
    
    if grads is None:
        print("❌ Gradients are None!")
        exit(1)
    
    print(f"✅ Gradients computed")
    print(f"   Gradients shape: {grads.shape}")
    print(f"   Gradients range: [{tf.reduce_min(grads):.4f}, {tf.reduce_max(grads):.4f}]")
    
    # Global average pooling on gradients
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    
    # Convert to numpy
    conv_output = conv_output[0].numpy()
    pooled_grads = pooled_grads.numpy()
    
    print(f"   Pooled grads shape: {pooled_grads.shape}")
    
    # Weight feature maps by importance
    for i in range(len(pooled_grads)):
        conv_output[:, :, i] *= pooled_grads[i]
    
    # Create heatmap
    heatmap = np.mean(conv_output, axis=-1)
    
    print(f"   Raw heatmap range: [{np.min(heatmap):.4f}, {np.max(heatmap):.4f}]")
    
    # Apply ReLU and normalize
    heatmap = np.maximum(heatmap, 0)
    if np.max(heatmap) > 0:
        heatmap = heatmap / np.max(heatmap)
    
    print(f"✅ Heatmap normalized: [{np.min(heatmap):.4f}, {np.max(heatmap):.4f}]")
    
    # Create visualizations
    print("\n🎨 Creating visualizations...")
    
    # Resize heatmap
    heatmap_resized = cv2.resize(heatmap, (224, 224))
    
    # Apply colormap
    heatmap_colored = np.uint8(255 * heatmap_resized)
    heatmap_colored = cv2.applyColorMap(heatmap_colored, cv2.COLORMAP_JET)
    
    # Original image
    original_img = (img_array[0].numpy() * 255).astype(np.uint8)
    
    # Create output directory
    os.makedirs("static/test_gradcam", exist_ok=True)
    
    # Save outputs
    cv2.imwrite("static/test_gradcam/1_heatmap_only.jpg", heatmap_colored)
    print("✅ Saved: static/test_gradcam/1_heatmap_only.jpg")
    
    cv2.imwrite("static/test_gradcam/2_original.jpg", original_img)
    print("✅ Saved: static/test_gradcam/2_original.jpg")
    
    # Different overlay strengths
    overlay_30_70 = cv2.addWeighted(original_img, 0.3, heatmap_colored, 0.7, 0)
    cv2.imwrite("static/test_gradcam/3_overlay_30_70.jpg", overlay_30_70)
    print("✅ Saved: static/test_gradcam/3_overlay_30_70.jpg")
    
    overlay_50_50 = cv2.addWeighted(original_img, 0.5, heatmap_colored, 0.5, 0)
    cv2.imwrite("static/test_gradcam/4_overlay_50_50.jpg", overlay_50_50)
    print("✅ Saved: static/test_gradcam/4_overlay_50_50.jpg")
    
    overlay_60_40 = cv2.addWeighted(original_img, 0.6, heatmap_colored, 0.4, 0)
    cv2.imwrite("static/test_gradcam/5_overlay_60_40.jpg", overlay_60_40)
    print("✅ Saved: static/test_gradcam/5_overlay_60_40.jpg")
    
    print("\n" + "="*70)
    print("🎉 SUCCESS! Grad-CAM generated!")
    print("="*70)
    print("Check 'static/test_gradcam/' folder for outputs")
    print("The heatmap should show RED/YELLOW/BLUE colors!")
    print("="*70)

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()