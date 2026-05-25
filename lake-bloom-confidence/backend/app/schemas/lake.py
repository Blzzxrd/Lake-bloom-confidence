from pydantic import BaseModel, ConfigDict


class LakeRead(BaseModel):
    id: int
    name: str
    state: str
    geometry: str
    area_km2: float
    shoreline_length_km: float

    model_config = ConfigDict(from_attributes=True)
