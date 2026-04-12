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
    priority: str
    status: str
    progress: int = 0
    observations: str = ""
    obsHistory: List[ObsHistoryEntry] = []
    changes: List[ChangeEntry] = []


class BoardItemOut(BoardItemCreate):
    id: str
