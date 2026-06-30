"""
predictor/utils/feature_builder.py
====================================
Utility helpers for building and validating ML feature vectors.
"""

from typing import Any


def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert any value to float, returning default on failure."""
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def clamp(value: float, lo: float, hi: float) -> float:
    """Clamp value to [lo, hi]."""
    return max(lo, min(hi, value))


def build_feature_vector(
    N: float, P: float, K: float,
    pH: float, temperature: float,
    rainfall: float, humidity: float,
) -> list:
    """
    Build the feature vector in the exact order the model was trained on.
    Order: N, P, K, pH, temperature, rainfall, humidity
    """
    return [
        safe_float(N),
        safe_float(P),
        safe_float(K),
        safe_float(pH),
        safe_float(temperature),
        safe_float(rainfall),
        safe_float(humidity),
    ]
