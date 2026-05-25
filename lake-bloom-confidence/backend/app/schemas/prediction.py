from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ConfidenceFactors(BaseModel):
    cloud_quality: float = Field(ge=0, le=1)
    shoreline_risk: float = Field(ge=0, le=1)
    model_agreement: float = Field(ge=0, le=1)
    data_age: float = Field(ge=0, le=1)
    label_quality: float = Field(ge=0, le=1)
    observation_quality: float = Field(ge=0, le=1)
    model_quality: float = Field(ge=0, le=1)
    domain_quality: float = Field(ge=0, le=1)
    time_quality: float = Field(ge=0, le=1)


class PredictionRead(BaseModel):
    id: int
    lake_id: int
    scene_id: int
    generated_at: datetime
    bloom_probability: float = Field(ge=0, le=1)
    confidence_score: float = Field(ge=0, le=1)
    confidence_factors_json: dict[str, Any]
    model_version: str
    label: str

    model_config = ConfigDict(from_attributes=True)


class PredictionExplanation(PredictionRead):
    confidence_factors: ConfidenceFactors
    explanation: list[str]
    screening_notice: str
    advisory: dict[str, str]
