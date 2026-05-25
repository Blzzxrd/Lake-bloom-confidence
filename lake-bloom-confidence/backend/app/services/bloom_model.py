from __future__ import annotations

try:
    import numpy as np
    from sklearn.ensemble import RandomForestRegressor
except ImportError:  # pragma: no cover - exercised only in minimal local environments
    np = None
    RandomForestRegressor = None

FEATURE_ORDER = [
    "ndwi",
    "ndci",
    "green_red_ratio",
    "green_nir_ratio",
    "red_nir_ratio",
    "cloud_penalty",
    "shoreline_penalty",
    "days_since_clear_observation",
]


class MVPBloomModel:
    """Small deterministic placeholder model; replace with trained artifact later."""

    version = "mvp-placeholder-0.1.0"

    def __init__(self) -> None:
        if np is None or RandomForestRegressor is None:
            self.model = None
            return

        training = np.array(
            [
                [0.55, -0.10, 0.8, 1.2, 1.5, 0.05, 0.10, 1],
                [0.35, 0.05, 1.1, 1.4, 1.2, 0.15, 0.20, 3],
                [0.10, 0.30, 1.8, 1.8, 1.0, 0.10, 0.12, 2],
                [-0.05, 0.45, 2.4, 2.0, 0.8, 0.25, 0.30, 5],
                [0.20, 0.20, 1.5, 1.6, 1.0, 0.45, 0.35, 9],
                [0.60, -0.15, 0.7, 1.1, 1.4, 0.20, 0.15, 4],
                [0.00, 0.55, 2.8, 2.4, 0.7, 0.10, 0.20, 1],
                [0.15, 0.35, 2.0, 2.1, 0.9, 0.30, 0.45, 8],
            ],
            dtype=float,
        )
        labels = np.array([0.10, 0.25, 0.62, 0.86, 0.54, 0.08, 0.92, 0.68], dtype=float)
        self.model = RandomForestRegressor(n_estimators=64, random_state=42, min_samples_leaf=1)
        self.model.fit(training, labels)

    def predict(self, features: dict[str, float]) -> dict[str, float]:
        if self.model is None:
            raw = (
                0.20
                + features["ndci"] * 0.85
                + (features["green_red_ratio"] - 1.0) * 0.18
                - features["cloud_penalty"] * 0.15
                - features["shoreline_penalty"] * 0.10
            )
            probability = max(0.0, min(1.0, raw))
            agreement = max(0.35, min(0.85, 1.0 - features["cloud_penalty"] - features["shoreline_penalty"] * 0.5))
            return {"bloom_probability": probability, "model_agreement": agreement}

        vector = np.array([[features[name] for name in FEATURE_ORDER]], dtype=float)
        tree_predictions = np.array([tree.predict(vector)[0] for tree in self.model.estimators_])
        probability = float(np.clip(tree_predictions.mean(), 0.0, 1.0))
        disagreement = float(np.clip(tree_predictions.std(), 0.0, 0.5))
        agreement = float(np.clip(1.0 - (disagreement * 2.0), 0.0, 1.0))
        return {"bloom_probability": probability, "model_agreement": agreement}


model = MVPBloomModel()
