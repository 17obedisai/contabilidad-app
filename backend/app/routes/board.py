from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone, date, timedelta
from typing import List, Optional
from pydantic import BaseModel
from app.db.connection import get_database
from app.db.helpers import doc_to_dict, to_id
from app.core.dependencies import verify_token
from app.schemas.board_item import BoardItemCreate


class ReorderItem(BaseModel):
    id: str
    position: int


class ReorderPayload(BaseModel):
    items: List[ReorderItem]

router = APIRouter(prefix="/api/board", tags=["board"])

TRACKED_FIELDS = {"status", "progress", "observations"}

# Priority → brand-friendly color for the auto-generated reminder chip.
_PRIORITY_COLORS = {"alta": "#e74c3c", "media": "#e67e22", "baja": "#27ae60"}


def _deadline_minus_one(deadline_str: Optional[str]) -> Optional[str]:
    """Returns (deadline - 1 day) as YYYY-MM-DD, or None if input is invalid."""
    if not deadline_str:
        return None
    try:
        d = date.fromisoformat(str(deadline_str)[:10])
    except ValueError:
        return None
    return (d - timedelta(days=1)).isoformat()


async def _sync_auto_reminder(db, board_id, title: str, priority: str,
                              user_id: str, deadline: Optional[str]):
    """Upsert the auto-reminder (1 day before deadline) tied to a board item.

    - If deadline is None/empty: remove any existing auto-reminder.
    - Else: upsert a reminder on (deadline - 1) with a "Vence mañana: <title>" text.
    Tagged via `sourceBoardId` so the pairing is stable across updates.
    """
    remind_date = _deadline_minus_one(deadline)
    # Always remove the previous auto-reminder for this board item first —
    # this keeps things idempotent and avoids duplicates when the date shifts.
    await db.reminders.delete_many({"sourceBoardId": str(board_id)})
    if not remind_date:
        return
    color = _PRIORITY_COLORS.get((priority or "").lower())
    await db.reminders.insert_one({
        "userId":        user_id,
        "date":          remind_date,
        "text":          f"Vence mañana: {title}",
        "color":         color,
        "isGlobal":      False,
        "sourceBoardId": str(board_id),
        "createdAt":     datetime.now(timezone.utc).isoformat(),
    })


def _require_ownership(token: dict, owner_userId: str):
    if not token["isCont"] and token["userId"] != owner_userId:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")


@router.get("")
async def get_all_board(token: dict = Depends(verify_token)):
    """Returns all board items — admin only. Employees must use /api/board/{userId}."""
    if not token.get("isCont"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    db = get_database()
    cursor = db.board.find({})
    return [doc_to_dict(doc) async for doc in cursor]


@router.put("/reorder")
async def reorder_board_items(payload: ReorderPayload, token: dict = Depends(verify_token)):
    """Bulk-update `position` on a set of board items.

    Caller must own every item (or be the admin/contadora). We validate all
    ownership in one pass before any writes to avoid partial updates.
    """
    if not payload.items:
        return {"updated": 0}
    db = get_database()
    oids = [to_id(it.id) for it in payload.items]
    cursor = db.board.find({"_id": {"$in": oids}}, {"userId": 1})
    owners = {str(doc["_id"]): doc["userId"] async for doc in cursor}
    if len(owners) != len(payload.items):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ítem(s) no encontrado(s)")
    if not token.get("isCont"):
        for it in payload.items:
            if owners.get(it.id) != token["userId"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    # One update per item — small N (cards per column), simpler than bulkWrite.
    for it in payload.items:
        await db.board.update_one({"_id": to_id(it.id)}, {"$set": {"position": it.position}})
    return {"updated": len(payload.items)}


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
    # Auto-generate a 1-day-before reminder if the task has a deadline.
    await _sync_auto_reminder(
        db,
        board_id=result.inserted_id,
        title=body.title,
        priority=body.priority,
        user_id=body.userId,
        deadline=body.deadline,
    )
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

    # Allow updating other non-tracked fields (title, desc, priority, date, deadline)
    for field in {"title", "desc", "priority", "date", "deadline"}:
        if field in body:
            update_fields[field] = body[field]

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nada que actualizar")

    update_fields["changes"] = new_changes
    update_fields["obsHistory"] = new_obs_history

    await db.board.update_one({"_id": to_id(itemId)}, {"$set": update_fields})
    updated = await db.board.find_one({"_id": to_id(itemId)})

    # Keep the auto-reminder in sync when deadline/title/priority changed.
    if any(k in update_fields for k in ("deadline", "title", "priority")):
        await _sync_auto_reminder(
            db,
            board_id=to_id(itemId),
            title=updated.get("title", ""),
            priority=updated.get("priority", ""),
            user_id=updated.get("userId", ""),
            deadline=updated.get("deadline"),
        )

    return doc_to_dict(updated)


@router.delete("/{itemId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board_item(itemId: str, token: dict = Depends(verify_token)):
    db = get_database()
    doc = await db.board.find_one({"_id": to_id(itemId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado")
    _require_ownership(token, doc["userId"])
    await db.board.delete_one({"_id": to_id(itemId)})
    # Clean up the paired auto-reminder so it doesn't linger in the calendar.
    await db.reminders.delete_many({"sourceBoardId": str(to_id(itemId))})
