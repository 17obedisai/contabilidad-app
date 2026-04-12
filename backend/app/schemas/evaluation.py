from pydantic import BaseModel
from typing import Optional


class EvaluationCreate(BaseModel):
    userId: str
    month: int
    year: int
    self_eval: dict = {}
    cont_eval: dict = {}
    metrics: dict = {}


class EvaluationOut(EvaluationCreate):
    id: str
