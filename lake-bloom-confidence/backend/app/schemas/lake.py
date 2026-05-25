from pydantic import BaseModel, ConfigDict, Field


class LakeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    state: str = Field(min_length=2, max_length=2)


class LakeRead(BaseModel):
    id: int
    name: str
    state: str
    geometry: str
    area_km2: float
    shoreline_length_km: float

    model_config = ConfigDict(from_attributes=True)
