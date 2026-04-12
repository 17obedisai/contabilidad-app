from fastapi import APIRouter, Depends
from app.db.connection import get_database
from app.db.helpers import doc_to_dict
from app.core.dependencies import verify_token

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
async def get_users(token: dict = Depends(verify_token)):
    """Returns all users (public fields only — no password_hash)."""
    db = get_database()
    cursor = db.users.find({}, {"password_hash": 0})
    return [doc_to_dict(doc) async for doc in cursor]
