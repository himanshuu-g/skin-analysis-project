"""preprocessing/skin_region_extractor.py"""
import cv2
import numpy as np

def extract_skin_region(image):
    """
    Extract skin regions from image using HSV color space
    Returns image with only skin-colored pixels
    """
    # Convert to HSV color space
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Define skin color range in HSV
    # Lower bound: (0, 20, 70)
    # Upper bound: (20, 255, 255)
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([20, 255, 255], dtype=np.uint8)
    
    # Create mask for skin pixels
    mask = cv2.inRange(hsv, lower_skin, upper_skin)
    
    # Apply morphological operations to clean up the mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    
    # Apply Gaussian blur to smooth the mask
    mask = cv2.GaussianBlur(mask, (5, 5), 0)
    
    # Apply mask to original image
    skin = cv2.bitwise_and(image, image, mask=mask)
    
    # If too much is masked out, return original image
    skin_percentage = np.count_nonzero(mask) / (mask.shape[0] * mask.shape[1])
    if skin_percentage < 0.1:  # Less than 10% skin detected
        return image
    
    return skin