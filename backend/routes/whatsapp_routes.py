from fastapi import APIRouter, HTTPException, Depends, Request, Header
from typing import Optional
from models import WhatsappSessionInput, WhatsappSendInput, TemplateInput, uid, now_iso
from db import whatsapp_sessions, message_templates, logs, notifications
from auth import get_current_admin
import httpx
import os

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])
SIDECAR = os.environ.get("WHATSAPP_SIDECAR_URL", "http://localhost:3001")
WEBHOOK_TOKEN = os.environ.get("WHATSAPP_WEBHOOK_TOKEN", "")


async def _sc(method: str, path: str, **kwargs):
    async with httpx.AsyncClient(timeout=15) as c:
        return await c.request(method, f"{SIDECAR}{path}", **kwargs)


@router.get("/sessions")
async def list_sessions(admin=Depends(get_current_admin)):
    return await whatsapp_sessions.find({}, {"_id": 0}).to_list(50)


@router.post("/sessions/start")
async def start_session(inp: WhatsappSessionInput, admin=Depends(get_current_admin)):
    exists = await whatsapp_sessions.find_one({"session_id": inp.session_id})
    if not exists:
        await whatsapp_sessions.insert_one({
            "id": uid(), "session_id": inp.session_id, "label": inp.label or inp.session_id,
            "status": "starting", "qr": None, "created_at": now_iso(),
        })
    try:
        r = await _sc("POST", "/session/start", json={"sessionId": inp.session_id})
        return {"ok": True, "sidecar": r.json() if r.status_code == 200 else None}
    except Exception as e:
        raise HTTPException(502, f"Sidecar Baileys indisponível: {e}")


@router.get("/sessions/{sid}/status")
async def session_status(sid: str, admin=Depends(get_current_admin)):
    try:
        r = await _sc("GET", f"/session/status/{sid}")
        data = r.json() if r.status_code == 200 else {"connected": False, "qr": None}
    except Exception:
        data = {"connected": False, "qr": None, "error": "sidecar_offline"}
    await whatsapp_sessions.update_one(
        {"session_id": sid},
        {"$set": {
            "status": "connected" if data.get("connected") else ("qr" if data.get("qr") else "starting"),
            "qr": data.get("qr"),
            "updated_at": now_iso(),
        }}
    )
    return data


@router.post("/sessions/{sid}/restart")
async def restart_session(sid: str, admin=Depends(get_current_admin)):
    try:
        await _sc("POST", f"/session/restart/{sid}")
    except Exception:
        pass
    return {"ok": True}


@router.post("/sessions/{sid}/logout")
async def logout_session(sid: str, admin=Depends(get_current_admin)):
    try:
        await _sc("POST", f"/session/logout/{sid}")
    except Exception:
        pass
    await whatsapp_sessions.update_one({"session_id": sid}, {"$set": {"status": "disconnected", "qr": None}})
    return {"ok": True}


@router.delete("/sessions/{sid}")
async def delete_session(sid: str, admin=Depends(get_current_admin)):
    try:
        await _sc("DELETE", f"/session/{sid}")
    except Exception:
        pass
    await whatsapp_sessions.delete_one({"session_id": sid})
    return {"ok": True}


@router.post("/send")
async def send_message(inp: WhatsappSendInput, admin=Depends(get_current_admin)):
    try:
        r = await _sc("POST", "/message/send", json={"sessionId": inp.session_id, "to": inp.to, "text": inp.text})
        if r.status_code != 200:
            raise HTTPException(400, r.json().get("error", "Falha ao enviar"))
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Sidecar offline: {e}")


# ============ WEBHOOK from Sidecar ============
@router.post("/webhook")
async def wa_webhook(request: Request, x_webhook_token: Optional[str] = Header(None)):
    if WEBHOOK_TOKEN and x_webhook_token != WEBHOOK_TOKEN:
        raise HTTPException(401, "Invalid webhook token")
    body = await request.json()
    kind = body.get("event")  # connection | qr | message | disconnect
    sid = body.get("sessionId")
    if kind == "connection":
        await whatsapp_sessions.update_one({"session_id": sid}, {"$set": {"status": body.get("status", "unknown"), "updated_at": now_iso()}})
    elif kind == "qr":
        await whatsapp_sessions.update_one({"session_id": sid}, {"$set": {"qr": body.get("qr"), "status": "qr", "updated_at": now_iso()}})
    elif kind == "disconnect":
        await whatsapp_sessions.update_one({"session_id": sid}, {"$set": {"status": "disconnected", "updated_at": now_iso()}})
        await notifications.insert_one({"id": uid(), "user_id": None, "title": "WhatsApp desconectado",
                                        "message": f"Sessão {sid} desconectou.", "type": "warning", "read": False, "created_at": now_iso()})
    await logs.insert_one({"id": uid(), "kind": f"wa_{kind}", "message": str(body)[:500], "meta": body, "created_at": now_iso()})
    return {"ok": True}


# ============ TEMPLATES ============
@router.get("/templates")
async def list_templates(admin=Depends(get_current_admin)):
    return await message_templates.find({}, {"_id": 0}).to_list(200)


@router.post("/templates")
async def upsert_template(inp: TemplateInput, admin=Depends(get_current_admin)):
    doc = inp.model_dump()
    existing = await message_templates.find_one({"key": inp.key, "channel": inp.channel})
    if existing:
        await message_templates.update_one({"id": existing["id"]}, {"$set": doc})
        return {"ok": True, "id": existing["id"]}
    doc["id"] = uid()
    doc["created_at"] = now_iso()
    await message_templates.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@router.delete("/templates/{tid}")
async def delete_template(tid: str, admin=Depends(get_current_admin)):
    await message_templates.delete_one({"id": tid})
    return {"ok": True}
