import re
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.db.connection import get_database
from app.db.helpers import doc_to_dict, to_id
from app.core.dependencies import verify_token

router = APIRouter(prefix="/api/reminders", tags=["reminders"])

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# Accept #RGB / #RRGGBB hex colors (case-insensitive). Optional field.
_COLOR_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class ReminderCreate(BaseModel):
    date: str           # "YYYY-MM-DD"
    text: str
    color: Optional[str] = None   # e.g. "#7A9D7E"
    # When true, this is a corporate/global reminder visible to everyone.
    # Only admins (isCont) may create global reminders — enforced in the route.
    isGlobal: Optional[bool] = False

    @field_validator("date")
    @classmethod
    def _check_date(cls, v: str) -> str:
        if not v or not _DATE_RE.match(v):
            raise ValueError("date debe ser YYYY-MM-DD")
        return v

    @field_validator("text")
    @classmethod
    def _check_text(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("text es requerido")
        if len(v) > 280:
            raise ValueError("text máximo 280 caracteres")
        return v

    @field_validator("color")
    @classmethod
    def _check_color(cls, v):
        if v is None or v == "":
            return None
        if not _COLOR_RE.match(v):
            raise ValueError("color debe ser hex (#RGB o #RRGGBB)")
        return v


class ReminderUpdate(BaseModel):
    text: Optional[str] = None
    color: Optional[str] = None

    @field_validator("text")
    @classmethod
    def _check_text(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("text no puede estar vacío")
        if len(v) > 280:
            raise ValueError("text máximo 280 caracteres")
        return v

    @field_validator("color")
    @classmethod
    def _check_color(cls, v):
        if v is None or v == "":
            return None
        if not _COLOR_RE.match(v):
            raise ValueError("color debe ser hex (#RGB o #RRGGBB)")
        return v


def _owner_or_admin(token: dict, owner_userId: str):
    if not token.get("isCont") and token["userId"] != owner_userId:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")


@router.get("")
async def list_reminders(
    userId: Optional[str] = None,
    token: dict = Depends(verify_token),
):
    """
    Lists reminders.
    - Regular user: their own reminders + all global (corporate) reminders.
    - Admin: if `userId` is provided, returns that user's reminders + globals
      (so the admin sees the same view the employee would). Without `userId`,
      returns every reminder in the system (corporate panel).
    """
    db = get_database()
    if not token.get("isCont"):
        # Employee: own personal reminders OR any global reminder.
        query = {"$or": [{"userId": token["userId"]}, {"isGlobal": True}]}
    else:
        if userId:
            # Admin inspecting a specific user: show their personal + globals.
            query = {"$or": [{"userId": userId}, {"isGlobal": True}]}
        else:
            # Admin corporate view: everything.
            query = {}
    cursor = db.reminders.find(query).sort("date", 1)
    return [doc_to_dict(doc) async for doc in cursor]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_reminder(body: ReminderCreate, token: dict = Depends(verify_token)):
    """Creates a reminder for the authenticated user.

    If `isGlobal=true` is requested by a non-admin the flag is ignored (stored
    as False) — only the Contadora can broadcast corporate reminders.
    """
    is_global = bool(body.isGlobal) and bool(token.get("isCont"))
    db = get_database()
    doc = {
        "userId":    token["userId"],
        "date":      body.date,
        "text":      body.text,
        "color":     body.color,
        "isGlobal":  is_global,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.reminders.insert_one(doc)
    created = await db.reminders.find_one({"_id": res.inserted_id})
    return doc_to_dict(created)


@router.put("/{reminderId}")
async def update_reminder(reminderId: str, body: ReminderUpdate, token: dict = Depends(verify_token)):
    db = get_database()
    doc = await db.reminders.find_one({"_id": to_id(reminderId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recordatorio no encontrado")
    # Global reminders can only be modified by the Contadora, regardless of ownership.
    if doc.get("isGlobal") and not token.get("isCont"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo la Contadora puede modificar recordatorios corporativos")
    _owner_or_admin(token, doc["userId"])

    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nada que actualizar")

    await db.reminders.update_one({"_id": to_id(reminderId)}, {"$set": patch})
    updated = await db.reminders.find_one({"_id": to_id(reminderId)})
    return doc_to_dict(updated)


@router.delete("/{reminderId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(reminderId: str, token: dict = Depends(verify_token)):
    db = get_database()
    doc = await db.reminders.find_one({"_id": to_id(reminderId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recordatorio no encontrado")
    # Global reminders can only be deleted by the Contadora, regardless of ownership.
    if doc.get("isGlobal") and not token.get("isCont"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo la Contadora puede eliminar recordatorios corporativos")
    _owner_or_admin(token, doc["userId"])
    await db.reminders.delete_one({"_id": to_id(reminderId)})
