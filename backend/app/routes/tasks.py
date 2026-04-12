from fastapi import APIRouter, Depends, HTTPException, status
from app.db.connection import get_database
from app.db.helpers import doc_to_dict, to_id
from app.core.dependencies import verify_token
from app.schemas.task import TaskCreate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _require_ownership(token: dict, owner_userId: str):
    if not token["isCont"] and token["userId"] != owner_userId:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")


@router.get("/{userId}")
async def get_tasks(userId: str, token: dict = Depends(verify_token)):
    _require_ownership(token, userId)
    db = get_database()
    cursor = db.tasks.find({"userId": userId})
    return [doc_to_dict(doc) async for doc in cursor]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_task(body: TaskCreate, token: dict = Depends(verify_token)):
    _require_ownership(token, body.userId)
    db = get_database()
    result = await db.tasks.insert_one(body.model_dump())
    doc = await db.tasks.find_one({"_id": result.inserted_id})
    return doc_to_dict(doc)


@router.put("/{taskId}")
async def update_task(taskId: str, body: dict, token: dict = Depends(verify_token)):
    db = get_database()
    doc = await db.tasks.find_one({"_id": to_id(taskId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    _require_ownership(token, doc["userId"])

    allowed = {"hoursActual", "hoursEstimated", "type", "freq", "title"}
    update_fields = {k: v for k, v in body.items() if k in allowed}
    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nada que actualizar")

    await db.tasks.update_one({"_id": to_id(taskId)}, {"$set": update_fields})
    updated = await db.tasks.find_one({"_id": to_id(taskId)})
    return doc_to_dict(updated)


@router.delete("/{taskId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(taskId: str, token: dict = Depends(verify_token)):
    db = get_database()
    doc = await db.tasks.find_one({"_id": to_id(taskId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    _require_ownership(token, doc["userId"])
    await db.tasks.delete_one({"_id": to_id(taskId)})
