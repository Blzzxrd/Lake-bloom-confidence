from app.services.advisory import ALLOWED_LABELS, official_advisory_for_state
from app.services.confidence import compute_confidence


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_lake_list(client):
    response = client.get("/lakes")
    assert response.status_code == 200
    lakes = response.json()
    assert len(lakes) == 5
    assert {"id", "name", "state", "geometry", "area_km2", "shoreline_length_km"} <= set(lakes[0])


def test_create_verified_lake_from_lookup_candidate(client):
    response = client.post(
        "/lakes",
        json={
            "name": "Lake Minnetonka",
            "state": "MN",
            "source": "openstreetmap_nominatim",
            "source_id": "relation:12345",
            "display_name": "Lake Minnetonka, Hennepin County, Minnesota, United States",
            "lat": 44.93,
            "lon": -93.58,
            "boundingbox": ["44.86", "45.02", "-93.72", "-93.42"],
        },
    )
    assert response.status_code == 201
    lake = response.json()
    assert lake["name"] == "Lake Minnetonka"
    assert lake["state"] == "MN"

    latest = client.get(f"/lakes/{lake['id']}/latest")
    assert latest.status_code == 200
    payload = latest.json()
    assert 0 <= payload["bloom_probability"] <= 1
    assert 0 <= payload["confidence_score"] <= 1


def test_lake_search_filters_verified_lakes(client):
    client.post(
        "/lakes",
        json={
            "name": "Lake Champlain",
            "state": "NY",
            "source": "openstreetmap_nominatim",
            "source_id": "relation:98765",
            "display_name": "Lake Champlain, New York, United States",
        },
    )
    response = client.get("/lakes/search?q=Champlain&state=NY")
    assert response.status_code == 200
    assert any(lake["name"] == "Lake Champlain" for lake in response.json())


def test_unverified_lake_name_is_rejected(client, monkeypatch):
    from app.services import lake_discovery

    monkeypatch.setattr(lake_discovery, "lookup_lake_candidates", lambda *args, **kwargs: [])
    response = client.post("/lakes", json={"name": "Definitely Not A Real Lake 123", "state": "MN"})
    assert response.status_code == 404
    assert "No verified lake match found" in response.json()["detail"]


def test_lake_lookup_returns_verified_candidates(client):
    response = client.get("/lakes/lookup?q=Erie&state=OH")
    assert response.status_code == 200
    candidates = response.json()
    assert any(candidate["name"] == "Lake Erie Western Basin" for candidate in candidates)
    assert all(candidate["verified"] is True for candidate in candidates)


def test_ohio_advisory_uses_current_state_resource():
    advisory = official_advisory_for_state("OH")
    assert advisory["label"] == "Ohio HAB advisories and monitoring"
    assert advisory["url"] == "https://www.ohioalgaeinfo.com/"


def test_confidence_score_bounds():
    result = compute_confidence(
        cloud_pct=33,
        shoreline_penalty=0.2,
        model_agreement=0.7,
        days_since_clear_observation=4,
        label_quality=0.9,
    )
    assert 0 <= result["confidence_score"] <= 1
    assert all(0 <= value <= 1 for value in result["factors"].values())


def test_prediction_response_schema(client):
    lake_id = client.get("/lakes").json()[0]["id"]
    response = client.get(f"/lakes/{lake_id}/latest")
    assert response.status_code == 200
    payload = response.json()
    assert 0 <= payload["bloom_probability"] <= 1
    assert 0 <= payload["confidence_score"] <= 1
    assert payload["label"] in ALLOWED_LABELS

    explain = client.get(f"/predictions/{payload['id']}/explain")
    assert explain.status_code == 200
    explanation = explain.json()
    assert "confidence_factors" in explanation
    assert "screening_notice" in explanation


def test_safe_water_phrase_never_appears_in_api_labels(client):
    labels = []
    for lake in client.get("/lakes").json():
        latest = client.get(f"/lakes/{lake['id']}/latest").json()
        labels.append(latest["label"])
        explanation = client.get(f"/predictions/{latest['id']}/explain").json()
        labels.append(explanation["label"])

    joined = " ".join(labels).lower()
    assert "safe water" not in joined
