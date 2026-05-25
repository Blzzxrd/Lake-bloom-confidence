from apscheduler.schedulers.background import BackgroundScheduler

from app.db import SessionLocal
from app.services.satellite_ingest import ingest_mock_satellite_scenes


def run_ingest_job() -> None:
    db = SessionLocal()
    try:
        ingest_mock_satellite_scenes(db)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(run_ingest_job, "interval", hours=6, id="mock-satellite-ingest", replace_existing=True)
    scheduler.start()
    return scheduler
