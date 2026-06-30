import os
import requests
from typing import Dict, Any, Optional

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
OPENWEATHER_CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"

REQUEST_TIMEOUT = 20


class WeatherServiceError(Exception):
    pass


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _build_weather_fallback(reason: Optional[str] = None) -> Dict[str, Any]:
    """
    Safe fallback payload so crop recommendation does not crash
    if OpenWeather fails or returns incomplete data.
    """
    return {
        "temperature": 28.0,          # safe neutral farming fallback
        "humidity": 60.0,
        "rainfall": 0.0,              # current/near-term rainfall
        "rainfall_7day": 0.0,         # aggregated rainfall estimate
        "weather_summary": "weather data unavailable",
        "source": "fallback",
        "status": "fallback",
        "error": reason,
    }


def _fetch_json(url: str) -> Dict[str, Any]:
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()


def _extract_weather_summary(weather_block: Any) -> str:
    """
    Extract readable weather description from OpenWeather 'weather' list.
    """
    if isinstance(weather_block, list) and weather_block:
        first = weather_block[0]
        if isinstance(first, dict):
            return first.get("description") or first.get("main") or "unknown"
    return "unknown"


def _extract_forecast_aggregate(forecast_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse OpenWeather 5-day / 3-hour forecast endpoint.

    We use this for:
    - current-ish weather snapshot (first forecast bucket)
    - rainfall total across forecast horizon
    - rainfall_7day approximation (OpenWeather free forecast is 5-day, so we
      expose the forecast total as rainfall_7day for now)
    """
    forecast_list = forecast_data.get("list", [])
    if not forecast_list:
        raise WeatherServiceError("No forecast data returned from OpenWeather.")

    first_item = forecast_list[0]
    main = first_item.get("main", {}) or {}

    temperature = _safe_float(main.get("temp"), 28.0)
    humidity = _safe_float(main.get("humidity"), 60.0)
    weather_summary = _extract_weather_summary(first_item.get("weather"))

    total_rainfall = 0.0
    for item in forecast_list:
        rain_block = item.get("rain", {}) or {}
        total_rainfall += _safe_float(rain_block.get("3h"), 0.0)

    total_rainfall = round(total_rainfall, 2)

    return {
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
        "rainfall": total_rainfall,       # using total forecast rainfall
        "rainfall_7day": total_rainfall,  # approximation until we add a real historical/weather API source
        "weather_summary": weather_summary,
        "source": "openweather_forecast",
        "status": "ok",
        "error": None,
    }


def _extract_current_weather(current_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse current weather endpoint.
    This is used as a fallback if forecast fails.
    """
    main = current_data.get("main", {}) or {}

    temperature = _safe_float(main.get("temp"), 28.0)
    humidity = _safe_float(main.get("humidity"), 60.0)
    weather_summary = _extract_weather_summary(current_data.get("weather"))

    # Current weather endpoint may contain rain in last 1h or 3h
    rain_block = current_data.get("rain", {}) or {}
    rainfall_1h = _safe_float(rain_block.get("1h"), 0.0)
    rainfall_3h = _safe_float(rain_block.get("3h"), 0.0)
    current_rainfall = max(rainfall_1h, rainfall_3h)

    return {
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
        "rainfall": round(current_rainfall, 2),
        "rainfall_7day": round(current_rainfall, 2),  # weak fallback when forecast unavailable
        "weather_summary": weather_summary,
        "source": "openweather_current_fallback",
        "status": "ok",
        "error": None,
    }


def get_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetch weather data for crop recommendation.

    Returns:
    {
        "temperature": float,
        "humidity": float,
        "rainfall": float,
        "rainfall_7day": float,
        "weather_summary": str,
        "source": str,
        "status": "ok" | "fallback",
        "error": str | None
    }

    Strategy:
    1) Try OpenWeather forecast endpoint first
       -> gives multiple 3-hour forecast buckets and rainfall aggregation.
    2) If forecast fails, try current weather endpoint.
    3) If both fail, return safe fallback payload.
    """

    if lat is None or lon is None:
        return _build_weather_fallback("Latitude/longitude not provided.")

    if not OPENWEATHER_API_KEY:
        return _build_weather_fallback("OPENWEATHER_API_KEY is not set.")

    # ---------- 1) Try forecast endpoint ----------
    forecast_url = (
        f"{OPENWEATHER_FORECAST_URL}"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    )

    try:
        forecast_data = _fetch_json(forecast_url)
        parsed = _extract_forecast_aggregate(forecast_data)
        return parsed
    except Exception as forecast_exc:
        forecast_error = str(forecast_exc)

    # ---------- 2) Fallback to current weather endpoint ----------
    current_url = (
        f"{OPENWEATHER_CURRENT_URL}"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    )

    try:
        current_data = _fetch_json(current_url)
        parsed = _extract_current_weather(current_data)
        parsed["error"] = f"Forecast failed, current weather fallback used: {forecast_error}"
        return parsed
    except Exception as current_exc:
        combined_error = (
            f"Forecast failed: {forecast_error}. "
            f"Current weather fallback failed: {current_exc}"
        )
        return _build_weather_fallback(combined_error)