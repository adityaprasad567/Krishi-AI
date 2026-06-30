import requests


class SoilServiceError(Exception):
    pass


SOIL_FALLBACK_PH = 7.0


def _fallback_soil_payload(message: str) -> dict:
    """
    Return a safe fallback soil payload instead of killing the live prediction flow.
    """
    return {
        "pH": SOIL_FALLBACK_PH,
        "soil_type": "Unknown",
        "source": "soilgrids",
        "status": "fallback",
        "error": message,
    }


def get_soil_data(lat: float, lon: float) -> dict:
    """
    Fetch soil pH from SoilGrids for the given location.

    Expected return shape:
    {
        "pH": float,
        "soil_type": str,
        "source": str,
        "status": str,
        "error": str | None
    }

    IMPORTANT:
    Live prediction should not fail just because SoilGrids does not return pH.
    If the API response is missing / changes format / cannot be parsed, we return
    a safe fallback pH payload instead of raising an exception.
    """
    url = (
        "https://rest.isric.org/soilgrids/v2.0/properties/query"
        f"?lat={lat}&lon={lon}"
        "&property=phh2o"
        "&depth=0-5cm"
        "&value=mean"
    )

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        return _fallback_soil_payload(f"Failed to fetch soil data: {exc}")

    try:
        layers = data.get("properties", {}).get("layers", [])
        ph_layer = next(
            (layer for layer in layers if layer.get("name") == "phh2o"),
            None
        )

        if not ph_layer:
            return _fallback_soil_payload(
                "phh2o layer not found in SoilGrids response."
            )

        depths = ph_layer.get("depths", [])
        if not depths:
            return _fallback_soil_payload(
                "No depth values found in SoilGrids response."
            )

        values = depths[0].get("values", {}) or {}

        # SoilGrids response shape can vary. Try common keys in order.
        ph_value = (
            values.get("mean")
            or values.get("Q0.5")
            or values.get("median")
        )

        if ph_value is None:
            return _fallback_soil_payload(
                "No pH mean value found in SoilGrids response."
            )

        ph_value = float(ph_value)

        # Some soil datasets return pH scaled by 10
        if ph_value > 14:
            ph_value = ph_value / 10.0

        return {
            "pH": round(ph_value, 2),
            "soil_type": "Unknown",
            "source": "soilgrids",
            "status": "ok",
            "error": None,
        }

    except Exception as exc:
        return _fallback_soil_payload(
            f"Could not parse pH from SoilGrids response: {exc}"
        )