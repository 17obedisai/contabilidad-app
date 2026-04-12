from pydantic import BaseModel, Field
from typing import Optional
from bson import ObjectId


class UserCreate(BaseModel):
    name: str
    nick: str
    role: str
    emoji: str
    level: int = 1
    password: str
    isCont: bool = False
    noQuiz: bool = False


class UserOut(BaseModel):
    id: str
    name: str
    nick: str
    role: str
    emoji: str
    level: int
    isCont: bool
    noQuiz: bool


class UserInDB(BaseModel):
    name: str
    nick: str
    role: str
    emoji: str
    level: int
    password_hash: str
    isCont: bool
    noQuiz: bool
