from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from models import UserUpdate, ChangePasswordInput, uid, now_iso
from db import users, notifications, favorites, products
from auth import get_current_user, get_current_admin
from utils.security import hash_password, verify_password, sanitize_phone

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/notifications")
async def my_notifications(user=Depends(get_current_user)):
    docs = await notifications.find({"$or": [{"user_id": user["id"]}, {"user_id": None}]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@router.post("/me/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"ok": True}


@router.delete("/me/notifications/{nid}")
async def delete_notif(nid: str, user=Depends(get_current_user)):
    await notifications.delete_one({"id": nid})
    return {"ok": True}


@router.put("/me")
async def update_me(inp: UserUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in inp.model_dump().items() if v is not None}
    if "phone" in upd:
        upd["phone"] = sanitize_phone(upd["phone"])
    if upd:
        upd["updated_at"] = now_iso()
        await users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return fresh


@router.post("/me/change-password")
async def change_password(inp: ChangePasswordInput, user=Depends(get_current_user)):
    full = await users.find_one({"id": user["id"]})
    if not verify_password(inp.current_password, full["password"]):
        raise HTTPException(400, "Senha atual incorreta")
    await users.update_one({"id": user["id"]}, {"$set": {"password": hash_password(inp.new_password)}})
    return {"ok": True}


@router.get("/me/favorites")
async def list_favorites(user=Depends(get_current_user)):
    favs = await favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [f["product_id"] for f in favs]
    prods = await products.find({"id": {"$in": ids}}, {"_id": 0}).to_list(len(ids))
    return prods


@router.post("/me/favorites/{pid}")
async def add_favorite(pid: str, user=Depends(get_current_user)):
    if not await favorites.find_one({"user_id": user["id"], "product_id": pid}):
        await favorites.insert_one({"id": uid(), "user_id": user["id"], "product_id": pid, "created_at": now_iso()})
    return {"ok": True}


@router.delete("/me/favorites/{pid}")
async def remove_favorite(pid: str, user=Depends(get_current_user)):
    await favorites.delete_one({"user_id": user["id"], "product_id": pid})
    return {"ok": True}


# ============ ADMIN: manage users ============
admin_router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@admin_router.get("")
async def admin_list_users(q: Optional[str] = None, status: Optional[str] = None, admin=Depends(get_current_admin)):
    filt: dict = {}
    if status:
        filt["status"] = status
    if q:
        filt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"cpf": {"$regex": q}},
            {"phone": {"$regex": q}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    docs = await users.find(filt, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(500)
    return docs


@admin_router.patch("/{uid_}/status")
async def admin_toggle_status(uid_: str, payload: dict, admin=Depends(get_current_admin)):
    s = payload.get("status")
    if s not in ("active", "blocked"):
        raise HTTPException(400, "Status inválido")
    await users.update_one({"id": uid_}, {"$set": {"status": s}})
    return {"ok": True}


@admin_router.post("/{uid_}/reset-password")
async def admin_reset(uid_: str, payload: dict, admin=Depends(get_current_admin)):
    new_pw = payload.get("password")
    if not new_pw or len(new_pw) < 8:
        raise HTTPException(400, "Senha fraca")
    await users.update_one({"id": uid_}, {"$set": {"password": hash_password(new_pw)}})
    return {"ok": True}


@admin_router.delete("/{uid_}")
async def admin_delete(uid_: str, admin=Depends(get_current_admin)):
    await users.delete_one({"id": uid_})
    return {"ok": True}
