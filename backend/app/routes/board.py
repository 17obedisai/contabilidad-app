from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
from app.db.connection import get_database
from app.db.helpers import doc_to_dict, to_id
from app.core.dependencies import verify_token
from app.schemas.board_item import BoardItemCreate

router = APIRouter(prefix="/api/board", tags=["board"])

TRACKED_FIELDS = {"status", "progress", "observations"}


def _require_ownership(token: dict, owner_userId: str):
    if not token["isCont"] and token["userId"] != owner_userId:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")


@router.get("")
async def get_all_board(token: dict = Depends(verify_token)):
    """Returns all board items (shared kanban view)."""
    db = get_database()
    cursor = db.board.find({})
    return [doc_to_dict(doc) async for doc in cursor]


@router.get("/{userId}")
async def get_board(userId: str, token: dict = Depends(verify_token)):
    _require_ownership(token, userId)
    db = get_database()
    cursor = db.board.find({"userId": userId})
    return [doc_to_dict(doc) async for doc in cursor]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_board_item(body: BoardItemCreate, token: dict = Depends(verify_token)):
    _require_ownership(token, body.userId)
    db = get_database()
    result = await db.board.insert_one(body.model_dump())
    doc = await db.board.find_one({"_id": result.inserted_id})
    return doc_to_dict(doc)


@router.put("/{itemId}")
async def update_board_item(itemId: str, body: dict, token: dict = Depends(verify_token)):
    db = get_database()
    doc = await db.board.find_one({"_id": to_id(itemId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado")
    _require_ownership(token, doc["userId"])

    now = datetime.now(timezone.utc).isoformat()
    update_fields: dict = {}
    new_changes: list = list(doc.get("changes", []))
    new_obs_history: list = list(doc.get("obsHistory", []))

    for field in TRACKED_FIELDS:
        if field not in body:
            continue
        old_val = doc.get(field)
        new_val = body[field]
        if old_val == new_val:
            continue
        update_fields[field] = new_val
        new_changes.append({
            "field": field,
            "old_value": str(old_val),
            "new_value": str(new_val),
            "date": now,
        })
        if field == "observations" and new_val:
            new_obs_history.append({"text": new_val, "date": now})

    # Allow updating other non-tracked fields (title, desc, priority, date)
    for field in {"title", "desc", "priority", "date"}:
        if field in body:
            update_fields[field] = body[field]

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nada que actualizar")

    update_fields["changes"] = new_changes
    update_fields["obsHistory"] = new_obs_history

    await db.board.update_one({"_id": to_id(itemId)}, {"$set": update_fields})
    updated = await db.board.find_one({"_id": to_id(itemId)})
    return doc_to_dict(updated)


@router.delete("/{itemId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board_item(itemId: str, token: dict = Depends(verify_token)):
    db = get_database()
    doc = await db.board.find_one({"_id": to_id(itemId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado")
    _require_ownership(token, doc["userId"])
    await db.board.delete_one({"_id": to_id(itemId)})
