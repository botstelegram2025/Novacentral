from fastapi import Depends, HTTPException, Header, status
from typing import Optional, List
from utils.security import decode_access
from db import users, admins


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("kind") != "user":
        raise HTTPException(status_code=401, detail="Invalid token subject")
    user = await users.find_one({"id": payload.get("sub")}, {"_id": 0, "password": 0})
    if not user or user.get("status") != "active":
        raise HTTPException(status_code=401, detail="User inactive")
    return user


async def get_current_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("kind") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    admin = await admins.find_one({"id": payload.get("sub")}, {"_id": 0, "password": 0})
    if not admin or admin.get("status") != "active":
        raise HTTPException(status_code=401, detail="Admin inactive")
    return admin


def require_roles(allowed: List[str]):
    async def checker(admin=Depends(get_current_admin)):
        if admin.get("role") not in allowed and admin.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return admin
    return checker


async def optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = decode_access(authorization.split(" ", 1)[1])
        if payload.get("kind") != "user":
            return None
        return await users.find_one({"id": payload.get("sub")}, {"_id": 0, "password": 0})
    except Exception:
        return None
