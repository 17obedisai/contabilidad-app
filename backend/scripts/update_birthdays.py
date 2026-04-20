"""
One-shot script to backfill `birthday` on existing users.

Run from /backend:
  python scripts/update_birthdays.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


# nick → YYYY-MM-DD (year is filler; month/day is what matters for the calendar)
BIRTHDAYS = {
    "sazu":     "2000-02-01",
    "nevis":    "2000-02-24",
    "yennifer": "2000-04-02",
    "juan":     "2000-06-26",
    "nelson":   "2000-07-03",
    "obed":     "2000-09-15",
    "sandra":   "2000-11-02",
    "jair":     "2000-11-13",
    "karen":    "2000-11-19",
}


async def main():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    print("\n──────────────────────────────────────")
    print("  BACKFILL: birthdays on users")
    print("──────────────────────────────────────")

    updated, missing = 0, []
    for nick, bday in BIRTHDAYS.items():
        res = await db.users.update_one(
            {"nick": nick},
            {"$set": {"birthday": bday}},
        )
        if res.matched_count == 0:
            missing.append(nick)
            print(f"  ⚠️   {nick:<10} → no encontrado")
        else:
            updated += 1
            print(f"  ✅  {nick:<10} → {bday}")

    print("\n  Resumen:")
    print(f"   actualizados : {updated}")
    print(f"   no encontrados: {len(missing)} {missing if missing else ''}")

    # Verify
    print("\n  Verificación (lectura desde DB):")
    cursor = db.users.find(
        {"nick": {"$in": list(BIRTHDAYS.keys())}},
        {"nick": 1, "birthday": 1, "_id": 0},
    ).sort("nick", 1)
    async for u in cursor:
        print(f"   {u.get('nick','?'):<10} birthday={u.get('birthday','<none>')}")

    client.close()
    print()


if __name__ == "__main__":
    asyncio.run(main())
