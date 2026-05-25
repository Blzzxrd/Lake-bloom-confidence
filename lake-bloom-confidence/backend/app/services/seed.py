from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.lake import Lake
from app.services.satellite_ingest import ingest_mock_satellite_scenes


DEMO_LAKES = [
    {
        "name": "Lake Erie Western Basin",
        "state": "OH",
        "geometry": "POLYGON((-83.5 41.3,-82.5 41.3,-82.5 42.0,-83.5 42.0,-83.5 41.3))",
        "area_km2": 3200.0,
        "shoreline_length_km": 510.0,
    },
    {
        "name": "Utah Lake",
        "state": "UT",
        "geometry": "POLYGON((-111.95 40.05,-111.65 40.05,-111.65 40.35,-111.95 40.35,-111.95 40.05))",
        "area_km2": 380.0,
        "shoreline_length_km": 121.0,
    },
    {
        "name": "Clear Lake",
        "state": "CA",
        "geometry": "POLYGON((-123.05 38.85,-122.55 38.85,-122.55 39.15,-123.05 39.15,-123.05 38.85))",
        "area_km2": 180.0,
        "shoreline_length_km": 160.0,
    },
    {
        "name": "Lake Okeechobee",
        "state": "FL",
        "geometry": "POLYGON((-81.15 26.75,-80.55 26.75,-80.55 27.25,-81.15 27.25,-81.15 26.75))",
        "area_km2": 1890.0,
        "shoreline_length_km": 216.0,
    },
    {
        "name": "Upper Klamath Lake",
        "state": "OR",
        "geometry": "POLYGON((-122.05 42.15,-121.65 42.15,-121.65 42.55,-122.05 42.55,-122.05 42.15))",
        "area_km2": 249.0,
        "shoreline_length_km": 145.0,
    },
]


def seed_demo_data(db: Session) -> None:
    if db.query(Lake).count() == 0:
        for lake_data in DEMO_LAKES:
            db.add(Lake(**lake_data))
        db.commit()
    ingest_mock_satellite_scenes(db)
