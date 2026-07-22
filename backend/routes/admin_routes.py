from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timedelta, timezone
from models import TicketInput, TicketReplyInput, SettingsInput, uid, now_iso
from db import tickets, orders, users, products, settings, logs, audit_logs, notifications, admins
from auth import get_current_user, get_current_admin

router = APIRouter(tags=["admin"])


# ============ DASHBOARD ============
@router.get("/admin/dashboard")
async def dashboard(admin=Depends(get_current_admin)):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = today - timedelta(days=7)
    month = today - timedelta(days=30)
    year = today - timedelta(days=365)

    total_users = await users.count_documents({})
    active_users = await users.count_documents({"status": "active"})

    async def sum_paid(since):
        pipeline = [
            {"$match": {"status": {"$in": ["paid", "completed"]}, "created_at": {"$gte": since.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
        ]
        res = await orders.aggregate(pipeline).to_list(1)
        return res[0] if res else {"total": 0, "count": 0}

    r_day = await sum_paid(today)
    r_week = await sum_paid(week)
    r_month = await sum_paid(month)
    r_year = await sum_paid(year)

    orders_today = await orders.count_documents({"created_at": {"$gte": today.isoformat()}})
    orders_month = await orders.count_documents({"created_at": {"$gte": month.isoformat()}})
    paid_orders = await orders.count_documents({"status": {"$in": ["paid", "completed"]}})
    pending_orders = await orders.count_documents({"status": "pending"})

    # sold count
    pipeline = [{"$match": {"status": {"$in": ["paid", "completed"]}}}, {"$unwind": "$items"},
                {"$group": {"_id": None, "sold": {"$sum": "$items.quantity"}}}]
    sold_res = await orders.aggregate(pipeline).to_list(1)
    products_sold = sold_res[0]["sold"] if sold_res else 0

    # last orders and users
    last_orders = await orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    last_users = await users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(10)

    # revenue chart last 14 days
    chart = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        nxt = day + timedelta(days=1)
        pipeline = [
            {"$match": {"status": {"$in": ["paid", "completed"]}, "created_at": {"$gte": day.isoformat(), "$lt": nxt.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
        ]
        r = await orders.aggregate(pipeline).to_list(1)
        chart.append({
            "date": day.strftime("%d/%m"),
            "revenue": (r[0]["total"] if r else 0),
            "orders": (r[0]["count"] if r else 0),
        })

    ticket_avg = 0.0
    if r_month["count"]:
        ticket_avg = r_month["total"] / r_month["count"]

    return {
        "total_users": total_users,
        "active_users": active_users,
        "orders_today": orders_today,
        "orders_month": orders_month,
        "paid_orders": paid_orders,
        "pending_orders": pending_orders,
        "products_sold": products_sold,
        "revenue": {"day": r_day["total"], "week": r_week["total"], "month": r_month["total"], "year": r_year["total"]},
        "ticket_avg": round(ticket_avg, 2),
        "chart": chart,
        "last_orders": last_orders,
        "last_users": last_users,
    }


# ============ ORDERS ADMIN ============
@router.get("/admin/orders")
async def admin_orders(q: Optional[str] = None, status: Optional[str] = None, admin=Depends(get_current_admin)):
    filt: dict = {}
    if status:
        filt["status"] = status
    if q:
        filt["$or"] = [
            {"id": {"$regex": q}},
            {"user_snapshot.name": {"$regex": q, "$options": "i"}},
            {"user_snapshot.cpf": {"$regex": q}},
        ]
    return await orders.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.patch("/admin/orders/{oid}/status")
async def admin_update_status(oid: str, payload: dict, admin=Depends(get_current_admin)):
    st = payload.get("status")
    if st not in ("pending", "paid", "processing", "completed", "cancelled", "refunded"):
        raise HTTPException(400, "Status inválido")
    upd = {"status": st, "updated_at": now_iso(), "updated_by": admin["id"]}
    if st in ("completed", "paid"):
        upd["delivery"] = {"delivered_at": now_iso(), "by": admin["name"]}
    await orders.update_one({"id": oid}, {"$set": upd})
    return {"ok": True}


# ============ REPORTS ============
@router.get("/admin/reports/best-sellers")
async def best_sellers(limit: int = 10, admin=Depends(get_current_admin)):
    pipeline = [
        {"$match": {"status": {"$in": ["paid", "completed"]}}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "name": {"$first": "$items.name"}, "qty": {"$sum": "$items.quantity"}, "revenue": {"$sum": "$items.line_total"}}},
        {"$sort": {"qty": -1}},
        {"$limit": limit},
    ]
    return await orders.aggregate(pipeline).to_list(limit)


# ============ SETTINGS ============
@router.get("/admin/settings")
async def get_settings(admin=Depends(get_current_admin)):
    d = await settings.find_one({"key": "main"}, {"_id": 0})
    return d or {"key": "main"}


@router.put("/admin/settings")
async def update_settings(inp: SettingsInput, admin=Depends(get_current_admin)):
    upd = {k: v for k, v in inp.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    await settings.update_one({"key": "main"}, {"$set": upd, "$setOnInsert": {"key": "main"}}, upsert=True)
    return {"ok": True}


@router.get("/public/settings")
async def public_settings():
    d = await settings.find_one({"key": "main"}, {"_id": 0}) or {}
    # only expose non-sensitive
    return {
        "app_name": d.get("app_name", "Digital Store"),
        "logo": d.get("logo"),
        "favicon": d.get("favicon"),
        "primary_color": d.get("primary_color"),
        "company_info": d.get("company_info"),
        "social_links": d.get("social_links"),
        "seo": d.get("seo"),
        "mp_public_key": d.get("mp_public_key"),
    }


# ============ LOGS & AUDIT ============
@router.get("/admin/logs")
async def get_logs(kind: Optional[str] = None, limit: int = 200, admin=Depends(get_current_admin)):
    filt = {"kind": kind} if kind else {}
    return await logs.find(filt, {"_id": 0}).sort("created_at", -1).to_list(limit)


@router.get("/admin/audit")
async def get_audit(limit: int = 200, admin=Depends(get_current_admin)):
    return await audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)


# ============ TICKETS ============
@router.post("/tickets")
async def create_ticket(inp: TicketInput, user=Depends(get_current_user)):
    doc = {
        "id": uid(),
        "user_id": user["id"],
        "user_name": user["name"],
        "subject": inp.subject,
        "status": "open",
        "messages": [{"from": "user", "text": inp.message, "at": now_iso()}],
        "created_at": now_iso(),
    }
    await tickets.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.get("/tickets/mine")
async def my_tickets(user=Depends(get_current_user)):
    return await tickets.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("/tickets/{tid}/reply")
async def user_reply(tid: str, inp: TicketReplyInput, user=Depends(get_current_user)):
    t = await tickets.find_one({"id": tid, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Ticket não encontrado")
    await tickets.update_one({"id": tid}, {
        "$push": {"messages": {"from": "user", "text": inp.message, "at": now_iso()}},
        "$set": {"status": "open", "updated_at": now_iso()},
    })
    return {"ok": True}


@router.get("/admin/tickets")
async def admin_list_tickets(status: Optional[str] = None, admin=Depends(get_current_admin)):
    filt = {"status": status} if status else {}
    return await tickets.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/admin/tickets/{tid}/reply")
async def admin_reply(tid: str, inp: TicketReplyInput, admin=Depends(get_current_admin)):
    await tickets.update_one({"id": tid}, {
        "$push": {"messages": {"from": "admin", "by": admin["name"], "text": inp.message, "at": now_iso()}},
        "$set": {"status": "answered", "updated_at": now_iso()},
    })
    return {"ok": True}


@router.patch("/admin/tickets/{tid}/status")
async def admin_ticket_status(tid: str, payload: dict, admin=Depends(get_current_admin)):
    await tickets.update_one({"id": tid}, {"$set": {"status": payload.get("status", "closed")}})
    return {"ok": True}


# ============ HEALTH ============
@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/ready")
async def ready():
    try:
        await settings.find_one({}, {"_id": 0})
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(503, str(e))


@router.get("/live")
async def live():
    return {"status": "live"}
