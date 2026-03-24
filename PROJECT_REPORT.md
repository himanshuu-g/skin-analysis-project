# SkinAnalysis AI
## Project Report and Technical Summary

Prepared on: March 23, 2026  
Project type: Full-stack AI web application  
Submission context: College project and internship-ready portfolio system

---

## 1. Executive Summary

SkinAnalysis AI is an end-to-end web application that classifies facial skin type (`dry`, `normal`, `oily`) from uploaded images, explains model focus using Grad-CAM, and converts predictions into personalized skincare guidance.  
The project combines machine learning, secure web development, persistent user data, responsive frontend design, and deployment tooling in a single integrated system.

The current implementation supports:
- Secure authentication with session handling
- CSRF-protected HTML and API mutation flows
- Image validation and safe upload storage
- CNN inference with class probabilities and confidence score
- Grad-CAM explainability output
- Personalized skincare recommendations and routines
- User history tracking
- Account-scoped schedule management with backend sync
- Admin analytics dashboard
- Training, evaluation, and dataset-preparation scripts

---

## 2. Problem Statement

Many users choose skincare products without reliably knowing their skin type.  
This project addresses that gap by building a prototype AI assistant that:
- predicts skin type from a face image,
- explains what the model focused on,
- stores user results over time,
- and connects the prediction to practical skincare recommendations.

---

## 3. Objectives Completed

1. Built a secure Flask application for AI-assisted skin analysis.
2. Implemented signup, login, logout, and session-based access control.
3. Added CSRF protection for all protected mutation routes.
4. Validated uploaded images by extension, MIME type, actual content, and file size.
5. Integrated TensorFlow inference with confidence and class probabilities.
6. Added Grad-CAM explainability with fallback-safe generation.
7. Persisted user scans and schedule events in MongoDB.
8. Created a dashboard with analysis, history, routine, schedule, and settings views.
9. Added admin monitoring for users, results, and events.
10. Included dataset cleaning, training, and evaluation pipelines.
11. Added Docker and Render deployment support.

---

## 4. End-to-End Workflow

### 4.1 Analysis Flow

1. User creates an account or logs in.
2. User uploads a face image or captures one from the dashboard.
3. Backend validates image safety and content.
4. The model predicts `dry`, `normal`, or `oily`.
5. Grad-CAM heatmap is generated to visualize focus regions.
6. Result metadata is stored in MongoDB.
7. Dashboard updates the latest metrics and history.
8. User can review result details and download reminder files for follow-up care.

### 4.2 Schedule Flow

1. User opens the schedule view.
2. Frontend loads account-scoped events through authenticated APIs.
3. User can create, update, complete, or delete schedule items.
4. Events persist in MongoDB and stay available across sessions/devices for the same account.
5. Upcoming events can be exported as `.ics` calendar files.

---

## 5. Architecture Overview

```text
Browser (HTML templates + modular JS + CSS)
   |
   | HTTP / JSON API
   v
Flask App (app.py)
   |-- Auth + Session + CSRF
   |-- Upload validation
   |-- Inference orchestration
   |-- Dashboard/history/schedule/admin views
   |
   +--> ML Layer
   |      preprocessing/image_preprocess.py
   |      preprocessing/gradcam.py
   |      model/skin_model.keras
   |
   +--> Recommendation Layer
   |      recommender/products.py
   |
   +--> Data Layer
          database/db.py
          database/auth.py
          database/save_result.py
          database/schedule_events.py
          database/admin_stats.py
          MongoDB collections:
            users, results, schedule_events, products, admin_audit
```

---

## 6. Technology Stack

- Backend: Flask, Gunicorn
- ML/Data: TensorFlow/Keras, NumPy, OpenCV, scikit-learn
- Image handling: Pillow, OpenCV
- Database: MongoDB
- Frontend: Jinja templates, JavaScript modules, responsive CSS
- Explainability: Grad-CAM
- Deployment: Docker, Docker Compose, Render

---

## 7. Major Modules

- `app.py`
  Main Flask application, route handling, security, inference orchestration, dashboard context.
- `database/db.py`
  MongoDB connection management and index creation.
- `database/auth.py`
  User lookup, user creation, and role resolution.
- `database/save_result.py`
  Scan result persistence and history queries.
- `database/schedule_events.py`
  Schedule CRUD scoped by authenticated user ownership.
- `database/admin_stats.py`
  Admin overview metrics, recent activity queries, and audit logging.
- `preprocessing/image_preprocess.py`
  Image preprocessing, inference execution, confidence flags, and Grad-CAM generation.
- `preprocessing/gradcam.py`
  Robust Grad-CAM implementation with fallback paths.
- `recommender/products.py`
  Skin-type-specific descriptions, routines, dos and don'ts, and products.
- `train.py`
  MobileNetV2-based transfer-learning training pipeline.
- `evaluate_model.py`
  Held-out test evaluation with confusion matrix and per-class metrics.
- `prepare_dataset.py`
  Dataset cleaning, duplicate filtering, quality filtering, and train/val/test split generation.

---

## 8. Security and Validation

### 8.1 Security Controls

- Session cookie hardened with `HttpOnly` and `SameSite=Lax`
- Optional secure-cookie enforcement via environment variable
- CSRF token generation and validation for all mutating routes
- Protected user-only and admin-only views

### 8.2 Image Validation

- Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`
- MIME type validation
- Actual image-content validation via Pillow
- Maximum upload size: `5 MB`
- Unique filename generation for saved uploads

### 8.3 Schedule Validation

Server-side validation enforces:
- event type enum
- priority enum
- title length
- description length
- reminder bounds
- datetime validity
- user ownership for all reads and writes

---

## 9. Routes and APIs

### 9.1 Web Routes

- `GET /`
- `GET|POST /signup`
- `GET|POST /login`
- `GET /logout`
- `GET /analyzer`
- `GET /settings`
- `GET /history`
- `GET /history/<result_id>`
- `POST /history/<result_id>/delete`
- `POST /analyze`
- `GET /admin`

### 9.2 API Routes

- `GET /api/csrf-token`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/results`
- `GET /api/schedule/events`
- `POST /api/schedule/events`
- `PATCH /api/schedule/events/<event_id>`
- `DELETE /api/schedule/events/<event_id>`
- `POST /api/analyze`
- `GET /api/admin/overview`
- `GET /api/admin/recent-users`
- `GET /api/admin/recent-results`
- `GET /api/admin/recent-events`

---

## 10. Database Design

MongoDB collections used by the project:

- `users`
  Stores name, email, contact number, hashed password, role, and creation timestamp.
- `results`
  Stores user scan results, confidence, image paths, Grad-CAM path, probabilities, model version, and inference latency.
- `schedule_events`
  Stores user-specific routine or appointment events with completion state and reminders.
- `products`
  Supports recommendation catalog data.
- `admin_audit`
  Stores admin access logs for monitoring actions.

Indexes are created in `database/db.py` for:
- unique user email lookup
- result history queries by user and time
- schedule event queries by user, completion state, and date
- admin audit lookup

---

## 11. Dataset Preparation and Training Pipeline

### 11.1 Data Preparation

`prepare_dataset.py` performs:
- duplicate filtering using file hashes
- copy-name filtering
- unreadable-image removal
- low-resolution filtering
- blurry-image filtering
- deterministic splitting into train/validation/test

Default split ratio:
- train: 70%
- validation: 15%
- test: 15%

### 11.2 Model Training

`train.py` uses:
- image size `224 x 224`
- MobileNetV2 backbone
- two-stage transfer learning
- augmentation (flip, rotation, zoom, translation, contrast)
- class weighting
- early stopping
- best-checkpoint saving

Saved model artifacts:
- `model/skin_model.keras`
- `model/skin_model_best.keras`
- `model/class_names.json`

---

## 12. Model Evaluation

Latest verified evaluation executed on March 23, 2026 using `dataset/split/test`:

- Test samples: `356`
- Overall accuracy: `51.97%`
- Confusion matrix (`true x predicted`):
  - `[[54, 25, 19], [31, 91, 37], [20, 39, 40]]`

Per-class metrics:
- dry: precision `51.43%`, recall `55.10%`, F1 `53.20%`
- normal: precision `58.71%`, recall `57.23%`, F1 `57.96%`
- oily: precision `41.67%`, recall `40.40%`, F1 `41.03%`

Interpretation:
- `normal` is currently the strongest class.
- `oily` is currently the weakest class.
- The project should be presented as a prototype AI decision-support system, not a clinical diagnostic tool.

---

## 13. Explainability and Recommendation Logic

### 13.1 Grad-CAM

Grad-CAM is generated for scan results to show which image regions influenced the model prediction.  
Fallback-safe logic in `preprocessing/gradcam.py` improves reliability across different model graph cases.

### 13.2 Recommendation Engine

`recommender/products.py` returns:
- skin description
- characteristics
- dos and don'ts
- product suggestions
- morning routine
- evening routine

This turns raw classification output into a user-facing care plan.

---

## 14. Frontend and User Experience

The project includes:
- landing page with project summary and auth access
- dashboard with metrics and multiple in-page views
- scan upload progress handling
- live result rendering
- history review and deletion
- schedule summary, filters, event details, and export
- admin console for recent activity and system counts

The design is responsive and supports desktop and mobile breakpoints.

---

## 15. Testing and Verification

Verified during repository review:
- `app.py` compiled successfully using `python -m compileall`
- `static/js/upload.js` passed `node --check`
- `static/js/schedule.js` passed `node --check`
- `evaluate_model.py` ran successfully on the held-out test split

Automated route-level tests are now part of the project for:
- protected API access behavior
- signup validation behavior
- upload validation failure path
- schedule create/update/delete behavior

---

## 16. Current Limitations

- Model accuracy is still moderate, especially for the `oily` class.
- The project depends on a trained local model artifact being present.
- Native push notifications are not implemented; reminders are exported through `.ics` files.
- Production hardening such as rate limiting and centralized observability can be expanded further.

---

## 17. Improvement Roadmap

1. Improve dataset balance and image quality, especially for `oily` samples.
2. Compare additional backbones such as EfficientNet or ConvNeXt.
3. Add richer experiment tracking and model version benchmarking.
4. Expand automated tests and add end-to-end browser checks.
5. Surface confusion matrix and evaluation trends directly inside the admin dashboard.

---

## 18. College Viva Talking Points

1. Why server-rendered Flask was chosen for fast full-stack delivery.
2. How CSRF protection works in a hybrid HTML plus API application.
3. Why explainability matters for AI trust and demo credibility.
4. How the data-cleaning script improves reproducibility.
5. Why model performance should be presented honestly as prototype-level.
6. How MongoDB supports account-scoped history and schedule synchronization.
7. How the project combines ML, backend engineering, UI design, and deployment.

---

## 19. Conclusion

SkinAnalysis AI demonstrates a complete academic project lifecycle:
- data preparation,
- model training and evaluation,
- explainable inference,
- secure web integration,
- persistent user workflows,
- and deployable delivery.

The project is suitable for college presentation after documentation alignment, honest performance reporting, and submission-focused demo framing.
