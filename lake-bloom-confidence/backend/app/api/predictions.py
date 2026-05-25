from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models.prediction import Prediction
from app.services.advisory import SCREENING_NOTICE, official_advisory_for_state
from app.services.confidence import explain_confidence
from app.schemas.prediction import PredictionExplanation, PredictionRead

router = APIRouter(tags=["predictions", "models"])


@router.get("/predictions/{prediction_id}/explain", response_model=PredictionExplanation)
def explain_prediction(prediction_id: int, db: Session = Depends(get_db)) -> dict:
    prediction = db.get(Prediction, prediction_id)
    if prediction is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    factors = {
        key: value
        for key, value in prediction.confidence_factors_json.items()
        if key != "features"
    }
    return {
        **PredictionRead.model_validate(prediction).model_dump(),
        "confidence_factors": factors,
        "explanation": explain_confidence(factors),
        "screening_notice": SCREENING_NOTICE,
        "advisory": official_advisory_for_state(prediction.lake.state),
    }


@router.get("/models/current")
def current_model() -> dict:
    settings = get_settings()
    return {
        "model_version": settings.model_version,
        "model_type": "scikit-learn RandomForestRegressor placeholder",
        "purpose": "Screening bloom likelihood from remote-sensing features",
        "limitations": [
            "Does not detect toxins.",
            "Requires field verification when confidence is low or decisions are consequential.",
            "Should be compared with official advisories and lab testing.",
        ],
        "features": [
            "NDWI",
            "NDCI",
            "green/red ratio",
            "green/NIR ratio",
            "red/NIR ratio",
            "cloud penalty",
            "shoreline penalty",
            "days since clear observation",
        ],
    }
