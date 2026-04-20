from pydantic import BaseModel
from typing import Optional


class TaskCreate(BaseModel):
    userId: str
    title: str = ""
    type: str
    freq: str
    hoursEstimated: float
    hoursActual: float = 0.0
    # Completion status for the Índice de Cumplimiento model:
    # "ON_TIME" (100%), "LATE" (50%), "PENDING" (0%). Defaults to PENDING.
    completionStatus: Optional[str] = "PENDING"


class TaskOut(TaskCreate):
    id: str
