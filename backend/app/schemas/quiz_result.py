from pydantic import BaseModel


class QuizResultCreate(BaseModel):
    userId: str
    month: int
    year: int
    correct: int
    total: int
    score: float
    time: float


class QuizResultOut(QuizResultCreate):
    id: str
