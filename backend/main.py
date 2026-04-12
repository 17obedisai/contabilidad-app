from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.connection import connect_db, close_db
from app.routes import auth, evaluations, tasks, board, quiz, ranking, users
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(evaluations.router)
app.include_router(tasks.router)
app.include_router(board.router)
app.include_router(quiz.router)
app.include_router(ranking.router)
app.include_router(users.router)
