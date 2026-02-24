"""preprocessing/face_detection.py"""
import cv2
import numpy as np

def detect_face(image):
    """
    Detect face in image using Haar Cascade
    Returns the face region if found, otherwise returns original image
    """
    # Load Haar Cascade for face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    # Convert to grayscale for detection
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    # If face detected, return the first face
    if len(faces) > 0:
        (x, y, w, h) = faces[0]
        face_roi = image[y:y+h, x:x+w]
        return face_roi
    
    # If no face detected, return original image
    return image