from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from models import CouponInput, PromotionInput, BannerInput, uid, now_iso
from db import coupons, promotions, banners
from auth import get_current_admin

router = APIRouter(prefix="/marketing", tags=["marketing"])


# ============ COUPONS ============
@router.get("/coupons")
async def list_coupons(admin=Depends(get_current_admin)):
    return await coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/coupons/validate")
async def validate_coupon(payload: dict):
    code = (payload.get("code") or "").upper()
    coup = await coupons.find_one({"code": code, "active": True}, {"_id": 0})
    if not coup:
        raise HTTPException(404, "Cupom inválido")
    return coup


@router.post("/coupons")
async def create_coupon(inp: CouponInput, admin=Depends(get_current_admin)):
    if await coupons.find_one({"code": inp.code.upper()}):
        raise HTTPException(409, "Código já existente")
    doc = inp.model_dump()
    doc["code"] = doc["code"].upper()
    doc["id"] = uid()
    doc["used_count"] = 0
    doc["created_at"] = now_iso()
    await coupons.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/coupons/{cid}")
async def update_coupon(cid: str, inp: CouponInput, admin=Depends(get_current_admin)):
    upd = inp.model_dump()
    upd["code"] = upd["code"].upper()
    await coupons.update_one({"id": cid}, {"$set": upd})
    return {"ok": True}


@router.delete("/coupons/{cid}")
async def delete_coupon(cid: str, admin=Depends(get_current_admin)):
    await coupons.delete_one({"id": cid})
    return {"ok": True}


# ============ PROMOTIONS ============
@router.get("/promotions")
async def list_promotions(active_only: bool = False):
    q = {"active": True} if active_only else {}
    docs = await promotions.find(q, {"_id": 0}).sort("start_at", -1).to_list(200)
    return docs


@router.post("/promotions")
async def create_promotion(inp: PromotionInput, admin=Depends(get_current_admin)):
    doc = inp.model_dump()
    doc["id"] = uid()
    doc["created_at"] = now_iso()
    await promotions.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/promotions/{pid}")
async def update_promotion(pid: str, inp: PromotionInput, admin=Depends(get_current_admin)):
    await promotions.update_one({"id": pid}, {"$set": inp.model_dump()})
    return {"ok": True}


@router.delete("/promotions/{pid}")
async def delete_promotion(pid: str, admin=Depends(get_current_admin)):
    await promotions.delete_one({"id": pid})
    return {"ok": True}


# ============ BANNERS ============
@router.get("/banners")
async def list_banners(active_only: bool = False, type_: Optional[str] = None):
    q: dict = {}
    if active_only:
        q["active"] = True
    if type_:
        q["type"] = type_
    docs = await banners.find(q, {"_id": 0}).sort("order", 1).to_list(200)
    return docs


@router.post("/banners")
async def create_banner(inp: BannerInput, admin=Depends(get_current_admin)):
    doc = inp.model_dump()
    doc["id"] = uid()
    doc["created_at"] = now_iso()
    await banners.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/banners/{bid}")
async def update_banner(bid: str, inp: BannerInput, admin=Depends(get_current_admin)):
    await banners.update_one({"id": bid}, {"$set": inp.model_dump()})
    return {"ok": True}


@router.delete("/banners/{bid}")
async def delete_banner(bid: str, admin=Depends(get_current_admin)):
    await banners.delete_one({"id": bid})
    return {"ok": True}
