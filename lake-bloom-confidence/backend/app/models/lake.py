from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Lake(Base):
    __tablename__ = "lakes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    geometry: Mapped[str] = mapped_column(String, nullable=False)
    area_km2: Mapped[float] = mapped_column(Float, nullable=False)
    shoreline_length_km: Mapped[float] = mapped_column(Float, nullable=False)

    scenes = relationship("Scene", back_populates="lake", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="lake", cascade="all, delete-orphan")
    reports = relationship("CitizenReport", back_populates="lake", cascade="all, delete-orphan")
