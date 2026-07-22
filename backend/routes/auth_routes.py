from fastapi import APIRouter, HTTPException, Depends, Request
from models import RegisterInput, LoginInput, AdminLoginInput, TokenResponse, ForgotPasswordInput, ResetPasswordInput, uid, now_iso
from utils.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_refresh, sanitize_cpf, sanitize_phone, is_valid_cpf, strong_password
)
from db import users, admins, password_resets
from auth import get_current_user
from services.notifier import log_event, push_notification, send_whatsapp_to_user
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(inp: RegisterInput, request: Request):
    cpf = sanitize_cpf(inp.cpf)
    phone = sanitize_phone(inp.phone)
    if not is_valid_cpf(cpf):
        raise HTTPException(status_code=400, detail="CPF inválido")
    if len(phone) < 8:
        raise HTTPException(status_code=400, detail="Telefone inválido")
    if inp.password != inp.confirm_password:
        raise HTTPException(status_code=400, detail="Senhas não conferem")
    if not strong_password(inp.password):
        raise HTTPException(status_code=400, detail="Senha fraca (mín. 8, com letras e números)")
    if not inp.accept_terms:
        raise HTTPException(status_code=400, detail="Aceite os termos")
    if await users.find_one({"cpf": cpf}):
        raise HTTPException(status_code=409, detail="CPF já cadastrado")
    if await users.find_one({"phone": phone, "ddd": inp.ddd}):
        raise HTTPException(status_code=409, detail="Telefone já cadastrado")

    user = {
        "id": uid(),
        "name": inp.name.strip(),
        "cpf": cpf,
        "email": (inp.email or "").strip().lower() or None,
        "ddi": inp.ddi or "+55",
        "ddd": inp.ddd,
        "phone": phone,
        "avatar": None,
        "password": hash_password(inp.password),
        "status": "active",
        "created_at": now_iso(),
        "last_login": now_iso(),
    }
    await users.insert_one(user)
    await log_event("register", f"Novo usuário: {user['name']}", {"user_id": user["id"], "ip": request.client.host if request.client else None})
    await push_notification(user["id"], "Bem-vindo!", f"Olá {user['name']}, sua conta foi criada.", "success")
    # Try WhatsApp welcome
    await send_whatsapp_to_user(user["id"], "welcome", {"nome": user["name"], "cpf": cpf})

    pub = {k: v for k, v in user.items() if k not in ("password", "_id")}
    access = create_access_token({"sub": user["id"], "kind": "user"})
    refresh = create_refresh_token({"sub": user["id"], "kind": "user"})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "user": pub}


@router.post("/login", response_model=TokenResponse)
async def login(inp: LoginInput, request: Request):
    cpf = sanitize_cpf(inp.cpf)
    user = await users.find_one({"cpf": cpf})
    if not user or not verify_password(inp.password, user["password"]):
        await log_event("login_fail", f"CPF {cpf}", {"ip": request.client.host if request.client else None})
        raise HTTPException(status_code=401, detail="CPF ou senha inválidos")
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Conta bloqueada")
    await users.update_one({"id": user["id"]}, {"$set": {"last_login": now_iso()}})
    await log_event("login", f"Usuário {user['name']} entrou", {"user_id": user["id"]})
    pub = {k: v for k, v in user.items() if k not in ("password", "_id")}
    minutes = 60 * 24 * 30 if inp.remember else None
    access = create_access_token({"sub": user["id"], "kind": "user"}, minutes)
    refresh = create_refresh_token({"sub": user["id"], "kind": "user"})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "user": pub}


@router.post("/refresh")
async def refresh(payload: dict):
    token = payload.get("refresh_token", "")
    try:
        data = decode_refresh(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh inválido")
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token inválido")
    access = create_access_token({"sub": data["sub"], "kind": data.get("kind", "user")})
    return {"access_token": access, "token_type": "bearer"}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout(user=Depends(get_current_user)):
    await log_event("logout", f"{user['name']}", {"user_id": user["id"]})
    return {"ok": True}


@router.post("/forgot-password")
async def forgot(inp: ForgotPasswordInput):
    cpf = sanitize_cpf(inp.cpf)
    user = await users.find_one({"cpf": cpf})
    if not user:
        return {"ok": True}  # do not reveal
    token = secrets.token_urlsafe(24)
    await password_resets.insert_one({
        "id": uid(),
        "user_id": user["id"],
        "token": token,
        "method": inp.method,
        "created_at": now_iso(),
        "used": False,
    })
    if inp.method == "whatsapp":
        await send_whatsapp_to_user(user["id"], "password_reset", {"nome": user["name"], "token": token})
    await log_event("password_reset_requested", f"{user['name']} via {inp.method}", {"user_id": user["id"]})
    return {"ok": True, "delivery": inp.method}


@router.post("/reset-password")
async def reset(inp: ResetPasswordInput):
    rec = await password_resets.find_one({"token": inp.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    if not strong_password(inp.new_password):
        raise HTTPException(status_code=400, detail="Senha fraca")
    await users.update_one({"id": rec["user_id"]}, {"$set": {"password": hash_password(inp.new_password)}})
    await password_resets.update_one({"id": rec["id"]}, {"$set": {"used": True, "used_at": now_iso()}})
    return {"ok": True}


# ============ ADMIN AUTH ============
admin_router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@admin_router.post("/login")
async def admin_login(inp: AdminLoginInput, request: Request):
    cpf = sanitize_cpf(inp.cpf)
    a = await admins.find_one({"cpf": cpf})
    if not a or not verify_password(inp.password, a["password"]):
        await log_event("admin_login_fail", f"CPF {cpf}", {"ip": request.client.host if request.client else None})
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if a.get("status") != "active":
        raise HTTPException(status_code=403, detail="Administrador inativo")
    await admins.update_one({"id": a["id"]}, {"$set": {"last_login": now_iso()}})
    await log_event("admin_login", f"{a['name']}", {"admin_id": a["id"]})
    pub = {k: v for k, v in a.items() if k not in ("password", "_id")}
    access = create_access_token({"sub": a["id"], "kind": "admin", "role": a["role"]})
    refresh = create_refresh_token({"sub": a["id"], "kind": "admin"})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "user": pub}


@admin_router.get("/me")
async def admin_me(admin=Depends(__import__("auth").get_current_admin)):
    return admin
