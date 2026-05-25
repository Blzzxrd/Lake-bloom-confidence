from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, lakes, predictions, reports
from app.config import get_settings
from app.db import SessionLocal, init_db
from app.jobs.scheduled_ingest import start_scheduler
from app.services.seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_db()
    if settings.seed_demo_data:
        db = SessionLocal()
        try:
            seed_demo_data(db)
        finally:
            db.close()

    scheduler = start_scheduler() if settings.scheduler_enabled else None
    try:
        yield
    finally:
        if scheduler:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="Lake Bloom Confidence API",
    description=(
        "Remote-sensing screening API for harmful algal bloom likelihood and separate "
        "assessment confidence. It does not claim toxin detection."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(lakes.router)
app.include_router(predictions.router)
app.include_router(reports.router)
