from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.lake import Lake
from app.models.prediction import Prediction
from app.services.satellite_ingest import create_mock_scene_and_prediction


US_STATE_CODES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC",
}


STATE_CENTROIDS = {
    "AL": (-86.8, 32.8), "AK": (-150.0, 64.0), "AZ": (-111.7, 34.2),
    "AR": (-92.4, 34.9), "CA": (-119.5, 37.2), "CO": (-105.5, 39.0),
    "CT": (-72.7, 41.6), "DE": (-75.5, 39.0), "FL": (-82.4, 28.5),
    "GA": (-83.4, 32.7), "HI": (-157.5, 20.8), "ID": (-114.6, 44.2),
    "IL": (-89.2, 40.0), "IN": (-86.1, 40.0), "IA": (-93.5, 42.0),
    "KS": (-98.3, 38.5), "KY": (-85.0, 37.6), "LA": (-91.9, 31.1),
    "ME": (-69.0, 45.2), "MD": (-76.7, 39.0), "MA": (-71.8, 42.3),
    "MI": (-85.5, 44.3), "MN": (-94.3, 46.3), "MS": (-89.7, 32.7),
    "MO": (-92.5, 38.5), "MT": (-110.5, 46.9), "NE": (-99.8, 41.5),
    "NV": (-117.0, 39.3), "NH": (-71.6, 43.7), "NJ": (-74.5, 40.1),
    "NM": (-106.1, 34.5), "NY": (-75.5, 43.0), "NC": (-79.4, 35.5),
    "ND": (-100.5, 47.5), "OH": (-82.8, 40.3), "OK": (-97.5, 35.6),
    "OR": (-120.5, 44.0), "PA": (-77.8, 40.9), "RI": (-71.6, 41.7),
    "SC": (-80.9, 33.9), "SD": (-100.0, 44.4), "TN": (-86.4, 35.8),
    "TX": (-99.3, 31.5), "UT": (-111.7, 39.3), "VT": (-72.7, 44.0),
    "VA": (-78.8, 37.5), "WA": (-120.5, 47.4), "WV": (-80.6, 38.6),
    "WI": (-89.8, 44.6), "WY": (-107.5, 43.0), "DC": (-77.0, 38.9),
}


def normalize_state(state: str) -> str:
    code = state.strip().upper()
    if code not in US_STATE_CODES:
        raise ValueError("State must be a valid U.S. postal code")
    return code


def find_lakes(db: Session, *, query: str = "", state: str | None = None) -> list[Lake]:
    lake_query = db.query(Lake)
    if query:
        lake_query = lake_query.filter(Lake.name.ilike(f"%{query.strip()}%"))
    if state:
        lake_query = lake_query.filter(Lake.state == normalize_state(state))
    return lake_query.order_by(Lake.name).limit(50).all()


def get_or_create_modeled_lake(db: Session, *, name: str, state: str) -> Lake:
    clean_name = " ".join(name.strip().split())
    clean_state = normalize_state(state)
    existing = (
        db.query(Lake)
        .filter(Lake.name.ilike(clean_name), Lake.state == clean_state)
        .first()
    )
    if existing:
        ensure_prediction(db, existing)
        return existing

    lake = Lake(
        name=clean_name,
        state=clean_state,
        geometry=_modeled_geometry(clean_name, clean_state),
        area_km2=_modeled_area(clean_name, clean_state),
        shoreline_length_km=_modeled_shoreline(clean_name, clean_state),
    )
    db.add(lake)
    db.commit()
    db.refresh(lake)
    ensure_prediction(db, lake)
    return lake


def ensure_prediction(db: Session, lake: Lake) -> None:
    exists = db.query(Prediction).filter(Prediction.lake_id == lake.id).first()
    if exists is None:
        create_mock_scene_and_prediction(db, lake, acquired_at=datetime.now(UTC))


def _seed(name: str, state: str) -> int:
    return int(hashlib.sha256(f"{name.lower()}|{state}".encode()).hexdigest()[:12], 16)


def _modeled_area(name: str, state: str) -> float:
    seed = _seed(name, state)
    return round(0.8 + (seed % 45000) / 100.0, 2)


def _modeled_shoreline(name: str, state: str) -> float:
    area = _modeled_area(name, state)
    seed = _seed(name, state) // 17
    return round(max(2.5, area ** 0.58 * (2.5 + (seed % 380) / 100.0)), 2)


def _modeled_geometry(name: str, state: str) -> str:
    lon, lat = STATE_CENTROIDS.get(state, (-98.6, 39.8))
    seed = _seed(name, state)
    lon_offset = ((seed % 2000) - 1000) / 10000
    lat_offset = (((seed // 2000) % 1600) - 800) / 10000
    cx = lon + lon_offset
    cy = lat + lat_offset
    width = 0.04 + ((seed // 13) % 70) / 1000
    height = 0.03 + ((seed // 29) % 60) / 1000
    return (
        f"POLYGON(({cx - width:.5f} {cy - height:.5f},"
        f"{cx + width:.5f} {cy - height:.5f},"
        f"{cx + width:.5f} {cy + height:.5f},"
        f"{cx - width:.5f} {cy + height:.5f},"
        f"{cx - width:.5f} {cy - height:.5f}))"
    )
