from __future__ import annotations


def normalized_difference(a: float, b: float) -> float:
    denom = a + b
    if abs(denom) < 1e-9:
        return 0.0
    return float((a - b) / denom)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def compute_remote_sensing_features(bands: dict[str, float], *, cloud_pct: float, lake_area_km2: float, shoreline_length_km: float, days_since_clear_observation: int) -> dict[str, float]:
    green = bands["green"]
    red = bands["red"]
    red_edge = bands["red_edge"]
    nir = bands["nir"]

    shoreline_complexity = shoreline_length_km / max(lake_area_km2, 0.01)
    shoreline_penalty = float(clamp(shoreline_complexity / 18.0, 0.05, 0.55))

    return {
        "ndwi": normalized_difference(green, nir),
        "ndci": normalized_difference(red_edge, red),
        "green_red_ratio": float(green / max(red, 1e-6)),
        "green_nir_ratio": float(green / max(nir, 1e-6)),
        "red_nir_ratio": float(red / max(nir, 1e-6)),
        "cloud_penalty": float(clamp(cloud_pct / 100.0, 0.0, 1.0)),
        "shoreline_penalty": shoreline_penalty,
        "days_since_clear_observation": float(days_since_clear_observation),
    }
