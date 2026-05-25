# Lake Bloom Confidence Backend

FastAPI backend for a remote-sensing screening and decision-support tool. The API estimates:

- Bloom Likelihood: probability from 0 to 1.
- Assessment Confidence: reliability score from 0 to 1.
- Confidence explanation: cloud quality, shoreline risk, model agreement, data age, and label quality.

The system does not detect toxins. Satellite estimates do not replace official advisories or lab testing.

## Stack

- Python 3.11+
- FastAPI
- PostgreSQL with PostGIS
- SQLAlchemy
- Rasterio, GeoPandas, Shapely, Xarray, NumPy, Pandas
- scikit-learn MVP model
- APScheduler background ingestion
- Docker Compose

## Run With Docker

```bash
cd lake-bloom-confidence/backend
docker compose up --build
```

Open:

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

The app creates tables and seeds 5 demo lakes on startup. The database container enables PostGIS via `migrations/init.sql`.

## Run Tests

```bash
cd lake-bloom-confidence/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pytest
```

Tests use in-memory SQLite for speed. Docker uses PostgreSQL/PostGIS.

## Frontend Contract

Frontend API calls:

- `GET /lakes`
- `GET /lakes/search?q={query}&state={state}`
- `POST /lakes`
- `GET /lakes/{lake_id}`
- `GET /lakes/{lake_id}/latest`
- `GET /lakes/{lake_id}/history`
- `GET /predictions/{prediction_id}/explain`
- `POST /reports`
- `GET /models/current`

Approved status labels:

- Probable bloom, high confidence
- Probable bloom, guarded confidence
- Possible bloom
- Bloom unlikely, high confidence
- Not enough reliable information

Recommended frontend warning text:

```text
Satellite estimates do not replace official advisories or lab testing.
```

## Example JSON Responses

### `GET /health`

```json
{
  "status": "ok",
  "service": "Lake Bloom Confidence"
}
```

### `GET /lakes`

```json
[
  {
    "id": 3,
    "name": "Clear Lake",
    "state": "CA",
    "geometry": "POLYGON((-123.05 38.85,-122.55 38.85,-122.55 39.15,-123.05 39.15,-123.05 38.85))",
    "area_km2": 180.0,
    "shoreline_length_km": 160.0
  }
]
```

### `GET /lakes/{lake_id}`

```json
{
  "id": 1,
  "name": "Lake Erie Western Basin",
  "state": "OH",
  "geometry": "POLYGON((-83.5 41.3,-82.5 41.3,-82.5 42.0,-83.5 42.0,-83.5 41.3))",
  "area_km2": 3200.0,
  "shoreline_length_km": 510.0
}
```

### `GET /lakes/search?q=Champlain&state=NY`

```json
[
  {
    "id": 6,
    "name": "Lake Champlain",
    "state": "NY",
    "geometry": "POLYGON((-75.50000 43.00000,-75.42000 43.00000,-75.42000 43.07000,-75.50000 43.07000,-75.50000 43.00000))",
    "area_km2": 125.0,
    "shoreline_length_km": 84.0
  }
]
```

### `POST /lakes`

Creates or returns a modeled lake record for a U.S. lake not already in the demo database, then generates a mock satellite scene and prediction.

Request:

```json
{
  "name": "Lake Minnetonka",
  "state": "MN"
}
```

Response:

```json
{
  "id": 6,
  "name": "Lake Minnetonka",
  "state": "MN",
  "geometry": "POLYGON((-94.30000 46.30000,-94.22000 46.30000,-94.22000 46.37000,-94.30000 46.37000,-94.30000 46.30000))",
  "area_km2": 42.5,
  "shoreline_length_km": 18.4
}
```

### `GET /lakes/{lake_id}/latest`

```json
{
  "id": 1,
  "lake_id": 1,
  "scene_id": 1,
  "generated_at": "2026-05-24T23:40:00Z",
  "bloom_probability": 0.62,
  "confidence_score": 0.47,
  "confidence_factors_json": {
    "cloud_quality": 0.81,
    "shoreline_risk": 0.95,
    "model_agreement": 0.89,
    "data_age": 0.9,
    "label_quality": 0.78,
    "observation_quality": 0.81,
    "model_quality": 0.89,
    "domain_quality": 0.95,
    "time_quality": 0.9,
    "features": {
      "ndwi": 0.12,
      "ndci": 0.31,
      "green_red_ratio": 1.6,
      "green_nir_ratio": 1.4,
      "red_nir_ratio": 0.88,
      "cloud_penalty": 0.19,
      "shoreline_penalty": 0.05,
      "days_since_clear_observation": 2.0
    }
  },
  "model_version": "mvp-placeholder-0.1.0",
  "label": "Possible bloom"
}
```

### `GET /lakes/{lake_id}/history`

```json
[
  {
    "id": 1,
    "lake_id": 1,
    "scene_id": 1,
    "generated_at": "2026-05-24T23:40:00Z",
    "bloom_probability": 0.62,
    "confidence_score": 0.47,
    "confidence_factors_json": {
      "cloud_quality": 0.81,
      "shoreline_risk": 0.95,
      "model_agreement": 0.89,
      "data_age": 0.9,
      "label_quality": 0.78,
      "observation_quality": 0.81,
      "model_quality": 0.89,
      "domain_quality": 0.95,
      "time_quality": 0.9
    },
    "model_version": "mvp-placeholder-0.1.0",
    "label": "Possible bloom"
  }
]
```

### `GET /predictions/{prediction_id}/explain`

```json
{
  "id": 1,
  "lake_id": 1,
  "scene_id": 1,
  "generated_at": "2026-05-24T23:40:00Z",
  "bloom_probability": 0.62,
  "confidence_score": 0.47,
  "confidence_factors_json": {
    "cloud_quality": 0.81,
    "shoreline_risk": 0.95,
    "model_agreement": 0.89,
    "data_age": 0.9,
    "label_quality": 0.78,
    "observation_quality": 0.81,
    "model_quality": 0.89,
    "domain_quality": 0.95,
    "time_quality": 0.9
  },
  "model_version": "mvp-placeholder-0.1.0",
  "label": "Possible bloom",
  "confidence_factors": {
    "cloud_quality": 0.81,
    "shoreline_risk": 0.95,
    "model_agreement": 0.89,
    "data_age": 0.9,
    "label_quality": 0.78,
    "observation_quality": 0.81,
    "model_quality": 0.89,
    "domain_quality": 0.95,
    "time_quality": 0.9
  },
  "explanation": [
    "Cloud quality contribution: 0.81.",
    "Shoreline mixed-pixel reliability: 0.95.",
    "Model agreement contribution: 0.89.",
    "Recent clear-observation contribution: 0.90.",
    "Supporting label quality contribution: 0.78."
  ],
  "screening_notice": "Satellite estimates do not replace official advisories or lab testing. This service estimates bloom likelihood and assessment confidence only; it does not detect toxins.",
  "advisory": {
    "label": "Ohio HAB advisories and monitoring",
    "url": "https://www.ohioalgaeinfo.com/"
  }
}
```

### `POST /reports`

Request:

```json
{
  "lake_id": 1,
  "lat": 41.72,
  "lon": -83.2,
  "photo_url": "https://example.org/report-photo.jpg",
  "visual_category": "surface scum",
  "notes": "Green surface streaks near the public boat ramp."
}
```

Response:

```json
{
  "id": 1,
  "lake_id": 1,
  "submitted_at": "2026-05-24T23:45:00Z",
  "lat": 41.72,
  "lon": -83.2,
  "photo_url": "https://example.org/report-photo.jpg",
  "visual_category": "surface scum",
  "notes": "Green surface streaks near the public boat ramp.",
  "review_status": "pending"
}
```

### `GET /models/current`

```json
{
  "model_version": "mvp-placeholder-0.1.0",
  "model_type": "scikit-learn RandomForestRegressor placeholder",
  "purpose": "Screening bloom likelihood from remote-sensing features",
  "limitations": [
    "Does not detect toxins.",
    "Requires field verification when confidence is low or decisions are consequential.",
    "Should be compared with official advisories and lab testing."
  ],
  "features": [
    "NDWI",
    "NDCI",
    "green/red ratio",
    "green/NIR ratio",
    "red/NIR ratio",
    "cloud penalty",
    "shoreline penalty",
    "days since clear observation"
  ]
}
```

## Notes For Google Stitch Frontend

Pages:

- Home: title, lake search, warning text.
- Lake Dashboard: map, likelihood card, confidence card, factor panel, advisory link, timeline.
- Report Bloom: photo upload, category select, location, notes, privacy notice.
- About: distinguish bloom likelihood from confidence and explain that toxins are not directly detected.

Components:

- `LakeSearch`
- `LakeMap`
- `BloomStatusCard`
- `ConfidenceGauge`
- `ConfidenceFactorList`
- `PredictionTimeline`
- `AdvisoryPanel`
- `ReportForm`
- `SafetyDisclaimer`
- `ModelExplanationPanel`
