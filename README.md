# SkinAnalysis AI

AI-powered skin type analyzer built with Flask + TensorFlow.  
The app predicts facial skin type (`dry`, `normal`, `oily`), generates Grad-CAM explainability output, and provides tailored skincare guidance with user history and synced schedule tracking.

## Key Features

- Secure authentication (`signup`, `login`, `logout`)
- Session-based access control with CSRF protection
- Image upload validation (extension, MIME, real content, size)
- AI inference with confidence + class probabilities
- Grad-CAM explainability generation
- Dashboard with analyzer, routine, schedule, history, and settings views
- Per-user scan history with detail and delete support
- Per-user schedule events synced via backend DB across devices/accounts
- Reminder export (`.ics`) for phone calendar/alarm import
- Dockerized runtime with Gunicorn

## Tech Stack

- Backend: Flask, Gunicorn
- ML: TensorFlow/Keras, OpenCV, NumPy, scikit-learn
- Image processing: Pillow, OpenCV, MediaPipe
- Database: MongoDB (`users`, `results`, `schedule_events`, `products` collections)
- Frontend: Jinja templates + modular JavaScript + CSS

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
|   |-- save_result.py
|   |-- schedule_events.py
|   `-- migrate_sqlite_to_mongo.py
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
|       |-- upload.js
|       |-- dashboard.js
|       |-- history.js
|       |-- analysis.js
|       |-- camera.js
|       `-- schedule.js
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
$env:MONGO_URI = "mongodb://localhost:27017"
$env:MONGO_DB_NAME = "skin_analysis"
$env:ADMIN_EMAILS = "you@example.com"
```

4. Run the app

```powershell
python app.py
```

Open: `http://127.0.0.1:5000`

5. (Optional) Migrate existing SQLite data into MongoDB

```powershell
python -m database.migrate_sqlite_to_mongo --drop-existing
```

## Environment Variables

- `SECRET_KEY`: strongly recommended; if missing, app falls back to insecure dev key
- `SESSION_COOKIE_SECURE`: set `1` for HTTPS production, `0` for local dev
- `FLASK_DEBUG`: optional debug toggle
- `MONGO_URI`: Mongo connection URI (default: `mongodb://localhost:27017`)
- `MONGO_DB_NAME`: database name (default: `skin_analysis`)
- `ADMIN_EMAILS`: comma-separated emails that should have admin access (example: `admin@example.com,ops@example.com`)

## API Endpoints

- `GET /api/csrf-token`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/results?limit=20`
- `GET /api/schedule/events`
- `POST /api/schedule/events`
- `PATCH /api/schedule/events/<event_id>`
- `DELETE /api/schedule/events/<event_id>`
- `GET /api/admin/overview` (admin only)
- `GET /api/admin/recent-users?limit=20` (admin only)
- `GET /api/admin/recent-results?limit=20` (admin only)
- `GET /api/admin/recent-events?limit=20` (admin only)
- `POST /api/analyze` (multipart form-data with `image`)

For protected mutation endpoints (`POST`, `PATCH`, `DELETE`), send CSRF token in:
- `X-CSRF-Token` header, or
- `csrf_token` form field

## Schedule Sync Notes

- Schedule events are stored per user in the `schedule_events` collection.
- Events are fetched and mutated through authenticated API endpoints.
- UI filter/selection state remains local, but event data is server-backed.
- Any logged-in device for the same account can see the same events.

## Admin Console

- Route: `GET /admin` (admin only)
- Shows high-level counts and recent users/results/events.
- Access is role-gated using `ADMIN_EMAILS`.

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

## Current Known Limitations

- Model accuracy can be improved further, especially for the `oily` class.
- Ensure MongoDB is reachable and indexed before serving production traffic.

## Project Report

Detailed technical report is available at:
- `PROJECT_REPORT.md`
- `PROJECT_REPORT.pdf`
