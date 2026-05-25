from __future__ import annotations


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def compute_confidence(
    *,
    cloud_pct: float,
    shoreline_penalty: float,
    model_agreement: float,
    days_since_clear_observation: int,
    label_quality: float,
) -> dict:
    cloud_quality = clamp01(1.0 - (cloud_pct / 100.0))
    shoreline_risk = clamp01(1.0 - shoreline_penalty)
    data_age = clamp01(1.0 - (days_since_clear_observation / 21.0))

    observation_quality = cloud_quality
    model_quality = clamp01(model_agreement)
    domain_quality = shoreline_risk
    time_quality = data_age
    label_quality = clamp01(label_quality)

    confidence = (
        observation_quality
        * model_quality
        * domain_quality
        * time_quality
        * label_quality
    )

    return {
        "confidence_score": clamp01(confidence),
        "factors": {
            "cloud_quality": cloud_quality,
            "shoreline_risk": shoreline_risk,
            "model_agreement": model_quality,
            "data_age": data_age,
            "label_quality": label_quality,
            "observation_quality": observation_quality,
            "model_quality": model_quality,
            "domain_quality": domain_quality,
            "time_quality": time_quality,
        },
    }


def explain_confidence(factors: dict) -> list[str]:
    return [
        f"Cloud quality contribution: {factors['cloud_quality']:.2f}.",
        f"Shoreline mixed-pixel reliability: {factors['shoreline_risk']:.2f}.",
        f"Model agreement contribution: {factors['model_agreement']:.2f}.",
        f"Recent clear-observation contribution: {factors['data_age']:.2f}.",
        f"Supporting label quality contribution: {factors['label_quality']:.2f}.",
    ]
