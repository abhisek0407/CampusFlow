"""FastAPI application.  Run:  uvicorn api.main:app --host 127.0.0.1 --port 8000   (ONE worker only)

Swagger UI at /docs.  See API_README.md for configuration (CIT_API_TOKENS ...) and the event contract.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .auth import StaticTokenAuthProvider
from .config import Settings
from .errors import ApiError
from .routes.scheduler import router as scheduler_router
from .services.artifacts import JobArtifactStore
from .services.job_manager import JobManager
from .services.runner import RealSchedulerRunner
from .services.schedule_repository import load_seed_repository
from .services.scheduler_service import SchedulerService


def create_app(settings=None, auth_provider=None, schedule_repo=None, job_manager=None, runner=None):
    """App factory.  Every collaborator can be injected (tests use fakes); defaults are the real implementations."""
    settings = settings or Settings.from_env()
    repo = schedule_repo or load_seed_repository(settings)
    manager = job_manager or JobManager(max_stored_jobs=settings.max_stored_jobs)
    service = SchedulerService(settings, repo, manager, runner or RealSchedulerRunner(),
                               artifacts=JobArtifactStore(settings.runtime_dir))

    @asynccontextmanager
    async def lifespan(_app):
        yield
        service.shutdown()

    app = FastAPI(title="CIT Scheduler API", version="1.0.0", lifespan=lifespan,
                  description="Preview, review and approve timetable changes with live solver progress.")
    app.state.settings = settings
    app.state.auth_provider = auth_provider or StaticTokenAuthProvider.from_env()
    app.state.schedule_repo = repo
    app.state.job_manager = manager
    app.state.scheduler_service = service

    @app.exception_handler(ApiError)
    async def _api_error(_request, exc):
        return JSONResponse(status_code=exc.http_status, content={"detail": exc.public_message, "errors": exc.details})

    @app.get("/health")
    def health():
        return {"status": "ok"}

    app.include_router(scheduler_router)
    return app


def __getattr__(name):
    """``uvicorn api.main:app`` builds the app lazily, so merely importing this module (tests) has no side effects."""
    if name == "app":
        global app
        app = create_app()
        return app
    raise AttributeError(name)
