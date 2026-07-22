from db import notifications, logs, message_templates, users
from models import uid, now_iso
from typing import Optional, Dict, Any
import httpx
import os

WA_URL = os.environ.get("WHATSAPP_SIDECAR_URL", "http://localhost:3001")


async def log_event(kind: str, message: str, meta: Optional[Dict[str, Any]] = None):
    doc = {
        "id": uid(),
        "kind": kind,
        "message": message,
        "meta": meta or {},
        "created_at": now_iso(),
    }
    await logs.insert_one(doc)


async def push_notification(user_id: Optional[str], title: str, message: str, ntype: str = "info", link: Optional[str] = None):
    doc = {
        "id": uid(),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": ntype,
        "link": link,
        "read": False,
        "created_at": now_iso(),
    }
    await notifications.insert_one(doc)
    return doc


def render_template(body: str, vars: Dict[str, Any]) -> str:
    out = body or ""
    for k, v in (vars or {}).items():
        out = out.replace("{" + k + "}", str(v) if v is not None else "")
    return out


async def get_template(key: str) -> Optional[Dict[str, Any]]:
    return await message_templates.find_one({"key": key, "active": True}, {"_id": 0})


async def send_whatsapp_to_user(user_id: str, template_key: str, vars: Dict[str, Any]):
    """Try sending template message via active WA session to user's phone. Fails silently."""
    try:
        user = await users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            return False
        tpl = await get_template(template_key)
        if not tpl:
            return False
        text = render_template(tpl["body"], vars)
        # find any active session
        from db import whatsapp_sessions
        sess = await whatsapp_sessions.find_one({"status": "connected"}, {"_id": 0})
        if not sess:
            await log_event("whatsapp_skip", f"No active session to send {template_key}", {"user_id": user_id})
            return False
        phone = f"{user['ddi'].replace('+','')}{user['ddd']}{user['phone']}"
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(f"{WA_URL}/message/send", json={"sessionId": sess["session_id"], "to": phone, "text": text})
            ok = r.status_code == 200
            await log_event("whatsapp_send", f"send {template_key} -> {phone} ok={ok}", {"status": r.status_code})
            return ok
    except Exception as e:
        await log_event("whatsapp_error", str(e), {"template": template_key})
        return False
