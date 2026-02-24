# SkinAnalysis AI

AI-powered skin type analyzer built with Flask + TensorFlow.  
The app predicts facial skin type (`dry`, `normal`, `oily`), generates Grad-CAM explainability output, and provides tailored skincare guidance with user history tracking.

## Key Features

- Secure authentication (signup/login/logout)
- Session-based access control with CSRF protection
- Image upload validation (type, MIME, content, size)
- AI inference with confidence and class probabilities
- Grad-CAM explainability image generation
- Dashboard with analyzer, history, and settings views
- Per-user scan history, detail view, and delete support
- Dockerized deployment

## Tech Stack

- Backend: Flask, Gunicorn
- ML: TensorFlow/Keras, OpenCV, NumPy, scikit-learn
- Image processing: Pillow, OpenCV, MediaPipe
- Database: PostgreSQL (`DATABASE_URL`)
- Frontend: Jinja templates + JavaScript + CSS

## Project Structure

```text
.
|-- app.py
|-- requirements.txt
|-- Dockerfile
|-- docker-compose.yml
|-- database/
|   |-- db.py
|   |-- auth.py
|   `-- save_result.py
|-- preprocessing/
|   |-- image_preprocess.py
|   `-- gradcam.py
|-- model/
|   |-- cnn_model.py
|   |-- skin_model.keras
|   `-- class_names.json
|-- recommender/
|   `-- products.py
|-- templates/
|-- static/
|   |-- css/
|   `-- js/
|-- prepare_dataset.py
|-- train.py
`-- evaluate_model.py
```

## Local Setup (Windows PowerShell)

1. Create and activate virtual environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Install dependencies

```powershell
pip install -r requirements.txt
```

3. Set environment variables

```powershell
$env:SECRET_KEY = "replace-with-a-long-random-secret"
$env:SESSION_COOKIE_SECURE = "0"
$env:FLASK_DEBUG = "0"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/skin_care"
$env:DB_SSLMODE = "prefer"
```

4. Run the app

```powershell
python app.py
```

Open: `http://127.0.0.1:5000`

## Environment Variables

- `SECRET_KEY`: strongly recommended; if missing, app falls back to insecure dev key
- `SESSION_COOKIE_SECURE`: set `1` for HTTPS production, `0` for local dev
- `FLASK_DEBUG`: optional debug toggle
- `DATABASE_URL`: PostgreSQL connection string (required for runtime DB access)
- `DB_SSLMODE`: optional psycopg2 SSL mode override (for example: `require`, `prefer`)

## API Endpoints

- `GET /api/csrf-token`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/results?limit=20`
- `POST /api/analyze` (multipart form-data with `image`)

For protected `POST` endpoints, send CSRF token in:
- `X-CSRF-Token` header, or
- `csrf_token` form field

## Web Routes

- `GET /`
- `GET|POST /signup`
- `GET|POST /login`
- `GET /logout`
- `GET /analyzer`
- `GET /history`
- `GET /settings`
- `GET /history/<result_id>`
- `POST /history/<result_id>/delete`
- `POST /analyze`

## ML Workflow

1. Prepare cleaned dataset split

```powershell
python prepare_dataset.py
```

2. Train model

```powershell
python train.py
```

3. Evaluate model

```powershell
python evaluate_model.py --data-dir dataset/split/test --batch-size 32
```

Outputs are saved in `model/` (including `skin_model.keras` and `class_names.json`).

## Docker

Run with Docker Compose:

```powershell
docker compose up --build
```

Open: `http://localhost:5000`

## Security and Validation Notes

- CSRF checks on mutating routes (`POST/PUT/PATCH/DELETE`)
- Session cookie hardened (`HttpOnly`, `SameSite=Lax`)
- Max upload size: `5 MB`
- Allowed image extensions: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`

## Current Known Limitation

- Model accuracy can be improved further, especially for the `oily` class.

## Project Report

Detailed technical report is available at:
- `PROJECT_REPORT.md`
