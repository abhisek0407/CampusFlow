"""Pydantic request/response schemas (Pydantic v2).  Shape and bounds are checked here; ids and values are checked
against the active dataset in ``api.services.changes``."""
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

_Days = Field(min_length=1, max_length=7)
_Periods = Field(min_length=1, max_length=24)


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FacultyUnavailable(_Strict):
    type: Literal["faculty_unavailable"]
    faculty_id: str = Field(min_length=1, max_length=64)
    days: List[str] = _Days
    periods: List[int] = _Periods
    reason: Optional[str] = Field(default=None, max_length=200)


class RoomUnavailable(_Strict):
    type: Literal["room_unavailable"]
    room_id: str = Field(min_length=1, max_length=64)
    days: List[str] = _Days
    periods: List[int] = _Periods
    reason: Optional[str] = Field(default=None, max_length=200)


class AddFaculty(_Strict):
    type: Literal["add_faculty"]
    faculty: Dict[str, Any]


class AddSession(_Strict):
    type: Literal["add_session"]
    session: Dict[str, Any]


class RemoveSession(_Strict):
    type: Literal["remove_session"]
    session_id: str = Field(min_length=1, max_length=64)


ChangeModel = Annotated[
    Union[FacultyUnavailable, RoomUnavailable, AddFaculty, AddSession, RemoveSession],
    Field(discriminator="type"),
]


class StartJobRequest(_Strict):
    mode: Literal["generate", "repair"]
    base_version: Optional[str] = Field(default=None, max_length=64)
    changes: List[ChangeModel] = Field(default_factory=list, max_length=200)
    # Optional caller-owned snapshot. CampusFlow supplies this from MongoDB so the API's local seed files
    # are never the source of truth for an integrated job.
    dataset_snapshot: Optional[Dict[str, Any]] = None
    baseline_schedule: Optional[Dict[str, Any]] = None
    time_limit_seconds: float = Field(default=180, ge=1, le=900)      # never an unlimited solve
    workers: int = Field(default=8, ge=1, le=16)
    team: str = Field(default="your-team", pattern=r"^[A-Za-z0-9 _.\-]{1,64}$")


class ValidateSnapshotRequest(_Strict):
    dataset_snapshot: Dict[str, Any]
    schedule: Dict[str, Any]
    baseline_schedule: Optional[Dict[str, Any]] = None


class JobCreatedResponse(BaseModel):
    job_id: str
    status: str
    websocket_url: str


class JobStatusResponse(BaseModel):
    job_id: str
    mode: str
    status: str
    stage: Optional[str] = None
    proposal_status: str
    base_version: str
    created_at: str
    updated_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    latest_seq: int
    solver_statuses: Dict[str, str] = Field(default_factory=dict)
    result_available: bool
    approvable: bool
    error: Optional[str] = None
    log_ref: Optional[str] = None


class DecisionResponse(BaseModel):
    job_id: str
    proposal_status: str
    active_version: str
    previous_version: Optional[str] = None


class ActiveInfoResponse(BaseModel):
    version: str
    dataset_id: Optional[str] = None
    has_schedule: bool
    sessions: int
