from .weather_service import get_weather_data
from .soil_service import get_soil_data
from .satellite_service import get_satellite_data


class CropEngineError(Exception):
    pass


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _normalize_weather_payload(weather: dict) -> dict:
    """
    Ensure weather payload always contains the keys required by the
    recommendation engine + frontend dashboard.
    """
    weather = weather or {}

    return {
        "temperature": _safe_float(weather.get("temperature"), 28.0),
        "humidity": _safe_float(weather.get("humidity"), 60.0),
        "rainfall": _safe_float(weather.get("rainfall"), 0.0),
        "rainfall_7day": _safe_float(
            weather.get("rainfall_7day", weather.get("rainfall", 0.0)),
            0.0
        ),
        "weather_summary": weather.get("weather_summary", "Weather data unavailable"),
        "source": weather.get("source", "unknown"),
        "status": weather.get("status", "fallback"),
        "error": weather.get("error"),
    }


def _normalize_soil_payload(soil: dict) -> dict:
    """
    Ensure soil payload always contains the keys required by the
    recommendation engine + frontend dashboard.
    """
    soil = soil or {}

    return {
        "pH": _safe_float(soil.get("pH"), 7.0),
        "source": soil.get("source", "unknown"),
        "status": soil.get("status", "ok"),
        "error": soil.get("error"),
    }


def _normalize_satellite_payload(satellite: dict) -> dict:
    """
    Ensure satellite payload always contains the keys required by the
    recommendation engine + frontend dashboard.
    """
    satellite = satellite or {}

    return {
        "ndvi": _safe_float(satellite.get("ndvi"), 0.58),
        "vegetation_status": satellite.get("vegetation_status", "Moderate vegetation"),
        "field_health_summary": satellite.get(
            "field_health_summary",
            "Satellite field-health summary unavailable."
        ),
        "satellite_advisory": satellite.get(
            "satellite_advisory",
            "Satellite advisory unavailable."
        ),
        "satellite_source": satellite.get("satellite_source", "unknown"),
        "status": satellite.get("status", "fallback"),
        "error": satellite.get("error"),
    }


def _build_risk_flags(weather: dict, soil: dict, satellite: dict) -> list:
    """
    Build human-readable risk flags for dashboard display.
    """
    flags = []

    rainfall_7day = _safe_float(weather.get("rainfall_7day"), 0.0)
    humidity = _safe_float(weather.get("humidity"), 0.0)
    temperature = _safe_float(weather.get("temperature"), 0.0)
    ph = _safe_float(soil.get("pH"), 7.0)
    ndvi = _safe_float(satellite.get("ndvi"), 0.58)

    if rainfall_7day < 40:
        flags.append("Low recent rainfall may reduce soil moisture for crop establishment.")

    if humidity < 35:
        flags.append("Low humidity may increase moisture stress in crops.")

    if temperature > 38:
        flags.append("High temperature can create heat stress for sensitive crops.")

    if temperature < 12:
        flags.append("Low temperature may slow germination and crop growth.")

    if ph < 5.5:
        flags.append("Soil pH is acidic and may affect nutrient uptake.")
    elif ph > 7.8:
        flags.append("Soil pH is alkaline and may reduce micronutrient availability.")

    if ndvi < 0.40:
        flags.append("Satellite vegetation index suggests weak or stressed field condition.")

    return flags


def _build_advisory(weather: dict, soil: dict, satellite: dict, features: dict) -> dict:
    """
    Build farmer advisory signals from live weather + soil + satellite data.
    This is rule-based for now and can later be replaced by a more advanced
    agronomy module.
    """
    rainfall = _safe_float(weather.get("rainfall"), 0.0)
    rainfall_7day = _safe_float(weather.get("rainfall_7day", rainfall), rainfall)
    humidity = _safe_float(weather.get("humidity"), 0.0)
    temperature = _safe_float(weather.get("temperature"), 0.0)
    ph = _safe_float(soil.get("pH"), 7.0)
    ndvi = _safe_float(satellite.get("ndvi"), 0.58)
    vegetation_status = satellite.get("vegetation_status", "Moderate vegetation")

    # -------------------------------
    # Rainfall assessment
    # -------------------------------
    if rainfall_7day >= 120:
        rainfall_status = "favorable"
    elif rainfall_7day >= 60:
        rainfall_status = "moderate"
    else:
        rainfall_status = "low"

    # -------------------------------
    # Soil pH assessment
    # -------------------------------
    if 5.5 <= ph <= 7.5:
        ph_status = "safe"
    elif 5.0 <= ph <= 8.0:
        ph_status = "watch"
    else:
        ph_status = "risky"

    # -------------------------------
    # Vegetation / NDVI assessment
    # -------------------------------
    if ndvi >= 0.65:
        vegetation_signal = "strong"
    elif ndvi >= 0.45:
        vegetation_signal = "moderate"
    else:
        vegetation_signal = "weak"

    # -------------------------------
    # Irrigation logic
    # -------------------------------
    irrigation_needed = (
        rainfall_7day < 80
        or humidity < 45
        or (vegetation_signal == "weak" and rainfall_7day < 100)
    )

    # -------------------------------
    # Risk score logic
    # -------------------------------
    risk_points = 0

    if rainfall_status == "low":
        risk_points += 2
    elif rainfall_status == "moderate":
        risk_points += 1

    if ph_status == "watch":
        risk_points += 1
    elif ph_status == "risky":
        risk_points += 2

    if vegetation_signal == "weak":
        risk_points += 2
    elif vegetation_signal == "moderate":
        risk_points += 1

    if temperature > 38 or temperature < 12:
        risk_points += 2

    if humidity < 35:
        risk_points += 1

    if risk_points <= 2:
        risk_level = "Low"
    elif risk_points <= 5:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # -------------------------------
    # Advisory notes
    # -------------------------------
    if irrigation_needed:
        irrigation_note = (
            "Irrigation support is advisable under current rainfall, humidity, "
            "and vegetation conditions."
        )
    else:
        irrigation_note = (
            "Current moisture conditions appear comparatively supportive for crop growth."
        )

    if ph_status == "safe":
        ph_note = "Soil pH is within a generally safe range for many crops."
    elif ph_status == "watch":
        ph_note = (
            "Soil pH is slightly outside the ideal range. Monitor nutrient availability "
            "and crop response."
        )
    else:
        ph_note = (
            "Soil pH is risky and may need correction or crop-specific management."
        )

    if vegetation_signal == "strong":
        vegetation_note = (
            "Satellite vegetation signal is strong, suggesting comparatively healthy field vigor."
        )
    elif vegetation_signal == "moderate":
        vegetation_note = (
            "Satellite vegetation signal is moderate. Field condition looks usable but may still "
            "benefit from moisture and nutrient optimization."
        )
    else:
        vegetation_note = (
            "Satellite vegetation signal is weak. Inspect the field for water stress, poor crop vigor, "
            "nutrient deficiency, or pest/disease issues."
        )

    # -------------------------------
    # Farmer action items
    # -------------------------------
    action_items = []

    if irrigation_needed:
        action_items.append("Review irrigation planning and soil moisture before sowing or fertilizing.")

    if ph_status in {"watch", "risky"}:
        action_items.append("Test soil pH and adjust nutrient strategy based on crop suitability.")

    if vegetation_signal == "weak":
        action_items.append("Inspect the field physically for uneven growth, water stress, or nutrient deficiency.")

    if temperature > 38:
        action_items.append("Plan for heat-stress mitigation such as irrigation timing or mulching.")

    if rainfall_7day < 40:
        action_items.append("Recent rainfall is low; do not rely only on rain-fed conditions.")

    if not action_items:
        action_items.append("Current field indicators look comparatively stable; continue routine monitoring.")

    return {
        "risk_level": risk_level,
        "rainfall_status": rainfall_status,
        "ph_status": ph_status,
        "vegetation_signal": vegetation_signal,
        "vegetation_status": vegetation_status,
        "irrigation_needed": irrigation_needed,
        "irrigation_note": irrigation_note,
        "ph_note": ph_note,
        "vegetation_note": vegetation_note,
        "temperature": temperature,
        "humidity": humidity,
        "rainfall": rainfall,
        "rainfall_7day": rainfall_7day,
        "ndvi": ndvi,
        "action_items": action_items,
    }


def _build_summary(weather: dict, soil: dict, satellite: dict, advisory: dict) -> dict:
    """
    Build a compact dashboard summary block for the frontend.
    """
    risk_level = advisory.get("risk_level", "Medium")
    irrigation_needed = advisory.get("irrigation_needed", False)

    if risk_level == "Low":
        overall = "Current field conditions look comparatively supportive."
    elif risk_level == "Medium":
        overall = "Field conditions are mixed. Monitor moisture, pH, and crop vigor closely."
    else:
        overall = "Field conditions show notable stress risk and need closer attention."

    moisture_summary = (
        "Irrigation support is advisable."
        if irrigation_needed
        else "Moisture conditions are comparatively supportive right now."
    )

    return {
        "overall": overall,
        "moisture_summary": moisture_summary,
        "weather_summary": weather.get("weather_summary", "Weather data unavailable"),
        "field_health_summary": satellite.get("field_health_summary", "No field health summary available."),
        "ph_summary": advisory.get("ph_note", "No pH summary available."),
    }


def build_live_features(lat: float, lon: float, N: float, P: float, K: float) -> dict:
    """
    Build the exact feature payload expected by the crop model:
    N, P, K, pH, temperature, rainfall, humidity

    Also returns richer frontend-ready sections:
    - weather
    - soil
    - rainfall_7day
    - advisory
    - satellite
    - risk_flags
    - summary

    IMPORTANT:
    Live prediction should remain usable even if weather / soil / satellite
    services fail. We fall back to safe defaults and preserve error/status
    metadata for the frontend dashboard.
    """

    # -------------------------------
    # Weather
    # -------------------------------
    try:
        raw_weather = get_weather_data(lat, lon)
    except Exception as exc:
        raw_weather = {
            "temperature": 28.0,
            "humidity": 60.0,
            "rainfall": 0.0,
            "rainfall_7day": 0.0,
            "weather_summary": "Weather service unavailable. Using fallback weather values.",
            "source": "fallback",
            "status": "fallback",
            "error": f"Weather fetch failed: {exc}",
        }

    # -------------------------------
    # Soil
    # -------------------------------
    try:
        raw_soil = get_soil_data(lat, lon)
    except Exception as exc:
        raw_soil = {
            "pH": 7.0,
            "source": "fallback",
            "status": "fallback",
            "error": f"Soil fetch failed: {exc}",
        }

    # -------------------------------
    # Satellite / NDVI
    # -------------------------------
    try:
        raw_satellite = get_satellite_data(lat, lon)
    except Exception as exc:
        raw_satellite = {
            "ndvi": 0.58,
            "vegetation_status": "Moderate vegetation",
            "field_health_summary": "Satellite service unavailable. Using fallback vegetation values.",
            "satellite_advisory": "Satellite advisory unavailable because the satellite service could not be reached.",
            "satellite_source": "fallback",
            "status": "fallback",
            "error": f"Satellite fetch failed: {exc}",
        }

    weather = _normalize_weather_payload(raw_weather)
    soil = _normalize_soil_payload(raw_soil)
    satellite = _normalize_satellite_payload(raw_satellite)

    # Exact feature block for ML crop model
    features = {
        "N": float(N),
        "P": float(P),
        "K": float(K),
        "pH": float(soil["pH"]),
        "temperature": float(weather["temperature"]),
        "rainfall": float(weather["rainfall"]),
        "humidity": float(weather["humidity"]),
    }

    advisory = _build_advisory(weather, soil, satellite, features)
    risk_flags = _build_risk_flags(weather, soil, satellite)
    summary = _build_summary(weather, soil, satellite, advisory)

    return {
        "features": features,
        "weather": weather,
        "soil": soil,
        "rainfall_7day": weather["rainfall_7day"],
        "satellite": satellite,
        "advisory": advisory,
        "risk_flags": risk_flags,
        "summary": summary,
    }