from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from models import ProductInput, CategoryInput, uid, now_iso
from db import products, categories
from auth import get_current_admin
from slugify import slugify

router = APIRouter(prefix="/catalog", tags=["catalog"])


# ============ CATEGORIES ============
@router.get("/categories")
async def list_categories(active_only: bool = False):
    q = {"active": True} if active_only else {}
    docs = await categories.find(q, {"_id": 0}).sort("order", 1).to_list(500)
    return docs


@router.post("/categories")
async def create_category(inp: CategoryInput, admin=Depends(get_current_admin)):
    doc = inp.model_dump()
    doc["id"] = uid()
    doc["slug"] = slugify(inp.name)
    doc["created_at"] = now_iso()
    await categories.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/categories/{cid}")
async def update_category(cid: str, inp: CategoryInput, admin=Depends(get_current_admin)):
    upd = inp.model_dump()
    upd["slug"] = slugify(inp.name)
    upd["updated_at"] = now_iso()
    r = await categories.update_one({"id": cid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Categoria não encontrada")
    return {"ok": True}


@router.delete("/categories/{cid}")
async def delete_category(cid: str, admin=Depends(get_current_admin)):
    await categories.delete_one({"id": cid})
    return {"ok": True}


# ============ PRODUCTS ============
@router.get("/products")
async def list_products(
    q: Optional[str] = None,
    category_id: Optional[str] = None,
    kind: Optional[str] = None,
    featured: Optional[bool] = None,
    promo: Optional[bool] = None,
    is_new: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 60,
    sort: str = "recent",
    include_hidden: bool = False,
):
    filt: dict = {}
    if not include_hidden:
        filt["status"] = "active"
        filt["is_hidden"] = {"$ne": True}
    if q:
        filt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"sku": {"$regex": q, "$options": "i"}},
        ]
    if category_id:
        filt["category_id"] = category_id
    if featured is not None:
        filt["is_featured"] = featured
    if promo is not None:
        filt["is_promo"] = promo
    if is_new is not None:
        filt["is_new"] = is_new
    if min_price is not None or max_price is not None:
        pr: dict = {}
        if min_price is not None:
            pr["$gte"] = min_price
        if max_price is not None:
            pr["$lte"] = max_price
        filt["price"] = pr

    if kind:
        cat_ids = [c["id"] for c in await categories.find({"kind": kind}, {"_id": 0, "id": 1}).to_list(500)]
        filt["category_id"] = {"$in": cat_ids}

    sort_field = "created_at"
    sort_dir = -1
    if sort == "price_asc":
        sort_field, sort_dir = "price", 1
    elif sort == "price_desc":
        sort_field, sort_dir = "price", -1
    elif sort == "best_selling":
        sort_field, sort_dir = "sold_count", -1

    docs = await products.find(filt, {"_id": 0}).sort(sort_field, sort_dir).to_list(limit)
    # attach category kind
    cat_map = {c["id"]: c for c in await categories.find(
        {}, {"_id": 0, "id": 1, "name": 1, "kind": 1}
    ).limit(200).to_list(200)}
    for d in docs:
        c = cat_map.get(d.get("category_id"))
        d["category"] = {"id": c["id"], "name": c["name"], "kind": c["kind"]} if c else None
    return docs


@router.get("/products/{pid}")
async def get_product(pid: str):
    d = await products.find_one({"$or": [{"id": pid}, {"slug": pid}]}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Produto não encontrado")
    c = await categories.find_one({"id": d.get("category_id")}, {"_id": 0})
    d["category"] = c
    return d


@router.post("/products")
async def create_product(inp: ProductInput, admin=Depends(get_current_admin)):
    doc = inp.model_dump()
    doc["id"] = uid()
    doc["slug"] = slugify(inp.name) + "-" + doc["id"][:6]
    doc["sold_count"] = 0
    doc["rating"] = 0
    doc["created_at"] = now_iso()
    await products.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/products/{pid}")
async def update_product(pid: str, inp: ProductInput, admin=Depends(get_current_admin)):
    upd = inp.model_dump()
    upd["updated_at"] = now_iso()
    r = await products.update_one({"id": pid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Produto não encontrado")
    return {"ok": True}


@router.post("/products/{pid}/duplicate")
async def duplicate_product(pid: str, admin=Depends(get_current_admin)):
    d = await products.find_one({"id": pid}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Produto não encontrado")
    d["id"] = uid()
    d["slug"] = d.get("slug", "prod") + "-copy-" + d["id"][:6]
    d["name"] = d["name"] + " (Cópia)"
    d["sold_count"] = 0
    d["created_at"] = now_iso()
    await products.insert_one(d)
    return {k: v for k, v in d.items() if k != "_id"}


@router.delete("/products/{pid}")
async def delete_product(pid: str, admin=Depends(get_current_admin)):
    await products.delete_one({"id": pid})
    return {"ok": True}


@router.patch("/products/{pid}/status")
async def toggle_status(pid: str, payload: dict, admin=Depends(get_current_admin)):
    status = payload.get("status")
    if status not in ("active", "inactive", "archived", "hidden"):
        raise HTTPException(400, "Status inválido")
    await products.update_one({"id": pid}, {"$set": {"status": status}})
    return {"ok": True}
