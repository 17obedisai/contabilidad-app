from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId
from app.db.connection import get_database
from app.db.helpers import doc_to_dict
from app.core.security import verify_password, hash_password, create_access_token
from app.core.dependencies import verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/profiles")
async def get_profiles():
    """
    Public endpoint: returns minimal public profile info for the login screen.
    Never returns password hashes or any sensitive field.
    """
    db = get_database()
    cursor = db.users.find(
        {},
        {"password_hash": 0},
    )
    items = []
    async for doc in cursor:
        d = doc_to_dict(doc)
        items.append({
            "id":     d.get("id"),
            "nick":   d.get("nick"),
            "name":   d.get("name"),
            "role":   d.get("role"),
            "emoji":  d.get("emoji", "👤"),
            "level":  d.get("level", 3),
            "isCont": bool(d.get("isCont", False)),
            "noQuiz": bool(d.get("noQuiz", False)),
        })
    # Sort by level then name for a stable, hierarchical display
    items.sort(key=lambda u: (u.get("level", 99), u.get("name", "")))
    return items


class LoginRequest(BaseModel):
    nick: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    db = get_database()
    user = await db.users.find_one({"nick": body.nick})

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nick o contraseña incorrectos",
        )

    token = create_access_token({
        "userId": str(user["_id"]),
        "nick": user["nick"],
        "isCont": user["isCont"],
    })

    return LoginResponse(access_token=token)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.put("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    token: dict = Depends(verify_token),
):
    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La nueva contraseña debe tener al menos 6 caracteres",
        )

    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(token["userId"])})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta",
        )

    new_hash = hash_password(body.new_password)
    await db.users.update_one({"_id": ObjectId(token["userId"])}, {"$set": {"password_hash": new_hash}})
