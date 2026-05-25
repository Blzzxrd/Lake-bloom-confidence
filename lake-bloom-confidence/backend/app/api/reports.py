from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.citizen_report import CitizenReport
from app.models.lake import Lake
from app.schemas.report import ReportCreate, ReportRead

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, db: Session = Depends(get_db)) -> CitizenReport:
    if db.get(Lake, payload.lake_id) is None:
        raise HTTPException(status_code=404, detail="Lake not found")
    report = CitizenReport(
        **payload.model_dump(),
        submitted_at=datetime.now(UTC),
        review_status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
