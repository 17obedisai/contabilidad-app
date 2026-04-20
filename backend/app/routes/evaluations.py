from fastapi import APIRouter, Depends, HTTPException, status
from app.db.connection import get_database
from app.db.helpers import doc_to_dict
from app.core.dependencies import verify_token

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


def _require_access(token: dict, target_userId: str):
    """User can only access their own data; contadora can access any."""
    if not token["isCont"] and token["userId"] != target_userId:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")


@router.get("/{userId}/{year}/{month}")
async def get_evaluation(
    userId: str, year: int, month: int, token: dict = Depends(verify_token)
):
    _require_access(token, userId)
    db = get_database()
    doc = await db.evaluations.find_one({"userId": userId, "year": year, "month": month})
    if not doc:
        return {"userId": userId, "year": year, "month": month,
                "self_eval": {}, "cont_eval": {}, "metrics": {}, "okrs": []}
    return doc_to_dict(doc)


@router.put("/{userId}/{year}/{month}")
async def save_evaluation(
    userId: str, year: int, month: int,
    body: dict,
    token: dict = Depends(verify_token),
):
    """
    Body puede contener: self_eval, cont_eval, metrics.
    - Cualquier usuario puede escribir self_eval en su propia evaluación.
    - Solo la contadora puede escribir cont_eval o acceder a otros usuarios.
    """
    _require_access(token, userId)

    update_fields: dict = {}

    if "self_eval" in body:
        if token["userId"] != userId:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Solo puedes enviar tu propia autoevaluación")
        update_fields["self_eval"] = body["self_eval"]

    if "cont_eval" in body or "metrics" in body or "okrs" in body:
        if not token["isCont"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Solo la contadora puede registrar evaluación de contadora")
        if "cont_eval" in body:
            update_fields["cont_eval"] = body["cont_eval"]
        if "metrics" in body:
            update_fields["metrics"] = body["metrics"]
        if "okrs" in body:
            # Clamp to max 3 objectives; normalize achievement to 0-100.
            raw = body["okrs"] if isinstance(body["okrs"], list) else []
            clean: list = []
            for item in raw[:3]:
                if not isinstance(item, dict):
                    continue
                obj = str(item.get("objective", ""))[:200]
                ach = item.get("achievement", 0)
                try:
                    ach = float(ach)
                except (TypeError, ValueError):
                    ach = 0.0
                ach = max(0.0, min(100.0, ach))
                clean.append({"objective": obj, "achievement": ach})
            update_fields["okrs"] = clean

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Nada que actualizar")

    db = get_database()
    await db.evaluations.update_one(
        {"userId": userId, "year": year, "month": month},
        {"$set": update_fields, "$setOnInsert": {"userId": userId, "year": year, "month": month}},
        upsert=True,
    )
    doc = await db.evaluations.find_one({"userId": userId, "year": year, "month": month})
    return doc_to_dict(doc)
