from __future__ import annotations


class STACClient:
    """Thin future-facing STAC boundary for Sentinel-2, HLS, or other collections."""

    def search_lake_scenes(self, *, geometry: str, start_date: str | None = None, end_date: str | None = None) -> list[dict]:
        # Real implementation will query a STAC API and return item metadata plus assets.
        return []
