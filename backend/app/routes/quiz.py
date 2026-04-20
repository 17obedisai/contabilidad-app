from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from app.db.connection import get_database
from app.db.helpers import doc_to_dict, to_id
from app.core.dependencies import verify_token

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


# ── schemas ──────────────────────────────────────────────────────────────────

class SubmitRequest(BaseModel):
    year: int
    month: int
    answers: List[int]   # list of chosen option indices, one per question
    time: float          # seconds taken


class QuestionPayload(BaseModel):
    text: str
    options: List[str] = Field(..., min_length=2, max_length=6)
    correct: int        # index into options[]
    difficulty: Optional[str] = "m"


class QuizTemplatePayload(BaseModel):
    """Full template for a month's quiz — sent by admin editor."""
    title: str
    questions: List[QuestionPayload]


def _require_admin(token: dict):
    if not token.get("isCont"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Solo la contadora puede editar el quiz")


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_quiz(db, year: int, month: int) -> dict:
    quiz = await db.quizzes.find_one({"year": year, "month": month})
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Quiz no disponible para ese mes")
    return quiz


# ── routes ───────────────────────────────────────────────────────────────────

@router.get("/questions/{year}/{month}")
async def get_questions(year: int, month: int, token: dict = Depends(verify_token)):
    """Returns questions WITHOUT the correct answer index."""
    db = get_database()
    quiz = await _get_quiz(db, year, month)
    questions = [
        {"id": str(i), "text": q["text"], "options": q["options"]}
        for i, q in enumerate(quiz.get("questions", []))
    ]
    return {"year": year, "month": month, "questions": questions}


@router.get("/template/{year}/{month}")
async def get_template(year: int, month: int, token: dict = Depends(verify_token)):
    """
    Admin-only: returns the FULL quiz template INCLUDING the correct-answer index.
    Used by the quiz editor panel.
    Returns an empty template if none exists yet for that month.
    """
    _require_admin(token)
    db = get_database()
    quiz = await db.quizzes.find_one({"year": year, "month": month})
    if not quiz:
        return {"year": year, "month": month, "title": "", "questions": []}
    return {
        "year": year,
        "month": month,
        "title": quiz.get("title", ""),
        "questions": [
            {
                "text":       q.get("text", ""),
                "options":    q.get("options", []),
                "correct":    q.get("correct", 0),
                "difficulty": q.get("difficulty", "m"),
            }
            for q in quiz.get("questions", [])
        ],
    }


@router.put("/template/{year}/{month}")
async def save_template(
    year: int, month: int,
    body: QuizTemplatePayload,
    token: dict = Depends(verify_token),
):
    """
    Admin-only: upserts the quiz template for the given month.
    Validates each question's `correct` index is within its options range.
    """
    _require_admin(token)
    db = get_database()

    # Validate correct-answer indices
    for i, q in enumerate(body.questions):
        if q.correct < 0 or q.correct >= len(q.options):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pregunta {i+1}: índice correcto fuera de rango",
            )

    doc = {
        "year":  year,
        "month": month,
        "title": body.title.strip(),
        "questions": [q.model_dump() for q in body.questions],
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.quizzes.update_one(
        {"year": year, "month": month},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "year": year, "month": month, "count": len(body.questions)}


@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_quiz(body: SubmitRequest, token: dict = Depends(verify_token)):
    """Validates answers server-side and saves the result."""
    userId = token["userId"]
    db = get_database()

    # Prevent duplicate submissions
    existing = await db.quiz_results.find_one(
        {"userId": userId, "year": body.year, "month": body.month}
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Ya enviaste el quiz de este mes")

    quiz = await _get_quiz(db, body.year, body.month)
    questions = quiz.get("questions", [])

    if len(body.answers) != len(questions):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Se esperaban {len(questions)} respuestas")

    correct_count = sum(
        1 for i, q in enumerate(questions)
        if body.answers[i] == q["correct"]
    )
    total = len(questions)
    score = round((correct_count / total) * 100, 2) if total else 0.0

    result_doc = {
        "userId": userId,
        "year": body.year,
        "month": body.month,
        "correct": correct_count,
        "total": total,
        "score": score,
        "time": body.time,
        "submittedAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.quiz_results.insert_one(result_doc)

    feedback = [
        {
            "questionIndex": i,
            "text": q["text"],
            "options": q["options"],
            "selected": body.answers[i],
            "correct": q["correct"],
            "isCorrect": body.answers[i] == q["correct"],
        }
        for i, q in enumerate(questions)
    ]
    return {"correct": correct_count, "total": total, "score": score, "feedback": feedback}


@router.delete("/results/{userId}/{year}/{month}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_result(
    userId: str, year: int, month: int,
    token: dict = Depends(verify_token),
):
    """
    Admin-only: removes the quiz_results document for a specific user/year/month.
    Allows that employee to retake the quiz for that month.
    """
    _require_admin(token)
    db = get_database()
    res = await db.quiz_results.delete_one(
        {"userId": userId, "year": year, "month": month}
    )
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay resultado para ese empleado/mes",
        )


@router.get("/results/{year}/{month}")
async def get_results(year: int, month: int, token: dict = Depends(verify_token)):
    """
    Returns quiz results for the given month.
    Regular users only see their own result; contadora sees all.
    """
    db = get_database()
    cursor = db.quiz_results.find({"year": year, "month": month}, {"_id": 0})
    results = [doc async for doc in cursor]

    # Always attach user info (nick, emoji, name) for ranking display
    users = {str(u["_id"]): u async for u in db.users.find({}, {"nick": 1, "emoji": 1, "name": 1})}
    for r in results:
        u = users.get(r["userId"], {})
        r["nick"] = u.get("nick", r["userId"])
        r["emoji"] = u.get("emoji", "")
        r["name"] = u.get("name", "")

    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return results
