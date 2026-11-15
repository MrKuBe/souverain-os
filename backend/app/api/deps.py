import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import TokenError, decode_access_token
from app.models.audit import Audit
from app.models.user import User
from app.schemas.common import ADMIN_ROLES, READER_ROLES, WRITER_ROLES

settings = get_settings()
_bearer = HTTPBearer(auto_error=False)

SessionDep = Annotated[Session, Depends(get_session)]


def _token_from_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> tuple[str | None, bool]:
    if credentials is not None and credentials.scheme.casefold() == "bearer":
        return credentials.credentials, True
    cookie_token = request.cookies.get(settings.access_cookie_name)
    return cookie_token, False


def _user_from_token(session: Session, token: str) -> User | None:
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub", ""))
    except (TokenError, TypeError, ValueError):
        return None
    user = session.get(User, user_id)
    if user is None or not user.is_active:
        return None
    if user.role not in READER_ROLES:
        return None
    return user


def get_optional_user(
    request: Request,
    session: SessionDep,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User | None:
    token, _bearer_auth = _token_from_request(request, credentials)
    if not token:
        return None
    return _user_from_token(session, token)


def get_current_user(
    user: User | None = Depends(get_optional_user),
) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def _is_bearer_request(request: Request) -> bool:
    authorization = request.headers.get("authorization", "")
    return authorization.casefold().startswith("bearer ")


def require_csrf(
    request: Request,
    user: User = Depends(get_current_user),
) -> User:
    if _is_bearer_request(request):
        return user
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    header_token = request.headers.get(settings.csrf_header_name)
    if (
        not cookie_token
        or not header_token
        or not secrets.compare_digest(cookie_token, header_token)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Jeton CSRF manquant ou invalide.",
        )
    return user


def require_writer(user: User = Depends(require_csrf)) -> User:
    if user.role not in WRITER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rôle insuffisant : écriture réservée à admin_ght ou auditeur.",
        )
    return user


def require_writer_read(user: User = Depends(get_current_user)) -> User:
    if user.role not in WRITER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Fonction réservée aux rôles admin_ght et auditeur.",
        )
    return user


def require_admin_read(user: User = Depends(get_current_user)) -> User:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au rôle admin_ght.",
        )
    return user


def require_admin_write(user: User = Depends(require_csrf)) -> User:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé au rôle admin_ght.",
        )
    return user


def get_audit_or_404(session: Session, audit_id: int) -> Audit:
    audit = session.get(Audit, audit_id)
    if audit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit introuvable.",
        )
    return audit


def assert_audit_readable(audit: Audit, user: User | None) -> None:
    if audit.is_demo:
        return
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise pour consulter un audit réel.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.role not in READER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rôle insuffisant pour consulter cet audit.",
        )


def assert_audit_writable(audit: Audit, user: User) -> None:
    if audit.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le jeu de démonstration est strictement en lecture seule.",
        )
    if user.role not in WRITER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Écriture réservée aux rôles admin_ght et auditeur.",
        )
