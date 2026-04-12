from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.db.connection import get_database
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
