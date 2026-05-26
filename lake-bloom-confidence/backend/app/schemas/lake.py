from pydantic import BaseModel, ConfigDict, Field


class LakeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    state: str = Field(min_length=2, max_length=2)
    source: str | None = Field(default=None, max_length=80)
    source_id: str | None = Field(default=None, max_length=160)
    display_name: str | None = Field(default=None, max_length=260)
    lat: float | None = None
    lon: float | None = None
    boundingbox: list[str] | None = None


class LakeLookupCandidate(BaseModel):
    name: str
    state: str
    display_name: str
    source: str
    source_id: str
    verified: bool = True
    lat: float | None = None
    lon: float | None = None
    boundingbox: list[str] | None = None


class LakeRead(BaseModel):
    id: int
    name: str
    state: str
    geometry: str
    area_km2: float
    shoreline_length_km: float

    model_config = ConfigDict(from_attributes=True)
