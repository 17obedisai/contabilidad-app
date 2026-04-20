import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from typing import Optional
from bson import ObjectId
from app.db.connection import get_database
from app.db.helpers import doc_to_dict, to_id
from app.core.security import hash_password
from app.core.dependencies import verify_token

router = APIRouter(prefix="/api/users", tags=["users"])

# YYYY-MM-DD strict format
_BDAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _require_admin(token: dict):
    if not token.get("isCont"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo la contadora puede gestionar usuarios")


class UserCreate(BaseModel):
    nick: str
    name: str
    role: str
    birthday: str  # required — "YYYY-MM-DD"
    emoji: str = "👤"
    level: int = 3
    password: str = "coocentral25"
    isCont: bool = False
    noQuiz: bool = False

    @field_validator("birthday")
    @classmethod
    def _check_birthday(cls, v: str) -> str:
        if not v or not _BDAY_RE.match(v):
            raise ValueError("birthday debe ser YYYY-MM-DD")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    emoji: Optional[str] = None
    level: Optional[int] = None
    noQuiz: Optional[bool] = None
    birthday: Optional[str] = None  # optional on update — preserves existing value if omitted

    @field_validator("birthday")
    @classmethod
    def _check_birthday(cls, v):
        if v is None:
            return v
        if not _BDAY_RE.match(v):
            raise ValueError("birthday debe ser YYYY-MM-DD")
        return v


class PasswordReset(BaseModel):
    new_password: str


@router.get("")
async def get_users(token: dict = Depends(verify_token)):
    """Returns all users (public fields only — no password_hash)."""
    db = get_database()
    cursor = db.users.find({}, {"password_hash": 0})
    return [doc_to_dict(doc) async for doc in cursor]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, token: dict = Depends(verify_token)):
    _require_admin(token)
    db = get_database()

    existing = await db.users.find_one({"nick": body.nick})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El nick '{body.nick}' ya está en uso",
        )

    doc = {
        "nick":          body.nick.lower().strip(),
        "name":          body.name.strip(),
        "role":          body.role.strip(),
        "birthday":      body.birthday,
        "emoji":         body.emoji,
        "level":         body.level,
        "isCont":        body.isCont,
        "noQuiz":        body.noQuiz,
        "password_hash": hash_password(body.password),
    }
    result = await db.users.insert_one(doc)
    created = await db.users.find_one({"_id": result.inserted_id}, {"password_hash": 0})
    return doc_to_dict(created)


@router.put("/{userId}")
async def update_user(userId: str, body: UserUpdate, token: dict = Depends(verify_token)):
    _require_admin(token)
    db = get_database()

    doc = await db.users.find_one({"_id": to_id(userId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nada que actualizar")

    await db.users.update_one({"_id": to_id(userId)}, {"$set": patch})
    updated = await db.users.find_one({"_id": to_id(userId)}, {"password_hash": 0})
    return doc_to_dict(updated)


@router.put("/{userId}/password", status_code=status.HTTP_204_NO_CONTENT)
async def admin_reset_password(userId: str, body: PasswordReset, token: dict = Depends(verify_token)):
    """Admin-only: sets a new password directly for any user (no current-password required)."""
    _require_admin(token)

    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 6 caracteres",
        )

    db = get_database()
    doc = await db.users.find_one({"_id": to_id(userId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    new_hash = hash_password(body.new_password)
    await db.users.update_one({"_id": to_id(userId)}, {"$set": {"password_hash": new_hash}})


@router.delete("/{userId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(userId: str, token: dict = Depends(verify_token)):
    _require_admin(token)

    # Prevent self-deletion
    if token["userId"] == userId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes eliminarte a ti mismo")

    db = get_database()
    doc = await db.users.find_one({"_id": to_id(userId)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    # Prevent deleting other contadora
    if doc.get("isCont"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede eliminar a la contadora")

    await db.users.delete_one({"_id": to_id(userId)})
