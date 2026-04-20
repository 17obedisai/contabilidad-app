from pydantic import BaseModel
from typing import Optional, List


class OkrItem(BaseModel):
    # Short free-text description of the monthly objective.
    objective: str = ""
    # Completion percentage (0-100). Stored as float to allow fine-grained updates.
    achievement: float = 0.0


class EvaluationCreate(BaseModel):
    userId: str
    month: int
    year: int
    self_eval: dict = {}
    cont_eval: dict = {}
    metrics: dict = {}
    # Up to 3 OKRs per month — enforced on the frontend and on save.
    okrs: List[OkrItem] = []


class EvaluationOut(EvaluationCreate):
    id: str
