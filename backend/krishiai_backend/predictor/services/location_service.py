"""
predictor/services/location_service.py
=======================================
Location / geocoding service using OpenStreetMap Nominatim.

No API key required. Respects Nominatim usage policy:
https://operations.osmfoundation.org/policies/nominatim/
"""
import requests
from typing import Any

REQUEST_TIMEOUT = 10
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
HEADERS = {
    "Accept-Language": "en",
    "User-Agent": "KrishiAI/1.0 (farming assistant; contact@krishiai.app)",
}


def _safe(val: Any, default: str = "") -> str:
    return str(val) if val else default


def _parse_address(address: dict) -> dict:
    """Extract structured location fields from Nominatim address block."""
    return {
        "village": address.get("village") or address.get("town") or address.get("hamlet") or address.get("city") or address.get("suburb"),
        "district": address.get("state_district") or address.get("county"),
        "state": address.get("state"),
        "country": address.get("country"),
    }


def reverse_geocode(lat: float, lon: float) -> dict:
    """
    Reverse geocode a lat/lon to a structured address.
    Returns:
      { village, district, state, country }
    """
    url = f"{NOMINATIM_BASE}/reverse?format=jsonv2&lat={lat}&lon={lon}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        address = data.get("address", {})
        parsed = _parse_address(address)
        return {
            **parsed,
            "display_name": data.get("display_name", f"{lat:.3f}, {lon:.3f}"),
        }
    except requests.RequestException as exc:
        raise RuntimeError(f"Nominatim reverse geocode failed: {exc}") from exc


def search_locations(query: str) -> list:
    """
    Search for locations by query string (India-focused).
    Returns list of location objects.
    """
    url = (
        f"{NOMINATIM_BASE}/search"
        f"?format=jsonv2&limit=6&countrycodes=in&addressdetails=1"
        f"&q={requests.utils.quote(query)}"
    )
    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        results = resp.json()
        locations = []
        for item in results:
            address = item.get("address", {})
            parsed = _parse_address(address)
            label_parts = [
                parsed.get("village"),
                parsed.get("district"),
                parsed.get("state"),
            ]
            label = ", ".join(p for p in label_parts if p) or item.get("display_name", "")
            locations.append({
                "lat": float(item["lat"]),
                "lon": float(item["lon"]),
                "label": label,
                **parsed,
                "source": "search",
            })
        return locations
    except requests.RequestException as exc:
        raise RuntimeError(f"Nominatim search failed: {exc}") from exc
