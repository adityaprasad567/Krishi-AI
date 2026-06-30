"""
krishiai_backend/urls.py
========================
Root URL configuration.

All API endpoints are exposed at:
    /api/v1/*   — versioned, recommended for all clients
    /*          — unversioned aliases kept for backward compatibility

Available endpoints:
    GET    /health                → model health check
    POST   /predict               → crop recommendation (manual, all 7 inputs)
    POST   /predict-live          → live crop recommendation (lat, lon, N, P, K)
    POST   /crops/recommend       → crop recommendation (frontend-native path)
    GET    /weather               → weather by lat/lon
    GET    /soil                  → soil data by lat/lon
    GET    /satellite             → satellite/NDVI data by lat/lon
    POST   /disease/predict       → leaf disease detection
    GET    /market/prices         → market prices
    GET    /location/reverse      → reverse geocode
    GET    /location/search       → location search
    POST   /auth/login            → user login
    POST   /auth/register         → user registration
"""

from django.urls import include, path

urlpatterns = [
    # Versioned (preferred)
    path("api/v1/", include("predictor.urls")),
    # Unversioned alias — kept so the frontend's VITE_API_BASE_URL=.../api still works
    path("api/", include("predictor.urls")),
    # Bare root paths (backward compat)
    path("", include("predictor.urls")),
]
