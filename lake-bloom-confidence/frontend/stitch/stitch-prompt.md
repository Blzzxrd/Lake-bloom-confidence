# Build Prompt For Google Stitch

Create a clean web app for **Lake Bloom Confidence** that uses the FastAPI backend at `VITE_API_BASE_URL`.

The app is a remote-sensing screening and decision-support tool. It estimates harmful algal bloom likelihood and a separate assessment confidence score. It must not claim toxin detection. It must not say `safe water`.

Use this warning in visible UI:

```text
Satellite estimates do not replace official advisories or lab testing.
```

## Design Direction

- Scientific but friendly.
- Blue/green palette with restrained status colors.
- Clear status badges.
- Avoid panic language.
- Emphasize confidence and field verification when uncertainty is high.
- First screen should be the usable app, not a marketing landing page.

## Pages

### Home

- Project title: `Lake Bloom Confidence`
- Search bar for lakes.
- Short warning: `Satellite estimates do not replace official advisories or lab testing.`
- Results should call `GET /lakes`.

### Lake Dashboard

- Map panel.
- Latest bloom likelihood card.
- Assessment confidence card.
- Confidence explanation panel.
- Official advisory link section.
- Time-series chart.

Calls:

- `GET /lakes/{lake_id}`
- `GET /lakes/{lake_id}/latest`
- `GET /predictions/{prediction_id}/explain`
- `GET /lakes/{lake_id}/history`

### Report Bloom

- Upload photo or photo URL field.
- Select visual category.
- Add location and notes.
- Privacy notice.

Call:

- `POST /reports`

### About

- Explain bloom likelihood versus confidence.
- Explain that toxins are not directly detected.
- Explain that official advisories and lab testing remain authoritative.

## Components

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

## Backend Contract

Base URL:

```text
import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
```

Endpoints:

- `GET /health`
- `GET /lakes`
- `GET /lakes/{lake_id}`
- `GET /lakes/{lake_id}/latest`
- `GET /lakes/{lake_id}/history`
- `GET /predictions/{prediction_id}/explain`
- `POST /reports`
- `GET /models/current`

Use `api-client.ts` as the typed frontend client.

## Status Labels

Display backend labels exactly:

- `Probable bloom, high confidence`
- `Probable bloom, guarded confidence`
- `Possible bloom`
- `Bloom unlikely, high confidence`
- `Not enough reliable information`

Never transform `Bloom unlikely, high confidence` into language that implies recreational or drinking water safety.

## Important Data Shapes

`Lake`:

```ts
{
  id: number;
  name: string;
  state: string;
  geometry: string;
  area_km2: number;
  shoreline_length_km: number;
}
```

`Prediction`:

```ts
{
  id: number;
  lake_id: number;
  scene_id: number;
  generated_at: string;
  bloom_probability: number;
  confidence_score: number;
  confidence_factors_json: Record<string, unknown>;
  model_version: string;
  label: string;
}
```

`PredictionExplanation`:

```ts
Prediction & {
  confidence_factors: {
    cloud_quality: number;
    shoreline_risk: number;
    model_agreement: number;
    data_age: number;
    label_quality: number;
    observation_quality: number;
    model_quality: number;
    domain_quality: number;
    time_quality: number;
  };
  explanation: string[];
  screening_notice: string;
  advisory: {
    label: string;
    url: string;
  };
}
```

`POST /reports` payload:

```ts
{
  lake_id: number;
  lat: number;
  lon: number;
  photo_url?: string | null;
  visual_category: string;
  notes?: string | null;
}
```
