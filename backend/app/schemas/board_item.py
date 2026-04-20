from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class ObsHistoryEntry(BaseModel):
    text: str
    date: str


class ChangeEntry(BaseModel):
    field: str
    old_value: str
    new_value: str
    date: str


class BoardItemCreate(BaseModel):
    userId: str
    title: str
    desc: str
    date: str
    deadline: Optional[str] = None  # ISO date "YYYY-MM-DD"; legacy items may lack this
    priority: str
    status: str
    progress: int = 0
    observations: str = ""
    obsHistory: List[ObsHistoryEntry] = []
    changes: List[ChangeEntry] = []
    # Manual ordering within a status column. Lower values render first.
    # Optional for legacy items; new items get assigned a position on reorder.
    position: Optional[int] = None


class BoardItemOut(BoardItemCreate):
    id: str
