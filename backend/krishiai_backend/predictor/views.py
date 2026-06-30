"""
predictor/views.py
==================
Django views exposing the KrishiAI API.

All new endpoints are prefixed under /api/v1/ (see krishiai_backend/urls.py).
The legacy /predict and /health paths are kept for backwards-compat.
"""

import json
import logging
import pickle
import time
import uuid
from pathlib import Path

import numpy as np
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .services.crop_engine import build_live_features
from .services.weather_service import get_weather_data
from .services.soil_service import get_soil_data
from .services.satellite_service import get_satellite_data
from .services.location_service import reverse_geocode, search_locations

logger = logging.getLogger("predictor")

# ─────────────────────────────────────────────────────────────────────────────
# Optional rate limiting
# ─────────────────────────────────────────────────────────────────────────────
try:
    from django_ratelimit.decorators import ratelimit
    _RATELIMIT_AVAILABLE = True
except ImportError:
    _RATELIMIT_AVAILABLE = False

    def ratelimit(*args, **kwargs):
        def decorator(view_func):
            return view_func
        return decorator

    logger.warning(
        "django-ratelimit is not installed — endpoints will NOT be rate-limited."
    )

# ─────────────────────────────────────────────────────────────────────────────
# Load model
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "crop_model.pkl"
ENCODER_PATH = BASE_DIR / "label_encoder.pkl"
METADATA_PATH = BASE_DIR / "model_metadata.json"


def _load_pickle(path: Path):
    if not path.exists():
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception:
        logger.exception("Failed to load pickle file at %s", path)
        return None


def _load_metadata(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return {}


model = _load_pickle(MODEL_PATH)
encoder = _load_pickle(ENCODER_PATH)
model_metadata = _load_metadata(METADATA_PATH)

if model is None or encoder is None:
    logger.error("Model or encoder not found. Run train_model.py before starting.")
else:
    logger.info(
        "Model loaded: %d crops, trained_at=%s",
        len(encoder.classes_),
        model_metadata.get("trained_at_utc", "unknown"),
    )

API_FIELD_TO_MODEL_FEATURE = [
    ("N", "N"), ("P", "P"), ("K", "K"),
    ("pH", "pH"), ("temperature", "temperature"),
    ("rainfall", "rainfall"), ("humidity", "humidity"),
]
API_FIELDS = [api_name for api_name, _ in API_FIELD_TO_MODEL_FEATURE]

VALID_RANGES = {
    "N": (0, 200), "P": (0, 200), "K": (0, 250),
    "pH": (3.0, 10.0), "temperature": (-10, 55),
    "rainfall": (0, 5000), "humidity": (0, 100),
}

PREDICT_RATE = getattr(settings, "PREDICT_RATE_LIMIT", "30/m")

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _display_name(label: str) -> str:
    return label.replace("_", " ").title()


def _error(status: int, message: str) -> JsonResponse:
    return JsonResponse({"error": message}, status=status)


def _client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _safe_float(val, default=0.0):
    try:
        return float(val)
    except (TypeError, ValueError):
        return float(default)


def _safe_dict(v):
    return v if isinstance(v, dict) else {}


def _safe_list(v):
    return v if isinstance(v, list) else []


def _build_prediction(features_in_order: list) -> dict:
    X = np.array([features_in_order])
    proba = model.predict_proba(X)[0]
    classes = encoder.classes_
    ranked = sorted(zip(classes, proba), key=lambda p: p[1], reverse=True)
    primary_crop, primary_conf = ranked[0]
    alternatives = [
        {"crop": _display_name(c), "confidence": round(float(p) * 100, 1)}
        for c, p in ranked[1:4] if p > 0.01
    ]
    importances = getattr(model, "feature_importances_", [0] * len(API_FIELD_TO_MODEL_FEATURE))
    feature_importance = {
        api_name: round(float(imp), 4)
        for (api_name, _), imp in zip(API_FIELD_TO_MODEL_FEATURE, importances)
    }
    return {
        "crop": _display_name(primary_crop),
        "confidence": round(float(primary_conf) * 100, 1),
        "alternatives": alternatives,
        "feature_importance": feature_importance,
    }


# ─────────────────────────────────────────────────────────────────────────────
# /predict  (original endpoint — kept for backward compat + test suite)
# ─────────────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
@ratelimit(key="ip", rate=PREDICT_RATE, method="POST", block=False)
def predict(request):
    """POST /predict — accepts all 7 model inputs directly."""
    if request.method == "OPTIONS":
        return JsonResponse({})

    if getattr(request, "limited", False):
        return _error(429, "Too many requests. Please try again shortly.")

    if model is None or encoder is None:
        return _error(503, "Model not available. Run train_model.py first.")

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return _error(400, "Invalid JSON body.")

    if not isinstance(body, dict):
        return _error(400, "Request body must be a JSON object.")

    missing = [f for f in API_FIELDS if f not in body]
    if missing:
        return _error(400, f"Missing fields: {missing}")

    try:
        raw_values = {f: float(body[f]) for f in API_FIELDS}
    except (TypeError, ValueError) as exc:
        return _error(400, f"All fields must be numbers. {exc}")

    out_of_range = []
    for name, value in raw_values.items():
        lo, hi = VALID_RANGES[name]
        if not (lo <= value <= hi):
            out_of_range.append(f"{name}={value} (expected {lo}-{hi})")
    if out_of_range:
        return _error(400, f"Value(s) out of valid range: {'; '.join(out_of_range)}")

    features_in_order = [raw_values[n] for n, _ in API_FIELD_TO_MODEL_FEATURE]

    try:
        result = _build_prediction(features_in_order)
    except Exception:
        logger.exception("Prediction failed")
        return _error(500, "Prediction failed due to an internal error.")

    return JsonResponse(result)


# ─────────────────────────────────────────────────────────────────────────────
# /predict-live
# ─────────────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
@ratelimit(key="ip", rate=PREDICT_RATE, method="POST", block=False)
def predict_live(request):
    """POST /predict-live — provide lat, lon, N, P, K; backend auto-fetches the rest."""
    if request.method == "OPTIONS":
        return JsonResponse({})

    if getattr(request, "limited", False):
        return _error(429, "Too many requests.")

    if model is None or encoder is None:
        return _error(503, "Model not available.")

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return _error(400, "Invalid JSON body.")

    required = ["lat", "lon", "N", "P", "K"]
    missing = [f for f in required if f not in body]
    if missing:
        return _error(400, f"Missing fields: {missing}")

    try:
        lat = float(body["lat"])
        lon = float(body["lon"])
        N = float(body["N"])
        P = float(body["P"])
        K = float(body["K"])
    except (TypeError, ValueError) as exc:
        return _error(400, f"lat, lon, N, P, K must all be numbers. {exc}")

    if not (-90 <= lat <= 90):
        return _error(400, "lat must be between -90 and 90.")
    if not (-180 <= lon <= 180):
        return _error(400, "lon must be between -180 and 180.")

    for name, value in {"N": N, "P": P, "K": K}.items():
        lo, hi = VALID_RANGES[name]
        if not (lo <= value <= hi):
            return _error(400, f"{name}={value} is out of valid range ({lo}-{hi}).")

    try:
        live_bundle = build_live_features(lat=lat, lon=lon, N=N, P=P, K=K)
    except Exception as exc:
        logger.exception("Live feature build failed")
        return _error(502, f"Failed to build live crop inputs: {exc}")

    features = _safe_dict(live_bundle.get("features"))

    for name in ["pH", "temperature", "rainfall", "humidity"]:
        if name not in features:
            return _error(502, f"Live feature '{name}' was not returned.")
        lo, hi = VALID_RANGES[name]
        if not (lo <= features[name] <= hi):
            return _error(502, f"Live data out of range: {name}={features[name]}")

    features_in_order = [
        features["N"], features["P"], features["K"],
        features["pH"], features["temperature"],
        features["rainfall"], features["humidity"],
    ]

    start = time.monotonic()
    try:
        result = _build_prediction(features_in_order)
    except Exception:
        logger.exception("Prediction failed for live features")
        return _error(500, "Prediction failed.")
    elapsed_ms = (time.monotonic() - start) * 1000

    weather = _safe_dict(live_bundle.get("weather"))
    soil = _safe_dict(live_bundle.get("soil"))
    satellite = _safe_dict(live_bundle.get("satellite"))
    advisory = _safe_dict(live_bundle.get("advisory"))
    summary = _safe_dict(live_bundle.get("summary"))
    risk_flags = _safe_list(live_bundle.get("risk_flags"))

    payload = {
        **result,
        "mode": "live",
        "location": {"lat": lat, "lon": lon},
        "live_inputs": features,
        "weather": weather,
        "soil": soil,
        "satellite": satellite,
        "advisory": advisory,
        "risk_flags": risk_flags,
        "summary": summary,
        "meta": {
            "response_time_ms": round(elapsed_ms, 2),
            "weather_source": weather.get("source"),
            "soil_source": soil.get("source"),
            "satellite_source": satellite.get("satellite_source"),
        },
    }
    return JsonResponse(payload)


# ─────────────────────────────────────────────────────────────────────────────
# /health
# ─────────────────────────────────────────────────────────────────────────────

def health(request):
    """GET /health — model status."""
    payload = {
        "status": "ok" if (model is not None and encoder is not None) else "degraded",
        "model_loaded": model is not None,
        "encoder_loaded": encoder is not None,
        "rate_limiting_enabled": _RATELIMIT_AVAILABLE,
        "crops": [_display_name(c) for c in encoder.classes_] if encoder else [],
        "model_metadata": {
            "trained_at_utc": model_metadata.get("trained_at_utc"),
            "dataset_rows": model_metadata.get("dataset_rows"),
            "n_crops": model_metadata.get("n_crops"),
            "cv_accuracy_mean": model_metadata.get("cv_accuracy_mean"),
            "held_out_test_accuracy": model_metadata.get("held_out_test_accuracy"),
        },
    }
    return JsonResponse(payload, status=200 if payload["status"] == "ok" else 503)


# ─────────────────────────────────────────────────────────────────────────────
# /crops/recommend  (frontend-native path → wraps /predict-live logic)
# ─────────────────────────────────────────────────────────────────────────────

# Crop metadata lookup (rules-based; extend with a real dataset later)
import json as _json

_CROP_RULES_PATH = BASE_DIR / "data" / "crop_rules.json"

def _load_crop_rules() -> dict:
    try:
        with open(_CROP_RULES_PATH, "r") as f:
            return _json.load(f)
    except Exception:
        return {}

_CROP_RULES = _load_crop_rules()


def _enrich_crop_result(crop_name: str, confidence: float) -> dict:
    """Add agronomic metadata to each crop result."""
    rules = _CROP_RULES.get(crop_name.lower(), {})
    return {
        "name": crop_name,
        "confidence": confidence,
        "expected_yield": rules.get("expected_yield", "Varies by region"),
        "water_requirement": rules.get("water_requirement", "Moderate"),
        "growing_duration": rules.get("growing_duration", "90-150 days"),
        "profitability": rules.get("profitability", 6),
        "best_sowing_month": rules.get("best_sowing_month", "June-July"),
        "fertilizer": rules.get("fertilizer", "NPK 20-20-0 as base dose"),
    }


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def crops_recommend_view(request):
    """
    POST /crops/recommend
    Body: { nitrogen, phosphorus, potassium, ph, temperature, humidity, rainfall, lat?, lon?, season?, soil_type? }
    Returns: list of CropResult objects (matching the frontend CropResult type)
    """
    if request.method == "OPTIONS":
        return JsonResponse({})

    if model is None or encoder is None:
        return _error(503, "Model not available. Run train_model.py first.")

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return _error(400, "Invalid JSON body.")

    if not isinstance(body, dict):
        return _error(400, "Request body must be a JSON object.")

    # Frontend sends: nitrogen, phosphorus, potassium, ph (lowercase)
    # Model expects: N, P, K, pH, temperature, rainfall, humidity
    field_map = {
        "nitrogen": "N", "phosphorus": "P", "potassium": "K",
        "ph": "pH", "temperature": "temperature",
        "humidity": "humidity", "rainfall": "rainfall",
    }

    raw = {}
    for fe_key, model_key in field_map.items():
        val = body.get(fe_key)
        if val is None:
            return _error(400, f"Missing field: {fe_key}")
        try:
            raw[model_key] = float(val)
        except (TypeError, ValueError):
            return _error(400, f"Field '{fe_key}' must be a number.")

    # Range validation
    out_of_range = []
    for name, value in raw.items():
        lo, hi = VALID_RANGES[name]
        if not (lo <= value <= hi):
            out_of_range.append(f"{name}={value} (expected {lo}-{hi})")
    if out_of_range:
        return _error(400, f"Values out of range: {'; '.join(out_of_range)}")

    features_in_order = [raw[n] for n, _ in API_FIELD_TO_MODEL_FEATURE]

    try:
        X = np.array([features_in_order])
        proba = model.predict_proba(X)[0]
        classes = encoder.classes_
        ranked = sorted(zip(classes, proba), key=lambda p: p[1], reverse=True)
    except Exception:
        logger.exception("Crop recommendation failed")
        return _error(500, "Recommendation failed.")

    # Return top 5 results with enriched metadata
    results = [
        _enrich_crop_result(_display_name(crop), round(float(conf) * 100, 1))
        for crop, conf in ranked[:5]
        if float(conf) > 0.005
    ]

    return JsonResponse(results, safe=False)


# ─────────────────────────────────────────────────────────────────────────────
# /weather
# ─────────────────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "OPTIONS"])
def weather_view(request):
    """
    GET /weather?lat=<float>&lon=<float>
    Returns a WeatherResponse object matching the frontend type.
    """
    if request.method == "OPTIONS":
        return JsonResponse({})

    try:
        lat = float(request.GET.get("lat", ""))
        lon = float(request.GET.get("lon", ""))
    except (TypeError, ValueError):
        return _error(400, "lat and lon query parameters are required and must be numbers.")

    try:
        raw = get_weather_data(lat, lon)
    except Exception as exc:
        logger.exception("Weather fetch failed")
        return _error(502, f"Weather service error: {exc}")

    temp = _safe_float(raw.get("temperature"), 28.0)
    humidity = _safe_float(raw.get("humidity"), 60.0)
    rainfall = _safe_float(raw.get("rainfall"), 0.0)

    # Build the full WeatherResponse shape expected by the frontend
    current = {
        "temp": temp,
        "feels_like": round(temp - 2.0, 1),
        "humidity": humidity,
        "pressure": 1013,
        "wind_speed": 12,
        "rain_probability": min(int(rainfall * 2), 100),
        "clouds": 40,
        "visibility": 10,
        "uv_index": 6,
        "sunrise": "06:15",
        "sunset": "18:30",
        "aqi": 72,
        "condition": raw.get("weather_summary", "Clear"),
        "icon": "☀️",
        "source": raw.get("source", "unknown"),
    }

    # Generate synthetic hourly (24 points)
    import math
    hourly = []
    for h in range(24):
        offset = 3 * math.sin((h - 6) * math.pi / 12)
        hourly.append({
            "time": f"{h:02d}:00",
            "temp": round(temp + offset, 1),
            "rain": round(max(0, (rainfall / 24) * (1 + 0.5 * math.sin(h))), 1),
        })

    # Generate 7-day forecast
    import random
    random.seed(int(lat * 100 + lon * 10))
    daily = []
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i, day in enumerate(days):
        delta = random.uniform(-3, 3)
        daily.append({
            "date": day,
            "min": round(temp + delta - 4, 1),
            "max": round(temp + delta + 4, 1),
            "rain": round(random.uniform(0, rainfall / 3), 1),
            "condition": "Partly cloudy",
        })

    return JsonResponse({"current": current, "hourly": hourly, "daily": daily})


# ─────────────────────────────────────────────────────────────────────────────
# /soil
# ─────────────────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "OPTIONS"])
def soil_view(request):
    """
    GET /soil?lat=<float>&lon=<float>
    Returns SoilData matching the frontend type.
    """
    if request.method == "OPTIONS":
        return JsonResponse({})

    try:
        lat = float(request.GET.get("lat", ""))
        lon = float(request.GET.get("lon", ""))
    except (TypeError, ValueError):
        return _error(400, "lat and lon are required numbers.")

    try:
        raw = get_soil_data(lat, lon)
    except Exception as exc:
        logger.exception("Soil fetch failed")
        return _error(502, f"Soil service error: {exc}")

    ph = _safe_float(raw.get("pH"), 7.0)

    # Derive NPK and other metrics from lat/lon (stable mock until real soil API)
    import hashlib
    seed = int(hashlib.md5(f"{lat:.3f},{lon:.3f}".encode()).hexdigest(), 16) % 10000
    import random
    rng = random.Random(seed)

    nitrogen = rng.randint(40, 140)
    phosphorus = rng.randint(20, 80)
    potassium = rng.randint(30, 100)
    moisture = round(rng.uniform(20, 65), 1)
    organic_carbon = round(rng.uniform(0.3, 2.5), 2)
    health_score = min(100, max(30, int(
        40 + (nitrogen / 140) * 20 + (phosphorus / 80) * 15 +
        (potassium / 100) * 15 + (1 - abs(ph - 6.5) / 3.5) * 10
    )))

    suggestions = []
    if nitrogen < 60:
        suggestions.append("Apply nitrogen-rich fertilizers like Urea or DAP.")
    if phosphorus < 30:
        suggestions.append("Add phosphorus via SSP or DAP to improve root development.")
    if potassium < 40:
        suggestions.append("Supplement potassium using MOP for better crop quality.")
    if ph < 5.5:
        suggestions.append("Apply agricultural lime to raise pH and improve nutrient availability.")
    elif ph > 7.8:
        suggestions.append("Use sulphur or ammonium sulphate to lower soil pH.")
    if moisture < 30:
        suggestions.append("Increase irrigation frequency to maintain optimal soil moisture.")
    if not suggestions:
        suggestions.append("Soil conditions look good. Maintain regular crop monitoring.")

    # Suitable crops based on N, P, K, pH
    suitable = []
    if 5.5 <= ph <= 7.5 and nitrogen > 60:
        suitable.extend(["Rice", "Wheat"])
    if ph >= 6.0 and potassium > 50:
        suitable.extend(["Maize", "Banana"])
    if 5.5 <= ph <= 7.0:
        suitable.extend(["Groundnut", "Soybean"])
    if nitrogen > 80 and phosphorus > 40:
        suitable.append("Sugarcane")
    if not suitable:
        suitable = ["Mung Bean", "Chickpea"]
    suitable = list(dict.fromkeys(suitable))[:6]  # deduplicate, max 6

    return JsonResponse({
        "nitrogen": nitrogen,
        "phosphorus": phosphorus,
        "potassium": potassium,
        "ph": round(ph, 2),
        "moisture": moisture,
        "organic_carbon": organic_carbon,
        "health_score": health_score,
        "suggestions": suggestions,
        "suitable_crops": suitable,
    })


# ─────────────────────────────────────────────────────────────────────────────
# /satellite
# ─────────────────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "OPTIONS"])
def satellite_view(request):
    """
    GET /satellite?lat=<float>&lon=<float>
    Returns SatelliteData matching the frontend type.
    """
    if request.method == "OPTIONS":
        return JsonResponse({})

    try:
        lat = float(request.GET.get("lat", ""))
        lon = float(request.GET.get("lon", ""))
    except (TypeError, ValueError):
        return _error(400, "lat and lon are required numbers.")

    try:
        raw = get_satellite_data(lat, lon)
    except Exception as exc:
        logger.exception("Satellite fetch failed")
        return _error(502, f"Satellite service error: {exc}")

    ndvi = _safe_float(raw.get("ndvi"), 0.58)
    # Derive other indices from NDVI
    vegetation_index = round(ndvi * 0.9 + 0.05, 2)
    crop_stress = max(0, min(100, int((1 - ndvi) * 80)))
    field_health = max(0, min(100, int(ndvi * 100 + 10)))

    return JsonResponse({
        "ndvi": ndvi,
        "vegetation_index": vegetation_index,
        "crop_stress": crop_stress,
        "field_health": field_health,
        "heatmap_url": None,
    })


# ─────────────────────────────────────────────────────────────────────────────
# /disease/predict
# ─────────────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def disease_predict_view(request):
    """
    POST /disease/predict  (multipart/form-data with 'image' file)
    Returns DiseaseResult matching the frontend type.

    NOTE: This is a stub implementation. Replace the body of _run_disease_model
    with your actual image classification model.
    """
    if request.method == "OPTIONS":
        return JsonResponse({})

    image = request.FILES.get("image")
    if not image:
        return _error(400, "No image file provided. Send a multipart/form-data request with field 'image'.")

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if image.content_type not in allowed_types:
        return _error(400, f"Unsupported image type: {image.content_type}. Use JPEG or PNG.")

    if image.size > 10 * 1024 * 1024:  # 10 MB limit
        return _error(400, "Image too large. Maximum size is 10 MB.")

    # ── Stub model — replace this block with real inference ──────────────────
    # Example: load a TF/PyTorch model and run inference on image.read()
    # For now we return a plausible mock response so the frontend renders.
    import hashlib
    image_hash = hashlib.md5(image.read(4096)).hexdigest()
    _diseases = [
        {
            "disease": "Healthy",
            "confidence": 92,
            "treatment": "No treatment needed. Continue regular monitoring.",
            "prevention": [
                "Maintain proper plant spacing for airflow.",
                "Avoid overhead irrigation to reduce leaf wetness.",
                "Rotate crops annually.",
            ],
        },
        {
            "disease": "Leaf Blight",
            "confidence": 87,
            "treatment": "Apply Mancozeb 75% WP @ 2g/L water. Repeat after 10 days if symptoms persist.",
            "prevention": [
                "Use certified disease-free seeds.",
                "Avoid waterlogging in the field.",
                "Apply potassium to strengthen cell walls.",
                "Remove and destroy infected leaves promptly.",
            ],
        },
        {
            "disease": "Powdery Mildew",
            "confidence": 83,
            "treatment": "Spray Sulfur 80% WP @ 3g/L or Hexaconazole 5% EC @ 2mL/L water.",
            "prevention": [
                "Ensure adequate spacing and ventilation.",
                "Avoid excessive nitrogen application.",
                "Water at the base of the plant, not on leaves.",
            ],
        },
        {
            "disease": "Rust",
            "confidence": 79,
            "treatment": "Apply Propiconazole 25% EC @ 1mL/L or Tebuconazole @ 1g/L. Repeat in 14 days.",
            "prevention": [
                "Plant rust-resistant varieties.",
                "Scout regularly for early signs.",
                "Avoid dense canopy conditions.",
            ],
        },
    ]
    idx = int(image_hash[:4], 16) % len(_diseases)
    result = _diseases[idx]
    # ── End stub ─────────────────────────────────────────────────────────────

    return JsonResponse(result)


# ─────────────────────────────────────────────────────────────────────────────
# /market/prices
# ─────────────────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "OPTIONS"])
def market_prices_view(request):
    """
    GET /market/prices?state=<str>
    Returns list of MarketPrice objects matching the frontend type.

    NOTE: Prices are synthetic. Connect to Agmarknet / data.gov.in for live data.
    """
    if request.method == "OPTIONS":
        return JsonResponse({})

    state = request.GET.get("state", "")

    # Seed by state for stable deterministic prices
    import hashlib, random
    seed = int(hashlib.md5((state or "india").lower().encode()).hexdigest(), 16) % 99999
    rng = random.Random(seed)

    crops = [
        ("Rice", 2200, "quintal"),
        ("Wheat", 2015, "quintal"),
        ("Maize", 1870, "quintal"),
        ("Soybean", 4300, "quintal"),
        ("Groundnut", 5500, "quintal"),
        ("Cotton", 6080, "quintal"),
        ("Sugarcane", 315, "quintal"),
        ("Tomato", 1800, "quintal"),
        ("Onion", 2200, "quintal"),
        ("Potato", 1200, "quintal"),
    ]

    results = []
    for crop_name, base_price, unit in crops:
        fluctuation = rng.randint(-150, 200)
        today = base_price + fluctuation
        yesterday = today + rng.randint(-80, 80)
        trend = []
        price = yesterday
        for d in range(7):
            price += rng.randint(-50, 60)
            price = max(base_price - 500, min(base_price + 600, price))
            trend.append({"date": f"Day {d+1}", "price": price})

        results.append({
            "crop": crop_name,
            "today": today,
            "yesterday": yesterday,
            "unit": unit,
            "trend": trend,
        })

    return JsonResponse(results, safe=False)


# ─────────────────────────────────────────────────────────────────────────────
# /location/reverse  and  /location/search
# ─────────────────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "OPTIONS"])
def location_reverse_view(request):
    """GET /location/reverse?lat=<float>&lon=<float>"""
    if request.method == "OPTIONS":
        return JsonResponse({})

    try:
        lat = float(request.GET.get("lat", ""))
        lon = float(request.GET.get("lon", ""))
    except (TypeError, ValueError):
        return _error(400, "lat and lon are required numbers.")

    try:
        result = reverse_geocode(lat, lon)
        return JsonResponse(result)
    except Exception as exc:
        logger.exception("Reverse geocode failed")
        return _error(502, f"Reverse geocode failed: {exc}")


@require_http_methods(["GET", "OPTIONS"])
def location_search_view(request):
    """GET /location/search?q=<str>"""
    if request.method == "OPTIONS":
        return JsonResponse({})

    query = request.GET.get("q", "").strip()
    if not query:
        return _error(400, "q query parameter is required.")

    try:
        results = search_locations(query)
        return JsonResponse(results, safe=False)
    except Exception as exc:
        logger.exception("Location search failed")
        return _error(502, f"Location search failed: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# /auth/login  and  /auth/register  (stubs)
# ─────────────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def auth_login_view(request):
    """
    POST /auth/login  { email, password }
    Returns { token, user }

    NOTE: This is a stub. Replace with real JWT/session auth.
    """
    if request.method == "OPTIONS":
        return JsonResponse({})

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return _error(400, "Invalid JSON body.")

    email = body.get("email", "")
    password = body.get("password", "")

    if not email or not password:
        return _error(400, "email and password are required.")

    if len(password) < 6:
        return _error(400, "Invalid credentials.")

    # Stub — in production, verify against your user database
    token = str(uuid.uuid4()).replace("-", "")
    user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, email))

    return JsonResponse({
        "token": token,
        "user": {
            "id": user_id,
            "name": email.split("@")[0].capitalize(),
            "email": email,
        },
    })


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def auth_register_view(request):
    """
    POST /auth/register  { name, phone, email, password }
    Returns { token, user }

    NOTE: This is a stub. Replace with real user creation + OTP flow.
    """
    if request.method == "OPTIONS":
        return JsonResponse({})

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return _error(400, "Invalid JSON body.")

    for field in ["name", "email", "password"]:
        if not body.get(field):
            return _error(400, f"'{field}' is required.")

    email = body["email"]
    name = body["name"]
    password = body["password"]

    if len(password) < 6:
        return _error(400, "Password must be at least 6 characters.")

    token = str(uuid.uuid4()).replace("-", "")
    user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, email))

    return JsonResponse({
        "token": token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
        },
    })
