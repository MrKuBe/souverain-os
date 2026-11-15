import base64
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Response
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import get_settings

settings = get_settings()
_password_hasher = PasswordHash.recommended()


class TokenError(Exception):
    """Jeton JWT absent, expiré, mal signé ou incohérent."""


class SecretDecryptionError(Exception):
    """Secret chiffré illisible (rotation de SECRET_KEY ou altération)."""


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return _password_hasher.verify(password, password_hash)
    except Exception:
        return False


@lru_cache
def _jwt_private_key() -> str:
    return Path(settings.jwt_private_key_path).read_text(encoding="utf-8")


@lru_cache
def _jwt_public_key() -> str:
    return Path(settings.jwt_public_key_path).read_text(encoding="utf-8")


def _signing_key() -> str:
    if settings.jwt_algorithm == "RS256":
        return _jwt_private_key()
    return settings.secret_key


def _verification_key() -> str:
    if settings.jwt_algorithm == "RS256":
        return _jwt_public_key()
    return settings.secret_key


def create_access_token(
    *,
    user_id: int,
    username: str,
    role: str,
    expires_minutes: int | None = None,
) -> str:
    now = datetime.now(UTC)
    lifetime = timedelta(minutes=expires_minutes or settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    return jwt.encode(payload, _signing_key(), algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            _verification_key(),
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
    except InvalidTokenError as exc:
        raise TokenError("Session invalide ou expirée.") from exc
    return payload


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(48)


def set_csrf_cookie(response: Response, csrf_token: str) -> None:
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
        path="/",
    )


def set_auth_cookies(response: Response, access_token: str, csrf_token: str) -> None:
    response.set_cookie(
        key=settings.access_cookie_name,
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
        path="/",
    )
    set_csrf_cookie(response, csrf_token)


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key=settings.access_cookie_name,
        domain=settings.cookie_domain,
        path="/",
    )
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        domain=settings.cookie_domain,
        path="/",
    )


@lru_cache
def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.secret_key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(value: str | None) -> str:
    if not value:
        raise SecretDecryptionError("Aucun secret enregistré.")
    try:
        return _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError) as exc:
        raise SecretDecryptionError(
            "Secret illisible : la SECRET_KEY a peut-être été changée sans migration."
        ) from exc
