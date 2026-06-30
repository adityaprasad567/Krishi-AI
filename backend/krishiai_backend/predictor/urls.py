"""
predictor/urls.py
=================
URL routing for the predictor app.

Routes:
    POST   /predict            → manual crop recommendation (all 7 inputs)
    POST   /predict-live       → live crop recommendation (lat, lon, N, P, K)
    GET    /health             → model status check
    GET    /weather            → current weather by lat/lon
    GET    /soil               → soil data by lat/lon
    GET    /satellite          → satellite / NDVI data by lat/lon
    GET    /location/reverse   → reverse geocode lat/lon
    GET    /location/search    → search for a place by query string
    POST   /crops/recommend    → alias for /predict (frontend-friendly path)
    POST   /disease/predict    → leaf disease detection (image upload)
    GET    /market/prices      → market prices by state
    POST   /auth/login         → (stub) user login
    POST   /auth/register      → (stub) user registration
"""

from django.urls import path
from .views import (
    predict,
    predict_live,
    health,
    weather_view,
    soil_view,
    satellite_view,
    location_reverse_view,
    location_search_view,
    crops_recommend_view,
    disease_predict_view,
    market_prices_view,
    auth_login_view,
    auth_register_view,
)

urlpatterns = [
    # Core ML endpoints
    path("predict", predict, name="predict"),
    path("predict-live", predict_live, name="predict_live"),
    path("health", health, name="health"),

    # Frontend-facing API endpoints
    path("crops/recommend", crops_recommend_view, name="crops_recommend"),
    path("weather", weather_view, name="weather"),
    path("soil", soil_view, name="soil"),
    path("satellite", satellite_view, name="satellite"),
    path("disease/predict", disease_predict_view, name="disease_predict"),
    path("market/prices", market_prices_view, name="market_prices"),

    # Location
    path("location/reverse", location_reverse_view, name="location_reverse"),
    path("location/search", location_search_view, name="location_search"),

    # Auth (stub — integrate your auth backend here)
    path("auth/login", auth_login_view, name="auth_login"),
    path("auth/register", auth_register_view, name="auth_register"),
]
