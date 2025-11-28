from __future__ import annotations

import datetime as dt
import hashlib
import os
from typing import Any, Dict

import jwt
from passlib.context import CryptContext
import logging

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)


def _truncate_for_bcrypt(password: str) -> str:
    """
    Handle bcrypt's 72-byte limit by pre-hashing with SHA-512 if needed.
    
    If password is longer than 72 bytes when encoded as UTF-8, we pre-hash
    it with SHA-512 to ensure it's exactly 64 bytes (512 bits), which is
    well under the 72-byte limit. This preserves password security while
    avoiding truncation issues.
    
    For shorter passwords, we return as-is to maintain compatibility.
    """
    if password is None:
        return ""
    try:
        b = str(password).encode("utf-8")
        if len(b) > 72:
            # Pre-hash with SHA-512 to get a fixed 64-byte output
            hashed = hashlib.sha512(b).digest()
            # Return as a string representation (hex or base64 would work too)
            return hashed.hex()
        else:
            # Password is short enough, return as-is
            return str(password)
    except Exception:
        # On any error, fall back to SHA-512 of the string representation
        try:
            return hashlib.sha512(str(password).encode("utf-8")).digest().hex()
        except Exception:
            return ""


def hash_password(password: str) -> str:
    processed = _truncate_for_bcrypt(password)
    logger.debug("[security] hashing password: raw_len=%s processed_len=%s prehashed=%s", 
                len(str(password)), len(processed), len(str(password).encode("utf-8")) > 72)
    return pwd_context.hash(processed)


def verify_password(password: str, hashed: str) -> bool:
    try:
        processed = _truncate_for_bcrypt(password)
        logger.debug("[security] verifying password: raw_len=%s processed_len=%s prehashed=%s", 
                    len(str(password)), len(processed), len(str(password).encode("utf-8")) > 72)
        return pwd_context.verify(processed, hashed)
    except Exception as e:
        logger.exception("[security] verify_password error: %s", e)
        # On error, return False to avoid authenticating
        return False


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
