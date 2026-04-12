from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None


def get_database():
    return client[settings.DB_NAME]


async def connect_db():
    global client
    client = AsyncIOMotorClient(settings.MONGO_URL)


async def close_db():
    global client
    if client:
        client.close()
