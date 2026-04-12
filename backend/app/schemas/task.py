from pydantic import BaseModel
from typing import Optional


class TaskCreate(BaseModel):
    userId: str
    title: str = ""
    type: str
    freq: str
    hoursEstimated: float
    hoursActual: float = 0.0


class TaskOut(TaskCreate):
    id: str
