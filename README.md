# KrishiAI — Full-Stack Smart Farming Assistant

AI-powered farming assistant for Indian farmers. Built with React + Django.

---

## 🚀 Quick Start

### Backend

```bash
cd backend/krishiai_backend

# 1. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r ../requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and set OPENWEATHER_API_KEY (free at openweathermap.org)

# 4. Start the server
python manage.py runserver 8000
```

The API will be available at `http://localhost:8000/api/`

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# .env already points to http://localhost:8000/api

# 3. Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🗂 Project Structure

```
krishiai/
├── frontend/                      # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/                 # Route pages
│   │   ├── components/            # UI components
│   │   ├── services/              # API service layer
│   │   ├── stores/                # Zustand state stores
│   │   ├── hooks/                 # Custom hooks
│   │   └── lib/                   # Utilities
│   ├── .env.example
│   └── package.json
│
└── backend/
    ├── krishiai_backend/
    │   ├── krishiai_backend/      # Django project config
    │   ├── predictor/             # Main app
    │   │   ├── views.py           # All API endpoints
    │   │   ├── urls.py            # URL routing
    │   │   ├── services/          # Weather, soil, satellite, location
    │   │   ├── utils/             # Feature builder utilities
    │   │   ├── data/              # crop_rules.json, CSV data
    │   │   ├── crop_model.pkl     # Trained ML model
    │   │   └── label_encoder.pkl
    │   └── .env.example
    └── requirements.txt
```

---

## 🔌 API Endpoints

All endpoints available at `/api/` (also at `/api/v1/` for versioned access).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Model health check |
| `POST` | `/api/predict` | Crop prediction (manual 7 inputs) |
| `POST` | `/api/predict-live` | Live prediction (lat, lon, N, P, K) |
| `POST` | `/api/crops/recommend` | Crop recommendation (frontend path) |
| `GET` | `/api/weather?lat=&lon=` | Weather data |
| `GET` | `/api/soil?lat=&lon=` | Soil health data |
| `GET` | `/api/satellite?lat=&lon=` | Satellite / NDVI data |
| `POST` | `/api/disease/predict` | Leaf disease detection (image upload) |
| `GET` | `/api/market/prices?state=` | Mandi market prices |
| `GET` | `/api/location/reverse?lat=&lon=` | Reverse geocode |
| `GET` | `/api/location/search?q=` | Location search |
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/register` | User registration |

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Backend API base URL |

### Backend (`backend/krishiai_backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DJANGO_SECRET_KEY` | In prod | Django secret key |
| `DJANGO_DEBUG` | No (default `True`) | Debug mode |
| `DJANGO_ALLOWED_HOSTS` | In prod | Comma-separated hosts |
| `CORS_ALLOWED_ORIGINS` | In prod | Comma-separated origins |
| `OPENWEATHER_API_KEY` | Recommended | Free key from openweathermap.org |
| `PREDICT_RATE_LIMIT` | No (default `30/m`) | Rate limit per IP |

---

## 🧪 Running Tests

```bash
cd backend/krishiai_backend
python manage.py test predictor
```

---

## 🚢 Production Deployment

### Backend (Render / Railway / Heroku)

```bash
# Set environment variables in your platform dashboard:
DJANGO_SECRET_KEY=<generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
OPENWEATHER_API_KEY=<your_key>

# Start command (already in Procfile):
cd krishiai_backend && gunicorn krishiai_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 3
```

### Frontend (Vercel / Netlify)

```bash
# Set environment variable in dashboard:
VITE_API_BASE_URL=https://your-backend.onrender.com/api

# Build command:
npm run build

# Output directory:
dist/
```

---

## 🐛 Known Limitations

1. **Disease detection** uses a content-hash stub — replace `disease_predict_view` body with a real image classification model (e.g., TensorFlow/PyTorch).
2. **Market prices** are deterministic mocks — connect to Agmarknet / data.gov.in for live data.
3. **Auth** is a UUID-based stub — replace with Django REST Framework + JWT (djangorestframework-simplejwt).
4. **Satellite NDVI** uses a stable location-based mock — connect to Sentinel Hub / NASA Earthdata for real imagery.
5. **Weather** requires `OPENWEATHER_API_KEY` — without it, safe fallback values are used.

---

## 📦 Key Dependencies

### Frontend
- React 18, TypeScript, Vite
- TailwindCSS v4, shadcn/ui, Radix UI
- TanStack Query, Zustand, React Router DOM
- Framer Motion, Recharts, Leaflet
- i18next (EN / हिन्दी / বাংলা)

### Backend
- Django 4.2, django-cors-headers
- scikit-learn, numpy, pandas
- gunicorn, python-dotenv, requests
