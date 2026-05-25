from __future__ import annotations

from datetime import UTC, datetime, timedelta
from random import Random

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.lake import Lake
from app.models.prediction import Prediction
from app.models.scene import Scene
from app.services.advisory import label_for_prediction
from app.services.bloom_model import model
from app.services.confidence import compute_confidence
from app.services.feature_engineering import compute_remote_sensing_features
from app.services.water_quality_ingest import label_quality_for_lake


def mock_bands_for_lake(lake: Lake) -> dict[str, float]:
    rng = Random(lake.id * 7919)
    bloom_signal = 0.18 + (lake.id % 5) * 0.08 + rng.uniform(-0.04, 0.08)
    return {
        "green": 0.16 + bloom_signal * 0.18,
        "red": 0.08 + bloom_signal * 0.06,
        "red_edge": 0.09 + bloom_signal * 0.22,
        "nir": 0.20 + rng.uniform(-0.04, 0.04),
    }


def create_mock_scene_and_prediction(db: Session, lake: Lake, *, acquired_at: datetime | None = None) -> Prediction:
    acquired_at = acquired_at or (datetime.now(UTC) - timedelta(days=lake.id % 6 + 1))
    cloud_pct = float(8 + (lake.id * 11) % 46)
    days_since_clear = int(max(1, (datetime.now(UTC) - acquired_at).days))

    scene = Scene(
        lake_id=lake.id,
        sensor="mock-sentinel-2",
        acquired_at=acquired_at,
        cloud_pct=cloud_pct,
        source_url="mock://sentinel-2/demo-scene",
        metadata_json={
            "ingestion_mode": "mock",
            "future_sources": ["Sentinel-2 STAC", "HLS STAC"],
            "bands": mock_bands_for_lake(lake),
        },
    )
    db.add(scene)
    db.flush()

    features = compute_remote_sensing_features(
        scene.metadata_json["bands"],
        cloud_pct=cloud_pct,
        lake_area_km2=lake.area_km2,
        shoreline_length_km=lake.shoreline_length_km,
        days_since_clear_observation=days_since_clear,
    )
    model_output = model.predict(features)
    confidence_output = compute_confidence(
        cloud_pct=cloud_pct,
        shoreline_penalty=features["shoreline_penalty"],
        model_agreement=model_output["model_agreement"],
        days_since_clear_observation=days_since_clear,
        label_quality=label_quality_for_lake(lake.id),
    )
    label = label_for_prediction(
        model_output["bloom_probability"], confidence_output["confidence_score"]
    )

    prediction = Prediction(
        lake_id=lake.id,
        scene_id=scene.id,
        generated_at=datetime.now(UTC),
        bloom_probability=model_output["bloom_probability"],
        confidence_score=confidence_output["confidence_score"],
        confidence_factors_json={
            **confidence_output["factors"],
            "features": features,
        },
        model_version=get_settings().model_version,
        label=label,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def ingest_mock_satellite_scenes(db: Session) -> int:
    created = 0
    lakes = db.query(Lake).all()
    for lake in lakes:
        existing = db.query(Prediction).filter(Prediction.lake_id == lake.id).first()
        if existing is None:
            create_mock_scene_and_prediction(db, lake)
            created += 1
    return created
