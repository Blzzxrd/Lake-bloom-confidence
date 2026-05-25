from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lake_id: Mapped[int] = mapped_column(ForeignKey("lakes.id"), nullable=False, index=True)
    sensor: Mapped[str] = mapped_column(String(80), nullable=False)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    cloud_pct: Mapped[float] = mapped_column(Float, nullable=False)
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    lake = relationship("Lake", back_populates="scenes")
    predictions = relationship("Prediction", back_populates="scene", cascade="all, delete-orphan")
