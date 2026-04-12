from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
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
