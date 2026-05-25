from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReportCreate(BaseModel):
    lake_id: int
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    photo_url: str | None = None
    visual_category: str
    notes: str | None = None


class ReportRead(BaseModel):
    id: int
    lake_id: int
    submitted_at: datetime
    lat: float
    lon: float
    photo_url: str | None
    visual_category: str
    notes: str | None
    review_status: str

    model_config = ConfigDict(from_attributes=True)
