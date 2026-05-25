SCREENING_NOTICE = (
    "Satellite estimates do not replace official advisories or lab testing. "
    "This service estimates bloom likelihood and assessment confidence only; it does not detect toxins."
)

ALLOWED_LABELS = {
    "Probable bloom, high confidence",
    "Probable bloom, guarded confidence",
    "Possible bloom",
    "Bloom unlikely, high confidence",
    "Not enough reliable information",
}


def label_for_prediction(bloom_probability: float, confidence_score: float) -> str:
    if confidence_score < 0.25:
        return "Not enough reliable information"
    if bloom_probability >= 0.65 and confidence_score >= 0.65:
        return "Probable bloom, high confidence"
    if bloom_probability >= 0.65:
        return "Probable bloom, guarded confidence"
    if bloom_probability >= 0.35:
        return "Possible bloom"
    if confidence_score >= 0.65:
        return "Bloom unlikely, high confidence"
    return "Not enough reliable information"


def official_advisory_for_state(state: str) -> dict[str, str]:
    return {
        "label": f"{state} official water quality advisories",
        "url": f"https://www.epa.gov/cyanohabs/state-resources-addressing-cyanobacterial-harmful-algal-blooms",
    }
