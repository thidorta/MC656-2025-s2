from __future__ import annotations

import datetime as dt
import os
from typing import Any, Dict

import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def jwt_config():
    secret = os.getenv("JWT_SECRET", "dev-secret-change-me")
    access_minutes = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))
    refresh_minutes = int(os.getenv("JWT_REFRESH_MINUTES", "1440"))
    return secret, access_minutes, refresh_minutes


def create_access_token(payload: Dict[str, Any]) -> str:
    secret, access_minutes, _ = jwt_config()
    to_encode = payload.copy()
    expire = dt.datetime.utcnow() + dt.timedelta(minutes=access_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, secret, algorithm="HS256")


def create_refresh_token(payload: Dict[str, Any]) -> str:
    secret, _, refresh_minutes = jwt_config()
    to_encode = payload.copy()
    expire = dt.datetime.utcnow() + dt.timedelta(minutes=refresh_minutes)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, secret, algorithm="HS256")


def decode_token(token: str) -> Dict[str, Any]:
    secret, _, _ = jwt_config()
    return jwt.decode(token, secret, algorithms=["HS256"])
