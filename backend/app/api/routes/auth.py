from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session

from app.api.deps import SessionDep, get_current_user, require_csrf
from app.core.config import get_settings
from app.core.security import (
    clear_auth_cookies,
    create_access_token,
    generate_csrf_token,
    set_auth_cookies,
    set_csrf_cookie,
)
from app.models.base import utcnow
from app.models.user import User
from app.schemas.auth import (
    CsrfResponse,
    LoginRequest,
    LoginResponse,
    TokenResponse,
    UserRead,
)
from app.schemas.common import Message
from app.services.audit_log import record_audit_log
from app.services.auth import (
    DirectoryUnavailableError,
    InvalidCredentialsError,
    authenticate_user,
)

router = APIRouter(prefix="/auth", tags=["Authentification"])
settings = get_settings()


def _finish_login(session: Session, user: User) -> User:
    user.last_login_at = utcnow()
    user.updated_at = utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: SessionDep,
) -> LoginResponse:
    try:
        user = authenticate_user(session, payload.username, payload.password)
    except InvalidCredentialsError as exc:
        record_audit_log(
            session,
            action="login_failed",
            request=request,
            username=payload.username,
            detail={"reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides.",
        ) from exc
    except DirectoryUnavailableError as exc:
        record_audit_log(
            session,
            action="login_failed",
            request=request,
            username=payload.username,
            detail={"reason": "directory_unavailable"},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Annuaire d'authentification indisponible.",
        ) from exc

    user = _finish_login(session, user)
    token = create_access_token(user_id=user.id or 0, username=user.username, role=user.role)
    csrf_token = generate_csrf_token()
    set_auth_cookies(response, token, csrf_token)
    record_audit_log(
        session,
        action="login",
        request=request,
        user=user,
        target_type="user",
        target_id=user.id,
        detail={"auth_source": user.auth_source, "role": user.role},
    )
    return LoginResponse(user=UserRead.model_validate(user), csrf_token=csrf_token)


@router.post("/token", response_model=TokenResponse)
def token_login(
    payload: LoginRequest,
    request: Request,
    session: SessionDep,
) -> TokenResponse:
    try:
        user = authenticate_user(session, payload.username, payload.password)
    except InvalidCredentialsError as exc:
        record_audit_log(
            session,
            action="login_failed",
            request=request,
            username=payload.username,
            detail={"reason": "invalid_credentials", "mode": "bearer"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides.",
        ) from exc
    except DirectoryUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Annuaire d'authentification indisponible.",
        ) from exc

    user = _finish_login(session, user)
    token = create_access_token(user_id=user.id or 0, username=user.username, role=user.role)
    record_audit_log(
        session,
        action="login",
        request=request,
        user=user,
        target_type="user",
        target_id=user.id,
        detail={"auth_source": user.auth_source, "mode": "bearer"},
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@router.get("/csrf", response_model=CsrfResponse)
def csrf(response: Response) -> CsrfResponse:
    token = generate_csrf_token()
    set_csrf_cookie(response, token)
    return CsrfResponse(csrf_token=token)


@router.post("/logout", response_model=Message)
def logout(
    request: Request,
    response: Response,
    session: SessionDep,
    user: User = Depends(require_csrf),
) -> Message:
    clear_auth_cookies(response)
    record_audit_log(
        session,
        action="logout",
        request=request,
        user=user,
        target_type="user",
        target_id=user.id,
    )
    return Message(detail="Déconnexion effectuée.")
