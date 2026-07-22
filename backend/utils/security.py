import os
import bcrypt
import jwt
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_REFRESH_SECRET = os.environ["JWT_REFRESH_SECRET"]
ACCESS_MINUTES = int(os.environ.get("JWT_ACCESS_MINUTES", "60"))
REFRESH_DAYS = int(os.environ.get("JWT_REFRESH_DAYS", "7"))
ALGO = "HS256"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(12)).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(data: dict, minutes: Optional[int] = None) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=minutes or ACCESS_MINUTES)
    payload["type"] = "access"
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGO)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)
    payload["type"] = "refresh"
    return jwt.encode(payload, JWT_REFRESH_SECRET, algorithm=ALGO)


def decode_access(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGO])


def decode_refresh(token: str) -> dict:
    return jwt.decode(token, JWT_REFRESH_SECRET, algorithms=[ALGO])


def sanitize_cpf(cpf: str) -> str:
    return re.sub(r"\D", "", cpf or "")


def sanitize_phone(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")


def is_valid_cpf(cpf: str) -> bool:
    cpf = sanitize_cpf(cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    for i in (9, 10):
        s = sum(int(cpf[j]) * ((i + 1) - j) for j in range(i))
        d = (s * 10) % 11
        if d == 10:
            d = 0
        if d != int(cpf[i]):
            return False
    return True


def strong_password(pw: str) -> bool:
    if len(pw) < 8:
        return False
    checks = [
        any(c.islower() for c in pw),
        any(c.isupper() for c in pw),
        any(c.isdigit() for c in pw),
    ]
    return sum(checks) >= 2
