import os
from typing import Dict, Any, Optional


class SatelliteServiceError(Exception):
    pass


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _build_satellite_fallback(reason: Optional[str] = None) -> Dict[str, Any]:
    """
    Safe fallback satellite payload.
    This keeps the crop recommendation pipeline alive even if
    real NDVI / satellite integration is not available yet.
    """
    ndvi = 0.58
    vegetation_status = _classify_ndvi(ndvi)
    field_health_summary = _field_health_summary_from_ndvi(ndvi)

    return {
        "ndvi": ndvi,
        "vegetation_status": vegetation_status,
        "field_health_summary": field_health_summary,
        "satellite_advisory": _satellite_advisory_from_ndvi(ndvi),
        "satellite_source": "mock_fallback",
        "status": "fallback",
        "error": reason,
    }


def _classify_ndvi(ndvi: float) -> str:
    """
    Convert NDVI into a vegetation status label.

    NDVI rough interpretation:
    < 0.2   -> very poor / bare soil
    0.2-0.4 -> weak vegetation
    0.4-0.6 -> moderate vegetation
    0.6-0.8 -> healthy vegetation
    > 0.8   -> very dense vegetation
    """
    ndvi = _safe_float(ndvi, 0.0)

    if ndvi < 0.2:
        return "Very low vegetation"
    elif ndvi < 0.4:
        return "Weak vegetation"
    elif ndvi < 0.6:
        return "Moderate vegetation"
    elif ndvi < 0.8:
        return "Healthy vegetation"
    else:
        return "Very dense vegetation"


def _field_health_summary_from_ndvi(ndvi: float) -> str:
    ndvi = _safe_float(ndvi, 0.0)

    if ndvi < 0.2:
        return (
            "Satellite vegetation index is very low. The field may be bare, recently harvested, "
            "water-stressed, or crop growth may be weak."
        )
    elif ndvi < 0.4:
        return (
            "Vegetation signal is below ideal range. Crop growth may be patchy or under stress "
            "from moisture, nutrients, or early disease pressure."
        )
    elif ndvi < 0.6:
        return (
            "Vegetation condition appears moderate. Crop growth is present, but there may still be "
            "scope to improve irrigation, nutrition, or overall crop vigor."
        )
    elif ndvi < 0.8:
        return (
            "Vegetation condition looks healthy. The field shows good crop vigor and acceptable canopy health."
        )
    else:
        return (
            "Vegetation density is very strong. Crop canopy appears lush and healthy from the satellite signal."
        )


def _satellite_advisory_from_ndvi(ndvi: float) -> str:
    ndvi = _safe_float(ndvi, 0.0)

    if ndvi < 0.2:
        return (
            "Field health appears weak from satellite signal. Check irrigation availability, soil moisture, "
            "germination quality, and nutrient application before the next crop decision."
        )
    elif ndvi < 0.4:
        return (
            "Vegetation appears stressed. Inspect the field for uneven growth, low moisture, pest pressure, "
            "or nutrient deficiency before sowing the next crop."
        )
    elif ndvi < 0.6:
        return (
            "Field condition is moderate. Continue monitoring moisture, nutrient balance, and crop health "
            "to improve field performance."
        )
    elif ndvi < 0.8:
        return (
            "Field vegetation looks healthy. Maintain current irrigation and nutrient management practices "
            "while monitoring for weather-related stress."
        )
    else:
        return (
            "Field vegetation appears very strong. Continue regular crop monitoring and avoid over-irrigation "
            "or excessive fertilizer use."
        )


def _generate_mock_ndvi(lat: float, lon: float) -> float:
    """
    Generate a stable pseudo-NDVI value based on location.
    This is only for MVP / fallback mode so the dashboard can work
    before real satellite integration is connected.

    Output range is kept roughly between 0.42 and 0.72.
    """
    lat_component = abs(int(lat * 100)) % 15
    lon_component = abs(int(lon * 100)) % 15

    ndvi = 0.42 + ((lat_component + lon_component) / 100.0)

    if ndvi > 0.72:
        ndvi = 0.72
    if ndvi < 0.35:
        ndvi = 0.35

    return round(ndvi, 2)


def get_satellite_data(lat: float, lon: float) -> Dict[str, Any]:
    """
    Satellite / NDVI service for KrishiAI.

    Current version:
    - returns a structured NDVI-style payload
    - uses stable mock NDVI for MVP mode
    - ready to be replaced with real Sentinel/NDVI integration later

    Returns:
    {
        "ndvi": float,
        "vegetation_status": str,
        "field_health_summary": str,
        "satellite_advisory": str,
        "satellite_source": str,
        "status": "ok" | "fallback",
        "error": str | None
    }
    """
    try:
        if lat is None or lon is None:
            return _build_satellite_fallback("Latitude/longitude not provided.")

        ndvi = _generate_mock_ndvi(lat, lon)
        vegetation_status = _classify_ndvi(ndvi)
        field_health_summary = _field_health_summary_from_ndvi(ndvi)
        satellite_advisory = _satellite_advisory_from_ndvi(ndvi)

        return {
            "ndvi": ndvi,
            "vegetation_status": vegetation_status,
            "field_health_summary": field_health_summary,
            "satellite_advisory": satellite_advisory,
            "satellite_source": "mock_ndvi",
            "status": "ok",
            "error": None,
        }

    except Exception as exc:
        return _build_satellite_fallback(str(exc))