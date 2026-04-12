from fastapi import APIRouter, Depends
from app.db.connection import get_database
from app.core.dependencies import verify_token

router = APIRouter(prefix="/api/ranking", tags=["ranking"])

# ── Weighting (must sum to 1.0) ───────────────────────────────────────────────
WEIGHTS = {
    "quiz":      0.30,   # average monthly quiz score (0-100)
    "self_eval": 0.20,   # average of self_eval numeric values (0-100)
    "cont_eval": 0.30,   # average of cont_eval numeric values (0-100)
    "tasks":     0.20,   # task completion ratio hoursActual/hoursEstimated capped at 100
}


def _average_dict(d: dict) -> float:
    """Average numeric values in a dict. Returns 0 if empty."""
    nums = [v for v in d.values() if isinstance(v, (int, float))]
    return sum(nums) / len(nums) if nums else 0.0


def _task_score(tasks: list) -> float:
    """Completion ratio capped at 100."""
    estimated = sum(t.get("hoursEstimated", 0) for t in tasks)
    actual = sum(t.get("hoursActual", 0) for t in tasks)
    if estimated == 0:
        return 100.0
    return min(actual / estimated * 100, 100.0)


@router.get("/{year}")
async def get_ranking(year: int, token: dict = Depends(verify_token)):
    db = get_database()

    # Load all users
    users = {str(u["_id"]): u async for u in db.users.find({})}

    # Quiz scores grouped by userId
    quiz_scores: dict[str, list] = {}
    async for r in db.quiz_results.find({"year": year}):
        quiz_scores.setdefault(r["userId"], []).append(r["score"])

    # Evaluations grouped by userId
    eval_self: dict[str, list] = {}
    eval_cont: dict[str, list] = {}
    async for e in db.evaluations.find({"year": year}):
        uid = e["userId"]
        if e.get("self_eval"):
            eval_self.setdefault(uid, []).append(_average_dict(e["self_eval"]))
        if e.get("cont_eval"):
            eval_cont.setdefault(uid, []).append(_average_dict(e["cont_eval"]))

    # Tasks grouped by userId
    user_tasks: dict[str, list] = {}
    async for t in db.tasks.find({"userId": {"$in": list(users.keys())}}):
        user_tasks.setdefault(t["userId"], []).append(t)

    ranking = []
    for uid, user in users.items():
        quiz_avg   = sum(quiz_scores.get(uid, [0])) / max(len(quiz_scores.get(uid, [0])), 1)
        self_avg   = sum(eval_self.get(uid, [0]))   / max(len(eval_self.get(uid, [0])), 1)
        cont_avg   = sum(eval_cont.get(uid, [0]))   / max(len(eval_cont.get(uid, [0])), 1)
        task_score = _task_score(user_tasks.get(uid, []))

        final_score = round(
            quiz_avg   * WEIGHTS["quiz"]      +
            self_avg   * WEIGHTS["self_eval"] +
            cont_avg   * WEIGHTS["cont_eval"] +
            task_score * WEIGHTS["tasks"],
            2,
        )

        entry = {
            "userId": uid,
            "nick": user["nick"],
            "name": user["name"],
            "emoji": user["emoji"],
            "level": user["level"],
            "scores": {
                "quiz":      round(quiz_avg, 2),
                "self_eval": round(self_avg, 2),
                "cont_eval": round(cont_avg, 2),
                "tasks":     round(task_score, 2),
            },
            "final": final_score,
        }

        ranking.append(entry)

    ranking.sort(key=lambda x: x["final"], reverse=True)
    for i, entry in enumerate(ranking, 1):
        entry["position"] = i

    return {"year": year, "weights": WEIGHTS, "ranking": ranking}
