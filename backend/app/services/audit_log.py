import logging
from typing import Any

from sqlmodel import Session
from starlette.requests import Request

from app.models.audit import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)

_SENSITIVE_FRAGMENTS = (
    "password",
    "passwd",
    "token",
    "secret",
    "authorization",
    "api_key",
    "apikey",
    "private_key",
    "bind_password",
)


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: "[masqué]"
            if any(fragment in str(key).lower() for fragment in _SENSITIVE_FRAGMENTS)
            else _redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


def record_audit_log(
    session: Session,
    *,
    action: str,
    request: Request | None = None,
    user: User | None = None,
    username: str | None = None,
    target_type: str | None = None,
    target_id: int | None = None,
    detail: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user.id if user else None,
        username=(user.username if user else None) or username or "anonyme",
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=_redact(detail) if detail is not None else None,
        ip_address=request.client.host if request and request.client else None,
        user_agent=(request.headers.get("user-agent") or None) if request else None,
    )
    if entry.user_agent:
        entry.user_agent = entry.user_agent[:500]
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry
