from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.lake import Lake
from app.models.prediction import Prediction
from app.schemas.lake import LakeCreate, LakeRead
from app.schemas.prediction import PredictionRead
from app.services.lake_discovery import find_lakes, get_or_create_modeled_lake

router = APIRouter(prefix="/lakes", tags=["lakes"])


@router.get("", response_model=list[LakeRead])
def list_lakes(db: Session = Depends(get_db)) -> list[Lake]:
    return db.query(Lake).order_by(Lake.name).all()


@router.get("/search", response_model=list[LakeRead])
def search_lakes(
    q: str = Query("", max_length=160),
    state: str | None = Query(None, min_length=2, max_length=2),
    db: Session = Depends(get_db),
) -> list[Lake]:
    try:
        return find_lakes(db, query=q, state=state)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("", response_model=LakeRead, status_code=status.HTTP_201_CREATED)
def create_modeled_lake(payload: LakeCreate, db: Session = Depends(get_db)) -> Lake:
    try:
        return get_or_create_modeled_lake(db, name=payload.name, state=payload.state)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/{lake_id}", response_model=LakeRead)
def get_lake(lake_id: int, db: Session = Depends(get_db)) -> Lake:
    lake = db.get(Lake, lake_id)
    if lake is None:
        raise HTTPException(status_code=404, detail="Lake not found")
    return lake


@router.get("/{lake_id}/latest", response_model=PredictionRead)
def get_latest_prediction(lake_id: int, db: Session = Depends(get_db)) -> Prediction:
    prediction = (
        db.query(Prediction)
        .filter(Prediction.lake_id == lake_id)
        .order_by(Prediction.generated_at.desc())
        .first()
    )
    if prediction is None:
        raise HTTPException(status_code=404, detail="No prediction found for lake")
    return prediction


@router.get("/{lake_id}/history", response_model=list[PredictionRead])
def get_prediction_history(lake_id: int, db: Session = Depends(get_db)) -> list[Prediction]:
    return (
        db.query(Prediction)
        .filter(Prediction.lake_id == lake_id)
        .order_by(Prediction.generated_at.desc())
        .limit(90)
        .all()
    )
