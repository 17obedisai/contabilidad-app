from bson import ObjectId
from fastapi import HTTPException, status


def to_id(raw_id: str) -> ObjectId:
    try:
        return ObjectId(raw_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID inválido")


def doc_to_dict(doc: dict) -> dict:
    """Convert MongoDB document: _id ObjectId → id str."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
