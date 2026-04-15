"""
Diagnostic and fix script for the Fabián/Nelson duplicate.

Usage:
  python scripts/fix_users.py           # Show diagnostic only
  python scripts/fix_users.py --fix     # Keep fabian, migrate nelson's data → fabian, delete nelson

Run from /backend directory:
  python scripts/fix_users.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.core.config import settings


async def main(do_fix: bool = False):
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    fabian = await db.users.find_one({"nick": "fabian"})
    nelson = await db.users.find_one({"nick": "nelson"})

    if not fabian:
        print("❌  No se encontró usuario 'fabian' en la BD.")
        client.close()
        return
    if not nelson:
        print("❌  No se encontró usuario 'nelson' en la BD.")
        client.close()
        return

    fid = str(fabian["_id"])
    nid = str(nelson["_id"])

    # Collect stats for both users
    async def stats(uid):
        return {
            "tasks":  await db.tasks.count_documents({"userId": uid}),
            "board":  await db.board.count_documents({"userId": uid}),
            "evals":  await db.evaluations.count_documents({"userId": uid}),
        }

    fs = await stats(fid)
    ns = await stats(nid)

    print("\n─────────────────────────────────────────")
    print("  DIAGNÓSTICO DUPLICADO FABIÁN / NELSON")
    print("─────────────────────────────────────────")
    print(f"\n  FABIÁN  │ id: {fid}")
    print(f"  Nombre  : {fabian.get('name')}  │  Rol: {fabian.get('role')}")
    print(f"  Tareas: {fs['tasks']}  │  Board: {fs['board']}  │  Evaluaciones: {fs['evals']}")

    print(f"\n  NELSON  │ id: {nid}")
    print(f"  Nombre  : {nelson.get('name')}  │  Rol: {nelson.get('role')}")
    print(f"  Tareas: {ns['tasks']}  │  Board: {ns['board']}  │  Evaluaciones: {ns['evals']}")
    print()

    if not do_fix:
        print("  👆  Para fusionar: ejecuta con --fix")
        print("      Efecto: Nelson's datos → Fabián, Nelson eliminado.")
        print()
        client.close()
        return

    # ── FIX: migrate nelson → fabian ─────────────────────────────────────────
    print("  🔧  Aplicando fix…")

    # Migrate tasks
    r = await db.tasks.update_many({"userId": nid}, {"$set": {"userId": fid}})
    print(f"  ✅  Tareas migradas: {r.modified_count}")

    # Migrate board items
    r = await db.board.update_many({"userId": nid}, {"$set": {"userId": fid}})
    print(f"  ✅  Board items migrados: {r.modified_count}")

    # Migrate evaluations
    r = await db.evaluations.update_many({"userId": nid}, {"$set": {"userId": fid}})
    print(f"  ✅  Evaluaciones migradas: {r.modified_count}")

    # Delete nelson user
    await db.users.delete_one({"_id": ObjectId(nid)})
    print(f"  🗑️   Usuario 'nelson' (id: {nid}) eliminado.")
    print()
    print("  ✔   Listo. Actualiza team.js y el seed para reflejar el cambio.")
    print()

    client.close()


if __name__ == "__main__":
    do_fix = "--fix" in sys.argv
    asyncio.run(main(do_fix))
